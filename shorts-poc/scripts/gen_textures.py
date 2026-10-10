"""Procedural textures (no external assets): paper grains, kraft table, film grain."""
import numpy as np
from PIL import Image, ImageFilter
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "tex"
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(7)


def noise(w, h, sigma):
    n = rng.normal(0, 1, (h, w)).astype("float32")
    img = Image.fromarray(((n - n.min()) / (n.max() - n.min()) * 255).astype("uint8"))
    if sigma:
        img = img.filter(ImageFilter.GaussianBlur(sigma))
    a = np.asarray(img).astype("float32")
    return (a - a.mean()) / (a.std() + 1e-6)


def paper(w, h, base, strength=10, fibers=True):
    base = np.array(base, dtype="float32")
    t = 0.55 * noise(w, h, 0.6) + 0.35 * noise(w, h, 3) + 0.25 * noise(w, h, 18)
    if fibers:  # directional fibre streaks
        f = noise(w, h, 0)
        f = np.asarray(Image.fromarray(((f - f.min()) / (f.max() - f.min()) * 255).astype("uint8")).filter(ImageFilter.GaussianBlur(0.5)), dtype="float32")
        t += 0.15 * ((f - f.mean()) / (f.std() + 1e-6))
    img = base[None, None, :] + t[..., None] * strength
    return Image.fromarray(np.clip(img, 0, 255).astype("uint8"))


# Paper Cutout style
paper(1080, 1920, (226, 205, 168), 7).save(OUT / "kraft.jpg", quality=92)       # table
paper(512, 512, (250, 247, 240), 5).save(OUT / "paper_white.jpg", quality=92)   # card stock tile
paper(512, 512, (255, 255, 255), 9).convert("L").save(OUT / "paper_height.png")  # greyscale blend layer

# Film-grain overlay (Apple style): transparent PNG with sparse white/black specks
g = noise(540, 960, 0.5)
alpha = np.clip(np.abs(g) * 14, 0, 40).astype("uint8")
rgb = np.where(g[..., None] > 0, 255, 0).astype("uint8").repeat(3, axis=2)
Image.fromarray(np.dstack([rgb, alpha]), "RGBA").save(OUT / "grain.png")

# Newsprint tint (Data Journalism): very subtle warm paper
paper(1080, 1920, (255, 241, 229), 3, fibers=False).save(OUT / "newsprint.jpg", quality=92)
print("textures ok", sorted(p.name for p in OUT.iterdir()))
