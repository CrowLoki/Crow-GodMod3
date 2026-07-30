#!/usr/bin/env python3
"""Render an approval-only Crow type audition from original vector skeletons.

This script deliberately does not read an installed font, build a font binary,
update a manifest, create a package, install anything, or sync public assets.
It exists only to let Crow compare four original directions before a typeface
is selected and expanded into a complete family.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, PngImagePlugin


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "fonts" / "specimens" / "crow-type-audition-v0.3.png"

WIDTH = 3200
HEIGHT = 1800
SUPERSAMPLE = 2

BACKGROUND = "#03050C"
PANEL = "#070B17"
PANEL_EDGE = "#202A4A"
LETTER = "#F0F5FF"
MUTED = "#75839D"
CYAN = "#45E7FF"
VIOLET = "#8B6CFF"

SAMPLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ 1234567890"


def paths(*items: tuple[tuple[float, float], ...]) -> tuple[tuple[tuple[float, float], ...], ...]:
    """Return an immutable set of polylines for one original glyph."""

    return tuple(items)


# Original single-line vector skeletons. Coordinates are normalized to a
# character box where (0, 0) is the upper-left and (1, 1) the lower-right.
# They are intentionally conventional at the structural level: the Crow
# character comes from terminal treatment, proportion, cuts, and rhythm—not
# from compromising recognition.
GLYPHS: dict[str, tuple[tuple[tuple[float, float], ...], ...]] = {
    "A": paths(((0.05, 1), (0.5, 0), (0.95, 1)), ((0.22, 0.62), (0.78, 0.62))),
    "B": paths(
        ((0.08, 1), (0.08, 0), (0.58, 0), (0.88, 0.13), (0.88, 0.38), (0.62, 0.5)),
        ((0.08, 0.5), (0.62, 0.5), (0.9, 0.62), (0.9, 0.87), (0.58, 1), (0.08, 1)),
    ),
    "C": paths(((0.9, 0.1), (0.72, 0), (0.28, 0), (0.06, 0.2), (0.06, 0.8), (0.28, 1), (0.72, 1), (0.9, 0.9))),
    "D": paths(((0.08, 1), (0.08, 0), (0.56, 0), (0.9, 0.2), (0.9, 0.8), (0.56, 1), (0.08, 1))),
    "E": paths(((0.9, 0), (0.08, 0), (0.08, 1), (0.9, 1)), ((0.08, 0.5), (0.72, 0.5))),
    "F": paths(((0.9, 0), (0.08, 0), (0.08, 1)), ((0.08, 0.5), (0.72, 0.5))),
    "G": paths(
        ((0.9, 0.1), (0.72, 0), (0.28, 0), (0.06, 0.2), (0.06, 0.8), (0.28, 1), (0.72, 1), (0.9, 0.82), (0.9, 0.58), (0.58, 0.58))
    ),
    "H": paths(((0.08, 0), (0.08, 1)), ((0.92, 0), (0.92, 1)), ((0.08, 0.5), (0.92, 0.5))),
    "I": paths(((0.05, 0), (0.95, 0)), ((0.5, 0), (0.5, 1)), ((0.05, 1), (0.95, 1))),
    "J": paths(((0.08, 0), (0.9, 0), (0.9, 0.78), (0.7, 1), (0.28, 1), (0.08, 0.82))),
    "K": paths(((0.08, 0), (0.08, 1)), ((0.92, 0), (0.08, 0.56), (0.94, 1))),
    "L": paths(((0.08, 0), (0.08, 1), (0.92, 1))),
    "M": paths(((0.05, 1), (0.05, 0), (0.5, 0.48), (0.95, 0), (0.95, 1))),
    "N": paths(((0.08, 1), (0.08, 0), (0.92, 1), (0.92, 0))),
    "O": paths(((0.28, 0), (0.72, 0), (0.94, 0.2), (0.94, 0.8), (0.72, 1), (0.28, 1), (0.06, 0.8), (0.06, 0.2), (0.28, 0))),
    "P": paths(((0.08, 1), (0.08, 0), (0.58, 0), (0.9, 0.16), (0.9, 0.4), (0.58, 0.54), (0.08, 0.54))),
    "Q": paths(
        ((0.28, 0), (0.72, 0), (0.94, 0.2), (0.94, 0.8), (0.72, 1), (0.28, 1), (0.06, 0.8), (0.06, 0.2), (0.28, 0)),
        ((0.58, 0.68), (0.98, 1.08)),
    ),
    "R": paths(
        ((0.08, 1), (0.08, 0), (0.58, 0), (0.9, 0.16), (0.9, 0.4), (0.58, 0.54), (0.08, 0.54)),
        ((0.54, 0.54), (0.94, 1)),
    ),
    "S": paths(((0.9, 0.12), (0.72, 0), (0.28, 0), (0.06, 0.16), (0.06, 0.4), (0.28, 0.5), (0.72, 0.5), (0.94, 0.62), (0.94, 0.84), (0.72, 1), (0.28, 1), (0.08, 0.88))),
    "T": paths(((0.04, 0), (0.96, 0)), ((0.5, 0), (0.5, 1))),
    "U": paths(((0.08, 0), (0.08, 0.78), (0.28, 1), (0.72, 1), (0.92, 0.78), (0.92, 0))),
    "V": paths(((0.04, 0), (0.5, 1), (0.96, 0))),
    "W": paths(((0.03, 0), (0.2, 1), (0.5, 0.55), (0.8, 1), (0.97, 0))),
    "X": paths(((0.06, 0), (0.94, 1)), ((0.94, 0), (0.06, 1))),
    "Y": paths(((0.04, 0), (0.5, 0.5), (0.96, 0)), ((0.5, 0.5), (0.5, 1))),
    "Z": paths(((0.06, 0), (0.94, 0), (0.06, 1), (0.94, 1))),
    "0": paths(
        ((0.28, 0), (0.72, 0), (0.94, 0.2), (0.94, 0.8), (0.72, 1), (0.28, 1), (0.06, 0.8), (0.06, 0.2), (0.28, 0)),
        ((0.25, 0.78), (0.75, 0.22)),
    ),
    "1": paths(((0.22, 0.22), (0.5, 0), (0.5, 1)), ((0.18, 1), (0.84, 1))),
    "2": paths(((0.08, 0.18), (0.28, 0), (0.72, 0), (0.92, 0.18), (0.92, 0.36), (0.08, 1), (0.94, 1))),
    "3": paths(((0.08, 0.12), (0.3, 0), (0.72, 0), (0.92, 0.16), (0.92, 0.38), (0.7, 0.5), (0.92, 0.62), (0.92, 0.84), (0.72, 1), (0.3, 1), (0.08, 0.88)), ((0.42, 0.5), (0.7, 0.5))),
    "4": paths(((0.76, 1), (0.76, 0)), ((0.76, 0.08), (0.06, 0.68), (0.96, 0.68))),
    "5": paths(((0.92, 0), (0.12, 0), (0.08, 0.48), (0.68, 0.48), (0.92, 0.62), (0.92, 0.84), (0.72, 1), (0.28, 1), (0.08, 0.88))),
    "6": paths(((0.86, 0.08), (0.7, 0), (0.28, 0), (0.06, 0.22), (0.06, 0.8), (0.28, 1), (0.72, 1), (0.94, 0.82), (0.94, 0.62), (0.72, 0.48), (0.08, 0.48))),
    "7": paths(((0.06, 0), (0.94, 0), (0.34, 1))),
    "8": paths(
        ((0.28, 0), (0.72, 0), (0.92, 0.14), (0.92, 0.36), (0.72, 0.5), (0.28, 0.5), (0.08, 0.36), (0.08, 0.14), (0.28, 0)),
        ((0.28, 0.5), (0.72, 0.5), (0.94, 0.64), (0.94, 0.86), (0.72, 1), (0.28, 1), (0.06, 0.86), (0.06, 0.64), (0.28, 0.5)),
    ),
    "9": paths(((0.14, 0.92), (0.3, 1), (0.72, 1), (0.94, 0.78), (0.94, 0.2), (0.72, 0), (0.28, 0), (0.06, 0.18), (0.06, 0.38), (0.28, 0.52), (0.92, 0.52))),
    "(": paths(((0.7, 0), (0.38, 0.22), (0.28, 0.5), (0.38, 0.78), (0.7, 1))),
    ")": paths(((0.3, 0), (0.62, 0.22), (0.72, 0.5), (0.62, 0.78), (0.3, 1))),
}


PROPORTIONS: dict[str, float] = {
    "I": 0.45,
    "J": 0.72,
    "L": 0.7,
    "M": 1.12,
    "T": 0.82,
    "W": 1.2,
    "1": 0.62,
    "(": 0.42,
    ")": 0.42,
}


@dataclass(frozen=True)
class Variant:
    name: str
    label: str
    accent: str
    stroke_ratio: float
    width_scale: float
    shear: float = 0.0
    mono: bool = False
    treatment: str = "solid"


VARIANTS = (
    Variant(
        name="TALON SANS",
        label="TALON SANS (RECOMMENDED)",
        accent=CYAN,
        stroke_ratio=0.105,
        width_scale=1.0,
        shear=-0.035,
        treatment="talon",
    ),
    Variant(
        name="CYBER CORVID",
        label="CYBER CORVID",
        accent=VIOLET,
        stroke_ratio=0.082,
        width_scale=0.9,
        shear=0.0,
        treatment="rail",
    ),
    Variant(
        name="FEATHER STENCIL",
        label="FEATHER STENCIL",
        accent=CYAN,
        stroke_ratio=0.125,
        width_scale=1.04,
        shear=0.025,
        treatment="stencil",
    ),
    Variant(
        name="VOID MONO",
        label="VOID MONO",
        accent=VIOLET,
        stroke_ratio=0.07,
        width_scale=0.86,
        mono=True,
        treatment="mono",
    ),
)


def scaled(value: float) -> int:
    return round(value * SUPERSAMPLE)


def transform_points(
    points: tuple[tuple[float, float], ...],
    *,
    x: float,
    y: float,
    width: float,
    height: float,
    shear: float,
) -> list[tuple[int, int]]:
    transformed: list[tuple[int, int]] = []
    for px, py in points:
        shifted_x = px + shear * (0.5 - py)
        transformed.append((scaled(x + shifted_x * width), scaled(y + py * height)))
    return transformed


def draw_terminal_cut(
    draw: ImageDraw.ImageDraw,
    endpoint: tuple[int, int],
    neighbor: tuple[int, int],
    *,
    stroke: int,
    background: str,
) -> None:
    """Clip one terminal corner into a restrained talon-like diagonal."""

    dx = endpoint[0] - neighbor[0]
    dy = endpoint[1] - neighbor[1]
    length = max((dx * dx + dy * dy) ** 0.5, 1.0)
    ux, uy = dx / length, dy / length
    nx, ny = -uy, ux
    depth = stroke * 0.48
    half = stroke * 0.58
    tip = (endpoint[0] + ux * depth, endpoint[1] + uy * depth)
    left = (endpoint[0] + nx * half, endpoint[1] + ny * half)
    corner = (
        endpoint[0] + ux * depth + nx * half,
        endpoint[1] + uy * depth + ny * half,
    )
    draw.polygon([tip, left, corner], fill=background)


def draw_stencil_cut(
    draw: ImageDraw.ImageDraw,
    *,
    x: float,
    y: float,
    width: float,
    height: float,
    stroke: int,
    background: str,
) -> None:
    """Add one coherent diagonal bridge cut, never a field of dots."""

    cut_y = scaled(y + height * 0.56)
    cut_x = scaled(x + width * 0.48)
    span = max(scaled(height * 0.055), stroke // 2)
    draw.polygon(
        [
            (cut_x - scaled(width * 0.22), cut_y + span),
            (cut_x + scaled(width * 0.22), cut_y - span),
            (cut_x + scaled(width * 0.22), cut_y + span),
            (cut_x - scaled(width * 0.22), cut_y + span * 3),
        ],
        fill=background,
    )


def draw_glyph(
    draw: ImageDraw.ImageDraw,
    character: str,
    *,
    x: float,
    y: float,
    width: float,
    height: float,
    variant: Variant,
    color: str,
    background: str,
) -> None:
    if character == " ":
        return

    stroke = max(2, scaled(height * variant.stroke_ratio))
    glyph_paths = GLYPHS[character]
    transformed_paths = [
        transform_points(
            path,
            x=x,
            y=y,
            width=width,
            height=height,
            shear=variant.shear,
        )
        for path in glyph_paths
    ]

    if variant.treatment == "rail":
        outer = stroke + max(2, scaled(height * 0.038))
        for line in transformed_paths:
            draw.line(line, fill=color, width=outer, joint="curve")
        for line in transformed_paths:
            draw.line(
                line,
                fill=background,
                width=max(2, scaled(height * 0.022)),
                joint="curve",
            )
    else:
        for line in transformed_paths:
            draw.line(line, fill=color, width=stroke, joint="curve")

    if variant.treatment == "talon":
        for line in transformed_paths:
            if len(line) < 2:
                continue
            draw_terminal_cut(
                draw,
                line[0],
                line[1],
                stroke=stroke,
                background=background,
            )
            draw_terminal_cut(
                draw,
                line[-1],
                line[-2],
                stroke=stroke,
                background=background,
            )
    elif variant.treatment == "stencil" and character not in {"I", "1", "(", ")"}:
        draw_stencil_cut(
            draw,
            x=x,
            y=y,
            width=width,
            height=height,
            stroke=stroke,
            background=background,
        )


def character_width(character: str, height: float, variant: Variant) -> float:
    if character == " ":
        return height * 0.42
    proportion = 0.82 if variant.mono else PROPORTIONS.get(character, 0.82)
    return height * proportion * variant.width_scale


def measure_text(text: str, *, height: float, variant: Variant, gap: float) -> float:
    widths = [character_width(character, height, variant) for character in text]
    return sum(widths) + gap * max(0, len(text) - 1)


def draw_vector_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    *,
    x: float,
    y: float,
    height: float,
    variant: Variant,
    color: str,
    background: str,
    max_width: float | None = None,
    gap_ratio: float = 0.075,
) -> tuple[float, float]:
    gap = height * gap_ratio
    natural_width = measure_text(text, height=height, variant=variant, gap=gap)
    if max_width is not None and natural_width > max_width:
        scale_factor = max_width / natural_width
        height *= scale_factor
        gap = height * gap_ratio
        natural_width = measure_text(text, height=height, variant=variant, gap=gap)

    cursor = x
    for character in text:
        width = character_width(character, height, variant)
        if character != " ":
            draw_glyph(
                draw,
                character,
                x=cursor,
                y=y,
                width=width,
                height=height,
                variant=variant,
                color=color,
                background=background,
            )
        cursor += width + gap
    return natural_width, height


def image_digest(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def render() -> Path:
    canvas = Image.new(
        "RGB",
        (WIDTH * SUPERSAMPLE, HEIGHT * SUPERSAMPLE),
        BACKGROUND,
    )
    draw = ImageDraw.Draw(canvas)

    draw.rounded_rectangle(
        (scaled(70), scaled(60), scaled(WIDTH - 70), scaled(HEIGHT - 60)),
        radius=scaled(36),
        fill=PANEL,
        outline=PANEL_EDGE,
        width=scaled(3),
    )

    label_variant = Variant(
        name="LABEL",
        label="LABEL",
        accent=CYAN,
        stroke_ratio=0.075,
        width_scale=0.82,
        mono=True,
        treatment="mono",
    )
    draw_vector_text(
        draw,
        "CROW TYPE AUDITION",
        x=145,
        y=104,
        height=68,
        variant=label_variant,
        color=LETTER,
        background=PANEL,
        max_width=1500,
        gap_ratio=0.11,
    )
    draw_vector_text(
        draw,
        "ORIGINAL APPROVAL PROOF",
        x=145,
        y=201,
        height=31,
        variant=label_variant,
        color=MUTED,
        background=PANEL,
        max_width=1000,
        gap_ratio=0.13,
    )
    draw.line(
        (scaled(145), scaled(272), scaled(WIDTH - 145), scaled(272)),
        fill=PANEL_EDGE,
        width=scaled(2),
    )

    row_top = 315
    row_height = 330
    row_bounds: list[tuple[int, int, int, int]] = []
    for index, variant in enumerate(VARIANTS, start=1):
        y = row_top + (index - 1) * row_height
        if index > 1:
            draw.line(
                (scaled(145), scaled(y - 22), scaled(WIDTH - 145), scaled(y - 22)),
                fill="#151D35",
                width=scaled(2),
            )

        number = f"0{index}"
        draw_vector_text(
            draw,
            number,
            x=150,
            y=y + 12,
            height=38,
            variant=label_variant,
            color=variant.accent,
            background=PANEL,
            max_width=90,
            gap_ratio=0.12,
        )
        draw_vector_text(
            draw,
            variant.label,
            x=250,
            y=y + 10,
            height=39,
            variant=label_variant,
            color=variant.accent,
            background=PANEL,
            max_width=980,
            gap_ratio=0.11,
        )

        sample_y = y + 103
        draw_vector_text(
            draw,
            SAMPLE,
            x=150,
            y=sample_y,
            height=128,
            variant=variant,
            color=LETTER,
            background=PANEL,
            max_width=WIDTH - 300,
            gap_ratio=0.07 if not variant.mono else 0.085,
        )
        row_bounds.append((150, sample_y, WIDTH - 150, sample_y + 145))

    draw_vector_text(
        draw,
        "SAME CONTENT  SAME SCALE  NO THIRD PARTY FONT OUTLINES",
        x=150,
        y=1668,
        height=30,
        variant=label_variant,
        color=MUTED,
        background=PANEL,
        max_width=WIDTH - 300,
        gap_ratio=0.11,
    )

    output = canvas.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    metadata = PngImagePlugin.PngInfo()
    metadata.add_text("Title", "Crow type audition v0.3")
    metadata.add_text("Sample", SAMPLE)
    metadata.add_text("Variants", " | ".join(variant.label for variant in VARIANTS))
    metadata.add_text(
        "Source",
        "Original vector skeletons in scripts/build_font_audition.py; no font files read.",
    )
    output.save(OUTPUT, optimize=True, pnginfo=metadata)

    with Image.open(OUTPUT) as proof:
        if proof.size != (WIDTH, HEIGHT):
            raise RuntimeError(f"Unexpected proof dimensions: {proof.size}")
        if proof.info.get("Sample") != SAMPLE:
            raise RuntimeError("Proof metadata does not preserve the exact sample text")

        row_signatures: list[str] = []
        for bounds in row_bounds:
            row = proof.crop(bounds).convert("RGB")
            colors = row.getcolors(maxcolors=row.width * row.height)
            if not colors or len(colors) < 8:
                raise RuntimeError(f"Font row appears empty or unrendered: {bounds}")
            row_signatures.append(hashlib.sha256(row.tobytes()).hexdigest())
        if len(set(row_signatures)) != len(VARIANTS):
            raise RuntimeError("Two audition rows rendered identically")

    return OUTPUT


def main() -> None:
    missing = sorted(set(SAMPLE.replace(" ", "")) - set(GLYPHS))
    if missing:
        raise RuntimeError(f"Missing audition glyphs: {missing}")

    output = render()
    print(f"Built {output.relative_to(ROOT).as_posix()}")
    print(f"  dimensions: {WIDTH}x{HEIGHT}")
    print(f"  sample: {SAMPLE}")
    print(f"  variants: {', '.join(variant.name for variant in VARIANTS)}")
    print(f"  sha256: {image_digest(output)}")


if __name__ == "__main__":
    main()
