"""brief → voice → mix → lint → render → mux → thumbnails.  One call produces a reviewable video package."""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from . import resolve
from .audio import mix as mixer
from .audio.music import STYLE_MOOD

ROOT = Path(__file__).resolve().parents[2]
STUDIO = ROOT / "studio"


def _sh(cmd: list[str], cwd: Path | None = None, log: Path | None = None) -> str:
    p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if log:
        log.write_text(p.stdout + "\n" + p.stderr)
    if p.returncode != 0:
        raise RuntimeError(f"{' '.join(cmd[:3])}… failed:\n{p.stderr[-1500:]}")
    return p.stdout


def mood_for(style: str, brief_mood: str | None) -> str:
    return (brief_mood or "tech_pulse") if style == "mix" else STYLE_MOOD[style]


def produce(brief: dict, out_dir: Path, style: str | None = None, reuse_voice: bool = True, do_lint: bool = True, do_render: bool = True) -> dict:
    out_dir = Path(out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    style = style or brief.get("style", "mix")
    spec_path = out_dir / "spec.json"
    if reuse_voice and spec_path.exists() and (out_dir / "voice.wav").exists():
        spec = resolve.refresh(json.loads(spec_path.read_text()), brief)
    else:
        spec = resolve.resolve(brief, out_dir)
    spec["style"] = style
    spec["mood"] = mood_for(style, brief.get("mood"))
    spec["captionSkin"] = "house" if style == "mix" else "pack"
    spec_path.write_text(json.dumps(spec, indent=1))
    art = {"spec": str(spec_path), "voice": str(out_dir / "voice.wav")}

    rep = mixer.mix(out_dir / "voice.wav", spec, out_dir / "audio.wav", mood=spec["mood"])
    mixer.spectrogram(out_dir / "audio.wav", out_dir / "audio_spectrogram.png")
    art.update(audio=str(out_dir / "audio.wav"), audio_report=rep)

    if do_lint:
        _sh(["node", "scripts/lint.mjs", str(spec_path), str(out_dir / "lint.json"), f"--style={style}"], cwd=STUDIO)
        art["lint"] = str(out_dir / "lint.json")
    if do_render:
        silent = out_dir / "silent.mp4"
        _sh(["node", "scripts/render_spec.mjs", str(spec_path), str(silent), f"--style={style}"], cwd=STUDIO, log=out_dir / "render.log")
        final = out_dir / "final.mp4"
        _sh(["ffmpeg", "-y", "-loglevel", "error", "-i", str(silent), "-i", str(out_dir / "audio.wav"), "-c:v", "libx264", "-preset", "slow", "-crf", "23",
             "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", str(final)])
        art["video"] = str(final)
    return art
