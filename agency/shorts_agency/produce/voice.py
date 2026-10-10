"""Voice-over: per-beat TTS (edge-tts, free) -> stitched stem + word timeline + loudness envelope for lip-sync."""
from __future__ import annotations

import asyncio
import json
import os
import subprocess
from pathlib import Path

import numpy as np

CA = "/root/.ccr/ca-bundle.crt"
SR = 44100
FPS = 30


def _ffprobe_dur(p: Path) -> float:
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)])
    return float(out.decode().strip())


def _run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True, capture_output=True)


async def _tts(text: str, voice: str, rate: str, path: Path):
    if os.path.exists(CA):  # sandbox egress proxy re-terminates TLS; trust its CA (never disable verification)
        import certifi

        certifi.where = lambda: CA
    import edge_tts

    proxy = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
    c = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary", proxy=proxy)
    words = []
    with open(path, "wb") as f:
        async for ch in c.stream():
            if ch["type"] == "audio":
                f.write(ch["data"])
            elif ch["type"] == "WordBoundary":
                words.append({"t": ch["text"], "s": ch["offset"] / 1e7, "d": ch["duration"] / 1e7})
    return words


def read_wav_mono(path: Path) -> np.ndarray:
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"])
    return np.frombuffer(raw, dtype="<f4").copy()


def envelope(x: np.ndarray, n_frames: int) -> list[float]:
    hop = SR // FPS
    env = np.array([np.sqrt(np.mean(x[i * hop:(i + 1) * hop] ** 2) + 1e-12) if i * hop < len(x) else 0.0 for i in range(n_frames)])
    k = np.array([0.25, 0.5, 0.25])
    env = np.convolve(env, k, mode="same")
    ref = np.percentile(env[env > 1e-4], 90) if (env > 1e-4).any() else 1.0
    return [round(float(min(1.0, v / ref)), 3) for v in env]


def synthesize(beats: list[dict], voice: str, rate: str, out_dir: Path, lead: float = 0.15, tail: float = 0.5) -> dict:
    """beats: [{id,text,gapAfter}] -> writes out_dir/voice.wav and returns {timeline, envelope, voice_path}."""
    out_dir.mkdir(parents=True, exist_ok=True)
    tmp = out_dir / ".voice_tmp"
    tmp.mkdir(exist_ok=True)
    t = lead
    segs: list[Path] = []

    def silence(sec: float, name: str) -> Path:
        p = tmp / name
        _run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", f"anullsrc=r={SR}:cl=mono", "-t", f"{sec:.3f}", str(p)])
        return p

    segs.append(silence(lead, "lead.wav"))
    out_beats = []
    for i, b in enumerate(beats):
        mp3 = tmp / f"b{i}.mp3"
        words = asyncio.run(_tts(b["text"], voice, rate, mp3))
        d = _ffprobe_dur(mp3)
        for k, w in enumerate(words):
            nxt = words[k + 1]["s"] if k + 1 < len(words) else d
            w["e"] = nxt
        wav = tmp / f"b{i}.wav"
        _run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(mp3), "-ar", str(SR), "-ac", "1", str(wav)])
        segs.append(wav)
        gap = b.get("gapAfter", 0.3) if i + 1 < len(beats) else tail
        segs.append(silence(gap, f"g{i}.wav"))
        out_beats.append({
            "id": b["id"], "text": b["text"], "start": round(t, 3), "end": round(t + d, 3),
            "words": [{"t": w["t"], "s": round(t + w["s"], 3), "e": round(t + w["e"], 3)} for w in words],
        })
        t += d + gap
    lst = tmp / "list.txt"
    lst.write_text("".join(f"file '{p.resolve()}'\n" for p in segs))
    raw = tmp / "raw.wav"
    _run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(raw)])
    voice_wav = out_dir / "voice.wav"
    _run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw), "-af", "loudnorm=I=-16:TP=-1.5:LRA=7", "-ar", str(SR), "-ac", "1", str(voice_wav)])
    total = round(_ffprobe_dur(voice_wav), 3)
    env = envelope(read_wav_mono(voice_wav), int(total * FPS) + 3)
    for p in tmp.iterdir():
        p.unlink()
    tmp.rmdir()
    return {"voice_path": str(voice_wav), "timeline": {"total": total, "beats": out_beats}, "envelope": env}
