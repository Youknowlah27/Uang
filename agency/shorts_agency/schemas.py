"""Structured outputs the LLM agents must produce (validated; invalid → the provider retries with the error)."""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class Angle(BaseModel):
    topic_id: str
    angle: str = Field(min_length=15)
    why_now: str
    hook_type: Literal["numbered", "curiosity_gap", "contrarian", "mid_action", "question"]
    risk: str = ""                       # e.g. "single-source rumour – wait for confirmation"


class AnglesOut(BaseModel):
    angles: list[Angle]


class PlanItem(BaseModel):
    day: str                             # YYYY-MM-DD
    account: str
    lane: Literal["brand", "clipping", "affiliate"]
    goal: Literal["reach", "creator_rewards", "campaign", "affiliate"]
    idea_id: str | None = None
    campaign_id: str | None = None
    target_seconds: int = Field(ge=15, le=120)
    hook_type: str
    cta_type: Literal["follow", "link", "comment"]
    experiment: str = ""                 # e.g. "hook A/B: contrarian vs numbered"
    rationale: str


class PlanOut(BaseModel):
    items: list[PlanItem]


class BriefBeat(BaseModel):
    id: str
    text: str
    gapAfter: float = 0.3

    @field_validator("text")
    @classmethod
    def _t(cls, v: str) -> str:
        if len(v.split()) < 2:
            raise ValueError("beat text too short")
        return v


class Claim(BaseModel):
    text: str
    source: str
    scene: str

    @field_validator("source")
    @classmethod
    def _s(cls, v: str) -> str:
        if not v.startswith("http"):
            raise ValueError("claim source must be a URL taken from the provided evidence")
        return v


class Cta(BaseModel):
    type: Literal["follow", "link", "comment"]
    headline: str
    sub: str = ""
    keyword: str = ""
    promise: str = ""


class PostCopy(BaseModel):
    caption: str
    hashtags: list[str]
    mentions: list[str] = Field(default_factory=list)
    tag_suggestions: list[dict[str, str]] = Field(default_factory=list)
    first_comment: str = ""
    youtube: dict[str, str] = Field(default_factory=dict)
    link_in_bio: str = ""


class WriterOut(BaseModel):
    title: str
    hook_type: str
    beats: list[BriefBeat] = Field(min_length=5, max_length=12)
    analysis_points: list[str] = Field(min_length=2)
    claims: list[Claim]
    cta: Cta
    post: PostCopy


class SceneOut(BaseModel):
    beat: str
    template: Literal["hook_stamp", "cards", "share", "milestone", "count_grid", "switch_cost", "statement", "cta_end"]
    style: Literal["apple", "data", "paper"] | None = None
    props: dict[str, Any] = Field(default_factory=dict)


class ReactionOut(BaseModel):
    beat: str
    word: int | str = 0
    pose: Literal["idle", "talk", "point", "shock", "think", "cheer", "sad", "smug", "wave"]
    dur: float = 1.1


class DirectorOut(BaseModel):
    style: Literal["apple", "data", "paper", "mix"] = "mix"
    mood: Literal["tech_pulse", "ambient", "corporate", "lofi"] = "tech_pulse"
    scenes: list[SceneOut]
    reactions: list[ReactionOut] = Field(default_factory=list)


class EditorialOut(BaseModel):
    hook_score: int = Field(ge=1, le=10)
    clarity_score: int = Field(ge=1, le=10)
    notes: list[str]
    risks: list[str] = Field(default_factory=list)


class InsightOut(BaseModel):
    works: list[str]
    fails: list[str]
    why: list[str]
    improve: list[str]
    copy_updates: list[str]
    confidence: Literal["low", "medium", "high"]
