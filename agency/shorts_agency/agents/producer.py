"""Producer — deterministic: voice (TTS) → mix (music+SFX) → safe-zone lint → render → mux.  Heavy; the Showrunner serialises it."""
from __future__ import annotations

from pathlib import Path

from ..produce import pipeline
from .base import Agent


def assemble_brief(plan_id: str, writer: dict, director: dict, plan: dict, accounts: dict, platforms: list[str]) -> dict:
    cta = writer["cta"]
    return {
        "id": plan_id, "title": writer["title"], "account": plan["account"], "lane": plan["lane"], "goal": plan["goal"], "platforms": platforms,
        "style": director["style"], "mood": director["mood"], "voice": {"name": "en-US-AndrewNeural", "rate": "+5%"},
        "beats": writer["beats"], "scenes": director["scenes"], "cta": cta,
        "mascot": {"host": True, "reactions": director["reactions"]}, "claims": writer["claims"], "analysis_points": writer["analysis_points"], "post": writer["post"],
    }


class ProducerAgent(Agent):
    name = "producer"
    role = "Renders the video: voice-over, music, SFX, visual effects, safe-zone lint."

    def work(self, brief: dict, style: str | None = None, **kw) -> dict:
        out_dir = self.ctx.workdir / brief["id"]
        art = pipeline.produce(brief, out_dir, style=style or brief.get("style", "mix"), reuse_voice=kw.get("reuse_voice", False), do_lint=True, do_render=kw.get("render", True))
        return {"out_dir": str(out_dir), **{k: v for k, v in art.items() if isinstance(v, (str, dict))}}
