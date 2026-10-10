"""Analyst — closes the loop: metrics in → what works / what doesn't / why (with honest confidence) → strategy.yaml + insight note."""
from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import yaml

from .. import analytics
from ..schemas import InsightOut
from .base import Agent


class AnalystAgent(Agent):
    name = "analyst"
    role = "Reads performance, explains winners and losers, updates the copy strategy."

    def join(self, rows: list[dict]) -> list[dict]:
        vids = self.ctx.store.list("video")
        by_id = {v["_id"]: v for v in vids}
        by_title = {v.get("title", "").lower(): v for v in vids}
        joined = []
        for r in rows:
            v = by_id.get(r.get("video_id") or "") or by_title.get((r.get("title") or "").lower())
            if not v and r.get("title"):
                v = next((x for k, x in by_title.items() if k and k in r["title"].lower()), None)
            if not v or not v.get("spec"):
                continue
            spec = json.loads(Path(v["spec"]).read_text())
            r["video_id"] = v["_id"]
            r["attrs"] = analytics.attributes({**spec, "hook_type": v.get("hook_type", spec.get("hook_type", "unknown"))})
            joined.append(r)
        return joined

    def work(self, csv_paths: dict[str, str] | None = None, rows: list[dict] | None = None) -> dict:
        if rows is None:
            rows = []
            for plat, p in (csv_paths or {}).items():
                rows += analytics.load_csv(Path(p), plat)
            rows = self.join(rows)
        if len(rows) < 3:
            return {"posts": len(rows), "note": "need >= 3 matched posts"}
        res = analytics.analyse(rows)
        today = date.today().isoformat()
        narrative = None
        if self.ctx.llm:
            try:
                msg = self.prompt("analyst") + "\n\nRESULT JSON:\n" + json.dumps({k: res[k] for k in ("n", "winners", "losers", "effects", "caveats", "baseline")})[:7000]
                narrative = self.ctx.llm.json("analyst", "You are a rigorous growth analyst. Never claim causality the data cannot support.", msg, InsightOut)
            except Exception as e:  # noqa: BLE001
                self.log("warn", f"narrative failed: {e!r}"[:200])
        sp = self.ctx.root / "knowledge" / "strategy.yaml"
        strategy = yaml.safe_load(sp.read_text())
        changes = analytics.apply_to_strategy(strategy, res, today)
        if changes:
            sp.write_text(yaml.safe_dump(strategy, sort_keys=False, allow_unicode=True))
        d = self.ctx.root / "knowledge" / "insights"
        d.mkdir(parents=True, exist_ok=True)
        md = [f"# Insights {today} (n={res['n']})", "", *[f"> ⚠ {c}" for c in res["caveats"]], ""]
        if narrative:
            for title, items in (("What works", narrative.works), ("What fails", narrative.fails), ("Why (hypotheses)", narrative.why), ("Improve next", narrative.improve), ("Copy-strategy updates", narrative.copy_updates)):
                md += [f"## {title}"] + [f"- {i}" for i in items] + [""]
            md.append(f"Confidence: **{narrative.confidence}**\n")
        md += ["## Effects (bootstrap, 90% CI)", "| attribute | value | n | lift | verdict |", "|---|---|---|---|---|"] + [f"| {e['attr']} | {e['value']} | {e['n']} | {e['lift_vs_rest']:+.0%} | {e['verdict']} |" for e in res["effects"][:20]]
        if changes:
            md += ["", "## strategy.yaml changes"] + [f"- {c}" for c in changes]
        (d / f"{today}.md").write_text("\n".join(md))
        self.ctx.store.put("insight", today, {"result": res, "changes": changes, "narrative": narrative.model_dump() if narrative else None}, "new")
        return {"posts": res["n"], "effects": len(res["effects"]), "strategy_changes": len(changes), "report": str(d / f"{today}.md")}
