"""Rules knowledge base loader."""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parents[2]


@dataclass
class Rule:
    id: str
    platform: list[str]
    lane: list[str]
    severity: str
    statement: str
    check: str
    confidence: str = "official"
    applies_when: dict[str, Any] = field(default_factory=dict)
    source: dict[str, Any] = field(default_factory=dict)
    notes: str = ""

    def applies(self, platforms: list[str], lane: str, goal: str) -> bool:
        plat_ok = "all" in self.platform or not platforms or any(p in self.platform for p in platforms)
        lane_ok = "all" in self.lane or lane in self.lane
        when_ok = all(goal == v if k == "goal" else True for k, v in self.applies_when.items())
        return plat_ok and lane_ok and when_ok


def load_rules(path: Path | None = None) -> list[Rule]:
    d = yaml.safe_load((path or ROOT / "rules" / "platform_rules.yaml").read_text())
    return [Rule(**{k: v for k, v in r.items()}) for r in d["rules"]]


def kb_meta(path: Path | None = None) -> dict:
    return yaml.safe_load((path or ROOT / "rules" / "platform_rules.yaml").read_text())["meta"]
