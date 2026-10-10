"""Free-tier / local alternatives. Config-driven model names; NOT exercised by the test-suite (no network/GPU in CI)."""
from __future__ import annotations

import json
import os
import ssl
import urllib.request

from .base import JSONMixin, LLMError


def _post(url: str, body: dict, headers: dict | None = None, timeout: int = 180) -> dict:
    ctx = ssl.create_default_context(cafile="/root/.ccr/ca-bundle.crt") if os.path.exists("/root/.ccr/ca-bundle.crt") else None
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json", **(headers or {})})
    with urllib.request.urlopen(req, timeout=timeout, context=ctx) as r:
        return json.loads(r.read())


class GeminiLLM(JSONMixin):
    name = "gemini"

    def __init__(self, model: str):
        self.model, self.key = model, os.environ.get("GEMINI_API_KEY", "")
        if not self.key:
            raise LLMError("set GEMINI_API_KEY (free tier key from Google AI Studio)")

    def complete(self, system: str, prompt: str, *, task: str = "", model: str | None = None) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model or self.model}:generateContent?key={self.key}"
        d = _post(url, {"systemInstruction": {"parts": [{"text": system}]}, "contents": [{"role": "user", "parts": [{"text": prompt}]}]})
        return d["candidates"][0]["content"]["parts"][0]["text"]


class OllamaLLM(JSONMixin):
    name = "ollama"

    def __init__(self, model: str, host: str = "http://localhost:11434"):
        self.model, self.host = model, host.rstrip("/")

    def complete(self, system: str, prompt: str, *, task: str = "", model: str | None = None) -> str:
        d = _post(f"{self.host}/api/generate", {"model": model or self.model, "system": system, "prompt": prompt, "stream": False, "format": "json"})
        return d["response"]
