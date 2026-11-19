"""Syntetisoi videon taustamusiikin (ambient-matto + arpeggio) WAV-tiedostoksi.

Kaikki äänet tehdään tässä tiedostossa siniaalloista, joten musiikissa ei ole
tekijänoikeusrajoituksia. Soinnut ja dynamiikka tulevat timeline.py:stä.

Käyttö:  python3 music.py ulos.wav
"""

import sys
import wave

import numpy as np

import timeline as TL

SR = 44100
N = int((TL.DURATION + 1.0) * SR)
RNG = np.random.default_rng(7)

# Soinnut: (basso, [matto-äänet]) MIDI-numeroina
VOICINGS = {
    "Bm":   (47, [54, 59, 62, 66, 73]),
    "G":    (43, [55, 59, 62, 66]),
    "D":    (38, [57, 62, 66, 69]),
    "A":    (45, [57, 61, 64, 69]),
    "Asus": (45, [57, 62, 64, 69]),
    "A/C#": (49, [57, 61, 64, 69]),
    "Em":   (40, [55, 59, 62, 67]),
    "F#m":  (42, [54, 57, 61, 66]),
}


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def smoothstep(x):
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3 - 2 * x)


def track(keys, t):
    """Avainkehysten pehmeä interpolointi; t voi olla skalaari tai taulukko."""
    t = np.asarray(t, dtype=np.float64)
    times = np.array([k[0] for k in keys])
    vals = np.array([k[1] for k in keys], dtype=np.float64)
    idx = np.clip(np.searchsorted(times, t, side="right") - 1, 0, len(times) - 1)
    nxt = np.clip(idx + 1, 0, len(times) - 1)
    span = np.maximum(times[nxt] - times[idx], 1e-9)
    u = np.where(nxt == idx, 0.0, smoothstep((t - times[idx]) / span))
    return vals[idx] + (vals[nxt] - vals[idx]) * u


L = np.zeros(N)
R = np.zeros(N)


def add(sig, start, pan=0.0, gain=1.0):
    i0 = int(round(start * SR))
    if i0 < 0:
        sig = sig[-i0:]
        i0 = 0
    n = min(len(sig), N - i0)
    if n <= 0:
        return
    a = (pan + 1) * np.pi / 4
    L[i0:i0 + n] += sig[:n] * np.cos(a) * gain
    R[i0:i0 + n] += sig[:n] * np.sin(a) * gain


def chord_at(t):
    name = TL.CHORDS[0][1]
    for start, c in TL.CHORDS:
        if start <= t:
            name = c
    return VOICINGS[name]


# --- Matto ------------------------------------------------------------------
PRE, REL = 0.6, 2.6
for k, (start, name) in enumerate(TL.CHORDS):
    end = TL.CHORDS[k + 1][0] if k + 1 < len(TL.CHORDS) else TL.DURATION + 0.2
    bass, notes = VOICINGS[name]
    s0 = start - PRE
    dur = (end - s0) + REL
    t = np.arange(int(dur * SR)) / SR
    env = smoothstep(t / 2.0) * (1 - smoothstep((t - (end - s0)) / REL))
    b = float(track(TL.MUSIC["bright"], start))
    h2, h3, h4 = 0.22 + 0.25 * b, 0.06 + 0.12 * b, 0.02 + 0.06 * b
    for ni, m in enumerate(notes):
        f0 = hz(m)
        amp = (0.55 if m > 70 else 1.0) / len(notes)
        for det, pan in ((-7, -0.65), (0, 0.0), (7, 0.65)):
            f = f0 * 2 ** (det / 1200)
            ph = RNG.uniform(0, 2 * np.pi, 4)
            w = 2 * np.pi * f * t
            sig = (np.sin(w + ph[0]) + h2 * np.sin(2 * w + ph[1])
                   + h3 * np.sin(3 * w + ph[2]) + h4 * np.sin(4 * w + ph[3]))
            lfo = 1 + 0.12 * np.sin(2 * np.pi * (0.09 + 0.03 * ni) * t + ph[0])
            add(sig * env * lfo * amp, s0, pan, 0.16)
    # basso
    fb = hz(bass)
    benv = smoothstep(t / 1.2) * (1 - smoothstep((t - (end - s0)) / 2.0))
    wb = 2 * np.pi * fb * t
    add((np.sin(wb) + 0.3 * np.sin(2 * wb)) * benv, s0, 0.0, 0.11)

# --- Arpeggio (pehmeä piano-tyyppinen näppäily) ------------------------------
PULSE = 0.6
pattern = [0, 2, 1, 3, 2, 1, 3, 4]
pl = int(3.0 * SR)
tp = np.arange(pl) / SR
step = 0
t = 0.0
while t < TL.DURATION:
    vol = float(track(TL.MUSIC["arp"], t))
    if vol > 0.01:
        _, notes = chord_at(t)
        tones = sorted(notes)[:4] + [sorted(notes)[0] + 12]
        m = tones[pattern[step % len(pattern)] % len(tones)] + 12
        f = hz(m)
        vel = (1.0 if step % 4 == 0 else 0.72) * RNG.uniform(0.85, 1.0)
        w = 2 * np.pi * f * tp
        env = (1 - np.exp(-tp / 0.004))
        sig = env * (np.exp(-tp / 1.1) * np.sin(w)
                     + 0.30 * np.exp(-tp / 0.45) * np.sin(2 * w)
                     + 0.10 * np.exp(-tp / 0.25) * np.sin(3 * w))
        pan = -0.35 if step % 2 == 0 else 0.35
        add(sig, t + RNG.uniform(-0.008, 0.008), pan, 0.07 * vol * vel)
        # ylösnousemuksessa lisäksi oktaavia ylempää
        if vol > 0.8 and step % 2 == 1:
            add(np.exp(-tp / 0.8) * np.sin(2 * w) * env, t + 0.3, -pan, 0.03 * vol)
    step += 1
    t += PULSE

# --- Kimallus ---------------------------------------------------------------
tt = np.arange(N) / SR
sh = track(TL.MUSIC["shimmer"], tt)
if sh.max() > 0:
    shim_l = np.zeros(N)
    shim_r = np.zeros(N)
    # kaksi oktaavia maton yläpuolella, hitaasti sykkivä
    for k, (start, name) in enumerate(TL.CHORDS):
        end = TL.CHORDS[k + 1][0] if k + 1 < len(TL.CHORDS) else TL.DURATION
        i0, i1 = int(start * SR), min(N, int((end + 1.5) * SR))
        seg_t = tt[i0:i1] - start
        e = smoothstep(seg_t / 1.0) * (1 - smoothstep((seg_t - (end - start)) / 1.5))
        for j, m in enumerate(VOICINGS[name][1][:3]):
            f = hz(m + 24)
            trem = 0.5 + 0.5 * np.sin(2 * np.pi * (0.7 + 0.23 * j) * seg_t + j)
            s = np.sin(2 * np.pi * f * seg_t) * e * trem * sh[i0:i1]
            shim_l[i0:i1] += s * (0.8 if j % 2 else 0.4)
            shim_r[i0:i1] += s * (0.4 if j % 2 else 0.8)
    L += shim_l * 0.012
    R += shim_r * 0.012

# --- Nousu ja pehmeä isku ylösnousemuksen kohdalle ---------------------------
HIT = 52.4


def lowpass_noise(n, cutoff, seed):
    x = np.random.default_rng(seed).standard_normal(n)
    X = np.fft.rfft(x)
    fr = np.fft.rfftfreq(n, 1 / SR)
    X *= 1 / (1 + (fr / cutoff) ** 4)
    return np.fft.irfft(X, n) / np.sqrt(cutoff / SR * 4)


rl = int(2.2 * SR)
rt = np.arange(rl) / SR
riser = lowpass_noise(rl, 2500, 1) * (np.exp(rt / 0.55) - 1) / (np.exp(2.2 / 0.55) - 1)
add(riser, HIT - 2.2, -0.2, 0.05)
add(lowpass_noise(rl, 2700, 2) * (np.exp(rt / 0.55) - 1) / (np.exp(2.2 / 0.55) - 1),
    HIT - 2.2, 0.2, 0.05)
il = int(3.5 * SR)
it = np.arange(il) / SR
boom_f = 38 + 30 * np.exp(-it / 0.15)
boom = np.sin(2 * np.pi * np.cumsum(boom_f) / SR) * np.exp(-it / 1.2) * (1 - np.exp(-it / 0.01))
add(boom, HIT, 0.0, 0.22)
add(lowpass_noise(il, 900, 3) * np.exp(-it / 0.9), HIT, 0.0, 0.03)

# --- Kaiku (synteettinen impulssivaste, FFT-konvoluutio) ----------------------
irl = int(3.4 * SR)
irt = np.arange(irl) / SR


def make_ir(seed):
    x = np.random.default_rng(seed).standard_normal(irl) * np.exp(-irt / 0.75)
    X = np.fft.rfft(x)
    fr = np.fft.rfftfreq(irl, 1 / SR)
    X *= 1 / (1 + (fr / 5000) ** 2)
    ir = np.fft.irfft(X, irl)
    ir[: int(0.025 * SR)] = 0  # esiviive
    return ir / np.sqrt(np.sum(ir ** 2))


def fftconv(x, h):
    n = len(x) + len(h) - 1
    nfft = 1 << (n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, nfft) * np.fft.rfft(h, nfft), nfft)[: len(x)]


wet_l = fftconv(L, make_ir(11))
wet_r = fftconv(R, make_ir(12))
out_l = 0.78 * L + 0.42 * wet_l
out_r = 0.78 * R + 0.42 * wet_r

# --- Masterointi ------------------------------------------------------------
lvl = track(TL.MUSIC["level"], tt)
fade = smoothstep(tt / 2.0)
out = np.stack([out_l, out_r], axis=1) * (lvl * fade)[:, None]
out /= np.max(np.abs(out)) + 1e-9
out = np.tanh(out * 1.1) / np.tanh(1.1) * 0.89  # n. -1 dBFS huippu

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "music.wav"
    pcm = (out * 32767).astype("<i2")
    with wave.open(path, "wb") as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm.tobytes())
    rms = np.sqrt(np.mean(out ** 2))
    print(f"{path}: {len(out) / SR:.1f} s, huippu {20 * np.log10(np.max(np.abs(out))):.1f} dBFS, "
          f"RMS {20 * np.log10(rms):.1f} dBFS")
