"""RulesWatcher — keeps the agency 'in the know': re-renders the official rule pages weekly, diffs against the last snapshot,
and raises an insight (and flags the affected KB rules) when the text changes. A human/LLM then updates rules/platform_rules.yaml."""
from __future__ import annotations

import difflib
import hashlib
import re
from datetime import datetime, timezone
from pathlib import Path

import yaml

from ..tools.render_fetch import fetch_text
from .base import Agent


def normalise(text: str) -> str:
    t = re.sub(r"\b(Last updated|FETCHED|Released|Effective)\b[^\n]*", "", text)
    return "\n".join(l.strip() for l in t.splitlines() if l.strip())


def diff_summary(old: str, new: str, limit: int = 40) -> list[str]:
    d = [l for l in difflib.unified_diff(old.splitlines(), new.splitlines(), lineterm="", n=0) if l[:1] in "+-" and not l.startswith(("+++", "---"))]
    return d[:limit]


class RulesWatcher(Agent):
    name = "rules_watcher"
    role = "Re-reads official platform/campaign rules and flags changes before they cost us monetisation."

    def work(self, fetcher=fetch_text, only: list[str] | None = None) -> dict:
        src = yaml.safe_load((self.ctx.root / "rules" / "sources.yaml").read_text())["sources"]
        snap_dir = self.ctx.root / "rules" / "snapshots"
        stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        changed, fetched, errors = [], 0, 0
        for s in src:
            if only and s["slug"] not in only:
                continue
            try:
                new = normalise(fetcher(s["url"]))
            except Exception as e:  # noqa: BLE001
                errors += 1
                self.log("warn", f"{s['slug']}: {e!r}"[:200])
                continue
            fetched += 1
            if len(new) < 500:  # login wall / empty render → don't trust
                self.log("warn", f"{s['slug']}: suspiciously short page ({len(new)} chars)")
                continue
            sha = hashlib.sha256(new.encode()).hexdigest()
            prev = self.ctx.store.get("rules_snapshot", s["slug"])
            old_path = snap_dir / f"{s['slug']}.txt"
            old = normalise(old_path.read_text()) if old_path.exists() else ""
            if prev is None and old:
                prev = {"sha": hashlib.sha256(old.encode()).hexdigest()}
            if prev and prev["sha"] != sha:
                dl = diff_summary(old, new)
                changed.append(s["slug"])
                self.ctx.store.put("insight", f"rules-{s['slug']}-{stamp}", {"kind": "rules_change", "slug": s["slug"], "url": s["url"], "platform": s["platform"], "affected_rules": s["rules"], "diff": dl}, "needs_review")
                hist = snap_dir / "history"
                hist.mkdir(exist_ok=True)
                if old:
                    (hist / f"{s['slug']}-{stamp}.txt").write_text(old)
            old_path.write_text(f"SOURCE: {s['url']}\nFETCHED: {stamp}\nCHARS: {len(new)}\n\n{new}\n")
            self.ctx.store.put("rules_snapshot", s["slug"], {"sha": sha, "fetched": stamp, "chars": len(new)}, "ok")
        return {"checked": fetched, "errors": errors, "changed": len(changed), "changed_slugs": ",".join(changed)}
