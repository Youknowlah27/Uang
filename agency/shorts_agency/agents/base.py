from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from ..llm.base import LLM
from ..state import Store

ROOT = Path(__file__).resolve().parents[2]


@dataclass
class Ctx:
    cfg: dict
    store: Store
    llm: LLM | None
    accounts: dict = field(default_factory=dict)
    root: Path = ROOT

    @property
    def workdir(self) -> Path:
        p = self.root / self.cfg.get("paths", {}).get("workdir", "build")
        p.mkdir(parents=True, exist_ok=True)
        return p


class Agent:
    """One role. Subclasses implement `work(**kw) -> dict`; `run()` makes it awaitable, logged and exception-safe."""
    name = "agent"
    role = ""

    def __init__(self, ctx: Ctx):
        self.ctx = ctx

    def log(self, level: str, msg: str, **kw: Any) -> None:
        self.ctx.store.log(self.name, level, msg, **kw)

    def prompt(self, name: str) -> str:
        return (self.ctx.root / "prompts" / f"{name}.md").read_text()

    async def run(self, **kw: Any) -> dict:
        t0 = time.time()
        self.log("info", "start")
        try:
            out = await asyncio.to_thread(self.work, **kw)
        except Exception as e:  # noqa: BLE001
            self.log("error", repr(e))
            raise
        self.log("info", "done", secs=round(time.time() - t0, 1), **{k: v for k, v in (out or {}).items() if isinstance(v, (int, float, str))})
        return out or {}

    def work(self, **kw: Any) -> dict:  # pragma: no cover
        raise NotImplementedError
