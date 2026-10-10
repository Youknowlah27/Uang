"""contact_sheet.py OUT.jpg IMG1 IMG2 ... : grid of downscaled stills (4 per row)."""
import sys
from PIL import Image, ImageDraw
out, imgs = sys.argv[1], sys.argv[2:]
tw, th, cols = 360, 640, 4
rows = (len(imgs) + cols - 1) // cols
sheet = Image.new("RGB", (cols * tw, rows * th), (30, 30, 30))
for i, p in enumerate(imgs):
    im = Image.open(p).convert("RGB").resize((tw, th), Image.LANCZOS)
    sheet.paste(im, ((i % cols) * tw, (i // cols) * th))
sheet.save(out, quality=88)
print(out, sheet.size)
