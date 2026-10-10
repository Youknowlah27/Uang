"""Task router: cheap/volume tasks → Gemini (free API key), critical tasks → Claude, automatic fallback to Claude on any error/429.
Saves Claude-subscription quota without lowering quality where it matters (script, direction, editorial review, strategy)."""
from __future__ import annotations

from .base import JSONMixin


class RoutingLLM(JSONMixin):
    name = "router"

    def __init__(self, default, routes: dict | None = None, fallback=None):
        self.default, self.routes, self.fallback = default, routes or {}, fallback or default
        self.stats: dict[str, int] = {}
        self.fallbacks = 0

    def complete(self, system: str, prompt: str, *, task: str = "", model: str | None = None) -> str:
        target = self.routes.get(task, self.default)
        self.stats[target.name] = self.stats.get(target.name, 0) + 1
        try:
            return target.complete(system, prompt, task=task, model=None if target is not self.default else model)
        except Exception:  # noqa: BLE001  (rate limit, quota, network, bad key …)
            if target is self.fallback:
                raise
            self.fallbacks += 1
            self.stats[self.fallback.name] = self.stats.get(self.fallback.name, 0) + 1
            return self.fallback.complete(system, prompt, task=task, model=model)
