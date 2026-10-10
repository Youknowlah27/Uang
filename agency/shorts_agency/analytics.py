"""Performance analytics: normalise exports, tag every post with the decisions that produced it, then ask
'what works, what doesn't, how sure are we?'. Small-sample honest: effects are only called 'likely' with n>=5 per group
and a bootstrap CI that excludes zero; everything else is labelled weak/noise."""
from __future__ import annotations

import csv
import re
from pathlib import Path
from statistics import median

import numpy as np

ALIASES = {
    "views": ["views", "video views", "plays", "play count", "views (all)"],
    "likes": ["likes", "like count"],
    "comments": ["comments", "comment count"],
    "shares": ["shares", "share count", "reposts"],
    "saves": ["saves", "favorites", "bookmarks", "save count"],
    "follows": ["new followers", "followers gained", "follows", "subscribers gained", "subscribers"],
    "avg_watch_s": ["average watch time", "avg watch time", "average view duration", "avg view duration (s)", "avg_watch_s"],
    "completion_rate": ["watched full video", "completion rate", "average percentage viewed", "full video watch rate", "completion_rate"],
    "link_clicks": ["link clicks", "clicks", "profile link clicks"],
    "url": ["url", "video link", "link", "permalink"],
    "title": ["title", "video title", "caption", "description"],
    "date": ["date", "post date", "publish time", "created", "posted"],
    "video_id": ["video_id", "id"],
}


def _num(x) -> float | None:
    if x is None or str(x).strip() == "":
        return None
    s = str(x).strip().replace(",", "")
    pct = s.endswith("%")
    s = s.rstrip("%")
    try:
        v = float(s)
    except ValueError:
        return None
    return v / 100 if pct else v


def load_csv(path: Path, platform: str) -> list[dict]:
    rows = []
    with open(path, newline="", encoding="utf-8-sig") as f:
        rd = csv.DictReader(f)
        cols = {c.lower().strip(): c for c in rd.fieldnames or []}
        pick = {k: next((cols[a] for a in al if a in cols), None) for k, al in ALIASES.items()}
        for r in rd:
            d = {"platform": platform}
            for k, col in pick.items():
                v = r.get(col) if col else None
                d[k] = v.strip() if k in ("url", "title", "date", "video_id") and v else (_num(v) if k not in ("url", "title", "date", "video_id") else None)
            if d.get("completion_rate") is not None and d["completion_rate"] > 1.5:
                d["completion_rate"] /= 100
            rows.append(d)
    return rows


def attributes(spec: dict) -> dict:
    tpl = [s["template"] for s in spec["scenes"]]
    styles = [s.get("style") or spec["style"] for s in spec["scenes"]]
    return {
        "style": spec["style"] if spec["style"] != "mix" else "mix", "duration_bucket": "<25" if spec["timeline"]["total"] < 25 else "25-45" if spec["timeline"]["total"] <= 45 else "46-60" if spec["timeline"]["total"] <= 60 else ">60",
        "cta_type": spec["cta"]["type"], "hook_type": spec.get("hook_type", "unknown"), "mood": spec.get("mood"), "lane": spec.get("lane"), "goal": spec.get("goal"),
        "n_scenes": len(tpl), "uses_chart": any(t in ("share", "count_grid", "milestone") for t in tpl), "reactions": len(spec.get("mascot", {}).get("reactions", [])),
        "first_style": styles[0],
    }


def _pct_rank(x: float, arr: list[float]) -> float:
    return float(np.mean([a <= x for a in arr])) if arr else 0.5


def score_rows(rows: list[dict]) -> list[dict]:
    """Composite 0-100 per post, relative to the batch (retention 40%, engagement 30%, reach 30%)."""
    views = [r["views"] or 0 for r in rows]
    for r in rows:
        v = max(r["views"] or 0, 1)
        r["engagement_rate"] = ((r["likes"] or 0) + 2 * (r["comments"] or 0) + 3 * (r["shares"] or 0) + 3 * (r["saves"] or 0)) / v
        r["follow_rate"] = (r["follows"] or 0) / v
    er = [r["engagement_rate"] for r in rows]
    comp = [r["completion_rate"] for r in rows if r.get("completion_rate") is not None]
    for r in rows:
        c = _pct_rank(r["completion_rate"], comp) if r.get("completion_rate") is not None else 0.5
        r["score"] = round(100 * (0.4 * c + 0.3 * _pct_rank(r["engagement_rate"], er) + 0.3 * _pct_rank(r["views"] or 0, views)), 1)
    return rows


def bootstrap_diff(a: list[float], b: list[float], n: int = 3000, seed: int = 0) -> tuple[float, float, float]:
    rng = np.random.default_rng(seed)
    a_, b_ = np.array(a), np.array(b)
    diffs = [np.median(rng.choice(a_, len(a_))) - np.median(rng.choice(b_, len(b_))) for _ in range(n)]
    return float(np.median(a_) - np.median(b_)), float(np.percentile(diffs, 5)), float(np.percentile(diffs, 95))


def group_effects(rows: list[dict], attr: str, min_n: int = 3) -> list[dict]:
    out = []
    values = sorted({str(r["attrs"].get(attr)) for r in rows})
    for val in values:
        a = [r["score"] for r in rows if str(r["attrs"].get(attr)) == val]
        b = [r["score"] for r in rows if str(r["attrs"].get(attr)) != val]
        if len(a) < min_n or len(b) < min_n:
            continue
        diff, lo, hi = bootstrap_diff(a, b)
        base = median(b) or 1
        lift = diff / base
        if len(a) >= 5 and len(b) >= 5 and (lo > 0 or hi < 0):
            verdict = "likely"
        elif abs(lift) >= 0.2:
            verdict = "weak signal"
        else:
            verdict = "noise"
        out.append({"attr": attr, "value": val, "n": len(a), "n_rest": len(b), "median_score": round(median(a), 1), "lift_vs_rest": round(lift, 2), "ci90": [round(lo, 1), round(hi, 1)], "verdict": verdict})
    return sorted(out, key=lambda e: -abs(e["lift_vs_rest"]))


ATTRS = ["style", "duration_bucket", "cta_type", "hook_type", "mood", "uses_chart", "first_style"]


def analyse(rows: list[dict]) -> dict:
    rows = score_rows(rows)
    eff = [e for a in ATTRS for e in group_effects(rows, a)]
    ranked = sorted(rows, key=lambda r: -r["score"])
    k = max(1, len(rows) // 4)
    caveats = []
    if len(rows) < 20:
        caveats.append(f"only {len(rows)} posts: every effect below is a hypothesis, not a finding")
    if len({r.get('platform') for r in rows}) > 1:
        caveats.append("platforms mixed: scores are batch-relative; compare within a platform when n allows")
    return {"n": len(rows), "winners": [{"id": r.get("video_id"), "score": r["score"], "views": r["views"], "attrs": r["attrs"]} for r in ranked[:k]],
            "losers": [{"id": r.get("video_id"), "score": r["score"], "views": r["views"], "attrs": r["attrs"]} for r in ranked[-k:]], "effects": eff, "caveats": caveats,
            "baseline": {"median_views": median([r["views"] or 0 for r in rows]) if rows else 0, "median_engagement": round(float(np.median([r["engagement_rate"] for r in rows])), 4) if rows else 0}}


def apply_to_strategy(strategy: dict, result: dict, today: str) -> list[str]:
    """Conservative, auditable edits: only 'likely' effects change the strategy file; each change is logged under evidence."""
    changes = []
    for e in result["effects"]:
        if e["verdict"] != "likely":
            continue
        if e["attr"] == "hook_type":
            pref, avoid = strategy["hooks"]["preferred"], strategy["hooks"]["avoid"]
            if e["lift_vs_rest"] > 0.25 and e["value"] not in pref:
                pref.insert(0, e["value"]); changes.append(f"prefer hook '{e['value']}' (+{e['lift_vs_rest']:.0%}, n={e['n']})")
            if e["lift_vs_rest"] < -0.25 and e["value"] not in avoid:
                avoid.append(e["value"]); changes.append(f"avoid hook '{e['value']}' ({e['lift_vs_rest']:.0%}, n={e['n']})")
        if e["attr"] == "cta_type" and e["lift_vs_rest"] > 0.25:
            mix = strategy["cta"]["mix"]
            if e["value"] in mix:
                mix[e["value"]] = round(min(0.8, mix[e["value"]] + 0.1), 2); changes.append(f"raise CTA '{e['value']}' share (+{e['lift_vs_rest']:.0%}, n={e['n']})")
    for c in changes:
        strategy.setdefault("evidence", []).append({"date": today, "change": c})
    if changes:
        strategy["updated"] = today
        strategy["confidence"] = "medium"
    return changes
