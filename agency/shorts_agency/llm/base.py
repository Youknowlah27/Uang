"""LLM provider abstraction. Agents only call `llm.json(task, system, prompt, Model)`; providers are swappable:
  claude_cli (default)  `claude -p` headless on the user's PC → uses the Claude subscription, no API key
  file_queue            writes tasks to queue/ for a Claude Code cloud routine to answer (no local CLI needed)
  gemini / ollama       free-tier / local alternatives (config-driven; untested in CI)
  mock                  deterministic fixtures for tests and dry-runs"""
from __future__ import annotations

import json
import re
from typing import Any, Protocol, TypeVar

from pydantic import BaseModel, ValidationError

T = TypeVar("T", bound=BaseModel)


class LLMError(RuntimeError):
    pass


class LLM(Protocol):
    name: str

    def complete(self, system: str, prompt: str, *, task: str = "", model: str | None = None) -> str: ...


def extract_json(text: str) -> Any:
    """Tolerant JSON extraction: strips code fences/prose, finds the outermost object/array."""
    t = text.strip()
    t = re.sub(r"^```(?:json)?\s*|\s*```$", "", t, flags=re.S)
    for opener, closer in (("{", "}"), ("[", "]")):
        i, j = t.find(opener), t.rfind(closer)
        if i != -1 and j > i:
            try:
                return json.loads(t[i:j + 1])
            except json.JSONDecodeError:
                continue
    raise LLMError(f"no JSON found in model output: {text[:200]!r}")


class JSONMixin:
    """Adds .json(): ask → parse → validate with pydantic → retry with the validation error."""

    def json(self, task: str, system: str, prompt: str, schema: type[T] | None = None, *, retries: int = 2, model: str | None = None) -> Any:
        last = ""
        for attempt in range(retries + 1):
            ask = prompt if attempt == 0 else f"{prompt}\n\nYour previous answer was invalid:\n{last}\nReturn ONLY corrected JSON."
            raw = self.complete(system + "\nReturn ONLY valid JSON, no prose, no code fences.", ask, task=task, model=model)  # type: ignore[attr-defined]
            try:
                data = extract_json(raw)
                return schema.model_validate(data) if schema else data
            except (LLMError, ValidationError) as e:
                last = str(e)[:1200]
        raise LLMError(f"{task}: still invalid after {retries + 1} attempts: {last}")


def get_llm(cfg: dict) -> "LLM":
    kind = (cfg or {}).get("provider", "claude_cli")
    if kind == "claude_cli":
        from .claude_cli import ClaudeCLI
        return ClaudeCLI(model=cfg.get("model"), timeout=cfg.get("timeout", 300))
    if kind == "mock":
        from .mock import MockLLM
        return MockLLM()
    if kind == "file_queue":
        from .file_queue import FileQueueLLM
        return FileQueueLLM(cfg.get("queue_dir", "queue"), timeout=cfg.get("timeout", 3600))
    if kind == "gemini":
        from .http_llms import GeminiLLM
        return GeminiLLM(cfg.get("model", "gemini-2.0-flash"))
    if kind == "ollama":
        from .http_llms import OllamaLLM
        return OllamaLLM(cfg.get("model", "llama3.1"), cfg.get("host", "http://localhost:11434"))
    raise ValueError(f"unknown llm provider {kind!r}")
