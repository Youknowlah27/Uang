"""Safe-zone analysis of the studio's lint dump (rectangles of every critical element per sampled frame)."""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[2]
MIN_OPACITY = 0.6  # ignore elements that are still fading/animating in


@dataclass
class Violation:
    key: str
    kind: str          # text | obj
    side: str          # left|right|top|bottom
    over_px: int
    first_s: float
    last_s: float
    frames: int
    sample: str

    def line(self) -> str:
        return f"{self.kind} '{self.sample}' exceeds {self.side} by {self.over_px}px ({self.first_s:.2f}s–{self.last_s:.2f}s, {self.frames} samples)"


@dataclass
class SafeZoneReport:
    ok: bool
    violations: list[Violation] = field(default_factory=list)
    checked_frames: int = 0
    unresolved_refs: list[str] = field(default_factory=list)
    box: dict = field(default_factory=dict)

    def summary(self) -> str:
        if self.ok:
            return f"safe-zone OK ({self.checked_frames} frames sampled)"
        return f"{len(self.violations)} safe-zone violation(s) in {self.checked_frames} frames"


def load_zones(path: Path | None = None) -> dict:
    return yaml.safe_load((path or ROOT / "rules" / "safe_zones.yaml").read_text())


TRANSIENT_VFX = {"shake", "punch", "glitch"}


def _transient_windows(spec: dict | None) -> list[tuple[float, float]]:
    """Time windows where a shake/punch/glitch moves the whole frame on purpose (ignored by the lint)."""
    if not spec:
        return []
    from ..produce.timeline import cue_time

    out = []
    for c in spec.get("cues", []):
        if c.get("vfx") in TRANSIENT_VFX:
            t = cue_time(spec["timeline"], c)
            out.append((t, t + float(c.get("dur", 0.4)) + 0.05))
    return out


def analyse(lint: dict | Path, zones: dict | None = None, spec: dict | None = None, min_samples: int = 2) -> SafeZoneReport:
    data = json.loads(Path(lint).read_text()) if not isinstance(lint, dict) else lint
    z = zones or load_zones()
    box, tol = z["critical_box"], z.get("tolerance_px", 4)
    fps = data["fps"]
    agg: dict[tuple, Violation] = {}
    windows = _transient_windows(spec)
    for fr in data["frames"]:
        t_fr = fr["f"] / fps
        if any(a <= t_fr <= b for a, b in windows):
            continue
        for it in fr["items"]:
            if it["o"] < MIN_OPACITY or it["y0"] < -5000 or it["y1"] > 5000:  # still fading in / offscreen warm-up artefact
                continue
            checks = [
                ("left", box["left"] - it["x0"]),
                ("right", it["x1"] - box["right"]),
                ("top", box["top"] - it["y0"]),
                ("bottom", it["y1"] - box["bottom"]),
            ]
            for side, over in checks:
                if over > tol:
                    key = (it["k"], it["t"], side)
                    t = fr["f"] / fps
                    v = agg.get(key)
                    if v is None:
                        agg[key] = Violation(f"{it['k']}:{it['t']}:{side}", it["k"], side, int(over), t, t, 1, it["t"])
                    else:
                        v.over_px, v.last_s, v.frames = max(v.over_px, int(over)), t, v.frames + 1
    vs = sorted((v for v in agg.values() if v.frames >= min_samples), key=lambda v: (-v.over_px, v.first_s))
    return SafeZoneReport(ok=not vs, violations=vs, checked_frames=len(data["frames"]), unresolved_refs=data.get("errors", []), box=box)


if __name__ == "__main__":
    import sys

    r = analyse(Path(sys.argv[1]))
    print(r.summary())
    for v in r.violations[:40]:
        print(" -", v.line())
    for e in r.unresolved_refs:
        print(" ! ", e)
