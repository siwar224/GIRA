"""
Builds public/crea/ing/ing-cheese-dusting.png: a transparent overlay, the same size as the
plates (1448x1086), with fine grated parmesan scattered over the pasta area.

Every shred is a real piece of texture cut from public/crea/ing/ing-cheese.png (which is
left untouched), keyed on brightness so shadows between shreds become transparent.
Run:  python scripts/make-cheese-dusting.py
"""
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public/crea/ing/ing-cheese.png"
OUT = ROOT / "public/crea/ing/ing-cheese-dusting.png"

W, H = 1448, 1086
# Pasta oval measured on the plates (centre and radii as fractions of the image).
CX, CY, RX, RY = 0.49, 0.50, 0.215, 0.235
CLUMPS = 560  # little clusters of strands, as grated cheese falls
SEED = 7

random.seed(SEED)
src = Image.open(SRC).convert("RGBA")
sw, sh = src.size
alpha = src.getchannel("A")
lum = src.convert("L")

# Candidate crop centres: well inside the cheese pile.
candidates = [
    (x, y)
    for y in range(0, sh, 6)
    for x in range(0, sw, 6)
    if alpha.getpixel((x, y)) > 250 and lum.getpixel((x, y)) > 175
]


def shred() -> Image.Image:
    """One thin strand of real grated cheese: real texture, masked to a short curved sliver."""
    length = random.uniform(5, 12)
    width = random.uniform(1.9, 3.6)
    pad = 4
    size = int(length + pad * 2)
    x, y = random.choice(candidates)
    box = (max(0, x - size // 2), max(0, y - size // 2), max(0, x - size // 2) + size, max(0, y - size // 2) + size)
    piece = src.crop(box).resize((size, size))
    # Parmesan, not straw: lift the texture towards a warm creamy white.
    rgb = Image.merge("RGB", piece.split()[:3])
    rgb = Image.blend(rgb, Image.new("RGB", rgb.size, (250, 238, 205)), 0.45)
    piece = Image.merge("RGBA", (*rgb.split(), piece.getchannel("A")))
    # Mask: a short, slightly curved stroke (drawn 4x larger, then downsampled for soft edges).
    k = 4
    m = Image.new("L", (size * k, size * k), 0)
    d = ImageDraw.Draw(m)
    bend = random.uniform(-0.25, 0.25)
    pts = []
    for i in range(7):
        u = i / 6 - 0.5
        pts.append(((size / 2 + u * length) * k, (size / 2 + bend * length * (u * u * 4 - 1) * 0.5) * k))
    d.line(pts, fill=255, width=max(1, round(width * k)), joint="curve")
    m = m.resize((size, size), Image.LANCZOS)
    opacity = random.uniform(0.85, 1.0)
    piece.putalpha(m.point(lambda v: round(v * opacity)))
    return piece.rotate(random.uniform(0, 360), resample=Image.BICUBIC, expand=True)


out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
for _ in range(CLUMPS):
    # Clumps are denser towards the middle of the pasta, sparse at its edge.
    r = math.sqrt(random.random()) ** 1.2
    t = random.uniform(0, 2 * math.pi)
    cx = W * (CX + RX * r * math.cos(t))
    cy = H * (CY + RY * r * math.sin(t))
    for _ in range(random.randint(4, 14)):
        x = cx + random.gauss(0, 11)
        y = cy + random.gauss(0, 8)
        p = shred()
        # 3/4 view: strands further back (top) look a little smaller.
        depth = 0.8 + 0.35 * (y / H - (CY - RY)) / (2 * RY)
        p = p.resize((max(2, round(p.width * depth)), max(2, round(p.height * depth))), Image.LANCZOS)
        out.alpha_composite(p, (max(0, round(x - p.width / 2)), max(0, round(y - p.height / 2))))

# A whisper of contact shadow so the shreds sit on the pasta instead of floating.
shadow = out.getchannel("A").filter(ImageFilter.GaussianBlur(2)).point(lambda v: v * 0.25)
shadow_img = Image.new("RGBA", (W, H), (90, 30, 10, 0))
shadow_img.putalpha(shadow)
final = Image.new("RGBA", (W, H), (0, 0, 0, 0))
final.alpha_composite(shadow_img, (2, 3))
final.alpha_composite(out)
final.save(OUT, optimize=True)
print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)")
