"""Word/cue time resolution. MUST stay behaviour-identical to studio/src/lib/timeline.tsx (parity test in tests/)."""
from __future__ import annotations

import re
from typing import Any

LEAD = 0.12


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9%$.]", "", s.lower())


def beat_of(timeline: dict, beat_id: str) -> dict:
    for b in timeline["beats"]:
        if b["id"] == beat_id:
            return b
    raise KeyError(f"beat {beat_id!r} not in timeline")


def word_index(timeline: dict, beat_id: str, ref: Any) -> int:
    b = beat_of(timeline, beat_id)
    n = len(b["words"])
    if ref is None:
        return 0
    if isinstance(ref, (int, float)) and not isinstance(ref, bool):
        return max(0, min(n - 1, int(ref)))
    prefix = str(ref).endswith("*")
    key = norm(str(ref)[:-1] if prefix else str(ref))
    for i, w in enumerate(b["words"]):
        nw = norm(w["t"])
        if (nw.startswith(key) if prefix else (nw == key or key in nw)):
            return i
    raise ValueError(f"unresolved word ref {ref!r} in beat {beat_id!r} (words: {[w['t'] for w in b['words']]})")


def word_time(timeline: dict, beat_id: str, ref: Any = None) -> float:
    b = beat_of(timeline, beat_id)
    return b["words"][word_index(timeline, beat_id, ref)]["s"]


def cue_time(timeline: dict, cue: dict) -> float:
    t = float(cue.get("at", 0.0))
    if cue.get("beat"):
        t = beat_of(timeline, cue["beat"])["start"] if cue.get("word") is None else word_time(timeline, cue["beat"], cue["word"])
    return t + float(cue.get("offset", 0.0))


def scene_start(timeline: dict, beat_id: str) -> float:
    return max(0.0, beat_of(timeline, beat_id)["start"] - LEAD)
