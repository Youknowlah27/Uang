"""OpportunityScout — turns clipping/UGC campaign briefs (pasted text, .md/.txt/.url in inbox/) into structured Campaign objects,
scores them (expected value per clip, effort, rule fit) and flags risks. Marketplaces are login-walled, so ingestion is
paste/inbox first; public listing URLs can be added under scout.sources (best effort)."""
from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone
from pathlib import Path

from ..models import Campaign
from ..tools.render_fetch import fetch_text
from .base import Agent

CLIP_MINUTES = 25   # assumed effort per clip (cut + captions + review); replaced by measured values later


def score_campaign(c: Campaign, assumed_views: int, our_platforms: list[str]) -> dict:
    flags: list[str] = []
    plats = [p for p in our_platforms if not c.platforms or p in c.platforms]
    if not plats:
        flags.append("none of our platforms are accepted")
    approval = 0.7
    ev_clip = c.rate_per_1k / 1000 * assumed_views * approval + c.flat_bonus * approval
    need_views = int(c.min_payout / c.rate_per_1k * 1000) if c.rate_per_1k > 0 and c.min_payout else 0
    if need_views and assumed_views < need_views:
        flags.append(f"clip must reach ≥{need_views:,} views before it is even reviewed (min payout {c.min_payout:g})")
    if c.content_type == "clipping" and not c.source_footage_urls:
        flags.append("no source-footage link in the brief")
    if c.budget is not None and c.budget < 300:
        flags.append(f"small budget ({c.budget:g}) may run out before payouts")
    if c.max_payout is not None and c.max_payout < 20:
        flags.append("low per-clip payout cap")
    if not c.requirements_text and not c.required_hashtags:
        flags.append("requirements not stated → rejection risk")
    ev_hour = ev_clip / (CLIP_MINUTES / 60)
    score = max(0.0, min(100.0, 12 * ev_hour ** 0.5 - 8 * len(flags))) if ev_hour > 0 else 0.0
    return {"ev_per_clip": round(ev_clip, 2), "ev_per_hour": round(ev_hour, 2), "required_views": need_views, "flags": flags, "platforms_ok": plats, "score": round(score, 1)}


def slug(text: str) -> str:
    return hashlib.sha1(text.encode()).hexdigest()[:10]


class ScoutAgent(Agent):
    name = "scout"
    role = "Finds paid clipping/UGC campaigns, reads their written rules and ranks them by expected value and risk."

    def parse(self, text: str, url: str = "") -> Campaign:
        prompt = self.prompt("scout_parse") + f"\n\nURL: {url}\n\nCAMPAIGN TEXT:\n{text[:6000]}"
        c = self.ctx.llm.json("scout_parse", "You extract structured campaign terms. Never invent numbers; use null/empty when unstated.", prompt, Campaign)
        c.id = c.id or slug(url or text)
        c.url = c.url or url
        c.fetched_at = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        return c

    def ingest(self, text: str, url: str = "") -> Campaign:
        c = self.parse(text, url)
        sc = score_campaign(c, self.ctx.cfg["scout"]["assumed_views_per_clip"], self.our_platforms())
        c.score = sc["score"]
        self.ctx.store.put("campaign", c.id, {**c.model_dump(), "scoring": sc}, "candidate")
        return c

    def our_platforms(self) -> list[str]:
        ps: set[str] = set()
        for a in self.ctx.accounts.values():
            ps |= set(a.get("handles", {}))
        return sorted(ps) or ["tiktok", "instagram", "youtube"]

    def work(self, **kw) -> dict:
        cfg = self.ctx.cfg["scout"]
        inbox = self.ctx.root / cfg["inbox_dir"]
        done = inbox / "processed"
        done.mkdir(parents=True, exist_ok=True)
        n = 0
        for f in sorted(inbox.glob("*")):
            if f.is_dir() or f.suffix not in (".md", ".txt", ".url"):
                continue
            body = f.read_text(errors="replace")
            url = ""
            if f.suffix == ".url":
                m = re.search(r"https?://\S+", body)
                url = m.group(0) if m else ""
                body = fetch_text(url) if url else body
            self.ingest(body, url)
            f.rename(done / f.name)
            n += 1
        for u in cfg.get("sources", []):
            try:
                self.ingest(fetch_text(u), u)
                n += 1
            except Exception as e:  # noqa: BLE001
                self.log("warn", f"source {u}: {e!r}"[:200])
        # refresh scores (assumed views may have changed)
        for d in self.ctx.store.list("campaign"):
            st = d.pop("_status"), d.pop("_id")
            sc = d.pop("scoring", None)
            c = Campaign(**{k: v for k, v in d.items() if k in Campaign.model_fields})
            sc = score_campaign(c, cfg["assumed_views_per_clip"], self.our_platforms())
            c.score = sc["score"]
            self.ctx.store.put("campaign", c.id, {**c.model_dump(), "scoring": sc}, st[0])
        ranked = sorted(self.ctx.store.list("campaign", ["candidate", "accepted"]), key=lambda d: -(d.get("score") or 0))
        return {"ingested": n, "campaigns": len(ranked), "top": ranked[0]["brand"] if ranked else ""}
