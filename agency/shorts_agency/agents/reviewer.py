"""ContentManager — the gate before the human. Runs the policy engine (rules KB → code), adds an LLM editorial read,
writes review.md/review.json and moves the video to awaiting_approval / needs_revision / blocked."""
from __future__ import annotations

import json
from pathlib import Path

from ..models import Campaign, Finding
from ..review import engine, safezone
from ..review.checks import fingerprint
from ..schemas import EditorialOut
from .base import Agent

CHECK_OWNER = {  # who must fix a failed check
    "writer": ("cta.", "caption.", "metadata.", "hook.", "claims.", "originality.analysis", "crp.duration", "campaign."),
    "director": ("safezone.", "crp.no_text", "originality.template"),
    "producer": ("audio.",),
}


def owner_of(check: str) -> str:
    for who, prefixes in CHECK_OWNER.items():
        if check.startswith(prefixes):
            return who
    return "human"


class ReviewerAgent(Agent):
    name = "reviewer"
    role = "Content manager: checks every rule in code, reads the script critically, and decides PASS / REVISE / BLOCK."

    def history(self, account: str, exclude: str) -> list[dict]:
        window = self.ctx.cfg["review"]["history_window"]
        vids = [v for v in self.ctx.store.list("video", ["awaiting_approval", "approved", "ready_to_post", "scheduled", "published"]) if v.get("account") == account and v["_id"] != exclude]
        return [{"id": v["_id"], "fingerprint": v["fingerprint"]} for v in vids[:window] if v.get("fingerprint")]

    def work(self, video_id: str) -> dict:
        v = self.ctx.store.get("video", video_id)
        out_dir = Path(v["out_dir"])
        spec = json.loads(Path(v["spec"]).read_text())
        audio = json.loads((out_dir / "audio.report.json").read_text()) if (out_dir / "audio.report.json").exists() else None
        sz = safezone.analyse(out_dir / "lint.json", spec=spec) if (out_dir / "lint.json").exists() else None
        camp = None
        if v.get("campaign_id"):
            cd = self.ctx.store.get("campaign", v["campaign_id"])
            camp = Campaign(**{k: x for k, x in (cd or {}).items() if k in Campaign.model_fields}) if cd else None
        ctx = {"accounts": self.ctx.accounts, "publisher": self.ctx.cfg["publisher"], "audio_report": audio, "safezone": sz, "history": self.history(v["account"], video_id), "campaign": camp}
        rv = engine.review(spec, ctx)

        if self.ctx.llm is not None and rv.verdict != "BLOCK":
            try:
                post = spec.get("post", {})
                msg = (self.prompt("editorial") + "\n\nSCRIPT:\n" + "\n".join(f"[{b['id']}] {b['text']}" for b in spec["timeline"]["beats"])
                       + f"\n\nCAPTION: {post.get('caption')}\nHASHTAGS: {post.get('hashtags')}\nCTA: {spec['cta']}\nANALYSIS: {spec.get('analysis_points')}")
                ed = self.ctx.llm.json("editorial", "You are a skeptical editor of business/tech short videos.", msg, EditorialOut)
                rv.editorial = [f"hook {ed.hook_score}/10 · clarity {ed.clarity_score}/10"] + ed.notes + [f"risk: {r}" for r in ed.risks]
                if ed.hook_score < 6 or ed.clarity_score < 6:
                    rv.findings.append(Finding(rule_id="edit.quality", check="editorial.quality", severity="warn", passed=False, message=f"editor scores low (hook {ed.hook_score}, clarity {ed.clarity_score})", fix="; ".join(ed.notes[:2]), confidence="internal"))
                    rv.score = max(0, rv.score - 8)
                    if rv.verdict == "PASS":
                        rv.verdict = "REVISE"
            except Exception as e:  # noqa: BLE001
                rv.editorial = [f"(editorial skipped: {str(e)[:120]})"]
        md = engine.render_markdown(rv)
        (out_dir / "review.md").write_text(md)
        (out_dir / "review.json").write_text(rv.model_dump_json(indent=1))
        status = {"PASS": "awaiting_approval", "REVISE": "needs_revision", "BLOCK": "blocked"}[rv.verdict]
        fails = [f for f in rv.findings if not f.passed]
        self.ctx.store.set_status("video", video_id, status, verdict=rv.verdict, score=rv.score, fingerprint=fingerprint(spec), review_md=str(out_dir / "review.md"),
                                  fixes=[{"owner": owner_of(f.check), "rule": f.rule_id, "message": f.message, "fix": f.fix, "severity": f.severity} for f in fails])
        return {"verdict": rv.verdict, "score": rv.score, "failed": len(fails)}
