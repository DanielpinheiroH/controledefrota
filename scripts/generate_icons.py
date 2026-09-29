"""Generate deterministic, code-native PWA icons with Pillow."""
from pathlib import Path
from PIL import Image, ImageDraw

target = Path('/icons')
target.mkdir(parents=True, exist_ok=True)
for size in (192, 512):
    image = Image.new('RGB', (size, size), '#123c36')
    draw = ImageDraw.Draw(image)
    def box(coords):
        return tuple(int(c * size / 512) for c in coords)
    draw.rounded_rectangle(box((108, 162, 300, 322)), radius=int(size*.025), fill='#e5f2ea')
    draw.rounded_rectangle(box((310, 204, 398, 322)), radius=int(size*.02), fill='#77b494')
    draw.rectangle(box((326, 218, 379, 262)), fill='#123c36')
    for x in (165, 352):
        draw.ellipse(box((x-30, 295, x+30, 355)), fill='#123c36', outline='#e5f2ea', width=max(2,int(size*.018)))
    image.save(target / f'icon-{size}.png')
