"""Template catalogue (what the Director may use), validators, and a deterministic fallback storyboard."""
from __future__ import annotations

import re
from typing import Any

from .produce.timeline import word_index

CATALOG: dict[str, dict[str, Any]] = {
    "hook_stamp": {"use": "FIRST scene. A bold claim, one struck-through word/line and a stamp word.", "props": {"kicker": "{text, at}", "lines": "[{text, at}] x2", "strike": "{line:int, at}", "stamp": "{text, at}", "icon": "chip|none"}, "required": ["lines"]},
    "cards": {"use": "2-4 named items (competitors, options, tools).", "props": {"kicker": "str", "title": "str", "subtitle": "str", "items": "[{name, sub, at}]", "check_at": "word", "note": "{text, at}"}, "required": ["items"]},
    "share": {"use": "A part-of-whole percentage (share of revenue/market).", "props": {"title": "str", "subtitle": "str", "kicker": "str", "total_label": "str", "display_pct": "number", "at": "word", "primary": "{label, sub, main, rest, main_label, at}", "secondary": "optional same shape", "legend": "[{label, value, tone, at}]", "source": "str", "source_short": "str"}, "required": ["primary", "at"]},
    "milestone": {"use": "A dated event + keyword + optional code snippet.", "props": {"lead": "{text, at}", "year": "{text, at}", "label": "{text, at}", "keyword": "{text, at}", "span": "{text, from, to, at}", "marker": "{label, at}", "title": "str", "subtitle": "str", "code": "[str]", "code_from": "word", "code_to": "word", "source": "str"}, "required": ["keyword"]},
    "count_grid": {"use": "One big count (users, devs, units) as a dot grid.", "props": {"kicker": "str", "value": "number", "decimals": "int", "suffix": "str", "label": "str", "label_at": "word", "at": "word", "dots": "int", "cols": "int", "per_dot": "str", "source": "str"}, "required": ["value", "at"]},
    "switch_cost": {"use": "Before/after or cost-of-change with 2-4 rows.", "props": {"title": "str", "arrow": "word", "fill": "word", "from": "{label}", "to": "{label}", "stamp": "{text, at}", "note": "{text, at}", "rows": "[{k, v, tag, at}]"}, "required": ["rows", "arrow", "fill"]},
    "statement": {"use": "The takeaway before the CTA: 2 lines, one struck, one highlighted.", "props": {"kicker": "str", "lines": "[{text, at}] x2", "strike": "{line, at}", "highlight": "{text, at}", "icon": "code|none"}, "required": ["lines"]},
    "cta_end": {"use": "LAST scene. Reads spec.cta.", "props": {}, "required": []},
}
TEXTY = {"statement", "hook_stamp", "cta_end"}


def tokens_like_tts(text: str) -> list[str]:
    return [w for w in re.split(r"\s+", text.strip()) if w]


def validate_scenes(beats: list[dict], scenes: list[dict]) -> list[str]:
    """Static checks (before TTS). Returns problems; word refs are verified again against the real timeline later."""
    probs: list[str] = []
    ids = [b["id"] for b in beats]
    if [s["beat"] for s in scenes] != ids:
        probs.append(f"scenes must map 1:1, in order, to beats {ids}")
    if scenes and scenes[0]["template"] != "hook_stamp":
        probs.append("first scene must be hook_stamp")
    if scenes and scenes[-1]["template"] != "cta_end":
        probs.append("last scene must be cta_end")
    for s in scenes:
        meta = CATALOG.get(s["template"])
        if not meta:
            probs.append(f"unknown template {s['template']}")
            continue
        for k in meta["required"]:
            if k not in (s.get("props") or {}):
                probs.append(f"scene {s['beat']} ({s['template']}) missing props.{k}")
    return probs


def validate_refs(spec_like: dict, scenes: list[dict]) -> list[str]:
    """Check every word ref in props resolves against the real timeline."""
    probs: list[str] = []

    def walk(beat: str, v: Any, path: str):
        if isinstance(v, dict):
            for k, x in v.items():
                if k in ("at", "check_at", "label_at", "arrow", "fill", "code_from", "code_to") and isinstance(x, (str, int)) and not isinstance(x, bool):
                    try:
                        word_index(spec_like["timeline"], beat, x)
                    except Exception:
                        words = [w["t"] for w in next(b for b in spec_like["timeline"]["beats"] if b["id"] == beat)["words"]]
                        probs.append(f"{beat}:{path}.{k}={x!r} not found; words are {words}")
                else:
                    walk(beat, x, f"{path}.{k}")
        elif isinstance(v, list):
            for i, x in enumerate(v):
                walk(beat, x, f"{path}[{i}]")

    for s in scenes:
        walk(s["beat"], s.get("props") or {}, "props")
    return probs


def auto_storyboard(brief: dict) -> dict:
    """Deterministic fallback: hook → statement scenes → cta. Always valid, deliberately plain."""
    beats = brief["beats"]
    scenes = []
    for i, b in enumerate(beats):
        words = tokens_like_tts(b["text"])
        if i == 0:
            half = max(1, len(words) // 2)
            scenes.append({"beat": b["id"], "template": "hook_stamp", "style": "paper", "props": {"icon": "chip", "lines": [{"text": " ".join(words[:half]).rstrip(".,!?"), "at": 0}, {"text": " ".join(words[half:half + 3]).rstrip(".,!?") or "…", "at": half}]}})
        elif i == len(beats) - 1:
            scenes.append({"beat": b["id"], "template": "cta_end", "style": "apple", "props": {}})
        else:
            half = max(1, len(words) // 2)
            scenes.append({"beat": b["id"], "template": "statement", "style": ["apple", "data", "paper"][i % 3], "props": {"kicker": "", "lines": [{"text": " ".join(words[:half]).rstrip(".,!?"), "at": 0}, {"text": " ".join(words[half:]).rstrip(".,!?"), "at": half}], "highlight": {"text": words[-1].rstrip(".,!?"), "at": len(words) - 1}}})
    return {"style": "mix", "mood": "tech_pulse", "scenes": scenes, "reactions": [{"beat": beats[0]["id"], "word": min(3, len(tokens_like_tts(beats[0]["text"])) - 1), "pose": "shock", "dur": 1.1}]}
