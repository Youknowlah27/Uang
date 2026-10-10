"""Synthesised sound-effects library. Each generator returns mono float32 with peak ≈ -6 dBFS (scaled later by cue gain)."""
from __future__ import annotations

import numpy as np

from . import dsp
from .dsp import SR


def _rng(name: str, seed: int = 0):
    return np.random.default_rng(abs(hash(name)) % (2**31) + seed) if False else np.random.default_rng(sum(map(ord, name)) * 131 + seed)


def whoosh(dur=0.55, soft=False, seed=0):
    r = _rng("whoosh", seed)
    n = dsp.n_of(dur)
    x = dsp.sweep_bp(dsp.white(n, r), 250 if soft else 400, 2600 if soft else 4200, q=1.4)
    env = np.sin(np.linspace(0, np.pi, n)) ** (2.0 if soft else 1.5)
    return dsp.peak(x * env, -8 if soft else -6)


def pop(hi=False, seed=0):
    r = _rng("pop", seed)
    n = dsp.n_of(0.14)
    f = dsp.sweep(1150 if hi else 760, 520 if hi else 280, n)
    x = dsp.osc(f, n=n) * dsp.exp_env(n, 0.035)
    click = dsp.hp(dsp.white(n, r), 3000) * dsp.exp_env(n, 0.004) * 0.35
    return dsp.peak(x + click, -6)


def tick(seed=0):
    r = _rng("tick", seed)
    n = dsp.n_of(0.035)
    x = dsp.bp(dsp.white(n, r), 2800, 7000) * dsp.exp_env(n, 0.005) + dsp.osc(2100, n=n) * dsp.exp_env(n, 0.006) * 0.5
    return dsp.peak(x, -9)


def click(seed=0):
    r = _rng("click", seed)
    n = dsp.n_of(0.06)
    x = dsp.osc(1300, n=n) * dsp.exp_env(n, 0.012) + dsp.hp(dsp.white(n, r), 4000) * dsp.exp_env(n, 0.003) * 0.4
    return dsp.peak(x, -8)


def stamp(seed=0):
    r = _rng("stamp", seed)
    n = dsp.n_of(0.42)
    thump = dsp.osc(dsp.sweep(110, 42, n), n=n) * dsp.exp_env(n, 0.11)
    body = dsp.lp(dsp.white(n, r), 1800) * dsp.exp_env(n, 0.035) * 0.7
    slap = dsp.hp(dsp.white(n, r), 2500) * dsp.exp_env(n, 0.012) * 0.45
    return dsp.peak(thump + body + slap, -5)


def slash(seed=0):
    r = _rng("slash", seed)
    n = dsp.n_of(0.2)
    x = dsp.sweep_bp(dsp.white(n, r), 1800, 9000, q=2.2)
    env = np.minimum(1, np.arange(n) / (0.004 * SR)) * dsp.exp_env(n, 0.07)
    return dsp.peak(x * env, -7)


def riser(dur=0.9, seed=0):
    r = _rng("riser", seed)
    n = dsp.n_of(dur)
    nz = dsp.sweep_bp(dsp.white(n, r), 300, 7000, q=1.2)
    tone = dsp.osc(dsp.sweep(180, 1400, n), n=n, kind="saw") * 0.25
    tone = dsp.lp(tone, 3000)
    env = np.linspace(0.05, 1, n) ** 2.2
    x = (nz + tone) * env
    return dsp.peak(dsp.fade(x, 0.02, 0.01), -7)


def ding(seed=0):
    n = dsp.n_of(0.9)
    parts = [(880.0, 1.0, 0.45), (1318.5, 0.55, 0.30), (1760.0, 0.35, 0.22), (2637.0, 0.18, 0.12), (3520.0, 0.08, 0.08)]
    x = np.zeros(n)
    for f, a, tau in parts:
        x += dsp.osc(f * 1.0008, n=n) * dsp.exp_env(n, tau) * a
    x[: int(0.002 * SR)] *= np.linspace(0, 1, int(0.002 * SR))
    return dsp.peak(x, -8)


def impact(seed=0):
    r = _rng("impact", seed)
    n = dsp.n_of(0.75)
    sub = dsp.osc(dsp.sweep(75, 32, n), n=n) * dsp.exp_env(n, 0.22)
    nz = dsp.lp(dsp.white(n, r), 900) * dsp.exp_env(n, 0.06) * 0.8
    top = dsp.hp(dsp.white(n, r), 3500) * dsp.exp_env(n, 0.015) * 0.25
    return dsp.peak(sub + nz + top, -5)


def sparkle(seed=0):
    r = _rng("sparkle", seed)
    n = dsp.n_of(0.6)
    x = np.zeros(n)
    for _ in range(9):
        t0 = r.uniform(0, 0.4)
        f = r.choice([3136.0, 3951.0, 4699.0, 5274.0, 6272.0])
        m = dsp.n_of(0.12)
        dsp.place(x, dsp.osc(f, n=m) * dsp.exp_env(m, 0.03), t0, r.uniform(0.4, 1.0))
    return dsp.peak(x, -12)


def swipe(seed=0):
    r = _rng("swipe", seed)
    n = dsp.n_of(0.26)
    x = dsp.sweep_bp(dsp.white(n, r), 700, 5200, q=1.8) * np.sin(np.linspace(0, np.pi, n)) ** 1.2
    return dsp.peak(x, -9)


def type_run(dur=1.0, seed=0):
    r = _rng("type", seed)
    out = np.zeros(dsp.n_of(dur + 0.08))
    t = 0.0
    while t < dur:
        k = tick(seed=int(r.integers(0, 9)))
        dsp.place(out, k * r.uniform(0.5, 1.0), t)
        t += r.uniform(0.045, 0.1)
    return dsp.peak(out, -10)


def tick_run(dur=0.9, seed=0):
    out = np.zeros(dsp.n_of(dur + 0.08))
    t, step = 0.0, 0.09
    k = 0
    while t < dur:
        s = tick(seed=k % 5)
        pitch = 1.0 + 0.5 * (t / dur)
        s = np.interp(np.arange(0, len(s), pitch), np.arange(len(s)), s)
        dsp.place(out, s * (0.5 + 0.5 * t / dur), t)
        step = max(0.035, step * 0.93)
        t += step
        k += 1
    return dsp.peak(out, -9)


def glitch(seed=0):
    r = _rng("glitch", seed)
    n = dsp.n_of(0.3)
    x = np.zeros(n)
    for _ in range(7):
        t0 = r.uniform(0, 0.25)
        m = dsp.n_of(r.uniform(0.01, 0.04))
        burst = np.sign(dsp.white(m, r)) * 0.6
        burst = np.repeat(burst[::8], 8)[:m]
        dsp.place(x, burst * np.hanning(len(burst)), t0, r.uniform(0.4, 1.0))
    return dsp.peak(dsp.hp(x, 500), -9)


def paper(seed=0):
    r = _rng("paper", seed)
    n = dsp.n_of(0.3)
    flutter = np.clip(dsp.lp(dsp.white(n, r), 40), -1, 1) ** 2
    x = dsp.bp(dsp.white(n, r), 1800, 7500) * flutter * np.sin(np.linspace(0, np.pi, n))
    return dsp.peak(x, -10)


LIB = {
    "whoosh": lambda dur=None, seed=0: whoosh(seed=seed),
    "whoosh_soft": lambda dur=None, seed=0: whoosh(0.5, True, seed),
    "pop": lambda dur=None, seed=0: pop(False, seed),
    "pop_hi": lambda dur=None, seed=0: pop(True, seed),
    "tick": lambda dur=None, seed=0: tick(seed),
    "click": lambda dur=None, seed=0: click(seed),
    "stamp": lambda dur=None, seed=0: stamp(seed),
    "slash": lambda dur=None, seed=0: slash(seed),
    "riser": lambda dur=None, seed=0: riser(dur or 0.9, seed),
    "ding": lambda dur=None, seed=0: ding(seed),
    "impact": lambda dur=None, seed=0: impact(seed),
    "sparkle": lambda dur=None, seed=0: sparkle(seed),
    "swipe": lambda dur=None, seed=0: swipe(seed),
    "type_run": lambda dur=None, seed=0: type_run(dur or 1.0, seed),
    "tick_run": lambda dur=None, seed=0: tick_run(dur or 0.9, seed),
    "glitch": lambda dur=None, seed=0: glitch(seed),
    "paper": lambda dur=None, seed=0: paper(seed),
}


def render(name: str, dur: float | None = None, seed: int = 0) -> np.ndarray:
    if name not in LIB:
        raise KeyError(f"unknown sfx {name!r}; known: {sorted(LIB)}")
    return LIB[name](dur=dur, seed=seed).astype(np.float32)
