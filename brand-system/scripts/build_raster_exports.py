"""Build deterministic social, wallpaper, and web exports.

The approved generated masters remain untouched. This script only resizes and
crops them into practical delivery formats.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
LANCZOS = Image.Resampling.LANCZOS


def cover(source: Path, destination: Path, size: tuple[int, int], focus_x: float = 0.5) -> None:
    image = Image.open(source).convert("RGB")
    target_w, target_h = size
    scale = max(target_w / image.width, target_h / image.height)
    resized = image.resize(
        (round(image.width * scale), round(image.height * scale)),
        LANCZOS,
    )
    left = round((resized.width - target_w) * focus_x)
    left = max(0, min(left, resized.width - target_w))
    top = max(0, (resized.height - target_h) // 2)
    result = resized.crop((left, top, left + target_w, top + target_h))
    destination.parent.mkdir(parents=True, exist_ok=True)
    result.save(destination, optimize=True)


def contain(source: Path, destination: Path, size: tuple[int, int]) -> None:
    image = Image.open(source).convert("RGB")
    fitted = ImageOps.contain(image, size, LANCZOS)
    canvas = Image.new("RGB", size, "#02030A")
    canvas.paste(fitted, ((size[0] - fitted.width) // 2, (size[1] - fitted.height) // 2))
    destination.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(destination, optimize=True)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> None:
    banner = ROOT / "assets/social/crow-family-banner.png"
    background = ROOT / "assets/backgrounds/void-grid-neutral.png"
    product_dir = ROOT / "assets/product-variants"

    outputs: list[Path] = []

    social_specs = [
        ("crow-family-open-graph-1200x630.png", (1200, 630), 0.0),
        ("crow-family-github-1280x640.png", (1280, 640), 0.0),
        ("crow-family-wide-1500x500.png", (1500, 500), 0.0),
        ("crow-family-post-1080x1080.png", (1080, 1080), 0.0),
        ("crow-family-story-1080x1920.png", (1080, 1920), 0.0),
    ]
    for name, size, focus in social_specs:
        target = ROOT / "assets/social/exports" / name
        cover(banner, target, size, focus)
        outputs.append(target)

    background_specs = [
        ("void-grid-1920x1080.png", (1920, 1080)),
        ("void-grid-2560x1440.png", (2560, 1440)),
        ("void-grid-3440x1440.png", (3440, 1440)),
        ("void-grid-mobile-1440x2560.png", (1440, 2560)),
        ("void-grid-square-2048x2048.png", (2048, 2048)),
    ]
    for name, size in background_specs:
        target = ROOT / "assets/backgrounds/exports" / name
        contain(background, target, size)
        outputs.append(target)

    for source in sorted(product_dir.glob("*-hero.png")):
        stem = source.stem.removesuffix("-hero")
        for suffix, size in [
            ("1920x1080", (1920, 1080)),
            ("1200x630", (1200, 630)),
        ]:
            target = product_dir / "exports" / f"{stem}-{suffix}.png"
            cover(source, target, size)
            outputs.append(target)

    manifest = {
        "version": "0.1.0",
        "generator": "scripts/build_raster_exports.py",
        "outputs": [
            {
                "file": path.relative_to(ROOT).as_posix(),
                "bytes": path.stat().st_size,
                "sha256": sha256(path),
            }
            for path in outputs
        ],
    }
    manifest_path = ROOT / "assets/raster-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Built {len(outputs)} raster exports.")


if __name__ == "__main__":
    main()

