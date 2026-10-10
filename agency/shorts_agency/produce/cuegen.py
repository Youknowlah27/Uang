"""Default sound-design + VFX cue generator. One list of cues drives BOTH the Python mixer (sfx) and Remotion (vfx)."""
from __future__ import annotations

from .timeline import beat_of, scene_start, word_time


def _c(beat, word=None, **kw):
    d = {"beat": beat}
    if word is not None:
        d["word"] = word
    d.update(kw)
    return d


def generate(brief: dict, timeline: dict) -> list[dict]:
    cues: list[dict] = []
    prev_style = None
    for i, sc in enumerate(brief["scenes"]):
        b, tpl, p = sc["beat"], sc["template"], sc.get("props", {})
        style = sc.get("style")
        if i > 0:
            cues.append({"at": scene_start(timeline, b), "sfx": "whoosh_soft", "gain": 0.55, "vfx": "speed" if style != prev_style else None, "dur": 0.35})
            if style != prev_style:
                cues.append({"at": scene_start(timeline, b), "vfx": "leak", "dur": 0.5})
        prev_style = style
        if tpl == "hook_stamp":
            if p.get("kicker"):
                cues.append(_c(b, p["kicker"]["at"], sfx="pop_hi", gain=0.8))
            for ln in p.get("lines", []):
                cues.append(_c(b, ln["at"], sfx="pop", gain=0.9))
            if p.get("strike"):
                cues.append(_c(b, p["strike"]["at"], sfx="slash", offset=0.08))
            if p.get("stamp"):
                cues.append(_c(b, p["stamp"]["at"], sfx="stamp", offset=-0.05, vfx="shake", dur=0.4, intensity=1.0))
                cues.append(_c(b, p["stamp"]["at"], vfx="flash", dur=0.18, offset=-0.05))
        elif tpl == "cards":
            for it in p.get("items", []):
                cues.append(_c(b, it["at"], sfx="pop", gain=0.9))
            if p.get("check_at") is not None:
                cues.append(_c(b, p["check_at"], sfx="ding", gain=0.5, offset=0.1))
        elif tpl == "share":
            cues.append(_c(b, p["at"], sfx="riser", dur=0.9, offset=-0.15, gain=0.7))
            cues.append(_c(b, p["at"], sfx="ding", offset=0.75, gain=0.8, vfx="punch", dur=0.3))
            for lg in p.get("legend", []):
                cues.append(_c(b, lg["at"], sfx="click", gain=0.7))
            if p.get("secondary"):
                cues.append(_c(b, p["secondary"]["at"], sfx="click", gain=0.7))
        elif tpl == "milestone":
            if p.get("lead"):
                cues.append(_c(b, p["lead"]["at"], sfx="swipe", gain=0.6))
            if p.get("year"):
                cues.append(_c(b, p["year"]["at"], sfx="impact", gain=0.8, vfx="punch", dur=0.3))
            if p.get("label"):
                cues.append(_c(b, p["label"]["at"], sfx="click", gain=0.6))
            if p.get("keyword"):
                cues.append(_c(b, p["keyword"]["at"], sfx="impact", gain=0.9, offset=-0.04, vfx="flash", dur=0.18))
                cues.append(_c(b, p["keyword"]["at"], vfx="sparks", dur=0.8, offset=0.0))
            if p.get("code"):
                t0 = word_time(timeline, b, p.get("code_from", 0))
                t1 = word_time(timeline, b, p.get("code_to", 0)) + 0.4
                cues.append({"at": t0, "sfx": "type_run", "dur": max(0.6, t1 - t0), "gain": 0.45})
        elif tpl == "count_grid":
            cues.append(_c(b, p["at"], sfx="tick_run", dur=0.9, gain=0.6, offset=-0.05))
            cues.append(_c(b, p["at"], sfx="ding", offset=1.0, gain=0.8, vfx="confetti", dur=1.2))
        elif tpl == "switch_cost":
            if p.get("arrow") is not None:
                cues.append(_c(b, p["arrow"], sfx="swipe", gain=0.6))
            if p.get("fill") is not None:
                cues.append(_c(b, p["fill"], sfx="tick_run", dur=0.6, gain=0.5, offset=-0.05))
            for r in p.get("rows", []):
                cues.append(_c(b, r["at"], sfx="click", gain=0.7))
            if p.get("stamp"):
                cues.append(_c(b, p["stamp"]["at"], sfx="stamp", gain=0.9, offset=0.05, vfx="shake", dur=0.35, intensity=0.8))
        elif tpl == "statement":
            if p.get("strike"):
                cues.append(_c(b, p["strike"]["at"], sfx="slash", offset=0.08))
            if p.get("highlight"):
                cues.append(_c(b, p["highlight"]["at"], sfx="impact", gain=0.9, offset=-0.04, vfx="punch", dur=0.3))
                cues.append(_c(b, p["highlight"]["at"], vfx="sparks", dur=0.8))
        elif tpl == "cta_end":
            t = scene_start(timeline, b) + 0.15
            cues.append({"at": t, "sfx": "ding", "gain": 0.9, "vfx": "confetti", "dur": 1.4})
            cues.append({"at": t + 0.35, "sfx": "pop_hi", "gain": 0.8})
    for r in (brief.get("mascot", {}) or {}).get("reactions", []):
        cues.append(_c(r["beat"], r.get("word"), sfx="pop_hi", gain=0.7, offset=-0.03))
    for c in cues:
        for k in [k for k, v in c.items() if v is None]:
            del c[k]
    # sanity: every referenced beat exists
    for c in cues:
        if "beat" in c:
            beat_of(timeline, c["beat"])
    return sorted(cues, key=lambda c: (c.get("at", 0) if "at" in c and "beat" not in c else 0))
