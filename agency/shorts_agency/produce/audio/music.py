"""Procedural background music (original, royalty-free by construction).  Four moods:
  tech_pulse  A-minor, 108 BPM, soft four-on-the-floor + arps       (default for 'mix')
  ambient     slow pads + sparse bells, no drums, 72 BPM            (Apple Minimal)
  corporate   C-major plucks + light kick/shaker, 100 BPM           (Data Journalism)
  lofi        swung Rhodes chords, vinyl crackle, soft drums, 82 BPM (Paper Cutout)
Returns stereo float32 (n, 2). The mixer decides the final level (ducking under the voice)."""
from __future__ import annotations

import numpy as np

from . import dsp
from .dsp import SR, note

MOODS = {"tech_pulse": "tech_pulse", "ambient": "ambient", "corporate": "corporate", "lofi": "lofi"}
STYLE_MOOD = {"apple": "ambient", "data": "corporate", "paper": "lofi", "mix": "tech_pulse"}


def _kick(vel=1.0):
    n = dsp.n_of(0.32)
    f = dsp.sweep(135, 44, n)
    x = dsp.osc(f, n=n) * dsp.exp_env(n, 0.09)
    x += dsp.lp(np.random.default_rng(1).standard_normal(n), 400) * dsp.exp_env(n, 0.008) * 0.3
    return x * vel


def _hat(vel=1.0, open_=False, seed=0):
    r = np.random.default_rng(seed)
    n = dsp.n_of(0.18 if open_ else 0.05)
    x = dsp.hp(r.standard_normal(n), 7000) * dsp.exp_env(n, 0.06 if open_ else 0.012)
    return x * vel


def _clap(vel=1.0, seed=0):
    r = np.random.default_rng(seed)
    n = dsp.n_of(0.22)
    x = dsp.bp(r.standard_normal(n), 1100, 2600) * dsp.exp_env(n, 0.05)
    for k in (0.011, 0.022):  # flam
        x[int(k * SR):] += 0.5 * dsp.bp(r.standard_normal(n - int(k * SR)), 1100, 2600) * dsp.exp_env(n - int(k * SR), 0.03)
    return x * vel


def _snare(vel=1.0, seed=0, soft=False):
    r = np.random.default_rng(seed)
    n = dsp.n_of(0.2)
    x = dsp.bp(r.standard_normal(n), 900 if soft else 1500, 5000) * dsp.exp_env(n, 0.06) + dsp.osc(190, n=n) * dsp.exp_env(n, 0.05) * 0.5
    return (dsp.lp(x, 3500) if soft else x) * vel


def _pluck(freq, dur=0.5, bright=1.0):
    n = dsp.n_of(dur)
    x = np.zeros(n)
    for h, a, tau in ((1, 1.0, 0.18), (2, 0.5, 0.12), (3, 0.3 * bright, 0.08), (4, 0.15 * bright, 0.05)):
        x += dsp.osc(freq * h, n=n) * dsp.exp_env(n, tau) * a
    x[: int(0.002 * SR)] *= np.linspace(0, 1, int(0.002 * SR))
    return x


def _pad(freqs, dur, brightness=1200, detune=0.003, slow=0.35):
    n = dsp.n_of(dur)
    L = np.zeros(n)
    R = np.zeros(n)
    for f in freqs:
        L += dsp.osc(f * (1 + detune), n=n, kind="saw") + 0.5 * dsp.osc(f * 0.5, n=n, kind="tri")
        R += dsp.osc(f * (1 - detune), n=n, kind="saw") + 0.5 * dsp.osc(f * 0.5, n=n, kind="tri")
    env = dsp.adsr(n, slow, 0.3, 0.8, min(0.6, dur / 3))
    return dsp.lp(L, brightness) * env, dsp.lp(R, brightness) * env


def _bass(freq, dur, kind="sine"):
    n = dsp.n_of(dur)
    x = dsp.osc(freq, n=n, kind=kind)
    x = dsp.lp(x, 260) * dsp.adsr(n, 0.004, 0.08, 0.7, 0.05)
    return x


def _bell(freq, dur=1.6):
    n = dsp.n_of(dur)
    x = np.zeros(n)
    for r_, a, tau in ((1.0, 1.0, 0.9), (2.76, 0.35, 0.5), (5.4, 0.15, 0.25)):
        x += dsp.osc(freq * r_, n=n) * dsp.exp_env(n, tau) * a
    x[: int(0.003 * SR)] *= np.linspace(0, 1, int(0.003 * SR))
    return x


def _rhodes(freq, dur=1.2):
    n = dsp.n_of(dur)
    t = np.arange(n) / SR
    idx = 2.2 * np.exp(-t / 0.25)
    mod = np.sin(2 * np.pi * freq * t)
    x = np.sin(2 * np.pi * freq * t + idx * mod) * dsp.exp_env(n, 0.9)
    x += 0.12 * np.sin(2 * np.pi * freq * 7.0 * t) * dsp.exp_env(n, 0.04)  # tine
    x[: int(0.003 * SR)] *= np.linspace(0, 1, int(0.003 * SR))
    return x * dsp.adsr(n, 0.003, 0.2, 0.7, 0.2)


def _stereo(m, pan=0.0):
    l = np.sqrt((1 - pan) / 2 + 0.5 * 0)  # equal-power
    ang = (pan + 1) * np.pi / 4
    return np.cos(ang) * m, np.sin(ang) * m


def _mixdown(n):
    return np.zeros(n), np.zeros(n)


def _add(L, R, x, t, g=1.0, pan=0.0):
    ang = (pan + 1) * np.pi / 4
    dsp.place(L, x, t, g * np.cos(ang) * np.sqrt(2))
    dsp.place(R, x, t, g * np.sin(ang) * np.sqrt(2))


def _addst(L, R, xl, xr, t, g=1.0):
    dsp.place(L, xl, t, g)
    dsp.place(R, xr, t, g)


def _chord_freqs(names):
    return [note(n) for n in names]


def _tech_pulse(dur, seed):
    bpm = 108
    beat = 60 / bpm
    bar = 4 * beat
    s16 = beat / 4
    n = dsp.n_of(dur)
    L, R = _mixdown(n)
    prog = [(["A3", "C4", "E4"], "A1", ["A4", "C5", "E5"]), (["F3", "A3", "C4"], "F1", ["A4", "C5", "F5"]), (["E3", "G3", "C4"], "C2", ["G4", "C5", "E5"]), (["D3", "G3", "B3"], "G1", ["G4", "B4", "D5"])]
    nbars = int(np.ceil(dur / bar))
    for b in range(nbars):
        t0 = b * bar
        chord, root, arp = prog[b % 4]
        pl, pr = _pad(_chord_freqs(chord), bar + 0.4, 1400)
        _addst(L, R, pl, pr, t0, 0.16)
        # arp: 16ths, pattern up-down
        notes = _chord_freqs(arp)
        pat = [0, 1, 2, 1, 0, 1, 2, 1, 0, 2, 1, 2, 0, 1, 2, 1]
        for i in range(16):
            tt = t0 + i * s16
            vel = 0.55 + 0.25 * (i % 4 == 0)
            lvl = min(1, b / 1.0) * 0.28
            _add(L, R, _pluck(notes[pat[i]], 0.35), tt, vel * lvl, pan=-0.25 if i % 2 == 0 else 0.25)
        if b >= 1:
            for i in range(8):
                tt = t0 + i * beat / 2
                if i in (0, 3, 4, 7) or (b % 2 == 1 and i == 5):
                    _add(L, R, _bass(note(root), beat * 0.45, "saw"), tt, 0.34)
            for i in range(8):
                _add(L, R, _hat(0.5 if i % 2 else 0.3, seed=i + b), t0 + i * beat / 2 + (beat / 4 if i % 2 else 0) * 0, 0.16 if i % 2 else 0.08, pan=0.35)
        last2 = b >= nbars - 2
        if b >= 2 and not last2:
            for i in range(4):
                _add(L, R, _kick(0.85), t0 + i * beat, 0.5)
            _add(L, R, _clap(0.8, seed=b), t0 + 1 * beat, 0.2)
            _add(L, R, _clap(0.8, seed=b + 9), t0 + 3 * beat, 0.2)
    return L, R


def _ambient(dur, seed):
    bpm = 72
    beat = 60 / bpm
    bar = 4 * beat
    n = dsp.n_of(dur)
    L, R = _mixdown(n)
    r = np.random.default_rng(seed + 11)
    prog = [(["F3", "A3", "C4", "E4"], "F1"), (["E3", "G3", "B3", "D4"], "E1"), (["D3", "F3", "A3", "C4"], "D1"), (["C3", "E3", "G3", "B3"], "C1")]
    scale = ["C5", "D5", "E5", "G5", "A5", "C6"]
    nbars = int(np.ceil(dur / bar))
    for b in range(nbars):
        t0 = b * bar
        chord, root = prog[b % 4]
        pl, pr = _pad(_chord_freqs(chord), bar + 1.2, 1000, 0.004, slow=1.0)
        _addst(L, R, pl, pr, t0, 0.17)
        _add(L, R, _bass(note(root), bar * 0.9), t0, 0.28)
        for i in range(8):
            if r.random() < 0.45:
                _add(L, R, _bell(note(str(r.choice(scale))), 1.8), t0 + i * beat / 2, 0.16 * r.uniform(0.6, 1.0), pan=r.uniform(-0.5, 0.5))
        if b >= 1:  # soft pulse
            for i in range(4):
                _add(L, R, _kick(0.5), t0 + i * beat, 0.16)
    return L, R


def _corporate(dur, seed):
    bpm = 100
    beat = 60 / bpm
    bar = 4 * beat
    s8 = beat / 2
    n = dsp.n_of(dur)
    L, R = _mixdown(n)
    prog = [(["C4", "E4", "G4"], "C2", ["C5", "E5", "G5", "E5"]), (["B3", "D4", "G4"], "G1", ["B4", "D5", "G5", "D5"]), (["A3", "C4", "E4"], "A1", ["A4", "C5", "E5", "C5"]), (["A3", "C4", "F4"], "F1", ["A4", "C5", "F5", "C5"])]
    nbars = int(np.ceil(dur / bar))
    for b in range(nbars):
        t0 = b * bar
        chord, root, arp = prog[b % 4]
        pl, pr = _pad(_chord_freqs(chord), bar + 0.3, 1800, 0.002, slow=0.2)
        _addst(L, R, pl, pr, t0, 0.10)
        for i in range(8):
            _add(L, R, _pluck(note(arp[i % 4]), 0.3, 1.2), t0 + i * s8, 0.30 * (0.7 + 0.3 * (i % 2 == 0)), pan=-0.2 if i % 2 else 0.2)
        _add(L, R, _bass(note(root), beat * 0.9), t0, 0.32)
        _add(L, R, _bass(note(root), beat * 0.9), t0 + 2.5 * beat, 0.26)
        if b >= 1 and b < nbars - 2:
            _add(L, R, _kick(0.7), t0, 0.40)
            _add(L, R, _kick(0.7), t0 + 2 * beat, 0.36)
            for i in range(16):
                _add(L, R, _hat(0.35 if i % 2 else 0.2, seed=i + b), t0 + i * beat / 4, 0.10, pan=0.4)
            _add(L, R, _snare(0.6, seed=b, soft=True), t0 + beat, 0.2)
            _add(L, R, _snare(0.6, seed=b + 3, soft=True), t0 + 3 * beat, 0.2)
    return L, R


def _lofi(dur, seed):
    bpm = 82
    beat = 60 / bpm
    bar = 4 * beat
    n = dsp.n_of(dur)
    L, R = _mixdown(n)
    r = np.random.default_rng(seed + 5)
    swing = 0.62
    prog = [(["D3", "F3", "A3", "C4", "E4"], "D2"), (["G3", "B3", "D4", "F4"], "G1"), (["C3", "E3", "G3", "B3", "D4"], "C2"), (["A3", "C4", "E4", "G4"], "A1")]
    nbars = int(np.ceil(dur / bar))
    for b in range(nbars):
        t0 = b * bar
        chord, root = prog[b % 4]
        for i, nm in enumerate(chord):
            _add(L, R, _rhodes(note(nm), bar * 0.95), t0 + i * 0.012, 0.20, pan=-0.3 + 0.15 * i)
        _add(L, R, _bass(note(root), beat * 1.3), t0, 0.34)
        _add(L, R, _bass(note(root) * (1.5 if b % 2 else 1.0), beat * 0.8), t0 + 2.5 * beat, 0.26)
        if b >= 1:
            for k in (0, 2.5):
                _add(L, R, _kick(0.6), t0 + k * beat, 0.36)
            for k in (1, 3):
                _add(L, R, _snare(0.7, seed=b + int(k), soft=True), t0 + k * beat, 0.24)
            for i in range(8):
                tt = t0 + (i // 2) * beat + (swing * beat if i % 2 else 0)
                _add(L, R, _hat(0.5 if i % 2 else 0.3, seed=i), tt, 0.08, pan=0.3)
        if b >= 2 and r.random() < 0.7:  # melody
            m = ["F5", "A5", "C6", "E5", "G5"]
            for i in range(2):
                _add(L, R, _rhodes(note(str(r.choice(m))), 0.9), t0 + (1 + i * 1.5) * beat + r.uniform(0, 0.04), 0.14, pan=0.35)
    # vinyl crackle
    crack = np.zeros(n)
    idx = r.integers(0, n, int(dur * 14))
    crack[idx] = r.uniform(0.3, 1.0, len(idx)) * r.choice([-1, 1], len(idx))
    crack = dsp.bp(crack, 1500, 9000) * 0.12
    L += crack
    R += np.roll(crack, 37)
    return L, R


GEN = {"tech_pulse": _tech_pulse, "ambient": _ambient, "corporate": _corporate, "lofi": _lofi}


def bed(mood: str, dur: float, seed: int = 0) -> np.ndarray:
    """Stereo (n,2) float32 normalised to peak -6 dBFS with a 1.2 s fade out."""
    if mood not in GEN:
        raise KeyError(f"unknown mood {mood!r}; choose from {sorted(GEN)}")
    L, R = GEN[mood](dur, seed)
    n = dsp.n_of(dur)
    L, R = L[:n], R[:n]
    x = np.stack([dsp.fade(L, 0.4, 1.2), dsp.fade(R, 0.4, 1.2)], axis=1)
    x = x / (np.max(np.abs(x)) + 1e-9) * 10 ** (-6 / 20)
    return x.astype(np.float32)
