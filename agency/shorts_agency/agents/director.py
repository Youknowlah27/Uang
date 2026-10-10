"""Director — script beats → scene plan (template, style, props with word refs), mascot reactions and music mood.
Validated against the template catalogue; falls back to a plain deterministic storyboard rather than failing."""
from __future__ import annotations

import json

from ..schemas import DirectorOut
from ..templates import CATALOG, auto_storyboard, validate_refs, validate_scenes
from .base import Agent


class DirectorAgent(Agent):
    name = "director"
    role = "Chooses visual templates, styles, mascot reactions and music mood for each beat."

    def work(self, brief: dict, feedback: list[str] | None = None, timeline: dict | None = None) -> dict:
        beats = brief["beats"]
        last: list[str] = list(feedback or [])
        out: DirectorOut | None = None
        used_fallback = False
        catalog = json.dumps({k: {"use": v["use"], "props": v["props"], "required": v["required"]} for k, v in CATALOG.items()}, indent=1)
        for attempt in range(3):
            prompt = (self.prompt("director") + "\n\nTEMPLATE_CATALOG:\n" + catalog + "\n\nBEATS:\n" + "\n".join(f"- {b['id']}: {b['text']}" for b in beats)
                      + "\nCLAIMS (to show on screen):\n" + "\n".join(f"- [{c['scene']}] {c['text']}" for c in brief.get("claims", []))
                      + (("\n\nFIX THESE PROBLEMS:\n- " + "\n- ".join(last)) if last else ""))
            try:
                out = self.ctx.llm.json("director", "You are an art director for vertical motion-graphics shorts. Output JSON only.", prompt, DirectorOut)
            except Exception as e:  # noqa: BLE001
                last = [f"invalid JSON/schema: {e}"[:400]]
                continue
            scenes = [s.model_dump() for s in out.scenes]
            last = validate_scenes([{"id": b["id"]} for b in beats], scenes)
            if timeline and not last:
                last = validate_refs({"timeline": timeline}, scenes)
            if not last:
                break
        if out is None or last:
            self.log("warn", f"director fell back to plain storyboard: {last[:2]}")
            sb = auto_storyboard(brief)
            used_fallback = True
        else:
            sb = {"style": out.style, "mood": out.mood, "scenes": [s.model_dump() for s in out.scenes], "reactions": [r.model_dump() for r in out.reactions]}
        sb["fallback"] = used_fallback
        return sb
