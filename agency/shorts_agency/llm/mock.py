"""Deterministic provider for tests/dry-runs: `register(task, fn)` where fn(system, prompt) -> str|dict."""
from __future__ import annotations

import json
from typing import Callable

from .base import JSONMixin, LLMError


class MockLLM(JSONMixin):
    name = "mock"

    def __init__(self):
        self.handlers: dict[str, Callable[[str, str], object]] = {}
        self.calls: list[tuple[str, str]] = []

    def register(self, task: str, fn: Callable[[str, str], object]) -> "MockLLM":
        self.handlers[task] = fn
        return self

    def complete(self, system: str, prompt: str, *, task: str = "", model: str | None = None) -> str:
        self.calls.append((task, prompt[:80]))
        fn = self.handlers.get(task)
        if fn is None:
            raise LLMError(f"MockLLM has no handler for task {task!r}")
        out = fn(system, prompt)
        return out if isinstance(out, str) else json.dumps(out)
