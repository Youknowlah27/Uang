"""ContentStrategist — turns ideas + campaigns + measured insights into a 7-day calendar, per account and lane.
LLM proposes; deterministic code enforces lane/account consistency, capacity, CRP rules and variety. Fallback planner if the LLM fails."""
from __future__ import annotations

import json
from datetime import date, timedelta

import yaml

from ..schemas import PlanItem, PlanOut
from .base import Agent

HOOKS = ["curiosity_gap", "numbered", "contrarian", "question", "mid_action"]


def enforce(items: list[PlanItem], accounts: dict, capacity: dict, strategy: dict, days: list[str]) -> tuple[list[PlanItem], list[str]]:
    """Return (valid items, problems) — never raises."""
    ok: list[PlanItem] = []
    probs: list[str] = []
    per_day: dict[tuple, int] = {}
    last_hook: dict[str, str] = {}
    for it in items:
        acct = accounts.get(it.account)
        if not acct:
            probs.append(f"unknown account {it.account}")
            continue
        if acct["lane"] != it.lane:
            probs.append(f"{it.account} is a {acct['lane']} account, item lane {it.lane}")
            continue
        if it.day not in days:
            probs.append(f"{it.day} outside planning window")
            continue
        cap = capacity.get(it.account, {}).get("per_day", 1)
        if per_day.get((it.account, it.day), 0) >= cap:
            probs.append(f"{it.account} over capacity on {it.day}")
            continue
        if it.lane == "brand" and it.campaign_id:
            probs.append("brand item may not carry a campaign")
            continue
        if it.lane == "clipping" and not it.campaign_id:
            probs.append("clipping item needs campaign_id")
            continue
        if it.goal == "creator_rewards" and it.target_seconds < 61:
            it.target_seconds = 61
        if it.hook_type == last_hook.get(it.account):
            probs.append(f"{it.account}: repeated hook type {it.hook_type} back-to-back (varied)")
            it.hook_type = next(h for h in HOOKS if h != it.hook_type)
        last_hook[it.account] = it.hook_type
        per_day[(it.account, it.day)] = per_day.get((it.account, it.day), 0) + 1
        ok.append(it)
    return ok, probs


def fallback_plan(ideas: list[dict], campaigns: list[dict], accounts: dict, capacity: dict, days: list[str]) -> list[PlanItem]:
    out: list[PlanItem] = []
    ii = 0
    for d_i, day in enumerate(days):
        for name, a in accounts.items():
            for _ in range(capacity.get(name, {}).get("per_day", 1)):
                if a["lane"] == "brand" and ii < len(ideas):
                    idea = ideas[ii]; ii += 1
                    out.append(PlanItem(day=day, account=name, lane="brand", goal="reach", idea_id=idea["id"], target_seconds=35, hook_type=HOOKS[(d_i + ii) % len(HOOKS)], cta_type="follow", rationale=f"fallback: top-scored idea '{idea['title'][:50]}'"))
                elif a["lane"] == "clipping" and campaigns:
                    c = campaigns[(d_i + len(out)) % len(campaigns)]
                    out.append(PlanItem(day=day, account=name, lane="clipping", goal="campaign", campaign_id=c["id"], target_seconds=40, hook_type="curiosity_gap", cta_type="follow", rationale=f"fallback: campaign {c.get('brand')}"))
    return out


class StrategistAgent(Agent):
    name = "strategist"
    role = "Plans the next days: which topic/campaign, which account and format, which hook and CTA, and which experiment."

    def work(self, days: int = 7, start: str | None = None) -> dict:
        cfg = self.ctx.cfg
        start_d = date.fromisoformat(start) if start else date.today()
        window = [(start_d + timedelta(d)).isoformat() for d in range(days)]
        ideas = sorted(self.ctx.store.list("idea", "new"), key=lambda d: -d.get("score", 0))[:12]
        camps = sorted(self.ctx.store.list("campaign", ["accepted", "candidate"]), key=lambda d: -(d.get("score") or 0))[:6]
        strategy = yaml.safe_load((self.ctx.root / "knowledge" / "strategy.yaml").read_text())
        items: list[PlanItem] = []
        used_llm = False
        if self.ctx.llm:
            try:
                prompt = self.prompt("strategist") + "\n\nWINDOW: " + ", ".join(window) + "\nACCOUNTS: " + json.dumps({k: {"lane": v["lane"], "goal_default": v.get("goal_default")} for k, v in self.ctx.accounts.items()}) \
                    + "\nCAPACITY(per day): " + json.dumps(cfg["capacity"]) + "\nSTRATEGY: " + json.dumps(strategy)[:2500] \
                    + "\nIDEAS:\n" + "\n".join(f"- id={i['id']} score={i['score']} | {i['title']} | angle={i.get('angle', {}).get('angle', '')}" for i in ideas) \
                    + "\nCAMPAIGNS:\n" + "\n".join(f"- id={c['id']} brand={c['brand']} score={c.get('score')} flags={c.get('scoring', {}).get('flags')}" for c in camps)
                items = self.ctx.llm.json("strategist", "You are the head of content strategy for a business+tech short-video brand. Be skeptical and evidence-based.", prompt, PlanOut).items
                used_llm = True
            except Exception as e:  # noqa: BLE001
                self.log("warn", f"LLM planning failed, using fallback: {e!r}"[:300])
        if not items:
            items = fallback_plan(ideas, camps, self.ctx.accounts, cfg["capacity"], window)
        valid, probs = enforce(items, self.ctx.accounts, cfg["capacity"], strategy, window)
        if not valid:
            valid = fallback_plan(ideas, camps, self.ctx.accounts, cfg["capacity"], window)
            probs.append("LLM plan rejected entirely; fallback used")
        for n, it in enumerate(valid):
            pid = f"{it.day}-{it.account}-{n}"
            self.ctx.store.put("plan", pid, it.model_dump(), "planned")
        return {"planned": len(valid), "problems": len(probs), "llm": int(used_llm), "window": f"{window[0]}..{window[-1]}"}
