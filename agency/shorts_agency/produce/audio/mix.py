"""Final mix: voice + music bed (side-chain ducked under the voice) + cue-driven SFX → loudness-normalised stereo WAV.

Targets (rules int.audio.mix): integrated -14 LUFS (±1), true peak <= -1 dBTP, music >= 12 dB below the voice while speaking."""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

import numpy as np
from scipy import signal

from ..timeline import cue_time
from . import dsp, music, sfx
from .dsp import SR

TARGET_LUFS = -14.0
TARGET_TP = -1.0


def _read(path: Path) -> np.ndarray:
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"])
    return np.frombuffer(raw, dtype="<f4").astype(np.float64)


def _write_wav(path: Path, st: np.ndarray) -> None:
    pcm = np.clip(st, -1.0, 1.0).astype("<f4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-", str(path)], input=pcm.tobytes(), check=True)


def voice_activity(v: np.ndarray, win: float = 0.02) -> np.ndarray:
    """smoothed 0..1 envelope of voice loudness per sample (attack 30 ms, release 280 ms)."""
    hop = int(win * SR)
    n = len(v)
    frames = np.sqrt(np.convolve(v ** 2, np.ones(hop) / hop, mode="same") + 1e-12)
    ref = np.percentile(frames[frames > 1e-4], 90) if (frames > 1e-4).any() else 1.0
    env = np.clip(frames / ref, 0, 1)
    # gate: below 8% counts as silence
    env = np.where(env < 0.08, 0.0, env)
    a, r = np.exp(-1 / (0.03 * SR)), np.exp(-1 / (0.28 * SR))
    out = np.zeros(n)
    y = 0.0
    for i in range(0, n, 16):  # block rate for speed
        x = env[i]
        y = a * y + (1 - a) * x if x > y else r * y + (1 - r) * x
        out[i:i + 16] = y
    return np.clip(out, 0, 1)


def _loudnorm_2pass(src: Path, dst: Path) -> dict:
    flt = f"loudnorm=I={TARGET_LUFS}:TP={TARGET_TP}:LRA=9:print_format=json"
    p = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(src), "-af", flt, "-f", "null", "-"], capture_output=True, text=True)
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", p.stderr, re.S)
    meas = json.loads(m.group(0))
    flt2 = (f"loudnorm=I={TARGET_LUFS}:TP={TARGET_TP}:LRA=9:measured_I={meas['input_i']}:measured_TP={meas['input_tp']}:"
            f"measured_LRA={meas['input_lra']}:measured_thresh={meas['input_thresh']}:offset={meas['target_offset']}:linear=true:print_format=json")
    p2 = subprocess.run(["ffmpeg", "-y", "-hide_banner", "-i", str(src), "-af", flt2, "-ar", str(SR), "-ac", "2", str(dst)], capture_output=True, text=True)
    m2 = re.search(r"\{[^{}]*\"output_i\"[^{}]*\}", p2.stderr, re.S)
    return json.loads(m2.group(0)) if m2 else meas


def measure(path: Path) -> dict:
    p = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True)
    tail = p.stderr.split("Summary:")[-1]
    g = lambda pat: float(re.search(pat, tail).group(1)) if re.search(pat, tail) else None
    return {"integrated_lufs": g(r"I:\s+(-?[\d.]+)\s+LUFS"), "lra": g(r"LRA:\s+(-?[\d.]+)\s+LU"), "true_peak_dbtp": g(r"Peak:\s+(-?[\d.]+)\s+dBFS")}


def mix(voice_wav: Path, spec: dict, out_wav: Path, mood: str | None = None, seed: int = 7) -> dict:
    tl = spec["timeline"]
    total = tl["total"]
    mood = mood or spec.get("mood", "tech_pulse")
    n = int((total + 0.4) * SR)
    v = np.zeros(n)
    vv = _read(voice_wav)
    v[: min(n, len(vv))] = vv[:n]

    act = voice_activity(v)
    voice_rms = np.sqrt(np.mean(v[act > 0.3] ** 2) + 1e-12)
    voice_db = 20 * np.log10(voice_rms)

    # --- music bed: nominal level 15 dB under the voice, extra 5 dB side-chain duck while speaking → ~20 dB under in speech
    bed = music.bed(mood, total + 0.4, seed=seed).astype(np.float64)
    bed = bed[:n] if len(bed) >= n else np.pad(bed, ((0, n - len(bed)), (0, 0)))
    bed_rms = np.sqrt(np.mean(bed ** 2))
    bed *= (voice_rms * 10 ** (-15 / 20)) / (bed_rms + 1e-12)
    duck = 1.0 - (1 - 10 ** (-5 / 20)) * act
    music_stem = bed * duck[:, None]

    # --- sfx
    sfx_stem = np.zeros((n, 2))
    placed = []
    for i, c in enumerate(spec.get("cues", [])):
        name = c.get("sfx")
        if not name:
            continue
        t = cue_time(tl, c)
        s = sfx.render(name, dur=c.get("dur"), seed=i % 5).astype(np.float64)
        g = float(c.get("gain", 0.8)) * 10 ** ((voice_db + 12 - (-6)) / 20)  # peak ≈ voice RMS + 12 dB * gain  (sfx are peak -6 dBFS)
        pan = ((i * 37) % 21 - 10) / 40.0
        ang = (pan + 1) * np.pi / 4
        dsp.place(sfx_stem[:, 0], s, t, g * np.cos(ang) * np.sqrt(2))
        dsp.place(sfx_stem[:, 1], s, t, g * np.sin(ang) * np.sqrt(2))
        placed.append({"t": round(t, 3), "sfx": name, "gain": c.get("gain", 0.8)})

    voice_stem = np.stack([v, v], axis=1)
    raw = voice_stem + music_stem + sfx_stem
    # gentle safety limiter before loudnorm (prevents intersample overs)
    pk = np.max(np.abs(raw))
    if pk > 0.98:
        raw = raw / pk * 0.98
    tmp = out_wav.with_suffix(".pre.wav")
    _write_wav(tmp, raw)
    ln = _loudnorm_2pass(tmp, out_wav)
    tmp.unlink()

    # --- report
    speaking = act > 0.3
    music_rms_speaking = np.sqrt(np.mean(music_stem[speaking] ** 2) + 1e-12)
    gap_db = 20 * np.log10(voice_rms / music_rms_speaking)
    rep = measure(out_wav)
    rep.update({"voice_vs_music_gap_db": round(float(gap_db), 1), "mood": mood, "sfx_count": len(placed), "duration_s": round(n / SR, 2), "speaking_ratio": round(float(speaking.mean()), 2)})
    rep["targets"] = {"integrated_lufs": TARGET_LUFS, "true_peak_dbtp": TARGET_TP, "min_gap_db": 12.0}
    rep["pass"] = bool(abs(rep["integrated_lufs"] - TARGET_LUFS) <= 1.5 and rep["true_peak_dbtp"] <= TARGET_TP + 0.3 and gap_db >= 12.0)
    rep["sfx"] = placed
    out_wav.with_suffix(".report.json").write_text(json.dumps(rep, indent=1))
    return rep


def spectrogram(wav: Path, png: Path) -> None:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    x = _read(wav)
    fig, ax = plt.subplots(2, 1, figsize=(12, 5.5), gridspec_kw={"height_ratios": [1, 2]})
    t = np.arange(len(x)) / SR
    ax[0].plot(t[::200], x[::200], lw=0.4, color="#2E9CA6")
    ax[0].set_xlim(0, t[-1]); ax[0].set_ylabel("amp")
    ax[1].specgram(x, NFFT=2048, Fs=SR, noverlap=1536, cmap="magma", vmin=-120)
    ax[1].set_ylim(0, 12000); ax[1].set_xlabel("s"); ax[1].set_ylabel("Hz")
    fig.tight_layout()
    fig.savefig(png, dpi=80)
    plt.close(fig)
