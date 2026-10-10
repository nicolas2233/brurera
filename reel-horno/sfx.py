"""Synthesises the sound-effects track for the reel (numpy only) -> sfx.wav"""
import re, wave, numpy as np

SR = 44100
tl = open('src/timeline.js').read()
num = lambda k: float(re.search(k + r':\s*([\d.]+)', tl).group(1))
OPEN, TRAY, CTA, END = num('open'), num('trayOut'), num('cta'), num('end')
SWAPS = [float(x) for x in re.search(r'swaps:\s*\[([^\]]+)\]', tl).group(1).split(',')]
rng = np.random.default_rng(7)
N = int(SR * END)
L = np.zeros(N); R = np.zeros(N)

def bandnoise(n, lo, hi):
    spec = np.fft.rfft(rng.standard_normal(n)); f = np.fft.rfftfreq(n, 1 / SR)
    spec[(f < lo) | (f > hi)] = 0
    x = np.fft.irfft(spec, n); return x / (np.abs(x).max() + 1e-9)

def put(t, x, gain=1.0, pan=0.0):
    i = int(t * SR); x = x[: max(0, N - i)]
    L[i:i + len(x)] += x * gain * (1 - max(0, pan)); R[i:i + len(x)] += x * gain * (1 + min(0, pan))

def env(n, a, d):  # attack (s), exponential decay time-constant (s)
    t = np.arange(n) / SR; return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)

# oven hum + fan under the intro, fading as the door opens
n = int(SR * (OPEN + 1.5)); t = np.arange(n) / SR
hum = 0.5 * bandnoise(n, 60, 400) + 0.25 * np.sin(2 * np.pi * 100 * t)
put(0, hum * np.minimum(1, t / 0.8) * np.clip((OPEN + 1.5 - t) / 1.5, 0, 1), 0.12)

# kitchen-timer ticks
for k, tt in enumerate(np.arange(0.35, OPEN - 0.8, 0.25)):
    n = int(SR * 0.04); x = bandnoise(n, 2500, 7000) * env(n, 0.001, 0.008)
    put(tt, x, 0.35 if k % 2 else 0.25, pan=0.15 if k % 2 else -0.15)

# DING (bell partials)
n = int(SR * 2.2); t = np.arange(n) / SR
bell = sum(a * np.sin(2 * np.pi * 1318 * r * t) * np.exp(-t / d) for a, r, d in [(1, 1, .9), (.5, 2.76, .4), (.3, 5.4, .2), (.2, 0.5, 1.2)])
put(OPEN - 0.72, bell * np.minimum(1, t / 0.002), 0.35)

# door: latch click, hinge creak, then heavy clunk when it lands
n = int(SR * 0.05); put(OPEN + 0.02, bandnoise(n, 1500, 6000) * env(n, 0.001, 0.01), 0.5)
n = int(SR * 0.6); t = np.arange(n) / SR
creak = np.sin(2 * np.pi * (380 + 120 * t + 30 * np.sin(2 * np.pi * 9 * t)) * t) * bandnoise(n, 200, 1800) * np.sin(np.pi * t / 0.6)
put(OPEN + 0.08, creak, 0.12)
n = int(SR * 0.7); t = np.arange(n) / SR
clunk = (np.sin(2 * np.pi * 70 * t) * np.exp(-t / 0.12) + 0.6 * bandnoise(n, 80, 900) * np.exp(-t / 0.05) + 0.25 * np.sin(2 * np.pi * 523 * t) * np.exp(-t / 0.15))
put(OPEN + 0.75, clunk, 0.6)

# big steam hiss when it opens
n = int(SR * 2.2); t = np.arange(n) / SR
put(OPEN + 0.25, bandnoise(n, 3000, 12000) * np.minimum(1, t / 0.08) * np.exp(-t / 0.7), 0.22)

# tray slide (metal scrape) for the first tray
n = int(SR * 1.4); t = np.arange(n) / SR
put(TRAY, bandnoise(n, 400, 3500) * np.sin(np.pi * t / 1.4) ** 2 * (0.6 + 0.4 * np.sin(2 * np.pi * 13 * t)), 0.12)

# whoosh + small hiss on each tray swap
for s in SWAPS:
    n = int(SR * 0.8); t = np.arange(n) / SR
    w = bandnoise(n, 150, 2500) * np.exp(-((t - 0.38) / 0.16) ** 2)
    put(s - 0.1, w, 0.45, pan=-0.2); put(s - 0.08, w, 0.45, pan=0.2)
    n = int(SR * 1.0); t = np.arange(n) / SR
    put(s + 0.35, bandnoise(n, 3500, 11000) * np.minimum(1, t / 0.05) * np.exp(-t / 0.3), 0.1)

# soft "pop" on price stamps
def pop(tt, f=520):
    n = int(SR * 0.18); t = np.arange(n) / SR
    put(tt, np.sin(2 * np.pi * (f + 900 * np.exp(-t / 0.02)) * t) * np.exp(-t / 0.05), 0.3)
pop(6.65 + 0.15)
for s, d in zip(SWAPS[:4], [1.05, 1.5, 1.1, 1.1]): pop(s + d + 0.15)

# sparkle on the CTA
for k in range(6):
    n = int(SR * 0.5); t = np.arange(n) / SR
    put(CTA + 0.3 + k * 0.07, np.sin(2 * np.pi * (1760 + 330 * k) * t) * np.exp(-t / 0.12), 0.06, pan=(k % 2) * 0.4 - 0.2)

mix = np.stack([L, R], 1)
mix /= max(1e-9, np.abs(mix).max()) / 0.85
fade = int(SR * 0.6); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
with wave.open('sfx.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('sfx.wav', END, 's')
