"""Renderöi evankelioimisvideon kuva kuvalta ja koodaa sen MP4:ksi ffmpegillä.

Käyttö:
  python3 render.py --format 16x9 --audio music.wav --out evankeliumi_16x9.mp4
  python3 render.py --format 9x16 --audio music.wav --out evankeliumi_9x16.mp4
  python3 render.py --format 16x9 --stills 10,36,41 --stills-dir /tmp/kuvat   # esikatselukuvat

Käsikirjoitus ja ajoitukset ovat timeline.py:ssä.
"""

import argparse
import math
import multiprocessing as mp
import os
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

import timeline as TL

INTER = "/usr/share/fonts/opentype/inter/"
SERIF = "/usr/share/fonts/truetype/crosextra/"

# Tekstityylit. size = pikselikoko 1080p-kuvassa; track = kirjainväli em-yksikköinä.
STYLES = {
    "statement": dict(font=INTER + "InterDisplay-Light.otf", size=74, color=(246, 240, 230), lh=1.32),
    "emph":      dict(font=INTER + "InterDisplay-ExtraLight.otf", size=210, color=(255, 247, 232),
                      lh=1.1, track=0.24, unit="line", glow=0.9, fade=1.5, rise=0),
    "verse":     dict(font=SERIF + "Caladea-Italic.ttf", size=60, color=(242, 234, 218), lh=1.36),
    "ref":       dict(font=INTER + "Inter-Medium.otf", size=28, color=(222, 184, 116), lh=1.0,
                      track=0.30, unit="line", gap=34),
    "label":     dict(font=INTER + "Inter-Medium.otf", size=28, color=(222, 184, 116), lh=1.0,
                      track=0.30, unit="line", gap_after=40),
    "prayer":    dict(font=SERIF + "Caladea-Italic.ttf", size=64, color=(250, 240, 222), lh=1.45,
                      unit="line", fade=1.2),
    "end":       dict(font=INTER + "InterDisplay-Light.otf", size=104, color=(255, 248, 236),
                      lh=1.2, glow=0.45, fade=1.2),
    "sub":       dict(font=INTER + "Inter-Regular.otf", size=32, color=(226, 210, 184), lh=1.0,
                      track=0.04, unit="line", gap=46, fade=1.2),
}

WORD_FADE = 0.8     # sanan häivytys sisään (s)
EXIT_FADE = 0.7     # tekstilohkon häivytys ulos (s)
RISE_PX = 16        # kuinka paljon sana nousee tullessaan (px @1080)
DEFAULT_STAGGER = 0.075

G = {}  # renderöintitila (luodaan setup():ssa, periytyy fork-prosesseille)


# ---------------------------------------------------------------------------
# Apufunktiot
# ---------------------------------------------------------------------------
def smoothstep(x):
    x = np.clip(x, 0.0, 1.0)
    return x * x * (3 - 2 * x)


def ease_out(x):
    x = min(max(x, 0.0), 1.0)
    return 1 - (1 - x) ** 3


def track(name, t):
    keys = TL.TRACKS[name]
    if t <= keys[0][0]:
        return np.asarray(keys[0][1], dtype=np.float32)
    for (ta, va), (tb, vb) in zip(keys, keys[1:]):
        if t < tb:
            u = float(smoothstep((t - ta) / (tb - ta)))
            va = np.asarray(va, dtype=np.float32)
            vb = np.asarray(vb, dtype=np.float32)
            return va + (vb - va) * u
    return np.asarray(keys[-1][1], dtype=np.float32)


def box_blur(a, r, axis):
    if r < 1:
        return a
    pad = [(0, 0)] * a.ndim
    pad[axis] = (r + 1, r)
    c = np.cumsum(np.pad(a, pad), axis=axis, dtype=np.float64)
    n = a.shape[axis]
    hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis)
    lo = np.take(c, np.arange(0, n), axis=axis)
    return ((hi - lo) / (2 * r + 1)).astype(np.float32)


def blur(a, r, passes=3):
    for _ in range(passes):
        a = box_blur(box_blur(a, r, 0), r, 1)
    return a


def gauss1d(coords, center, sigma):
    return np.exp(-((coords - center) / sigma) ** 2).astype(np.float32)


# ---------------------------------------------------------------------------
# Tekstin asettelu
# ---------------------------------------------------------------------------
class Unit:
    """Yksi animoitava tekstipala (sana tai kokonainen rivi)."""

    def __init__(self, mask, shadow, glowmask, x, y, color, t_on, fade, rise, glow):
        self.mask, self.shadow, self.glowmask = mask, shadow, glowmask
        self.x, self.y = x, y
        self.color = np.array(color, dtype=np.float32) / 255
        self.t_on, self.fade, self.rise, self.glow = t_on, fade, rise, glow


_font_cache = {}


def get_font(path, size):
    key = (path, size)
    if key not in _font_cache:
        _font_cache[key] = ImageFont.truetype(path, size, layout_engine=ImageFont.Layout.RAQM)
    return _font_cache[key]


def text_width(text, font, track_px):
    if track_px == 0:
        return font.getlength(text)
    return sum(font.getlength(ch) + track_px for ch in text) - track_px


def render_mask(text, font, track_px, pad):
    asc, desc = font.getmetrics()
    w = int(math.ceil(text_width(text, font, track_px))) + 2 * pad
    h = asc + desc + 2 * pad
    img = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(img)
    if track_px == 0:
        d.text((pad, pad + asc), text, font=font, fill=255, anchor="ls")
    else:
        x = pad
        for ch in text:
            d.text((x, pad + asc), ch, font=font, fill=255, anchor="ls")
            x += font.getlength(ch) + track_px
    return np.asarray(img, dtype=np.float32) / 255


def wrap_greedy(words, font, width):
    space = font.getlength(" ")
    rows, cur, cur_w = [], [], 0.0
    for item in words:
        ww = font.getlength(item[0])
        if cur and cur_w + space + ww > width:
            rows.append(cur)
            cur, cur_w = [], 0.0
        cur.append(item)
        cur_w += (space if len(cur) > 1 else 0) + ww
    if cur:
        rows.append(cur)
    return rows


def wrap_balanced(words, font, max_w):
    """Sama rivimäärä kuin ahneella rivityksellä, mutta rivit mahdollisimman tasapituisia."""
    rows = wrap_greedy(words, font, max_w)
    n = len(rows)
    if n == 1:
        return rows
    lo, hi = 0.0, max_w
    for _ in range(30):
        mid = (lo + hi) / 2
        if len(wrap_greedy(words, font, mid)) <= n:
            hi = mid
        else:
            lo = mid
    return wrap_greedy(words, font, hi)


def build_units(W, H, S):
    units_by_block = []
    max_w = (0.80 if W > H else 0.86) * W
    for item in TL.TEXTS:
        t0, t1 = item["t0"], item["t1"]
        stagger = item.get("stagger", DEFAULT_STAGGER)
        yc = item.get("y", 0.5) * H
        rows = []  # (style, [(text, t_on)], font, track_px)
        for text, sname, delay in item["lines"]:
            st = STYLES[sname]
            font = get_font(st["font"], int(round(st["size"] * S)))
            track_px = st.get("track", 0) * st["size"] * S
            if st.get("unit") == "line":
                # kutista fonttia, jos rivi ei mahdu (esim. pystykuvassa)
                tw = text_width(text, font, track_px)
                if tw > max_w:
                    k = max_w / tw * 0.98
                    font = get_font(st["font"], int(st["size"] * S * k))
                    track_px *= k
                rows.append((sname, [(text, t0 + delay)], font, track_px))
                continue
            words = text.split(" ")
            timed = [(w, t0 + delay + wi * stagger) for wi, w in enumerate(words)]
            for row in wrap_balanced(timed, font, max_w):
                rows.append((sname, row, font, 0))

        heights = []
        for sname, _, _, _ in rows:
            st = STYLES[sname]
            heights.append(st["lh"] * st["size"] * S + st.get("gap", 0) * S + st.get("gap_after", 0) * S)
        top = yc - sum(heights) / 2
        units = []
        for (sname, words, font, track_px), rh in zip(rows, heights):
            st = STYLES[sname]
            asc, desc = font.getmetrics()
            gap = st.get("gap", 0) * S
            line_h = st["lh"] * st["size"] * S
            baseline = top + gap + (line_h - (asc + desc)) / 2 + asc
            space = font.getlength(" ")
            widths = [text_width(w, font, track_px) for w, _ in words]
            row_w = sum(widths) + space * (len(words) - 1)
            x = (W - row_w) / 2
            glow = st.get("glow", 0)
            pad = int(st["size"] * S * (0.7 if glow else 0.3))
            for (word, t_on), ww in zip(words, widths):
                mask = render_mask(word, font, track_px, pad)
                shadow = blur(mask, max(1, int(st["size"] * S * 0.05)))
                shadow = np.roll(shadow, max(1, int(2 * S)), axis=0)
                glowmask = blur(mask, max(2, int(st["size"] * S * 0.16))) if glow else None
                units.append(Unit(mask, shadow, glowmask,
                                  x - pad, baseline - asc - pad, st["color"], t_on,
                                  st.get("fade", WORD_FADE), st.get("rise", RISE_PX) * S, glow))
                x += ww + space
            top += rh
        units_by_block.append((t0, t1, units))
    return units_by_block


# ---------------------------------------------------------------------------
# Alustus
# ---------------------------------------------------------------------------
def setup(W, H):
    S = min(W, H) / 1080
    G.update(W=W, H=H, S=S)
    G["xs"] = np.arange(W, dtype=np.float32)
    G["ys"] = np.arange(H, dtype=np.float32)
    yy = (G["ys"] / (H - 1))[:, None, None]
    G["yy"] = yy
    # vinjetti
    nx = (G["xs"] - W / 2) / (W / 2)
    ny = (G["ys"] - H / 2) / (H / 2)
    r2 = ny[:, None] ** 2 * (0.9 if H > W else 1.0) + nx[None, :] ** 2 * (1.0 if W > H else 0.6)
    G["vignette"] = (1 - 0.38 * np.clip(r2, 0, 2) ** 1.2).astype(np.float32)[:, :, None]
    # rakeisuus (estää liukuvärien porrastumista)
    rng = np.random.default_rng(3)
    G["grain"] = [rng.uniform(-1, 1, (H, W, 1)).astype(np.float32) * (1.2 / 255) for _ in range(6)]
    # partikkelit
    n = int(240 * (W * H) / (1920 * 1080))
    G["p_x0"] = rng.uniform(0, 1, n)
    G["p_y0"] = rng.uniform(0, 1, n)
    G["p_speed"] = rng.uniform(0.5, 1.6, n)
    G["p_drift"] = rng.uniform(-6, 6, n) * S
    G["p_amp"] = rng.uniform(4, 22, n) * S
    G["p_wf"] = rng.uniform(0.05, 0.25, n)
    G["p_ph"] = rng.uniform(0, 2 * np.pi, n)
    G["p_b"] = rng.uniform(0.25, 1.0, n) ** 1.5
    G["p_tw"] = rng.uniform(0.6, 2.2, n)
    G["p_size"] = rng.integers(0, 5, n)
    # partikkelien "sprite"-ytimet: koko x alipikselisiirto
    sigmas = [0.7, 1.0, 1.4, 1.9, 2.6]
    G["kernels"] = []
    for sg in sigmas:
        sg *= S
        rad = int(math.ceil(3 * sg)) + 1
        ks = []
        for oy in range(4):
            row = []
            for ox in range(4):
                c = np.arange(-rad, rad + 1, dtype=np.float32)
                kx = np.exp(-((c - ox / 4) ** 2) / (2 * sg * sg))
                ky = np.exp(-((c - oy / 4) ** 2) / (2 * sg * sg))
                row.append((ky[:, None] * kx[None, :]).astype(np.float32))
            ks.append(row)
        G["kernels"].append((rad, ks))
    # kumulatiivinen nousu (integroidaan nopeus kuvittain)
    nf = int(TL.DURATION * TL.FPS) + 2
    rise = np.array([float(track("part_rise", i / TL.FPS)) for i in range(nf)])
    G["rise_cum"] = np.concatenate([[0.0], np.cumsum(rise) / TL.FPS])
    G["blocks"] = build_units(W, H, S)


# ---------------------------------------------------------------------------
# Kuvan renderöinti
# ---------------------------------------------------------------------------
def flicker_noise(t):
    return 0.5 + 0.5 * math.sin(13.1 * t) * math.sin(7.3 * t + 1.0) * math.sin(2.9 * t + 0.4)


def render_frame(i):
    W, H, S = G["W"], G["H"], G["S"]
    xs, ys = G["xs"], G["ys"]
    t = i / TL.FPS

    # --- tausta ---
    top = track("bg_top", t) / 255
    bot = track("bg_bot", t) / 255
    bg = top[None, None, :] * (1 - G["yy"]) + bot[None, None, :] * G["yy"]
    img = np.broadcast_to(bg, (H, W, 3)).astype(np.float32)

    def add_light(shape2d, color):
        nonlocal img
        img = img + shape2d[:, :, None] * (np.asarray(color, dtype=np.float32) / 255)[None, None, :]

    cx = W / 2

    # --- keskushehku ---
    gi = float(track("glow_i", t))
    fl = float(track("flicker", t))
    gi *= 1 - fl * (0.25 + 0.55 * flicker_noise(t))
    if gi > 0.002:
        gr = float(track("glow_r", t)) * S * 1080 * 0.9
        gy = float(track("glow_y", t)) * H
        core = gauss1d(ys, gy, gr * 0.55)[:, None] * gauss1d(xs, cx, gr * 0.55)[None, :]
        halo = gauss1d(ys, gy, gr * 1.6)[:, None] * gauss1d(xs, cx, gr * 1.9)[None, :]
        warm = float(track("warmth", t))
        col = np.array([255, 196, 128]) * warm + np.array([200, 205, 235]) * (1 - warm)
        add_light((core * 0.75 + halo * 0.35) * gi, col)

    # --- aamunkoitto ---
    si = float(track("sun_i", t))
    if si > 0.002:
        sy = float(track("sun_y", t)) * H
        ry = 0.8 * S * 1080
        rx = max(0.6 * W, 0.8 * S * 1080)
        sun = gauss1d(ys, sy, ry)[:, None] * gauss1d(xs, cx, rx)[None, :]
        sun_core = gauss1d(ys, sy, ry * 0.45)[:, None] * gauss1d(xs, cx, rx * 0.35)[None, :]
        add_light(sun * si * 0.75, (255, 150, 84))
        add_light(sun_core * si * 0.6, (255, 214, 160))

    # --- valon risti ---
    bi = float(track("beam_i", t))
    if bi > 0.002:
        bi *= 1 + 0.04 * math.sin(2.1 * t)
        cross_y = (0.36 if W > H else 0.34) * H
        pv = float(track("beam_v", t))
        if pv > 0:
            front = -0.15 * H + pv * 1.35 * H
            yprof = (1 - smoothstep((ys - (front - 0.18 * H)) / (0.18 * H))) * (1 - 0.6 * ys / H)
            yprof = yprof * (1 + 0.5 * gauss1d(ys, cross_y, 0.12 * S * 1080))
            # ristin alaosa himmenee, jotta alla oleva teksti erottuu
            yprof = yprof * (1 - 0.72 * smoothstep((ys - cross_y - 0.04 * H) / (0.26 * H)))
            xprof = gauss1d(xs, cx, 5.0 * S) + 0.30 * gauss1d(xs, cx, 55 * S) + 0.10 * gauss1d(xs, cx, 180 * S)
            add_light(yprof.astype(np.float32)[:, None] * xprof[None, :] * bi, (255, 228, 184))
        ph = float(track("beam_h", t))
        if ph > 0:
            hl = ph * 0.30 * S * 1080
            dx = np.abs(xs - cx)
            xprof = smoothstep((hl - dx) / (0.08 * S * 1080)).astype(np.float32)
            yprof = gauss1d(ys, cross_y, 5.0 * S) + 0.30 * gauss1d(ys, cross_y, 55 * S) + 0.10 * gauss1d(ys, cross_y, 180 * S)
            add_light(yprof[:, None] * xprof[None, :] * bi, (255, 228, 184))

    # --- partikkelit ---
    pi_ = float(track("part_i", t))
    if pi_ > 0.002:
        m = int(40 * S)
        layer = np.zeros((H + 2 * m, W + 2 * m), dtype=np.float32)
        rc = G["rise_cum"][min(i, len(G["rise_cum"]) - 1)]
        px = (G["p_x0"] * (W + 2 * m) + G["p_drift"] * t
              + G["p_amp"] * np.sin(G["p_wf"] * t * 2 * np.pi + G["p_ph"])) % (W + 2 * m)
        py = (G["p_y0"] * (H + 2 * m) - rc * H * G["p_speed"]
              + G["p_amp"] * 0.6 * np.cos(G["p_wf"] * 0.7 * t * 2 * np.pi + G["p_ph"])) % (H + 2 * m)
        br = G["p_b"] * (0.55 + 0.45 * np.sin(G["p_tw"] * t * 2 * np.pi + G["p_ph"])) * pi_
        for k in range(len(px)):
            rad, ks = G["kernels"][G["p_size"][k]]
            ix, iy = int(px[k]), int(py[k])
            kern = ks[int((py[k] - iy) * 4)][int((px[k] - ix) * 4)]
            y0, x0 = iy - rad, ix - rad
            y1, x1 = y0 + kern.shape[0], x0 + kern.shape[1]
            if y0 < 0 or x0 < 0 or y1 > layer.shape[0] or x1 > layer.shape[1]:
                continue
            layer[y0:y1, x0:x1] += kern * br[k]
        layer = layer[m:m + H, m:m + W]
        # hehku: pienennä, sumenna, suurenna
        q = 4
        hq, wq = H // q, W // q
        small = layer[:hq * q, :wq * q].reshape(hq, q, wq, q).mean(axis=(1, 3))
        small = blur(small, 2)
        glow = np.asarray(Image.fromarray(small).resize((W, H), Image.BILINEAR))
        warm = float(track("warmth", t))
        col = np.array([255, 214, 160]) * warm + np.array([190, 205, 240]) * (1 - warm)
        add_light(layer * 0.9 + glow * 7.0, col)

    # --- sävykartoitus, vinjetti, häivytys ---
    k0 = 0.72
    over = np.maximum(img - k0, 0)
    img = np.minimum(img, k0) + (1 - k0) * (1 - np.exp(-over / (1 - k0)))
    img = img * G["vignette"]

    # --- tekstit ---
    for t0, t1, units in G["blocks"]:
        if t < t0 - 0.01 or t > t1:
            continue
        exit_a = 1 - smoothstep((t - (t1 - EXIT_FADE)) / EXIT_FADE)
        for u in units:
            if t < u.t_on:
                continue
            p = (t - u.t_on) / u.fade
            a = float(smoothstep(p)) * float(exit_a)
            if a <= 0.003:
                continue
            fy = u.y + (1 - ease_out(p)) * u.rise
            iy = int(math.floor(fy))
            f = fy - iy
            ix = int(round(u.x))
            mask, shadow = u.mask, u.shadow
            if f > 0.01:  # alipikselisiirto pystysuunnassa
                mask = (1 - f) * mask + f * np.pad(mask, ((1, 0), (0, 0)))[:-1]
                shadow = (1 - f) * shadow + f * np.pad(shadow, ((1, 0), (0, 0)))[:-1]
            h, w = mask.shape
            y0, x0 = max(iy, 0), max(ix, 0)
            y1, x1 = min(iy + h, H), min(ix + w, W)
            if y1 <= y0 or x1 <= x0:
                continue
            sl = (slice(y0 - iy, y1 - iy), slice(x0 - ix, x1 - ix))
            reg = img[y0:y1, x0:x1]
            reg *= (1 - shadow[sl] * 0.55 * a)[:, :, None]
            if u.glowmask is not None:
                reg += u.glowmask[sl][:, :, None] * (u.glow * a) * np.array([1.0, 0.80, 0.55], dtype=np.float32)
            m_ = (mask[sl] * a)[:, :, None]
            reg *= (1 - m_)
            reg += m_ * u.color
            img[y0:y1, x0:x1] = reg

    img = img * float(track("fade", t))
    img = img + G["grain"][i % len(G["grain"])]
    return (np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)


def frame_bytes(i):
    return render_frame(i).tobytes()


# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--format", choices=["16x9", "9x16"], default="16x9")
    ap.add_argument("--out", default="evankeliumi_16x9.mp4")
    ap.add_argument("--audio")
    ap.add_argument("--start", type=float, default=0.0)
    ap.add_argument("--end", type=float, default=TL.DURATION)
    ap.add_argument("--stills", help="pilkulla erotetut ajat (s), tallentaa PNG-kuvat")
    ap.add_argument("--stills-dir", default=".")
    ap.add_argument("--workers", type=int, default=os.cpu_count() or 4)
    args = ap.parse_args()

    W, H = (1920, 1080) if args.format == "16x9" else (1080, 1920)
    setup(W, H)

    if args.stills:
        os.makedirs(args.stills_dir, exist_ok=True)
        for s in args.stills.split(","):
            i = int(round(float(s) * TL.FPS))
            path = os.path.join(args.stills_dir, f"{args.format}_{float(s):06.2f}.png")
            Image.fromarray(render_frame(i)).save(path)
            print(path)
        return

    f0, f1 = int(args.start * TL.FPS), int(args.end * TL.FPS)
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(TL.FPS), "-i", "-"]
    if args.audio:
        cmd += ["-ss", f"{args.start}", "-i", args.audio, "-map", "0:v", "-map", "1:a",
                "-c:a", "aac", "-b:a", "192k", "-shortest"]
    cmd += ["-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
            "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-x264-params", "aq-mode=3",
            "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
            "-movflags", "+faststart", args.out]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    ctx = mp.get_context("fork")
    n = f1 - f0
    with ctx.Pool(args.workers) as pool:
        for k, buf in enumerate(pool.imap(frame_bytes, range(f0, f1), chunksize=4)):
            proc.stdin.write(buf)
            if k % (TL.FPS * 5) == 0:
                print(f"\r{k / TL.FPS:6.1f} s / {n / TL.FPS:.1f} s", end="", file=sys.stderr, flush=True)
    proc.stdin.close()
    rc = proc.wait()
    print(f"\nvalmis: {args.out}" if rc == 0 else f"\nffmpeg virhe {rc}", file=sys.stderr)
    sys.exit(rc)


if __name__ == "__main__":
    main()
