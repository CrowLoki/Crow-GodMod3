#!/usr/bin/env python3
"""Build the Crow Signal icon family from approved raster masters.

This script performs optical cropping, high-quality resampling, rounded masking,
and packaging only. It does not redraw or synthesize any part of the approved
three-eyed crow artwork.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SIGNAL_SOURCE = ROOT / "assets" / "marks" / "crow-signal-master.png"
PET_SOURCE = ROOT / "assets" / "mascots" / "masters" / "pet-companion.png"
ICON_ROOT = ROOT / "assets" / "icons"
PNG_DIR = ICON_ROOT / "png"
APP_DIR = ICON_ROOT / "app"
AVATAR_DIR = ICON_ROOT / "avatars"

VERSION = "0.1.0"
SQUARE_SIZES = (16, 20, 24, 32, 40, 48, 64, 96, 128, 180, 192, 256, 512, 1024)
APP_SIZES = (256, 512, 1024)
ICO_SIZES = (16, 20, 24, 32, 40, 48, 64, 96, 128, 180, 192, 256)

# Fractional crop boxes are square and intentionally keep the three eyes and
# beak large enough to survive the corresponding optical tier.
SIGNAL_CROPS = {
    "micro": (0.245, 0.175, 0.755, 0.685),
    "compact": (0.18, 0.08, 0.82, 0.72),
    "standard": (0.07, 0.00, 0.93, 0.86),
    "full": (0.00, 0.00, 1.00, 1.00),
    "avatar": (0.14, 0.06, 0.86, 0.78),
}

PET_AVATAR_CROP = (0.21, 0.05, 0.91, 0.5166666667)

# Approximate eye centres in the approved signal master, expressed as source
# fractions. These are used only for visibility validation, never for drawing.
SIGNAL_EYES = (
    (0.402, 0.427),
    (0.600, 0.427),
    (0.500, 0.360),
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def integer_crop_box(
    image: Image.Image,
    fractional_box: tuple[float, float, float, float],
) -> tuple[int, int, int, int]:
    left, top, right, bottom = fractional_box
    centre_x = ((left + right) / 2) * image.width
    centre_y = ((top + bottom) / 2) * image.height
    side = round(
        min(
            (right - left) * image.width,
            (bottom - top) * image.height,
        )
    )
    box = (
        round(centre_x - side / 2),
        round(centre_y - side / 2),
        round(centre_x - side / 2) + side,
        round(centre_y - side / 2) + side,
    )
    if box[0] < 0 or box[1] < 0 or box[2] > image.width or box[3] > image.height:
        raise ValueError(f"Crop lies outside {image.size}: {box}")
    return box


def tier_for_size(size: int) -> str:
    if size <= 48:
        return "micro"
    if size <= 192:
        return "compact"
    if size <= 256:
        return "standard"
    return "full"


def render_crop(
    source: Image.Image,
    size: int,
    fractional_box: tuple[float, float, float, float],
    *,
    sharpen: bool,
) -> tuple[Image.Image, tuple[int, int, int, int]]:
    crop_box = integer_crop_box(source, fractional_box)
    cropped = source.crop(crop_box)
    rendered = cropped.resize((size, size), Image.Resampling.LANCZOS)
    if sharpen:
        radius = 0.45 if size <= 48 else 0.7
        percent = 145 if size <= 48 else 105
        rendered = rendered.filter(
            ImageFilter.UnsharpMask(radius=radius, percent=percent, threshold=2)
        )
    return rendered, crop_box


def save_png(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, "PNG", optimize=True, compress_level=9)


def record_for(
    path: Path,
    *,
    kind: str,
    source_path: Path,
    crop_box: tuple[int, int, int, int] | None = None,
    extra: dict[str, object] | None = None,
) -> dict[str, object]:
    with Image.open(path) as image:
        record: dict[str, object] = {
            "file": path.relative_to(ROOT).as_posix(),
            "kind": kind,
            "source": source_path.relative_to(ROOT).as_posix(),
            "width": image.width,
            "height": image.height,
            "mode": image.mode,
            "bytes": path.stat().st_size,
            "sha256": sha256(path),
        }
    if crop_box is not None:
        record["crop_box"] = list(crop_box)
    if extra:
        record.update(extra)
    return record


def eye_signal_score(
    image: Image.Image,
    source_size: tuple[int, int],
    crop_box: tuple[int, int, int, int],
    eye_fraction: tuple[float, float],
) -> tuple[int, int]:
    source_x = eye_fraction[0] * source_size[0]
    source_y = eye_fraction[1] * source_size[1]
    crop_width = crop_box[2] - crop_box[0]
    crop_height = crop_box[3] - crop_box[1]
    output_x = round((source_x - crop_box[0]) / crop_width * image.width)
    output_y = round((source_y - crop_box[1]) / crop_height * image.height)
    radius = max(1, round(image.width * 0.045))
    region = image.convert("RGB").crop(
        (
            max(0, output_x - radius),
            max(0, output_y - radius),
            min(image.width, output_x + radius + 1),
            min(image.height, output_y + radius + 1),
        )
    )
    pixels = list(region.get_flattened_data())
    peak_blue = max(pixel[2] for pixel in pixels)
    peak_signal = max(max(pixel[0], pixel[2]) - pixel[1] for pixel in pixels)
    return peak_blue, peak_signal


def validate_three_eyes(
    image: Image.Image,
    source_size: tuple[int, int],
    crop_box: tuple[int, int, int, int],
    label: str,
) -> list[dict[str, int]]:
    scores: list[dict[str, int]] = []
    for index, eye in enumerate(SIGNAL_EYES, start=1):
        peak_blue, peak_signal = eye_signal_score(image, source_size, crop_box, eye)
        if peak_blue < 72 or peak_signal < 12:
            raise RuntimeError(
                f"{label}: eye {index} lost signal "
                f"(blue={peak_blue}, chroma={peak_signal})"
            )
        scores.append(
            {
                "eye": index,
                "peak_blue": peak_blue,
                "peak_signal": peak_signal,
            }
        )
    return scores


def rounded_square(image: Image.Image, radius_ratio: float = 0.22) -> Image.Image:
    output = image.convert("RGBA")
    mask = Image.new("L", output.size, 0)
    draw = ImageDraw.Draw(mask)
    radius = round(output.width * radius_ratio)
    draw.rounded_rectangle(
        (0, 0, output.width - 1, output.height - 1),
        radius=radius,
        fill=255,
    )
    output.putalpha(mask)
    return output


def checkerboard(size: tuple[int, int], cell: int = 16) -> Image.Image:
    board = Image.new("RGB", size, "#0A0F20")
    draw = ImageDraw.Draw(board)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill="#11182A")
    return board


def composite_rgba_on(image: Image.Image, background: Image.Image) -> Image.Image:
    output = background.convert("RGBA")
    output.alpha_composite(image.convert("RGBA"))
    return output.convert("RGB")


def label_font(size: int) -> ImageFont.ImageFont:
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def build_contact_sheet(
    square_paths: list[Path],
    app_paths: list[Path],
    signal_avatar: Path,
    pet_avatar: Path,
) -> Path:
    canvas = Image.new("RGB", (2400, 1760), "#050711")
    draw = ImageDraw.Draw(canvas)
    title_font = label_font(48)
    label = label_font(24)
    small = label_font(19)

    draw.rounded_rectangle(
        (60, 50, 2340, 1710),
        radius=42,
        fill="#0A0F20",
        outline="#29345F",
        width=3,
    )
    draw.text((120, 95), "CROW SIGNAL ICON FAMILY / V0.1", font=title_font, fill="#F2F7FF")
    draw.text(
        (120, 160),
        "Optical crops preserve the approved three-eye geometry at every size.",
        font=label,
        fill="#8B6CFF",
    )

    draw.text((120, 245), "SQUARE PNG OPTICAL TIERS", font=label, fill="#32DFFF")
    x, y = 120, 305
    cell_width = 150
    for path in square_paths:
        with Image.open(path) as source:
            icon = source.convert("RGB")
            size = icon.width
            preview_size = 112
            method = Image.Resampling.NEAREST if size <= 64 else Image.Resampling.LANCZOS
            preview = icon.resize((preview_size, preview_size), method)
            canvas.paste(preview, (x + 12, y + 10))
            draw.rectangle(
                (x + 11, y + 9, x + 12 + preview_size, y + 10 + preview_size),
                outline="#29345F",
                width=1,
            )
            draw.text((x + 12, y + 130), f"{size}px", font=small, fill="#F2F7FF")
            draw.text((x + 12, y + 154), tier_for_size(size), font=small, fill="#7F8DA8")
        x += cell_width
        if x + cell_width > 2280:
            x = 120
            y += 205

    section_y = 770
    draw.text((120, section_y), "ROUNDED APP ICONS", font=label, fill="#32DFFF")
    x = 120
    for path in app_paths:
        with Image.open(path) as source:
            icon = source.convert("RGBA").resize((230, 230), Image.Resampling.LANCZOS)
            board = checkerboard((230, 230), 18)
            canvas.paste(composite_rgba_on(icon, board), (x, section_y + 55))
            draw.text(
                (x, section_y + 298),
                f"{source.width}px",
                font=small,
                fill="#F2F7FF",
            )
        x += 290

    draw.text((1060, section_y), "AVATARS", font=label, fill="#32DFFF")
    for index, (name, path) in enumerate(
        (("Signal", signal_avatar), ("Pet Companion", pet_avatar))
    ):
        with Image.open(path) as source:
            preview = source.convert("RGB").resize((330, 330), Image.Resampling.LANCZOS)
            px = 1060 + index * 430
            canvas.paste(preview, (px, section_y + 55))
            draw.text(
                (px, section_y + 398),
                name,
                font=small,
                fill="#F2F7FF",
            )

    draw.rounded_rectangle(
        (120, 1505, 2280, 1625),
        radius=22,
        fill="#11162F",
        outline="#6D4AFF",
        width=2,
    )
    draw.text(
        (165, 1545),
        "SOURCE-PRESERVING CROPS  /  LANCZOS DOWNSAMPLING  /  NO REDRAW",
        font=label,
        fill="#F2F7FF",
    )

    output = ICON_ROOT / "contact-sheet.png"
    save_png(canvas, output)
    return output


def validate_ico(path: Path, expected_sizes: tuple[int, ...]) -> list[list[int]]:
    with Image.open(path) as ico:
        sizes = sorted(ico.ico.sizes())
        expected = sorted((size, size) for size in expected_sizes)
        if sizes != expected:
            raise RuntimeError(f"ICO entries differ: expected {expected}, got {sizes}")
        for size in sizes:
            frame = ico.ico.getimage(size)
            if frame.size != size:
                raise RuntimeError(f"ICO frame {size} decoded as {frame.size}")
    return [[width, height] for width, height in sizes]


def build() -> None:
    for directory in (PNG_DIR, APP_DIR, AVATAR_DIR):
        directory.mkdir(parents=True, exist_ok=True)

    signal = Image.open(SIGNAL_SOURCE).convert("RGB")
    pet = Image.open(PET_SOURCE).convert("RGB")
    if signal.width != signal.height:
        raise RuntimeError(f"Signal master must be square, got {signal.size}")

    records: list[dict[str, object]] = []
    square_paths: list[Path] = []
    optical_frames: dict[int, Image.Image] = {}

    for size in SQUARE_SIZES:
        tier = tier_for_size(size)
        image, crop_box = render_crop(
            signal,
            size,
            SIGNAL_CROPS[tier],
            sharpen=size <= 256,
        )
        eye_scores = validate_three_eyes(
            image,
            signal.size,
            crop_box,
            f"crow-signal-{size}",
        )
        path = PNG_DIR / f"crow-signal-{size}.png"
        save_png(image, path)
        square_paths.append(path)
        if size <= 256:
            optical_frames[size] = image.convert("RGBA")
        records.append(
            record_for(
                path,
                kind="square-icon",
                source_path=SIGNAL_SOURCE,
                crop_box=crop_box,
                extra={"optical_tier": tier, "eye_scores": eye_scores},
            )
        )

    # Use the exact optical exports as ICO frames instead of asking the ICO
    # encoder to shrink one generic source.
    ico_path = ICON_ROOT / "favicon.ico"
    ico_base = optical_frames[256]
    ico_base.save(
        ico_path,
        format="ICO",
        sizes=[(size, size) for size in ICO_SIZES],
        append_images=[optical_frames[size] for size in ICO_SIZES if size != 256],
    )
    ico_entries = validate_ico(ico_path, ICO_SIZES)
    records.append(
        {
            "file": ico_path.relative_to(ROOT).as_posix(),
            "kind": "multi-size-ico",
            "source": SIGNAL_SOURCE.relative_to(ROOT).as_posix(),
            "entries": ico_entries,
            "bytes": ico_path.stat().st_size,
            "sha256": sha256(ico_path),
        }
    )

    app_paths: list[Path] = []
    for size in APP_SIZES:
        image, crop_box = render_crop(
            signal,
            size,
            SIGNAL_CROPS["full"],
            sharpen=size <= 512,
        )
        rounded = rounded_square(image)
        path = APP_DIR / f"crow-signal-app-rounded-{size}.png"
        save_png(rounded, path)
        app_paths.append(path)
        records.append(
            record_for(
                path,
                kind="rounded-app-icon",
                source_path=SIGNAL_SOURCE,
                crop_box=crop_box,
                extra={"corner_radius_ratio": 0.22},
            )
        )

    signal_avatar_image, signal_avatar_crop = render_crop(
        signal,
        512,
        SIGNAL_CROPS["avatar"],
        sharpen=True,
    )
    signal_avatar = AVATAR_DIR / "crow-signal-avatar-512.png"
    save_png(signal_avatar_image, signal_avatar)
    records.append(
        record_for(
            signal_avatar,
            kind="avatar",
            source_path=SIGNAL_SOURCE,
            crop_box=signal_avatar_crop,
        )
    )

    pet_avatar_image, pet_avatar_crop = render_crop(
        pet,
        512,
        PET_AVATAR_CROP,
        sharpen=True,
    )
    pet_avatar = AVATAR_DIR / "pet-companion-avatar-512.png"
    save_png(pet_avatar_image, pet_avatar)
    records.append(
        record_for(
            pet_avatar,
            kind="pet-avatar",
            source_path=PET_SOURCE,
            crop_box=pet_avatar_crop,
        )
    )

    contact_sheet = build_contact_sheet(
        square_paths,
        app_paths,
        signal_avatar,
        pet_avatar,
    )
    records.append(
        record_for(
            contact_sheet,
            kind="contact-sheet",
            source_path=SIGNAL_SOURCE,
            extra={
                "secondary_source": PET_SOURCE.relative_to(ROOT).as_posix(),
            },
        )
    )

    manifest = {
        "name": "Crow Signal Icon Family",
        "version": VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_policy": (
            "Derived only by crop, Lanczos resampling, restrained sharpening, "
            "and rounded alpha masking. No source artwork was redrawn."
        ),
        "sources": [
            {
                "file": SIGNAL_SOURCE.relative_to(ROOT).as_posix(),
                "width": signal.width,
                "height": signal.height,
                "sha256": sha256(SIGNAL_SOURCE),
            },
            {
                "file": PET_SOURCE.relative_to(ROOT).as_posix(),
                "width": pet.width,
                "height": pet.height,
                "sha256": sha256(PET_SOURCE),
            },
        ],
        "square_sizes": list(SQUARE_SIZES),
        "app_sizes": list(APP_SIZES),
        "ico_sizes": list(ICO_SIZES),
        "resampling": "Pillow Image.Resampling.LANCZOS",
        "files": records,
    }
    manifest_path = ICON_ROOT / "manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Built {len(square_paths)} square Crow Signal PNGs.")
    print(f"Built {len(app_paths)} rounded app icons.")
    print(f"Built {len(ICO_SIZES)} ICO entries.")
    print(f"Built 2 avatars and {contact_sheet.relative_to(ROOT).as_posix()}.")
    print(f"Wrote {manifest_path.relative_to(ROOT).as_posix()}.")


if __name__ == "__main__":
    build()
