#!/usr/bin/env python3
"""Build deterministic derivatives from the approved Crow mascot v3 master.

The canonical PNG is never redrawn or overwritten. Every active derivative is
created from that one mascot using only crop, resample, background, accent
light, compositing, and runtime encoding.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
MASTERS = ASSETS / "mascots" / "masters"
MASCOT_RUNTIME = ASSETS / "mascots" / "runtime"
MASCOT_SOURCE = MASTERS / "crow-mascot-v3.png"
MASCOT_SOURCE_HASH = (
    "d640ce9685aca512375be5cb66600ebfdf3a4bccbb5f32479798a6ef3917b319"
)
MARK_MASTER = ASSETS / "marks" / "crow-signal-master.png"
MARK_RUNTIME = ASSETS / "marks" / "runtime"
BACKGROUND = ASSETS / "backgrounds" / "void-grid-neutral.png"
PRODUCT_DIR = ASSETS / "product-variants"
PRODUCT_RUNTIME = PRODUCT_DIR / "runtime"
SOCIAL_BANNER = ASSETS / "social" / "crow-family-banner.png"

IDENTITY_VERSION = "v3"
HERO_SIZE = (2400, 1350)
BANNER_SIZE = (2400, 1200)
LANCZOS = Image.Resampling.LANCZOS

PRODUCTS = {
    "crowclaw": ("#32DFFF", "#6D4AFF"),
    "crow-godmod3": ("#8B6CFF", "#32DFFF"),
    "crowquant": ("#18BFFF", "#596CFF"),
    "crownest": ("#32DFFF", "#5540C8"),
    "crowmemory": ("#8B6CFF", "#18BFFF"),
    "crowflix": ("#C93CFF", "#32DFFF"),
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify_source() -> None:
    if not MASCOT_SOURCE.is_file():
        raise FileNotFoundError(f"Missing approved mascot master: {MASCOT_SOURCE}")
    actual = sha256(MASCOT_SOURCE)
    if actual != MASCOT_SOURCE_HASH:
        raise RuntimeError(
            "Approved mascot checksum changed: crow-mascot-v3.png; "
            f"expected {MASCOT_SOURCE_HASH}, got {actual}"
        )
    with Image.open(MASCOT_SOURCE) as image:
        if image.mode != "RGBA" or image.getbbox() is None:
            raise RuntimeError("Canonical mascot must be a non-empty RGBA image")


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "PNG", optimize=True, compress_level=9)


def save_runtime(image: Image.Image, stem: Path) -> list[Path]:
    stem.parent.mkdir(parents=True, exist_ok=True)
    webp = stem.with_suffix(".webp")
    avif = stem.with_suffix(".avif")
    runtime = image.convert("RGBA") if "A" in image.mode else image.convert("RGB")
    runtime.save(webp, "WEBP", quality=88, method=6, exact=True)
    runtime.save(avif, "AVIF", quality=72, speed=6)
    return [webp, avif]


def add_radial_glow(
    canvas: Image.Image,
    colour: str,
    centre: tuple[float, float],
    diameter: int,
    opacity: int,
) -> None:
    alpha = ImageOps.invert(Image.radial_gradient("L"))
    alpha = alpha.resize((diameter, diameter), LANCZOS)
    alpha = alpha.point(lambda value: round(value * opacity / 255))
    glow = Image.new("RGBA", (diameter, diameter), colour)
    glow.putalpha(alpha)
    left = round(centre[0] * canvas.width - diameter / 2)
    top = round(centre[1] * canvas.height - diameter / 2)
    canvas.alpha_composite(glow, (left, top))


def create_signal_mark(source: Image.Image) -> Image.Image:
    """Crop the canonical face and breast without changing its anatomy."""
    crop = source.crop((252, 28, 840, 616))
    crop = crop.resize((1024, 1024), LANCZOS)
    ground = Image.new("RGBA", crop.size, "#03040A")
    add_radial_glow(ground, "#734CFF", (0.50, 0.44), 920, 72)
    add_radial_glow(ground, "#45E7FF", (0.50, 0.54), 700, 45)
    ground.alpha_composite(crop)
    return ground.convert("RGB")


def create_ground(size: tuple[int, int], accents: tuple[str, str]) -> Image.Image:
    base = ImageOps.fit(Image.open(BACKGROUND).convert("RGB"), size, LANCZOS)
    base = ImageEnhance.Color(base).enhance(0.82)
    base = ImageEnhance.Brightness(base).enhance(0.60).convert("RGBA")
    add_radial_glow(base, accents[0], (0.77, 0.42), round(size[1] * 1.18), 82)
    add_radial_glow(base, accents[1], (0.88, 0.72), round(size[1] * 0.88), 56)
    return base


def place_mascot(
    canvas: Image.Image,
    source: Image.Image,
    *,
    height_ratio: float,
    right_ratio: float,
    bottom_ratio: float,
) -> None:
    mascot = source.crop(source.getbbox())
    target_height = round(canvas.height * height_ratio)
    target_width = round(mascot.width * target_height / mascot.height)
    mascot = mascot.resize((target_width, target_height), LANCZOS)
    x = canvas.width - mascot.width - round(canvas.width * right_ratio)
    y = canvas.height - mascot.height - round(canvas.height * bottom_ratio)
    canvas.alpha_composite(mascot, (x, y))


def compose_product_hero(
    source: Image.Image,
    accents: tuple[str, str],
) -> Image.Image:
    canvas = create_ground(HERO_SIZE, accents)
    place_mascot(
        canvas,
        source,
        height_ratio=0.96,
        right_ratio=0.025,
        bottom_ratio=0.01,
    )
    return canvas.convert("RGB")


def compose_banner(source: Image.Image) -> Image.Image:
    canvas = create_ground(BANNER_SIZE, ("#734CFF", "#45E7FF"))
    place_mascot(
        canvas,
        source,
        height_ratio=0.96,
        right_ratio=0.10,
        bottom_ratio=0.0,
    )
    return canvas.convert("RGB")


def image_record(path: Path, kind: str, source: Path) -> dict[str, object]:
    with Image.open(path) as image:
        return {
            "file": path.relative_to(ROOT).as_posix(),
            "kind": kind,
            "source": source.relative_to(ROOT).as_posix(),
            "width": image.width,
            "height": image.height,
            "format": image.format,
            "bytes": path.stat().st_size,
            "sha256": sha256(path),
        }


def build() -> None:
    verify_source()
    records: list[dict[str, object]] = []
    mascot = Image.open(MASCOT_SOURCE).convert("RGBA")

    mark = create_signal_mark(mascot)
    save_png(mark, MARK_MASTER)
    records.append(image_record(MARK_MASTER, "crow-signal-master", MASCOT_SOURCE))
    for size in (512, 1024):
        resized = mark.resize((size, size), LANCZOS)
        for path in save_runtime(
            resized,
            MARK_RUNTIME / f"crow-signal-master-{size}",
        ):
            records.append(image_record(path, "runtime-mark", MASCOT_SOURCE))

    MASCOT_RUNTIME.mkdir(parents=True, exist_ok=True)
    runtime_mascot = mascot.copy()
    runtime_mascot.thumbnail((1536, 1536), LANCZOS)
    for path in save_runtime(runtime_mascot, MASCOT_RUNTIME / "crow-mascot-v3"):
        records.append(image_record(path, "runtime-mascot", MASCOT_SOURCE))

    PRODUCT_RUNTIME.mkdir(parents=True, exist_ok=True)
    for product, accents in PRODUCTS.items():
        hero = compose_product_hero(mascot, accents)
        hero_path = PRODUCT_DIR / f"{product}-hero.png"
        save_png(hero, hero_path)
        records.append(image_record(hero_path, "product-hero-master", MASCOT_SOURCE))
        for path in save_runtime(hero, PRODUCT_RUNTIME / f"{product}-hero"):
            records.append(image_record(path, "runtime-product-hero", MASCOT_SOURCE))

    banner = compose_banner(mascot)
    save_png(banner, SOCIAL_BANNER)
    records.append(image_record(SOCIAL_BANNER, "social-banner-master", MASCOT_SOURCE))

    manifest = {
        "name": "Crow Visual Identity v3",
        "identity_version": IDENTITY_VERSION,
        "generator": "scripts/build_visual_assets.py",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_policy": (
            "crow-mascot-v3.png is the sole active mascot. Derivatives use only "
            "crop, resample, background, accent light, compositing, and format "
            "encoding. Earlier mascot files remain untouched legacy records."
        ),
        "source": {
            "file": MASCOT_SOURCE.relative_to(ROOT).as_posix(),
            "sha256": MASCOT_SOURCE_HASH,
        },
        "product_roles": {
            product: "crow-mascot-v3"
            for product in PRODUCTS
        },
        "files": records,
    }
    manifest_path = ASSETS / "visual-identity-v3-manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Built {len(records)} Crow visual identity v3 derivatives.")
    print(f"Wrote {manifest_path.relative_to(ROOT).as_posix()}.")


if __name__ == "__main__":
    build()
