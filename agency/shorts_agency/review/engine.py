"""Content Manager: runs every applicable rule from the KB against a video package → Review(verdict, score, findings)."""
from __future__ import annotations

from ..models import Finding, Review
from . import checks as C
from .rules import Rule, load_rules

WEIGHT = {"block": 30, "warn": 8, "info": 0}


def review(spec: dict, ctx: dict | None = None, rules: list[Rule] | None = None) -> Review:
    """ctx keys: history, accounts, publisher, campaign, audio_report, safezone (SafeZoneReport)."""
    ctx = dict(ctx or {})
    ctx["spec"] = spec
    rules = rules if rules is not None else load_rules()
    platforms, lane, goal = spec.get("platforms", []), spec.get("lane", "brand"), spec.get("goal", "reach")
    findings: list[Finding] = []
    seen: set[tuple] = set()
    for r in rules:
        if not r.applies(platforms, lane, goal) or r.check == "manual":
            continue
        fn = C.CHECKS.get(r.check)
        if fn is None:
            findings.append(Finding(rule_id=r.id, check=r.check, severity="warn", passed=False, message=f"no implementation for check '{r.check}'", confidence=r.confidence))
            continue
        key = (r.check, r.severity if r.check not in ("metadata.limits",) else r.id)
        passed, msg, fix, ev = fn(ctx)
        sev = ev.pop("_severity", r.severity)
        # same check fired by several rules: report once per (check) unless it fails with a different severity
        if (r.check, passed) in seen and passed:
            continue
        seen.add((r.check, passed))
        findings.append(Finding(rule_id=r.id, check=r.check, severity=sev if not passed else r.severity, passed=passed, message=msg, fix=fix, evidence=ev, confidence=r.confidence))
    if ctx.get("campaign") is not None and not any(f.check == "campaign.requirements" for f in findings):  # a campaign attached to the video always applies
        passed, msg, fix, ev = C.CHECKS["campaign.requirements"](ctx)
        findings.append(Finding(rule_id="clip.campaign_terms", check="campaign.requirements", severity="block", passed=passed, message=msg, fix=fix, evidence=ev, confidence="official"))
    score = 100 - sum(WEIGHT[f.severity] for f in findings if not f.passed)
    score = max(0, score)
    blocks = [f for f in findings if not f.passed and f.severity == "block"]
    warns = [f for f in findings if not f.passed and f.severity == "warn"]
    verdict = "BLOCK" if blocks else ("REVISE" if warns else "PASS")
    n_pass = sum(1 for f in findings if f.passed)
    summary = f"{verdict}: {n_pass}/{len(findings)} checks passed, {len(blocks)} blocking, {len(warns)} warning(s), score {score}/100"
    return Review(video_id=spec["id"], verdict=verdict, score=score, findings=findings, summary=summary)


def render_markdown(rv: Review) -> str:
    icon = {"PASS": "✅", "REVISE": "🟡", "BLOCK": "⛔"}[rv.verdict]
    lines = [f"# Review — {rv.video_id}", f"**{icon} {rv.summary}**", ""]
    for sev, title in (("block", "Blocking"), ("warn", "Warnings")):
        bad = [f for f in rv.findings if not f.passed and f.severity == sev]
        if bad:
            lines.append(f"## {title}")
            for f in bad:
                lines.append(f"- `{f.rule_id}` {f.message}" + (f"  \n  → **Fix:** {f.fix}" if f.fix else ""))
            lines.append("")
    lines.append("## Passed")
    for f in rv.findings:
        if f.passed:
            lines.append(f"- ✅ `{f.rule_id}` {f.message}")
    if rv.editorial:
        lines += ["", "## Editorial notes"] + [f"- {n}" for n in rv.editorial]
    return "\n".join(lines)
