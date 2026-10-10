from __future__ import annotations

from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]


def load_config(path: Path | None = None) -> dict:
    p = path or ROOT / "config" / "agency.yaml"
    if not p.exists():
        p = ROOT / "config" / "agency.example.yaml"
    return yaml.safe_load(p.read_text())


def load_accounts(path: Path | None = None) -> dict:
    p = path or ROOT / "config" / "accounts.yaml"
    if not p.exists():
        p = ROOT / "config" / "accounts.example.yaml"
    return yaml.safe_load(p.read_text())["accounts"]
