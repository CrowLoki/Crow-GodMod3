#!/usr/bin/env python3
"""Render an approval-only cybernetic crow-foot cursor proof.

This script creates two native pixel drawings (32 and 48 px) from explicit
bird-foot anatomy.  It does not touch the existing cursor package, Windows
CUR/ANI files, installer, manifest, downloads, site, Git, or deployment.
"""

from __future__ import annotations

import hashlib
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, PngImagePlugin


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "cursors" / "concepts" / "crow-claw-pointer-proof-v0.2.png"

WIDTH = 1800
HEIGHT = 1120
VOID = (5, 7, 15, 255)
PANEL = (9, 13, 25, 255)
EDGE = (35, 43, 66, 255)
INK = (5, 7, 15, 255)
GUNMETAL = (22, 30, 46, 255)
GUNMETAL_2 = (39, 52, 72, 255)
STEEL = (117, 139, 171, 255)
FROST = (230, 246, 255, 255)
CYAN = (57, 224, 255, 255)
VIOLET = (111, 76, 255, 255)
TRANSPARENT = (0, 0, 0, 0)


def label_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        Path("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
    )
    for path in candidates:
        if path.is_file():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default(size=size)


def P(size: int, x: float, y: float) -> tuple[int, int]:
    """Scale a 32-unit design coordinate to the requested native canvas."""

    factor = size / 32
    return round(x * factor), round(y * factor)


def W(size: int, logical: float) -> int:
    return max(1, round(logical * size / 32))


def line(
    draw: ImageDraw.ImageDraw,
    size: int,
    points: list[tuple[float, float]],
    *,
    fill: tuple[int, int, int, int],
    width: float,
) -> None:
    draw.line(
        [P(size, x, y) for x, y in points],
        fill=fill,
        width=W(size, width),
        joint="curve",
    )


def joint(
    draw: ImageDraw.ImageDraw,
    size: int,
    x: float,
    y: float,
    radius: float,
    *,
    outer: tuple[int, int, int, int] = INK,
    inner: tuple[int, int, int, int] = VIOLET,
) -> None:
    cx, cy = P(size, x, y)
    r = W(size, radius)
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=outer)
    inner_r = max(1, r // 2)
    draw.ellipse(
        (cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r),
        fill=inner,
    )


def draw_toe(
    draw: ImageDraw.ImageDraw,
    size: int,
    path: list[tuple[float, float]],
    *,
    highlight: list[tuple[float, float]],
    talon: list[tuple[float, float]],
    outer_width: float,
    core_width: float,
) -> None:
    # Connected black silhouette first, then armour core and one restrained
    # cyan edge.  The talon stays black with a frost click-tip signal.
    line(draw, size, path, fill=INK, width=outer_width)
    line(draw, size, path[1:], fill=GUNMETAL_2, width=core_width)
    line(draw, size, highlight, fill=CYAN, width=0.85)
    line(draw, size, talon, fill=INK, width=max(1.6, core_width))


def render_cursor(size: int) -> Image.Image:
    if size not in (32, 48):
        raise ValueError("Approval proof is hand-calibrated for 32 and 48 px")

    image = Image.new("RGBA", (size, size), TRANSPARENT)
    draw = ImageDraw.Draw(image)

    # Tarsus: a short, broad lower leg trails southeast.  It is deliberately
    # shorter than the longest toe so the cursor cannot read as an arrow shaft.
    tarsus = [(18.0, 18.5), (21.0, 22.0), (24.0, 25.0), (28.5, 29.5)]
    line(draw, size, tarsus, fill=INK, width=7.0)
    line(draw, size, tarsus, fill=GUNMETAL_2, width=4.8)
    line(draw, size, [(19.0, 19.0), (21.7, 22.0), (24.8, 25.2), (28.0, 29.0)], fill=STEEL, width=1.0)
    for x, y in ((21.0, 21.9), (24.1, 25.0), (27.0, 28.0)):
        line(draw, size, [(x - 1.3, y + 1.0), (x + 1.4, y - 1.1)], fill=INK, width=0.9)

    # Three forward anisodactyl digits.  They share one compact palm and fan
    # northwest; the central digit is longest and owns hotspot (1, 3).
    digit_three = [(17.0, 17.0), (13.8, 13.4), (10.2, 9.7), (6.6, 6.4), (3.4, 4.6), (1.0, 3.0)]
    draw_toe(
        draw,
        size,
        digit_three,
        highlight=[(16.2, 16.1), (13.1, 12.7), (9.6, 9.0), (6.0, 5.8), (3.0, 4.0), (1.0, 3.0)],
        talon=[(5.2, 5.5), (3.2, 4.5), (1.0, 3.0)],
        outer_width=5.0,
        core_width=3.2,
    )

    digit_two = [(17.3, 16.7), (16.4, 12.6), (15.6, 8.8), (14.2, 5.6), (12.5, 3.8), (10.8, 4.8)]
    draw_toe(
        draw,
        size,
        digit_two,
        highlight=[(16.7, 16.0), (15.8, 12.1), (15.0, 8.2), (13.6, 5.1), (12.2, 3.7)],
        talon=[(14.2, 5.6), (12.5, 3.8), (10.8, 4.8)],
        outer_width=4.8,
        core_width=3.0,
    )

    digit_four = [(16.8, 18.0), (12.7, 18.0), (8.8, 17.3), (5.5, 15.7), (3.2, 13.6), (1.8, 14.5)]
    draw_toe(
        draw,
        size,
        digit_four,
        highlight=[(16.0, 17.2), (12.2, 17.1), (8.3, 16.4), (5.0, 14.8), (3.0, 13.3)],
        talon=[(5.5, 15.7), (3.2, 13.6), (1.8, 14.5)],
        outer_width=4.9,
        core_width=3.1,
    )

    # Opposed rear hallux: visibly leaves the back of the palm, turns east,
    # then hooks inward.  It is separated from the southeast tarsus.
    hallux = [(19.0, 17.3), (21.7, 15.7), (24.6, 15.7), (27.0, 17.2), (27.0, 19.5), (25.1, 21.2), (23.4, 20.4)]
    draw_toe(
        draw,
        size,
        hallux,
        highlight=[(19.4, 16.7), (22.0, 15.2), (24.5, 15.2), (26.5, 16.7)],
        talon=[(27.0, 17.2), (27.0, 19.5), (25.1, 21.2), (23.4, 20.4)],
        outer_width=4.6,
        core_width=2.8,
    )

    # Compact metatarsal palm and ankle joint, always readable independently
    # of the individual toe decorations.
    cx, cy = P(size, 17.7, 17.6)
    rx, ry = W(size, 3.5), W(size, 3.2)
    draw.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=INK)
    draw.ellipse(
        (cx - max(1, rx - 1), cy - max(1, ry - 1), cx + max(1, rx - 1), cy + max(1, ry - 1)),
        fill=GUNMETAL_2,
    )
    joint(draw, size, 17.8, 17.7, 1.75)

    # Two clear toe joints; no floating sparkles or micro-circuit clutter.
    joint(draw, size, 13.7, 13.4, 1.0, inner=CYAN)
    joint(draw, size, 10.2, 9.7, 0.9, inner=VIOLET)
    joint(draw, size, 16.2, 12.3, 0.9, inner=VIOLET)
    joint(draw, size, 12.6, 17.4, 0.9, inner=CYAN)
    joint(draw, size, 22.0, 15.8, 0.9, inner=VIOLET)

    # Hotspot is the exact upper-left talon tip and is guaranteed opaque.
    image.putpixel((1 if size == 32 else 2, 3 if size == 32 else 4), CYAN)
    return image


def paste_panel_cursor(
    canvas: Image.Image,
    cursor: Image.Image,
    *,
    x: int,
    y: int,
    scale: int,
    background: tuple[int, int, int, int],
) -> None:
    square = Image.new("RGBA", (cursor.width * scale, cursor.height * scale), background)
    enlarged = cursor.resize(square.size, Image.Resampling.NEAREST)
    square.alpha_composite(enlarged)
    canvas.alpha_composite(square, (x, y))


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def render_proof() -> Path:
    cursor32 = render_cursor(32)
    cursor48 = render_cursor(48)

    canvas = Image.new("RGBA", (WIDTH, HEIGHT), VOID)
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle(
        (38, 38, WIDTH - 38, HEIGHT - 38),
        radius=28,
        fill=PANEL,
        outline=EDGE,
        width=3,
    )
    draw.text(
        (84, 72),
        "CROWCLAW POINTER — ANATOMY APPROVAL PROOF",
        font=label_font(36, bold=True),
        fill=FROST,
    )
    draw.text(
        (86, 124),
        "actual bird-foot structure • 3 forward toes + 1 opposed rear hallux • no cursor package changed",
        font=label_font(21),
        fill=STEEL,
    )
    draw.line((84, 174, WIDTH - 84, 174), fill=EDGE, width=2)

    panels = (
        (80, 218, 790, 820, "32 px native design", cursor32, 14),
        (850, 218, 1720, 820, "48 px native redraw", cursor48, 10),
    )
    for left, top, right, bottom, label, cursor, scale in panels:
        draw.rounded_rectangle(
            (left, top, right, bottom),
            radius=22,
            fill=(4, 6, 12, 255),
            outline=EDGE,
            width=2,
        )
        draw.text(
            (left + 28, top + 24),
            label,
            font=label_font(24, bold=True),
            fill=CYAN,
        )
        draw.text(
            (left + 28, top + 61),
            "pixel-faithful magnification",
            font=label_font(18),
            fill=STEEL,
        )
        px = left + (right - left - cursor.width * scale) // 2
        py = top + 112
        paste_panel_cursor(
            canvas,
            cursor,
            x=px,
            y=py,
            scale=scale,
            background=(15, 19, 31, 255),
        )
        hotspot = (
            px + (1 if cursor.width == 32 else 2) * scale,
            py + (3 if cursor.width == 32 else 4) * scale,
        )
        draw.line((hotspot[0] - 12, hotspot[1], hotspot[0] + 12, hotspot[1]), fill=FROST, width=2)
        draw.line((hotspot[0], hotspot[1] - 12, hotspot[0], hotspot[1] + 12), fill=FROST, width=2)

    draw.line((84, 862, WIDTH - 84, 862), fill=EDGE, width=2)
    draw.text(
        (86, 892),
        "ACTUAL SIZE — dark and light backgrounds",
        font=label_font(22, bold=True),
        fill=STEEL,
    )

    x = 96
    for cursor in (cursor32, cursor48):
        for bg in ((15, 19, 31, 255), (235, 239, 243, 255)):
            box_size = 88
            draw.rounded_rectangle(
                (x, 946, x + box_size, 1034),
                radius=12,
                fill=bg,
                outline=EDGE,
                width=1,
            )
            ox = x + (box_size - cursor.width) // 2
            oy = 946 + (88 - cursor.height) // 2
            canvas.alpha_composite(cursor, (ox, oy))
            x += 116

    draw.text(
        (620, 938),
        "Click point",
        font=label_font(19, bold=True),
        fill=CYAN,
    )
    draw.text(
        (620, 972),
        "upper-left tip of the longest forward talon",
        font=label_font(19),
        fill=FROST,
    )
    draw.text(
        (620, 1004),
        "cyan is an edge signal; the claw body remains black / gunmetal",
        font=label_font(18),
        fill=STEEL,
    )

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    metadata = PngImagePlugin.PngInfo()
    metadata.add_text("Title", "CrowClaw pointer anatomy approval proof v0.2")
    metadata.add_text("Cursor sizes", "32,48")
    metadata.add_text("Digits", "three forward toes plus one opposed rear hallux")
    metadata.add_text("Packaged", "false")
    canvas.convert("RGB").save(OUTPUT, "PNG", optimize=True, pnginfo=metadata)

    # Native assets stay concept-only and versioned beside the proof.
    cursor32.save(OUTPUT.with_name("crow-claw-pointer-32-concept-v0.2.png"), "PNG", optimize=True)
    cursor48.save(OUTPUT.with_name("crow-claw-pointer-48-concept-v0.2.png"), "PNG", optimize=True)

    for cursor, expected in ((cursor32, 32), (cursor48, 48)):
        if cursor.size != (expected, expected):
            raise RuntimeError(f"Unexpected {expected}px cursor size: {cursor.size}")
        hotspot = (1, 3) if expected == 32 else (2, 4)
        if cursor.getpixel(hotspot)[3] != 255:
            raise RuntimeError(f"{expected}px cursor hotspot is transparent")
        colors = cursor.getcolors(maxcolors=expected * expected)
        if not colors or TRANSPARENT not in {color for _, color in colors}:
            raise RuntimeError(f"{expected}px cursor lost transparency")
    return OUTPUT


def main() -> None:
    output = render_proof()
    print(f"Built {output.relative_to(ROOT).as_posix()}")
    print(f"  concept native sizes: 32, 48")
    print(f"  sha256: {sha256(output)}")


if __name__ == "__main__":
    main()
