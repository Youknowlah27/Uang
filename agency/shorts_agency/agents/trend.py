"""TrendResearcher — free, key-less sources only (HN front page, BBC Tech RSS, TechCrunch RSS, Google Trends US RSS).
Deterministic scoring (niche fit × recency × engagement × cross-source corroboration); the LLM only adds angles."""
from __future__ import annotations

import hashlib
import math
import re
import time
from email.utils import parsedate_to_datetime

from ..checks_common import keywords
from ..schemas import AnglesOut
from ..tools import web
from .base import Agent

SOURCES = {
    "hn_frontpage": ("json", "https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=40"),
    "bbc_tech_rss": ("rss", "https://feeds.bbci.co.uk/news/technology/rss.xml"),
    "techcrunch_rss": ("rss", "https://techcrunch.com/feed/"),
    "google_trends_us": ("rss", "https://trends.google.com/trending/rss?geo=US"),
}


def _ts(s: str | None) -> float:
    try:
        return parsedate_to_datetime(s).timestamp() if s else time.time()
    except Exception:  # noqa: BLE001
        return time.time()


def collect(source_names: list[str]) -> list[dict]:
    out: list[dict] = []
    for name in source_names:
        kind, url = SOURCES[name]
        try:
            if kind == "json":
                for h in web.get_json(url).get("hits", []):
                    out.append({"source": name, "title": h.get("title") or "", "url": h.get("url") or f"https://news.ycombinator.com/item?id={h.get('objectID')}", "ts": float(h.get("created_at_i") or time.time()), "points": h.get("points") or 0, "comments": h.get("num_comments") or 0})
            else:
                for it in web.get_rss(url):
                    out.append({"source": name, "title": it.get("title", ""), "url": it.get("link", ""), "ts": _ts(it.get("pubDate")), "points": int(re.sub(r"\D", "", it.get("approx_traffic", "0")) or 0) // 1000 if name == "google_trends_us" else 0, "comments": 0})
        except Exception as e:  # noqa: BLE001
            out.append({"source": name, "error": repr(e)})
    return out


def score_items(items: list[dict], niche_kw: set[str], now: float | None = None) -> list[dict]:
    now = now or time.time()
    good = [i for i in items if i.get("title")]
    for it in good:
        it["kw"] = keywords(it["title"])
    # cluster by shared keywords (>=2) so that the same story from several outlets is counted once
    clusters: list[list[dict]] = []
    for it in sorted(good, key=lambda x: -x["points"]):
        for c in clusters:
            if len(it["kw"] & c[0]["kw"]) >= 2:
                c.append(it)
                break
        else:
            clusters.append([it])
    ideas = []
    for c in clusters:
        head = c[0]
        niche = len(head["kw"] & niche_kw) / max(3, len(head["kw"]))
        niche = min(1.0, niche * 2.5)
        age_h = max(0.0, (now - max(i["ts"] for i in c)) / 3600)
        recency = 0.5 ** (age_h / 18)
        eng = min(1.0, math.log1p(sum(i["points"] for i in c)) / math.log1p(800))
        cross = min(1.0, (len({i["source"] for i in c}) - 1) / 2)
        score = round(100 * (0.50 * niche + 0.20 * recency + 0.15 * eng + 0.15 * cross), 1)
        ideas.append({"id": hashlib.sha1(head["title"].encode()).hexdigest()[:10], "title": head["title"], "score": score, "niche_fit": round(niche, 2), "recency": round(recency, 2), "engagement": round(eng, 2), "cross_source": round(cross, 2),
                      "evidence": [{"title": i["title"], "url": i["url"], "source": i["source"]} for i in c][:5], "keywords": sorted(head["kw"])[:8]})
    return sorted(ideas, key=lambda x: -x["score"])


class TrendAgent(Agent):
    name = "trend"
    role = "Finds what is rising in business+tech right now and why it fits our niche."

    def work(self, items: list[dict] | None = None) -> dict:
        cfg = self.ctx.cfg
        niche = set(cfg["niche"]["keywords"])
        niche = {w for k in niche for w in k.lower().split()}
        raw = items if items is not None else collect(cfg["trend"]["sources"])
        errs = [r for r in raw if r.get("error")]
        ideas = score_items([r for r in raw if not r.get("error")], niche)[: cfg["trend"]["top_n"]]
        if self.ctx.llm and ideas:
            try:
                prompt = self.prompt("trend_angles") + "\n\nTOPICS:\n" + "\n".join(f"- id={i['id']} | {i['title']} | sources={[e['source'] for e in i['evidence']]}" for i in ideas[:8])
                out = self.ctx.llm.json("trend_angles", "You are a sharp business/tech short-video strategist.", prompt, AnglesOut)
                by = {a.topic_id: a for a in out.angles}
                for i in ideas:
                    if i["id"] in by:
                        i["angle"] = by[i["id"]].model_dump()
            except Exception as e:  # noqa: BLE001
                self.log("warn", f"angles failed: {e!r}"[:300])
        for i in ideas:
            self.ctx.store.put("idea", i["id"], i, "new")
        return {"collected": len(raw), "source_errors": len(errs), "ideas": len(ideas), "top": ideas[0]["title"] if ideas else ""}
