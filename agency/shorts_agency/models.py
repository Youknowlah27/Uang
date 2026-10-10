"""Shared pydantic models."""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

Severity = Literal["block", "warn", "info"]


class Campaign(BaseModel):
    """A clipping/UGC campaign brief, parsed by the Scout from a marketplace listing or pasted text."""
    id: str
    marketplace: str = "whop"                       # whop | vyro | clipping_net | direct | other
    brand: str
    url: str = ""
    content_type: Literal["clipping", "ugc"] = "clipping"
    rate_per_1k: float = 0.0
    currency: str = "USD"
    budget: float | None = None
    min_payout: float = 0.0
    max_payout: float | None = None
    flat_bonus: float = 0.0
    platforms: list[str] = Field(default_factory=list)
    required_hashtags: list[str] = Field(default_factory=list)
    required_mentions: list[str] = Field(default_factory=list)
    required_phrases: list[str] = Field(default_factory=list)
    forbidden_terms: list[str] = Field(default_factory=list)
    min_seconds: float | None = None
    max_seconds: float | None = None
    watermark_required: bool = False
    disclosure_required: list[str] = Field(default_factory=list)   # e.g. ["#ad"]
    source_footage_urls: list[str] = Field(default_factory=list)
    requirements_text: str = ""
    deadline: str | None = None
    status: Literal["candidate", "accepted", "rejected", "expired"] = "candidate"
    score: float | None = None
    notes: str = ""
    fetched_at: str | None = None


class Finding(BaseModel):
    rule_id: str
    check: str
    severity: Severity
    passed: bool
    message: str
    fix: str = ""
    evidence: dict[str, Any] = Field(default_factory=dict)
    confidence: str = "official"


class Review(BaseModel):
    video_id: str
    verdict: Literal["PASS", "REVISE", "BLOCK"]
    score: int
    findings: list[Finding]
    summary: str
    editorial: list[str] = Field(default_factory=list)   # LLM / human style notes (non-binding)

    def failed(self, severity: str | None = None) -> list[Finding]:
        return [f for f in self.findings if not f.passed and (severity is None or f.severity == severity)]
