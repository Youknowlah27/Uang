"""Tiny DSP toolkit (numpy + scipy). Everything mono float32 @ 44.1 kHz unless stated."""
from __future__ import annotations

import numpy as np
from scipy import signal

SR = 44100


def n_of(dur: float) -> int:
    return max(1, int(round(dur * SR)))


def tvec(dur: float) -> np.ndarray:
    return np.arange(n_of(dur)) / SR


def exp_env(n: int, tau: float, floor: float = 0.0) -> np.ndarray:
    t = np.arange(n) / SR
    return floor + (1 - floor) * np.exp(-t / tau)


def adsr(n: int, a: float, d: float, s: float, r: float) -> np.ndarray:
    e = np.ones(n) * s
    na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    if na > 0:
        e[:na] = np.linspace(0, 1, na, endpoint=False)
    if nd > 0 and na + nd <= n:
        e[na:na + nd] = np.linspace(1, s, nd, endpoint=False)
    if nr > 0 and nr <= n:
        e[n - nr:] *= np.linspace(1, 0, nr)
    return e


def osc(freq, dur: float | None = None, kind: str = "sine", n: int | None = None, phase: float = 0.0) -> np.ndarray:
    """freq: scalar Hz or per-sample array (instantaneous frequency)."""
    if np.isscalar(freq):
        n = n or n_of(dur or 0.0)
        ph = phase + 2 * np.pi * freq * np.arange(n) / SR
    else:
        ph = phase + 2 * np.pi * np.cumsum(np.asarray(freq, dtype=np.float64)) / SR
    if kind == "sine":
        return np.sin(ph)
    if kind == "saw":
        return 2 * ((ph / (2 * np.pi)) % 1.0) - 1
    if kind == "square":
        return np.sign(np.sin(ph))
    if kind == "tri":
        return 2 * np.abs(2 * ((ph / (2 * np.pi)) % 1.0) - 1) - 1
    raise ValueError(kind)


def sweep(f0: float, f1: float, n: int, curve: str = "exp") -> np.ndarray:
    x = np.linspace(0, 1, n)
    return f0 * (f1 / f0) ** x if curve == "exp" else f0 + (f1 - f0) * x


def white(n: int, rng: np.random.Generator) -> np.ndarray:
    return rng.standard_normal(n)


def _sos(kind: str, fc, order: int = 2):
    fc = np.clip(fc, 20, SR * 0.47)
    return signal.butter(order, fc, btype=kind, fs=SR, output="sos")


def lp(x, fc, order=2):
    return signal.sosfilt(_sos("low", fc, order), x)


def hp(x, fc, order=2):
    return signal.sosfilt(_sos("high", fc, order), x)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(_sos("band", [lo, hi], order), x)


def sweep_bp(x: np.ndarray, f0: float, f1: float, q: float = 3.0, block: int = 256) -> np.ndarray:
    """Band-pass whose centre frequency sweeps exponentially f0→f1 over the signal (whoosh / riser)."""
    n = len(x)
    out = np.zeros(n)
    zi = None
    for i0 in range(0, n, block):
        i1 = min(n, i0 + block)
        frac = (i0 + i1) / 2 / n
        fc = f0 * (f1 / f0) ** frac
        bw = fc / q
        sos = signal.butter(2, [max(20, fc - bw / 2), min(SR * 0.47, fc + bw / 2)], btype="band", fs=SR, output="sos")
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        out[i0:i1], zi = signal.sosfilt(sos, x[i0:i1], zi=zi)
    return out


def fade(x: np.ndarray, fi: float = 0.0, fo: float = 0.0) -> np.ndarray:
    x = x.copy()
    a, b = int(fi * SR), int(fo * SR)
    if a > 0:
        x[:a] *= np.linspace(0, 1, a)
    if b > 0:
        x[-b:] *= np.linspace(1, 0, b)
    return x


def peak(x: np.ndarray, db: float = -6.0) -> np.ndarray:
    p = np.max(np.abs(x)) + 1e-9
    return x * (10 ** (db / 20) / p)


def rms_db(x: np.ndarray) -> float:
    return 20 * np.log10(np.sqrt(np.mean(np.square(x)) + 1e-12))


def place(dst: np.ndarray, src: np.ndarray, t: float, gain: float = 1.0) -> None:
    i = int(round(t * SR))
    if i >= len(dst) or i + len(src) <= 0:
        return
    s0 = max(0, -i)
    d0 = max(0, i)
    n = min(len(src) - s0, len(dst) - d0)
    if n > 0:
        dst[d0:d0 + n] += src[s0:s0 + n] * gain


def midi_hz(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


def note(name: str) -> float:
    """'A3' -> Hz"""
    base = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}[name[0]]
    acc = 1 if "#" in name else (-1 if "b" in name else 0)
    octv = int(name[-1])
    return midi_hz(12 * (octv + 1) + base + acc)
