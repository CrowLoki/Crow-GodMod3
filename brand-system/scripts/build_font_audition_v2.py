#!/usr/bin/env python3
"""Build the approval-only CrowClaw lettering proof v0.4.

This is a specimen generator, not a font compiler.  The displayed glyphs are
original filled-vector constructions drawn from the custom stroke maps below.
The supplied hand-cut alphabet was used as a mood reference only.  No font
outline, installed typeface, or raster glyph is traced or embedded.

The three rows are intentionally constructionally different:

* Black Quill: tapered, hand-hewn display forms.
* Talon Heavy: a heavier logo cut with deeper hooked terminals.
* Bitfeather: a solid stepped-pixel companion based on the same morphology.

Nothing in this script installs, packages, publishes, or deploys a font.
"""

from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from PIL import Image, ImageDraw, ImageFont, PngImagePlugin


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "fonts" / "specimens" / "crow-type-audition-v0.6.png"

WIDTH = 3000
HEIGHT = 1860
SUPERSAMPLE = 3

INK = "#05060A"
PAPER = "#EEF0EA"
PAPER_DIM = "#D9DBD6"
VOID = "#050711"
VOID_PANEL = "#090D19"
VOID_EDGE = "#252B42"
FROST = "#EEF3FF"
MUTED = "#737C91"
CYAN = "#37DDF4"
VIOLET = "#8C6AFF"

ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
DIGITS = "1234567890"
SAMPLE = f"{ALPHABET}  {DIGITS}"


@dataclass(frozen=True)
class Stroke:
    """One filled ribbon skeleton.

    `weight` is relative to the family base width.  `start` and `end` are
    terminal width multipliers, producing beak/quill points without generic
    monoline caps.
    """

    points: tuple[tuple[float, float], ...]
    weight: float = 1.0
    start: float = 0.72
    end: float = 0.12


def stroke(
    *points: tuple[float, float],
    weight: float = 1.0,
    start: float = 0.72,
    end: float = 0.12,
) -> Stroke:
    return Stroke(tuple(points), weight, start, end)


def glyph(*strokes: Stroke) -> tuple[Stroke, ...]:
    return tuple(strokes)


# The forms deliberately avoid a reusable octagonal skeleton.  Every glyph has
# its own asymmetric tension, counter placement, and terminal direction.
GLYPHS: dict[str, tuple[Stroke, ...]] = {
    "A": glyph(
        stroke((0.05, 1.00), (0.15, 0.66), (0.28, 0.31), (0.47, -0.02), weight=1.06, start=0.18, end=0.10),
        stroke((0.47, -0.02), (0.61, 0.26), (0.76, 0.64), (0.96, 1.00), weight=0.92, start=0.12, end=0.10),
        stroke((0.19, 0.62), (0.77, 0.55), weight=0.62, start=0.20, end=0.08),
        stroke((0.46, 0.02), (0.36, 0.16), weight=0.46, start=0.18, end=0.05),
    ),
    "B": glyph(
        stroke((0.10, 1.00), (0.08, 0.65), (0.11, 0.30), (0.08, 0.00), weight=1.05, start=0.30, end=0.18),
        stroke((0.11, 0.02), (0.53, 0.00), (0.83, 0.11), (0.76, 0.35), (0.49, 0.46), (0.12, 0.46), weight=0.82, start=0.38, end=0.20),
        stroke((0.13, 0.47), (0.56, 0.45), (0.88, 0.60), (0.84, 0.86), (0.55, 1.00), (0.10, 0.97), weight=1.02, start=0.30, end=0.16),
    ),
    "C": glyph(
        stroke((0.91, 0.13), (0.72, 0.00), (0.30, 0.03), (0.10, 0.24), (0.08, 0.72), (0.25, 0.96), (0.67, 1.00), (0.94, 0.82), weight=1.00, start=0.10, end=0.05),
        stroke((0.74, 0.93), (0.92, 0.82), (0.82, 0.72), weight=0.48, start=0.18, end=0.06),
    ),
    "D": glyph(
        stroke((0.10, 1.00), (0.09, 0.55), (0.11, 0.00), weight=1.05, start=0.28, end=0.17),
        stroke((0.10, 0.02), (0.52, 0.00), (0.83, 0.18), (0.92, 0.49), (0.83, 0.83), (0.53, 1.00), (0.09, 0.97), weight=0.96, start=0.26, end=0.16),
    ),
    "E": glyph(
        stroke((0.11, 1.00), (0.08, 0.58), (0.11, 0.00), weight=1.05, start=0.26, end=0.16),
        stroke((0.09, 0.04), (0.91, 0.00), weight=0.82, start=0.34, end=0.06),
        stroke((0.10, 0.49), (0.69, 0.44), weight=0.68, start=0.28, end=0.05),
        stroke((0.10, 0.96), (0.89, 1.00), (0.98, 0.91), weight=0.88, start=0.32, end=0.05),
    ),
    "F": glyph(
        stroke((0.10, 1.02), (0.08, 0.53), (0.11, 0.00), weight=1.05, start=0.10, end=0.16),
        stroke((0.09, 0.04), (0.92, 0.00), weight=0.84, start=0.34, end=0.06),
        stroke((0.10, 0.49), (0.70, 0.44), weight=0.68, start=0.28, end=0.05),
        stroke((0.10, 0.96), (0.00, 1.04), weight=0.46, start=0.20, end=0.04),
    ),
    "G": glyph(
        stroke((0.92, 0.14), (0.72, 0.00), (0.29, 0.03), (0.09, 0.25), (0.09, 0.73), (0.27, 0.97), (0.70, 1.00), (0.92, 0.82), (0.91, 0.58), (0.60, 0.58), weight=1.00, start=0.10, end=0.08),
        stroke((0.90, 0.58), (0.82, 0.77), (0.92, 0.88), weight=0.56, start=0.32, end=0.05),
    ),
    "H": glyph(
        stroke((0.09, 1.00), (0.12, 0.55), (0.08, 0.00), weight=1.02, start=0.22, end=0.15),
        stroke((0.91, 1.00), (0.88, 0.50), (0.93, 0.00), weight=0.94, start=0.16, end=0.12),
        stroke((0.11, 0.48), (0.91, 0.43), weight=0.66, start=0.24, end=0.05),
    ),
    "I": glyph(
        stroke((0.50, 1.00), (0.47, 0.52), (0.52, 0.00), weight=1.06, start=0.20, end=0.09),
        stroke((0.18, 0.03), (0.50, -0.03), (0.82, 0.03), weight=0.62, start=0.08, end=0.08),
        stroke((0.16, 1.00), (0.50, 0.96), (0.86, 1.00), weight=0.66, start=0.05, end=0.05),
    ),
    "J": glyph(
        stroke((0.20, 0.02), (0.89, 0.00), weight=0.66, start=0.07, end=0.08),
        stroke((0.86, 0.01), (0.84, 0.70), (0.73, 0.93), (0.43, 1.02), (0.14, 0.89), (0.04, 0.75), weight=1.00, start=0.16, end=0.05),
    ),
    "K": glyph(
        stroke((0.10, 1.00), (0.09, 0.51), (0.11, 0.00), weight=1.04, start=0.22, end=0.15),
        stroke((0.91, 0.00), (0.58, 0.29), (0.12, 0.55), weight=0.79, start=0.06, end=0.20),
        stroke((0.47, 0.37), (0.68, 0.64), (0.96, 1.00), weight=0.95, start=0.24, end=0.05),
    ),
    "L": glyph(
        stroke((0.11, 0.00), (0.09, 0.53), (0.11, 0.98), weight=1.04, start=0.15, end=0.24),
        stroke((0.10, 0.97), (0.80, 1.00), (0.97, 0.88), weight=0.88, start=0.28, end=0.04),
    ),
    "M": glyph(
        stroke((0.05, 1.00), (0.08, 0.45), (0.08, 0.00), weight=0.96, start=0.17, end=0.13),
        stroke((0.08, 0.02), (0.35, 0.38), (0.51, 0.62), weight=0.86, start=0.18, end=0.20),
        stroke((0.51, 0.62), (0.68, 0.35), (0.94, 0.00), weight=0.82, start=0.24, end=0.10),
        stroke((0.94, 0.01), (0.92, 0.54), (0.96, 1.00), weight=0.96, start=0.14, end=0.13),
        stroke((0.51, 0.61), (0.44, 0.48), weight=0.40, start=0.16, end=0.04),
    ),
    "N": glyph(
        stroke((0.08, 1.00), (0.11, 0.47), (0.08, 0.00), weight=1.00, start=0.18, end=0.13),
        stroke((0.10, 0.02), (0.49, 0.49), (0.92, 1.00), weight=1.02, start=0.15, end=0.07),
        stroke((0.92, 1.00), (0.90, 0.50), (0.93, 0.00), weight=0.91, start=0.18, end=0.11),
    ),
    "O": glyph(
        stroke((0.46, -0.01), (0.22, 0.06), (0.07, 0.31), (0.09, 0.71), (0.29, 0.97), (0.61, 1.02), (0.86, 0.82), (0.94, 0.43), (0.82, 0.12), (0.46, -0.01), weight=1.00, start=0.38, end=0.36),
    ),
    "P": glyph(
        stroke((0.10, 1.00), (0.09, 0.52), (0.11, 0.00), weight=1.04, start=0.20, end=0.15),
        stroke((0.10, 0.03), (0.52, 0.00), (0.85, 0.13), (0.84, 0.37), (0.57, 0.51), (0.11, 0.48), weight=0.91, start=0.28, end=0.16),
    ),
    "Q": glyph(
        stroke((0.46, -0.01), (0.22, 0.06), (0.07, 0.31), (0.09, 0.71), (0.29, 0.97), (0.61, 1.02), (0.86, 0.82), (0.94, 0.43), (0.82, 0.12), (0.46, -0.01), weight=1.00, start=0.38, end=0.36),
        stroke((0.56, 0.67), (0.73, 0.85), (1.01, 1.08), weight=0.64, start=0.28, end=0.04),
    ),
    "R": glyph(
        stroke((0.10, 1.00), (0.09, 0.52), (0.11, 0.00), weight=1.04, start=0.20, end=0.15),
        stroke((0.10, 0.03), (0.52, 0.00), (0.85, 0.13), (0.84, 0.37), (0.57, 0.51), (0.11, 0.48), weight=0.91, start=0.28, end=0.16),
        stroke((0.49, 0.47), (0.66, 0.66), (0.95, 1.00), weight=0.92, start=0.26, end=0.05),
    ),
    "S": glyph(
        stroke((0.91, 0.12), (0.70, 0.00), (0.31, 0.04), (0.10, 0.20), (0.17, 0.42), (0.46, 0.50), (0.76, 0.54), (0.91, 0.71), (0.82, 0.91), (0.56, 1.02), (0.22, 0.97), (0.05, 0.83), weight=1.00, start=0.07, end=0.05),
    ),
    "T": glyph(
        stroke((0.03, 0.06), (0.28, 0.00), (0.52, 0.04), (0.76, 0.00), (0.98, 0.07), weight=0.84, start=0.05, end=0.05),
        stroke((0.51, -0.03), (0.49, 0.47), (0.52, 1.02), weight=1.06, start=0.08, end=0.06),
    ),
    "U": glyph(
        stroke((0.09, 0.00), (0.10, 0.63), (0.18, 0.88), (0.43, 1.02), weight=0.98, start=0.14, end=0.30),
        stroke((0.43, 1.02), (0.70, 0.98), (0.88, 0.78), (0.92, 0.00), weight=1.00, start=0.30, end=0.12),
    ),
    "V": glyph(
        stroke((0.04, 0.00), (0.22, 0.51), (0.49, 1.04), weight=0.97, start=0.09, end=0.06),
        stroke((0.49, 1.04), (0.72, 0.46), (0.97, -0.02), weight=0.87, start=0.28, end=0.05),
    ),
    "W": glyph(
        stroke((0.02, 0.00), (0.17, 0.55), (0.31, 1.02), weight=0.86, start=0.08, end=0.12),
        stroke((0.31, 1.02), (0.51, 0.61), (0.67, 1.01), weight=0.78, start=0.28, end=0.20),
        stroke((0.67, 1.01), (0.82, 0.51), (0.99, -0.01), weight=0.90, start=0.26, end=0.05),
        stroke((0.51, 0.61), (0.50, 0.46), weight=0.38, start=0.18, end=0.04),
    ),
    "X": glyph(
        stroke((0.06, -0.01), (0.45, 0.45), (0.94, 1.02), weight=1.02, start=0.06, end=0.05),
        stroke((0.96, 0.00), (0.57, 0.42), (0.06, 1.00), weight=0.72, start=0.05, end=0.05),
    ),
    "Y": glyph(
        stroke((0.04, 0.00), (0.27, 0.25), (0.50, 0.50), weight=0.90, start=0.06, end=0.28),
        stroke((0.96, -0.01), (0.73, 0.24), (0.50, 0.50), weight=0.82, start=0.05, end=0.25),
        stroke((0.50, 0.49), (0.48, 1.02), weight=1.02, start=0.28, end=0.06),
        stroke((0.50, 0.47), (0.42, 0.37), weight=0.36, start=0.18, end=0.04),
    ),
    "Z": glyph(
        stroke((0.05, 0.04), (0.90, 0.00), (0.98, 0.09), weight=0.82, start=0.06, end=0.04),
        stroke((0.88, 0.03), (0.53, 0.49), (0.08, 0.97), weight=1.02, start=0.24, end=0.22),
        stroke((0.07, 0.96), (0.78, 1.00), (0.98, 0.87), weight=0.91, start=0.24, end=0.04),
    ),
    "0": glyph(
        stroke((0.47, 0.00), (0.23, 0.07), (0.10, 0.31), (0.11, 0.71), (0.30, 0.96), (0.60, 1.00), (0.84, 0.80), (0.91, 0.42), (0.79, 0.13), (0.47, 0.00), weight=0.95, start=0.36, end=0.34),
        stroke((0.29, 0.73), (0.43, 0.53), weight=0.40, start=0.10, end=0.03),
    ),
    "1": glyph(
        stroke((0.17, 0.20), (0.45, -0.01), (0.48, 0.48), (0.51, 1.00), weight=1.04, start=0.05, end=0.22),
        stroke((0.47, 0.99), (0.86, 0.98), weight=0.69, start=0.28, end=0.05),
    ),
    "2": glyph(
        stroke((0.07, 0.20), (0.27, 0.02), (0.64, 0.00), (0.88, 0.16), (0.78, 0.38), (0.49, 0.61), (0.10, 0.96), weight=0.96, start=0.05, end=0.25),
        stroke((0.10, 0.96), (0.77, 1.00), (0.95, 0.88), weight=0.86, start=0.28, end=0.04),
    ),
    "3": glyph(
        stroke((0.10, 0.13), (0.32, 0.01), (0.67, 0.02), (0.87, 0.18), (0.75, 0.42), (0.47, 0.49), weight=0.90, start=0.05, end=0.28),
        stroke((0.47, 0.49), (0.76, 0.55), (0.90, 0.75), (0.78, 0.94), (0.48, 1.02), (0.15, 0.90), weight=1.00, start=0.28, end=0.05),
    ),
    "4": glyph(
        stroke((0.76, 1.01), (0.74, 0.49), (0.78, -0.01), weight=1.00, start=0.18, end=0.08),
        stroke((0.72, 0.06), (0.44, 0.34), (0.08, 0.67), (0.94, 0.64), weight=0.80, start=0.05, end=0.05),
    ),
    "5": glyph(
        stroke((0.92, 0.03), (0.18, 0.01), (0.12, 0.46), (0.61, 0.47), weight=0.90, start=0.05, end=0.30),
        stroke((0.57, 0.46), (0.84, 0.58), (0.90, 0.78), (0.72, 0.97), (0.38, 1.02), (0.10, 0.87), weight=0.99, start=0.30, end=0.05),
    ),
    "6": glyph(
        stroke((0.86, 0.06), (0.65, 0.00), (0.30, 0.16), (0.12, 0.47), (0.12, 0.78), (0.31, 0.98), (0.65, 1.00), (0.88, 0.81), (0.82, 0.59), (0.58, 0.49), (0.17, 0.53), weight=0.98, start=0.05, end=0.26),
    ),
    "7": glyph(
        stroke((0.04, 0.05), (0.93, 0.00), (0.99, 0.10), weight=0.84, start=0.05, end=0.04),
        stroke((0.87, 0.05), (0.62, 0.42), (0.37, 1.02), weight=0.98, start=0.24, end=0.05),
        stroke((0.54, 0.02), (0.61, 0.13), weight=0.34, start=0.15, end=0.04),
    ),
    "8": glyph(
        stroke((0.47, 0.00), (0.24, 0.06), (0.15, 0.25), (0.25, 0.44), (0.49, 0.50), (0.73, 0.43), (0.84, 0.23), (0.70, 0.05), (0.47, 0.00), weight=0.86, start=0.34, end=0.32),
        stroke((0.49, 0.50), (0.23, 0.57), (0.10, 0.78), (0.27, 0.98), (0.60, 1.01), (0.88, 0.84), (0.81, 0.61), (0.49, 0.50), weight=1.00, start=0.34, end=0.32),
    ),
    "9": glyph(
        stroke((0.17, 0.94), (0.39, 1.02), (0.73, 0.86), (0.88, 0.56), (0.88, 0.24), (0.70, 0.03), (0.36, 0.01), (0.12, 0.20), (0.18, 0.42), (0.43, 0.52), (0.84, 0.48), weight=0.98, start=0.05, end=0.24),
    ),
}


PROPORTIONS: dict[str, float] = {
    "I": 0.48,
    "J": 0.70,
    "L": 0.72,
    "M": 1.06,
    "T": 0.88,
    "W": 1.12,
    "1": 0.60,
}

# One controlled split per selected glyph.  Each tuple is x, y, angle degrees.
NOTCHES: dict[str, tuple[tuple[float, float, float], ...]] = {
    "A": ((0.47, 0.10, -18),),
    "E": ((0.11, 0.51, -8),),
    "H": ((0.52, 0.45, -10),),
    "M": ((0.51, 0.57, 8),),
    "N": ((0.52, 0.52, 44),),
    "R": ((0.57, 0.55, 38),),
    "T": ((0.51, 0.04, 90),),
    "W": ((0.51, 0.58, 90),),
    "Y": ((0.50, 0.47, 90),),
    "7": ((0.61, 0.08, 34),),
}


@dataclass(frozen=True)
class Variant:
    name: str
    description: str
    base_weight: float
    width_scale: float
    heavy: bool = False
    pixel: bool = False


VARIANTS = (
    Variant(
        "BLACK QUILL",
        "tapered hand-hewn primary",
        base_weight=0.085,
        width_scale=0.96,
    ),
    Variant(
        "TALON HEAVY",
        "heavier logo cut / deeper hooks",
        base_weight=0.108,
        width_scale=1.00,
        heavy=True,
    ),
    Variant(
        "BITFEATHER",
        "solid stepped-pixel companion",
        base_weight=0.105,
        width_scale=0.94,
        pixel=True,
    ),
)


def S(value: float) -> int:
    return round(value * SUPERSAMPLE)


def label_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        Path("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
    )
    for candidate in candidates:
        if candidate.is_file():
            return ImageFont.truetype(str(candidate), S(size))
    return ImageFont.load_default(size=S(size))


def _normal(a: tuple[float, float], b: tuple[float, float]) -> tuple[float, float]:
    dx, dy = b[0] - a[0], b[1] - a[1]
    length = max(math.hypot(dx, dy), 1e-6)
    return -dy / length, dx / length


def draw_ribbon(
    draw: ImageDraw.ImageDraw,
    points: list[tuple[float, float]],
    widths: list[float],
    fill: str,
) -> None:
    """Draw a crisp variable-width filled ribbon with pointed terminals."""

    if len(points) < 2:
        return
    for index in range(len(points) - 1):
        a, b = points[index], points[index + 1]
        nx, ny = _normal(a, b)
        wa, wb = widths[index] / 2, widths[index + 1] / 2
        polygon = [
            (S(a[0] + nx * wa), S(a[1] + ny * wa)),
            (S(b[0] + nx * wb), S(b[1] + ny * wb)),
            (S(b[0] - nx * wb), S(b[1] - ny * wb)),
            (S(a[0] - nx * wa), S(a[1] - ny * wa)),
        ]
        draw.polygon(polygon, fill=fill)

    # Interior joins are deliberately swollen a little like an inked quill
    # pressure turn.  Endpoints stay pointed instead of receiving round caps.
    for index in range(1, len(points) - 1):
        radius = widths[index] * 0.53
        px, py = points[index]
        draw.ellipse(
            (S(px - radius), S(py - radius), S(px + radius), S(py + radius)),
            fill=fill,
        )


def glyph_width(character: str, height: float, variant: Variant) -> float:
    return height * PROPORTIONS.get(character, 0.80) * variant.width_scale


def draw_vector_glyph(
    draw: ImageDraw.ImageDraw,
    character: str,
    *,
    x: float,
    y: float,
    height: float,
    variant: Variant,
    fill: str,
    background: str,
) -> None:
    width = glyph_width(character, height, variant)
    base = height * variant.base_weight

    for item in GLYPHS[character]:
        points = [(x + px * width, y + py * height) for px, py in item.points]
        # A two-point beak/crossbar still needs a pressure body between its two
        # tapered terminals.  Without this midpoint it becomes a hairline and
        # loses the cut-quill mass visible in the reference language.
        if len(points) == 2:
            a, b = points
            points = [a, ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), b]
        count = len(points)
        widths: list[float] = []
        for index in range(count):
            t = index / max(count - 1, 1)
            pressure = 0.96 + math.sin(math.pi * t) * (0.18 if variant.heavy else 0.12)
            terminal = 1.0
            if index == 0:
                terminal = item.start
            elif index == count - 1:
                terminal = item.end * (0.82 if variant.heavy else 1.0)
            widths.append(base * item.weight * pressure * terminal)
        draw_ribbon(draw, points, widths, fill)

    for nx, ny, angle in NOTCHES.get(character, ()):
        size = height * (0.030 if variant.heavy else 0.025)
        radians = math.radians(angle)
        ux, uy = math.cos(radians), math.sin(radians)
        vx, vy = -uy, ux
        cx, cy = x + nx * width, y + ny * height
        triangle = [
            (S(cx - vx * size * 0.55), S(cy - vy * size * 0.55)),
            (S(cx + vx * size * 0.55), S(cy + vy * size * 0.55)),
            (S(cx + ux * size * 1.65), S(cy + uy * size * 1.65)),
        ]
        draw.polygon(triangle, fill=background)


def draw_pixel_glyph(
    canvas: Image.Image,
    character: str,
    *,
    x: float,
    y: float,
    height: float,
    variant: Variant,
    fill: str,
) -> None:
    """Render a solid 14x20-ish stepped companion, not a dot matrix."""

    logical_h = 22
    logical_w = max(8, round(PROPORTIONS.get(character, 0.80) * 16))
    pixel = Image.new("RGBA", (logical_w + 4, logical_h + 4), (0, 0, 0, 0))
    pd = ImageDraw.Draw(pixel)
    line_width = 3 if variant.heavy else 2

    for item in GLYPHS[character]:
        pts = [
            (
                2 + round(px * (logical_w - 1)),
                2 + round(py * (logical_h - 1)),
            )
            for px, py in item.points
        ]
        pd.line(pts, fill=fill, width=line_width, joint="curve")

    # The proof canvas is supersampled, so the deliberately pixel-stepped
    # source must still be placed in supersampled coordinates.  It is later
    # reduced with the rest of the sheet, preserving solid stepped clusters.
    target_h = max(1, S(height))
    target_w = max(1, round((logical_w + 4) * target_h / (logical_h + 4)))
    scaled_pixel = pixel.resize((target_w, target_h), Image.Resampling.NEAREST)
    canvas.alpha_composite(scaled_pixel, (S(x), S(y)))


def measure(text: str, height: float, variant: Variant, gap_ratio: float) -> float:
    gap = height * gap_ratio
    total = 0.0
    for character in text:
        total += height * 0.36 if character == " " else glyph_width(character, height, variant)
        total += gap
    return max(0.0, total - gap)


def draw_text(
    canvas: Image.Image,
    draw: ImageDraw.ImageDraw,
    text: str,
    *,
    x: float,
    y: float,
    height: float,
    variant: Variant,
    fill: str,
    background: str,
    max_width: float,
    gap_ratio: float = 0.072,
) -> tuple[float, float]:
    natural = measure(text, height, variant, gap_ratio)
    if natural > max_width:
        scale = max_width / natural
        height *= scale
    gap = height * gap_ratio
    cursor = x
    for character in text:
        if character == " ":
            cursor += height * 0.36 + gap
            continue
        if variant.pixel:
            draw_pixel_glyph(
                canvas,
                character,
                x=cursor,
                y=y,
                height=height,
                variant=variant,
                fill=fill,
            )
        else:
            draw_vector_glyph(
                draw,
                character,
                x=cursor,
                y=y,
                height=height,
                variant=variant,
                fill=fill,
                background=background,
            )
        cursor += glyph_width(character, height, variant) + gap
    return cursor - x, height


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def render() -> Path:
    canvas = Image.new("RGBA", (S(WIDTH), S(HEIGHT)), VOID)
    draw = ImageDraw.Draw(canvas)

    margin = 62
    draw.rounded_rectangle(
        (S(margin), S(margin), S(WIDTH - margin), S(HEIGHT - margin)),
        radius=S(32),
        fill=VOID_PANEL,
        outline=VOID_EDGE,
        width=S(3),
    )

    draw.text(
        (S(126), S(102)),
        "CROWCLAW LETTERFORM AUDITION",
        font=label_font(45, bold=True),
        fill=FROST,
    )
    draw.text(
        (S(128), S(166)),
        "approval proof v0.6  •  original construction  •  no packaged font",
        font=label_font(23),
        fill=MUTED,
    )
    draw.line(
        (S(126), S(224), S(WIDTH - 126), S(224)),
        fill=VOID_EDGE,
        width=S(2),
    )

    row_y = (276, 690, 1104)
    row_height = 348
    row_signatures: list[tuple[int, int, int, int]] = []
    for index, (variant, y) in enumerate(zip(VARIANTS, row_y), start=1):
        light_row = index == 2
        bg = PAPER if light_row else VOID_PANEL
        fg = INK if light_row else FROST
        edge = "#C4C7C5" if light_row else "#181E31"
        accent = VIOLET if index == 2 else CYAN

        draw.rounded_rectangle(
            (S(112), S(y), S(WIDTH - 112), S(y + row_height)),
            radius=S(22),
            fill=bg,
            outline=edge,
            width=S(2),
        )
        draw.text(
            (S(146), S(y + 27)),
            f"0{index}  {variant.name}",
            font=label_font(27, bold=True),
            fill=accent,
        )
        draw.text(
            (S(146), S(y + 69)),
            variant.description,
            font=label_font(20),
            fill="#555A65" if light_row else MUTED,
        )
        draw_text(
            canvas,
            draw,
            SAMPLE,
            x=146,
            y=y + 126,
            height=158,
            variant=variant,
            fill=fg,
            background=bg,
            max_width=WIDTH - 292,
        )
        row_signatures.append((146, y + 118, WIDTH - 146, y + 310))

    draw.line(
        (S(126), S(1507), S(WIDTH - 126), S(1507)),
        fill=VOID_EDGE,
        width=S(2),
    )
    draw.text(
        (S(132), S(1542)),
        "READABILITY CHECK — SAME FAMILY AT PRACTICAL DISPLAY SIZES",
        font=label_font(22, bold=True),
        fill=MUTED,
    )
    check_variant = VARIANTS[0]
    check_x = 134
    for label, size in (("96 px", 96), ("48 px", 48), ("28 px", 28)):
        draw.text(
            (S(check_x), S(1602)),
            label,
            font=label_font(18, bold=True),
            fill=CYAN,
        )
        draw_text(
            canvas,
            draw,
            "CROWCLAW 3EYEDCROW",
            x=check_x,
            y=1642,
            height=size,
            variant=check_variant,
            fill=FROST,
            background=VOID_PANEL,
            max_width=790,
            gap_ratio=0.075,
        )
        check_x += 908

    output = canvas.convert("RGB").resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    metadata = PngImagePlugin.PngInfo()
    metadata.add_text("Title", "CrowClaw letterform audition v0.6")
    metadata.add_text("Sample", SAMPLE)
    metadata.add_text("Variants", " | ".join(variant.name for variant in VARIANTS))
    metadata.add_text(
        "Method",
        "Original tapered ribbon and stepped-pixel constructions; no font outlines embedded.",
    )
    output.save(OUTPUT, "PNG", optimize=True, pnginfo=metadata)

    with Image.open(OUTPUT) as proof:
        if proof.size != (WIDTH, HEIGHT):
            raise RuntimeError(f"Unexpected proof size {proof.size}")
        if proof.info.get("Sample") != SAMPLE:
            raise RuntimeError("Exact approval sample is missing from metadata")
        fingerprints: list[str] = []
        for bounds in row_signatures:
            crop = proof.crop(bounds)
            fingerprints.append(hashlib.sha256(crop.tobytes()).hexdigest())
            if crop.getbbox() is None:
                raise RuntimeError(f"Empty audition row: {bounds}")
        if len(set(fingerprints)) != len(VARIANTS):
            raise RuntimeError("Two audition rows rendered identically")
    return OUTPUT


def main() -> None:
    missing = sorted(set(ALPHABET + DIGITS) - set(GLYPHS))
    if missing:
        raise RuntimeError(f"Missing glyph definitions: {missing}")
    output = render()
    print(f"Built {output.relative_to(ROOT).as_posix()}")
    print(f"  dimensions: {WIDTH}x{HEIGHT}")
    print(f"  sample: {SAMPLE}")
    print(f"  sha256: {sha256(output)}")


if __name__ == "__main__":
    main()
