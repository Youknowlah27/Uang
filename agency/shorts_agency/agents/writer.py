"""ScriptWriter — plan item + evidence → Brief (script beats, analysis, sourced claims, CTA, caption/hashtags/tags). Validated; retries with feedback."""
from __future__ import annotations

import json
import re

import yaml

from ..schemas import WriterOut
from .base import Agent

GREETING = re.compile(r"^\s*(hey|hi|hello|welcome|in this video|today we)", re.I)
BANNED = re.compile(r"\b(guaranteed|will (crash|moon|explode)|price target|financial advice|cure[sd]?)\b", re.I)
GENERIC_TAGS = {"#fyp", "#viral", "#foryou", "#foryoupage", "#trending"}


def validate(out: WriterOut, plan: dict, evidence_urls: set[str], strategy: dict) -> list[str]:
    p: list[str] = []
    words = sum(len(b.text.split()) for b in out.beats)
    target = plan["target_seconds"] * 2.7
    if not (0.8 * target <= words <= 1.2 * target):
        p.append(f"script has {words} words; target ≈{int(target)} (±20%) for {plan['target_seconds']}s")
    if GREETING.search(out.beats[0].text):
        p.append("hook opens with a greeting")
    if out.beats[-1].id != "cta":
        p.append("last beat id must be 'cta'")
    ids = [b.id for b in out.beats]
    if len(set(ids)) != len(ids):
        p.append("duplicate beat ids")
    if out.cta.type != plan["cta_type"]:
        p.append(f"cta.type must be {plan['cta_type']}")
    tags = out.post.hashtags
    if not 3 <= len(tags) <= 5:
        p.append("hashtags must be 3-5")
    if any(t.lower() in GENERIC_TAGS for t in tags):
        p.append("generic hashtags not allowed")
    cap_max = strategy.get("copy", {}).get("caption_max_chars", 450)
    if len(out.post.caption) > cap_max:
        p.append(f"caption {len(out.post.caption)} > {cap_max} chars")
    for c in out.claims:
        if evidence_urls and c.source not in evidence_urls:
            p.append(f"claim source not in EVIDENCE: {c.source}")
    if BANNED.search(" ".join(b.text for b in out.beats) + " " + out.post.caption):
        p.append("banned phrasing (prediction/advice/guarantee)")
    if plan["cta_type"] == "comment" and not out.cta.keyword:
        p.append("comment CTA needs cta.keyword")
    if plan["cta_type"] == "link" and not out.post.link_in_bio:
        p.append("link CTA needs post.link_in_bio")
    return p


class WriterAgent(Agent):
    name = "writer"
    role = "Writes the script, original analysis, sourced claims, CTA, caption, hashtags and tag suggestions."

    def work(self, plan_id: str, feedback: list[str] | None = None, previous: dict | None = None) -> dict:
        plan = self.ctx.store.get("plan", plan_id)
        idea = self.ctx.store.get("idea", plan["idea_id"]) if plan.get("idea_id") else None
        strategy = yaml.safe_load((self.ctx.root / "knowledge" / "strategy.yaml").read_text())
        evidence = idea["evidence"] if idea else []
        evidence_urls = {e["url"] for e in evidence if e.get("url")} | set(plan.get("extra_sources", []))
        platforms = sorted(set().union(*[set(a.get("handles", {})) for n, a in self.ctx.accounts.items() if n == plan["account"]])) or ["tiktok", "instagram", "youtube"]
        ctx_block = (f"PLAN: {json.dumps({k: v for k, v in plan.items() if not k.startswith('_')})}\nPLATFORMS: {platforms}\nCAPTION_MAX: {strategy['copy']['caption_max_chars']}\nTARGET_SECONDS: {plan['target_seconds']}\n"
                     f"TOPIC: {idea['title'] if idea else ''}\nANGLE: {json.dumps((idea or {}).get('angle', {}))}\nEVIDENCE (the only allowed claim sources):\n" + "\n".join(f"- {e['title']} | {e['url']}" for e in evidence)
                     + f"\nTONE/COPY RULES: {strategy['copy']['tone']}; avoid hooks: {strategy['hooks']['avoid']}")
        if idea and idea.get("research_notes"):
            ctx_block += "\n\nRESEARCH NOTES (from Gemini Deep Research; URLs in them are allowed claim sources):\n" + idea["research_notes"][:4500]
        if previous:
            ctx_block += "\n\nPREVIOUS DRAFT (revise it, keep what works):\n" + json.dumps(previous)[:5000]
        if feedback:
            ctx_block += "\n\nREVIEW FEEDBACK TO FIX:\n- " + "\n- ".join(feedback)
        last: list[str] = []
        out = None
        for attempt in range(3):
            msg = self.prompt("writer") + "\n\n" + ctx_block + (("\n\nVALIDATION ERRORS TO FIX:\n- " + "\n- ".join(last)) if last else "")
            out = self.ctx.llm.json("writer", "You are a senior short-form scriptwriter. Output JSON only.", msg, WriterOut)
            last = validate(out, plan, evidence_urls, strategy)
            if not last:
                break
        brief = out.model_dump()
        brief["validation_problems"] = last
        brief["plan_id"] = plan_id
        return brief
