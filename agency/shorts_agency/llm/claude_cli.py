"""Headless Claude Code (`claude -p`) provider. Lean flags: no tools, no MCP, no settings, no session files
→ ~1.2k tokens of overhead per call instead of ~45k (measured 2026-10-10). Uses the logged-in subscription."""
from __future__ import annotations

import json
import shutil
import subprocess
import threading

from .base import JSONMixin, LLMError


class ClaudeCLI(JSONMixin):
    name = "claude_cli"

    def __init__(self, model: str | None = None, timeout: int = 300, binary: str = "claude"):
        self.model, self.timeout, self.binary = model, timeout, binary
        self.calls = 0
        self.cost_usd = 0.0
        self._lock = threading.Lock()
        if shutil.which(binary) is None:
            raise LLMError("`claude` CLI not found on PATH (install Claude Code and run `claude login`)")

    def complete(self, system: str, prompt: str, *, task: str = "", model: str | None = None) -> str:
        cmd = [self.binary, "-p", prompt, "--output-format", "json", "--tools", "", "--no-session-persistence", "--setting-sources", "",
               "--disable-slash-commands", "--strict-mcp-config", "--system-prompt", system]
        m = model or self.model
        if m:
            cmd += ["--model", m]
        p = subprocess.run(cmd, capture_output=True, text=True, timeout=self.timeout)
        d = None
        for line in reversed((p.stdout or "").splitlines()):  # the JSON result is one line; other lines are telemetry/notices
            line = line.strip()
            if line.startswith("{") and line.endswith("}"):
                try:
                    cand = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if "result" in cand or "is_error" in cand:
                    d = cand
                    break
        if d is None:
            raise LLMError(f"claude -p failed (rc={p.returncode}): {(p.stderr or p.stdout)[-400:]}")
        with self._lock:
            self.calls += 1
            self.cost_usd += float(d.get("total_cost_usd") or 0)
        if d.get("is_error"):
            raise LLMError(str(d.get("result"))[:300])
        return d.get("result", "")
