"""Showrunner — the manager. Runs every agent concurrently on its own cadence and pushes each plan item through
Writer → Director → Producer → Reviewer (→ revise loops) → human approval (Notion) → Publisher."""
from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path

from .agents.analyst import AnalystAgent
from .agents.base import Ctx
from .agents.director import DirectorAgent
from .agents.producer import ProducerAgent, assemble_brief
from .agents.publisher import PublisherAgent
from .agents.reviewer import ReviewerAgent
from .agents.rules_watcher import RulesWatcher
from .agents.scout import ScoutAgent
from .agents.strategist import StrategistAgent
from .agents.trend import TrendAgent
from .agents.writer import WriterAgent
from .produce import resolve
from .templates import validate_refs


class Showrunner:
    def __init__(self, ctx: Ctx):
        self.ctx = ctx
        self.trend, self.scout, self.strategist = TrendAgent(ctx), ScoutAgent(ctx), StrategistAgent(ctx)
        self.writer, self.director, self.producer = WriterAgent(ctx), DirectorAgent(ctx), ProducerAgent(ctx)
        self.reviewer, self.publisher, self.analyst, self.rules = ReviewerAgent(ctx), PublisherAgent(ctx), AnalystAgent(ctx), RulesWatcher(ctx)
        self.llm_slots = asyncio.Semaphore(2)      # LLM-bound agents may run 2 at a time
        self.render_slot = asyncio.Semaphore(1)    # rendering is CPU-bound: one at a time

    async def produce_item(self, plan_id: str) -> str:
        """One plan item → a reviewed video awaiting YOUR approval."""
        plan = self.ctx.store.get("plan", plan_id)
        if plan["lane"] == "clipping":
            self.ctx.store.put("video", plan_id, {"title": f"Clip for campaign {plan.get('campaign_id')}", "account": plan["account"], "lane": "clipping", "goal": "campaign", "campaign_id": plan.get("campaign_id")}, "needs_footage")
            return plan_id
        max_loops = self.ctx.cfg["review"]["max_revision_loops"]
        feedback: dict[str, list[str]] = {}
        writer = director = None
        platforms = sorted(self.ctx.accounts[plan["account"]].get("handles", {}))
        for attempt in range(max_loops + 1):
            async with self.llm_slots:
                if writer is None or feedback.get("writer"):
                    writer = await self.writer.run(plan_id=plan_id, feedback=feedback.get("writer"), previous=writer)
                    director = None
                if director is None or feedback.get("director"):
                    director = await self.director.run(brief=writer, feedback=feedback.get("director"))
            brief = assemble_brief(plan_id, writer, director, plan, self.ctx.accounts, platforms)
            brief["hook_type"] = writer.get("hook_type", plan.get("hook_type"))
            out_dir = self.ctx.workdir / plan_id
            async with self.render_slot:
                spec = await asyncio.to_thread(resolve.resolve, brief, out_dir)     # voice first → real word timings
                probs = validate_refs(spec, brief["scenes"])
                if probs:
                    feedback = {"director": probs}
                    director = None
                    async with self.llm_slots:
                        director = await self.director.run(brief=writer, feedback=probs, timeline=spec["timeline"])
                    brief = assemble_brief(plan_id, writer, director, plan, self.ctx.accounts, platforms)
                art = await self.producer.run(brief=brief, reuse_voice=True)
            self.ctx.store.put("video", plan_id, {"title": writer["title"], "account": plan["account"], "lane": plan["lane"], "goal": plan["goal"], "hook_type": writer.get("hook_type"),
                                                  "out_dir": art["out_dir"], "spec": art["spec"], "video": art.get("video", ""), "brief": brief}, "produced")
            rv = await self.reviewer.run(video_id=plan_id)
            if rv["verdict"] == "PASS" or attempt == max_loops:
                break
            fixes = self.ctx.store.get("video", plan_id)["fixes"]
            feedback = {}
            for f in fixes:
                feedback.setdefault(f["owner"], []).append(f"{f['rule']}: {f['message']} → {f['fix']}")
            feedback.pop("human", None)
            if not feedback:
                break
        return plan_id

    async def approve(self, video_id: str, publish_at: str | None = None) -> dict:
        self.ctx.store.set_status("video", video_id, "approved", scheduled_for=publish_at)
        return await self.publisher.run(video_id=video_id)

    async def daemon(self, once: bool = False) -> None:  # pragma: no cover  (long-running loop; exercised manually)
        sch = self.ctx.cfg["schedule"]

        async def loop(fn, every_h: float, **kw):
            while True:
                try:
                    await fn(**kw)
                except Exception as e:  # noqa: BLE001
                    self.ctx.store.log("showrunner", "error", repr(e))
                if once:
                    return
                await asyncio.sleep(every_h * 3600)

        async def producer_worker():
            while True:
                todo = self.ctx.store.list("plan", "planned")
                await asyncio.gather(*[self._take(p["_id"]) for p in todo[:3]])
                if once:
                    return
                await asyncio.sleep(120)

        await asyncio.gather(loop(self.trend.run, sch["trend_every_h"]), loop(self.scout.run, sch["scout_every_h"]), loop(self.strategist.run, 24), loop(self.analyst.run, 24),
                             loop(self.rules.run, 24 * 7), producer_worker())

    async def _take(self, plan_id: str) -> None:
        self.ctx.store.set_status("plan", plan_id, "in_production")
        try:
            await self.produce_item(plan_id)
            self.ctx.store.set_status("plan", plan_id, "done")
        except Exception as e:  # noqa: BLE001
            self.ctx.store.set_status("plan", plan_id, "failed", error=repr(e)[:300])
