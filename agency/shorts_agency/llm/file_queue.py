"""File-queue provider: the orchestrator drops task files; a Claude Code *cloud routine* (or you) answers them.
queue/<id>.task.json  {task, system, prompt}   →   queue/<id>.result.json  {text}"""
from __future__ import annotations

import json
import time
import uuid
from pathlib import Path

from .base import JSONMixin, LLMError


class FileQueueLLM(JSONMixin):
    name = "file_queue"

    def __init__(self, queue_dir: str = "queue", timeout: int = 3600, poll: float = 5.0):
        self.dir, self.timeout, self.poll = Path(queue_dir), timeout, poll
        self.dir.mkdir(parents=True, exist_ok=True)

    def complete(self, system: str, prompt: str, *, task: str = "", model: str | None = None) -> str:
        tid = f"{int(time.time())}-{uuid.uuid4().hex[:6]}"
        (self.dir / f"{tid}.task.json").write_text(json.dumps({"task": task, "system": system, "prompt": prompt}, indent=1))
        res = self.dir / f"{tid}.result.json"
        t0 = time.time()
        while time.time() - t0 < self.timeout:
            if res.exists():
                return json.loads(res.read_text())["text"]
            time.sleep(self.poll)
        raise LLMError(f"queue task {tid} not answered within {self.timeout}s")
