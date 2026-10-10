"""brief.json (authored by the Director) -> spec.json (everything Remotion + mixer need)."""
from __future__ import annotations

import json
from pathlib import Path

from . import cuegen, voice


def resolve(brief: dict, out_dir: Path, style_override: str | None = None, with_voice: bool = True) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    v = brief.get("voice", {})
    res = voice.synthesize(brief["beats"], v.get("name", "en-US-AndrewNeural"), v.get("rate", "+5%"), out_dir)
    tl = res["timeline"]
    spec = {
        "id": brief["id"], "title": brief["title"], "style": style_override or brief.get("style", "apple"), "mood": brief.get("mood", "tech_pulse"),
        "goal": brief.get("goal", "reach"), "lane": brief.get("lane", "brand"), "account": brief.get("account", "brand"),
        "platforms": brief.get("platforms", []), "timeline": tl, "envelope": res["envelope"], "scenes": brief["scenes"],
        "cta": brief["cta"], "mascot": brief.get("mascot", {"host": True, "reactions": []}),
        "claims": brief.get("claims", []), "analysis_points": brief.get("analysis_points", []), "post": brief.get("post", {}),
        "captionSkin": "house" if (style_override or brief.get("style")) == "mix" else "pack",
    }
    spec["cues"] = brief.get("cues") or cuegen.generate(brief, tl)
    return spec


def write(spec: dict, out_dir: Path) -> Path:
    p = out_dir / "spec.json"
    p.write_text(json.dumps(spec, indent=1))
    return p


def refresh(spec: dict, brief: dict) -> dict:
    """Re-apply the authored parts of a brief (scenes, cta, mascot, claims, post, cues) onto an existing spec
    WITHOUT re-synthesising the voice. Only valid while the beats' text/timing are unchanged."""
    spec["scenes"] = brief["scenes"]
    spec["cta"] = brief["cta"]
    spec["mascot"] = brief.get("mascot", spec["mascot"])
    spec["claims"] = brief.get("claims", [])
    spec["analysis_points"] = brief.get("analysis_points", [])
    spec["post"] = brief.get("post", {})
    spec["style"] = brief.get("style", spec["style"])
    spec["cues"] = brief.get("cues") or cuegen.generate(brief, spec["timeline"])
    return spec
