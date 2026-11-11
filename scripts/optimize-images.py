"""Regenerate web delivery assets from retained originals (requires Pillow)."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
for name in (
    'planespot-a350-900-blank', 'planespot-a350-900-operator',
    'planespot-a350-900-no-text', 'collection-home', 'collection-navigation',
):
    source = Image.open(ROOT / 'prototype' / f'{name}.png').convert('RGBA')
    if name == 'collection-navigation':
        # Only rows 2389–2563 are visible through the existing button circles.
        # Keep a small margin and the original canvas size/alignment.
        visible = Image.new('RGBA', source.size)
        visible.paste(source.crop((0, 2380, source.width, 2570)), (0, 2380))
        source = visible
    for width in (804, 1206):
        size = (width, round(source.height * width / source.width))
        source.resize(size, Image.Resampling.LANCZOS).save(
            ROOT / 'prototype' / f'{name}-{width}.webp', quality=88, method=6,
        )

Image.open(ROOT / 'assets/hat.png').resize((494, 362), Image.Resampling.LANCZOS).save(
    ROOT / 'assets/hat.webp', quality=88, method=6,
)
Image.open(ROOT / 'prototype/airport-camera-ground.jpg').save(
    ROOT / 'prototype/airport-camera-ground.webp', quality=82, method=6,
)
Image.open(ROOT / 'prototype/airport-terminal-v2.png').resize((1944, 1224), Image.Resampling.LANCZOS).save(
    ROOT / 'prototype/airport-terminal-v2.webp', quality=85, method=6,
)
