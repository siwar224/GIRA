"""
Builds single-piece seafood cut-outs for "Crea il tuo" from the multi-piece photos
(public/crea/ing/ing-prawns.png, ing-mussels.png, ing-clams.png — all left untouched):

  ing-prawn-single.png   the front prawn
  ing-mussel-a/b.png     the two mussels
  ing-clam-a/b/c.png     the three clams with meat (the empty half shell is skipped)

Each piece is traced (outline in % of the 600×600 source), intersected with the photo's own
alpha, feathered so no hard cut shows, graded to the plates' warm light, given a whisper of
sauce on its underside, then centred on a square transparent canvas.
Run:  python scripts/make-pieces.py
"""
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
ING = ROOT / "public/crea/ing"
SUPER = 4


def view(points):
    """Outlines were traced on a 2× view of the source's centre (150..450 px) → % of source."""
    return [((150 + x / 2) / 6, (150 + y / 2) / 6) for x, y in points]


JOBS = [
    {
        "src": "ing-prawns.png",
        "out": "ing-prawn-single.png",
        "sauce": 0.55,
        "outline": [
            (44.58, 43.9), (48.5, 43.0), (54.0, 42.6), (60.0, 43.3), (60.83, 47.67), (58.33, 49.83),
            (51.25, 52.08), (47.5, 54.83), (46.25, 57.92), (48.33, 59.83), (53.33, 58.75), (58.33, 55.67),
            (62.33, 52.5), (65.42, 53.33), (65.67, 60.83), (63.5, 66.83), (58.33, 71.83), (50.83, 74.5),
            (40.0, 73.67), (32.33, 69.33), (30.33, 63.5), (31.25, 58.33), (35.0, 54.83), (40.0, 51.67),
            (44.0, 48.5),
        ],
    },
    {
        "src": "ing-mussels.png",
        "out": "ing-mussel-a.png",  # front / lower mussel
        "sauce": 0.35,
        "outline": view([
            (35, 535), (120, 430), (230, 345), (330, 300), (430, 268), (510, 262), (560, 290), (578, 360),
            (560, 450), (500, 520), (420, 548), (300, 555), (160, 552), (60, 548),
        ]),
    },
    {
        "src": "ing-mussels.png",
        "out": "ing-mussel-b.png",  # back / upper mussel
        "sauce": 0.35,
        "outline": view([
            (25, 322), (70, 240), (150, 170), (260, 90), (300, 45), (330, 40), (400, 70), (425, 130),
            (420, 200), (400, 258), (330, 296), (230, 326), (140, 334), (40, 336),
        ]),
    },
    {
        "src": "ing-clams.png",
        "out": "ing-clam-a.png",  # top left
        "sauce": 0.3,
        "outline": view([
            (30, 170), (60, 80), (130, 30), (220, 20), (285, 40), (305, 110), (300, 200), (260, 240),
            (170, 275), (90, 275), (40, 240),
        ]),
    },
    {
        "src": "ing-clams.png",
        "out": "ing-clam-b.png",  # bottom left
        "sauce": 0.3,
        "outline": view([
            (20, 380), (60, 300), (140, 255), (230, 255), (290, 290), (300, 380), (290, 440), (230, 505),
            (150, 540), (90, 525), (40, 490),
        ]),
    },
    {
        "src": "ing-clams.png",
        "out": "ing-clam-c.png",  # bottom right
        "sauce": 0.3,
        "outline": view([
            (300, 370), (320, 300), (390, 280), (470, 285), (540, 320), (575, 400), (570, 470), (530, 540),
            (450, 575), (360, 560), (300, 520), (295, 440),
        ]),
    },
]


def build(job):
    src = Image.open(ING / job["src"]).convert("RGBA")
    W, H = src.size

    # 1 · Mask: traced outline ∩ the photo's own alpha, feathered and smoothed.
    big = Image.new("L", (W * SUPER, H * SUPER), 0)
    ImageDraw.Draw(big).polygon([(x / 100 * W * SUPER, y / 100 * H * SUPER) for x, y in job["outline"]], fill=255)
    poly = big.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.6))
    poly = poly.point(lambda v: 0 if v < 70 else min(255, round((v - 70) * 255 / 185)))
    mask = ImageChops.multiply(poly, src.getchannel("A"))
    mask = mask.filter(ImageFilter.GaussianBlur(0.9)).point(lambda v: 0 if v < 40 else min(255, round((v - 40) * 255 / 175)))

    # 2 · Colour: slightly warmer and richer, like the plates' warm studio light.
    rgb = src.convert("RGB")
    rgb = ImageEnhance.Color(rgb).enhance(1.08)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.05)
    rgb = Image.blend(rgb, ImageChops.multiply(rgb, Image.new("RGB", rgb.size, (255, 196, 150))), 0.12)

    # 3 · A whisper of tomato sauce on the underside of the piece.
    box = mask.point(lambda v: 255 if v > 8 else 0).getbbox()
    grad = Image.new("L", (W, H), 0)
    top, bottom = box[1], box[3]
    g = Image.linear_gradient("L").resize((W, max(1, bottom - top)))
    grad.paste(g, (0, top))
    grad = grad.point(lambda v: 0 if v < 150 else round((v - 150) * job["sauce"]))
    sauce = Image.new("RGB", rgb.size, (236, 100, 78))
    rgb = Image.composite(ImageChops.multiply(rgb, sauce), rgb, grad)

    piece = rgb.convert("RGBA")
    piece.putalpha(mask)
    piece = piece.crop(box)
    side = round(max(piece.size) * 1.12)
    out = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    out.alpha_composite(piece, ((side - piece.width) // 2, (side - piece.height) // 2))
    out.save(ING / job["out"], optimize=True)
    print(f"wrote {job['out']} {out.size}")


for job in JOBS:
    build(job)
