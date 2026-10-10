"""Gemini-app hand-off (uses your Google AI Plus quotas; no UI automation, a human is the courier ≈30 s per task).
  make_pack()      writes a paste-ready prompt + exactly where to save the result
  ingest_research() reads a Deep Research report (.md/.txt exported from Gemini or Google Docs) → evidence + notes on the idea
Best fits for the Gemini app: Deep Research (token-heavy evidence gathering), Nano Banana (mascot variants/thumbnails), Veo/Flow (rare B-roll)."""
from __future__ import annotations

import re
from pathlib import Path

URL = re.compile(r"https?://[^\s)>\]\"']+")

RESEARCH = """Use Deep Research. Topic: {topic}
Angle I will take: {angle}

Deliver a report with:
1. A claims table: claim | exact number/date | primary-source URL (company filings, press releases, official docs first) | as-of date | confidence.
2. What is DISPUTED or uncertain (list sources that disagree).
3. 3 non-obvious mechanisms/incentives that explain the story (why it matters, who wins/loses).
4. Counter-arguments a skeptical expert would raise.
Rules: no speculation, no price predictions, mark anything single-sourced as "unverified", include a source URL for every number.
Finish by exporting to Google Docs and saving it as: {name}"""

IMAGE = """Nano Banana Pro — mascot "Chip" (cute robot with a microchip body, teal body, lime-green eyes on a dark screen face, gold pins, small red bow tie). Flat 2D vector sticker style, thick clean outline, transparent/solid light background, front 3/4 view.
Make 6 expressions: shocked, cheering, sad, smug, thinking, waving. Same character in every image. Save as chip_<expression>.png into: {dest}
(Optional) 3 thumbnail backgrounds for the topic "{topic}", 1080x1920, big empty centre, no text."""

VIDEO = """Flow / Veo — 3 clips, 8 s each, vertical 9:16, NO realistic people, stylised/abstract only (to avoid AI-realism labels). Topic: {topic}
1) abstract data-centre corridor of glowing server racks, slow dolly   2) chip die macro with light traces flowing   3) paper-cut city skyline of tech campuses at dusk.
Use the cheapest tier that looks acceptable (Fast/Lite) — credits are limited. Download as broll_1.mp4 … broll_3.mp4 into: {dest}"""


def make_pack(kind: str, topic: str, angle: str = "", out_dir: Path = Path("build/handoff"), slug: str = "topic") -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    if kind == "research":
        name = f"{slug}_research.md  (→ inbox/research/ ; or leave in Google Drive 'Shorts Agency Handoff')"
        body = RESEARCH.format(topic=topic, angle=angle or "(you propose the strongest skeptical angle)", name=name)
        where = "gemini.google.com → Tools → Deep Research"
    elif kind == "image":
        body, where = IMAGE.format(topic=topic, dest="agency/studio/public/assets/"), "gemini.google.com (Nano Banana Pro)"
    elif kind == "video":
        body, where = VIDEO.format(topic=topic, dest="agency/studio/public/broll/"), "labs.google/flow"
    else:
        raise ValueError(kind)
    p = out_dir / f"{slug}_{kind}.md"
    p.write_text(f"# Hand-off: {kind}\n**Open:** {where}\n**Paste this:**\n\n```\n{body}\n```\n")
    return p


def ingest_research(path: Path, store, idea_id: str) -> dict:
    text = path.read_text(errors="replace")
    urls = list(dict.fromkeys(URL.findall(text)))
    idea = store.get("idea", idea_id) or {"id": idea_id, "title": idea_id, "score": 0, "evidence": []}
    idea.pop("_status", None)
    have = {e["url"] for e in idea.get("evidence", [])}
    idea["evidence"] = idea.get("evidence", []) + [{"title": "Gemini Deep Research source", "url": u.rstrip(".,;"), "source": "gemini_research"} for u in urls if u.rstrip(".,;") not in have]
    idea["research_notes"] = text[:6000]
    store.put("idea", idea_id, idea, "researched")
    return {"idea": idea_id, "urls": len(urls), "chars": len(text)}
