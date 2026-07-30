#!/usr/bin/env python3
"""Build and validate the original Crow Talon Windows cursor family.

The artwork is procedural: every cursor is drawn from primitives in this file.
No source image, system icon, font glyph, or third-party cursor is embedded.

The builder writes native 32- and 48-pixel sources and directly renders the
larger 64- and 96-pixel resources. Animated cursors are RIFF ACON containers
whose frames are independently valid multi-resolution CUR files.
"""

from __future__ import annotations

import ctypes
import hashlib
import io
import json
import math
import os
import struct
import sys
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable, Sequence

from PIL import Image, ImageDraw, ImageFont


REPO_ROOT = Path(__file__).resolve().parents[1]
CURSOR_ROOT = REPO_ROOT / "cursors"
SOURCE_DIR = CURSOR_ROOT / "src"
SOURCE_32_DIR = SOURCE_DIR / "32"
SOURCE_48_DIR = SOURCE_DIR / "48"
WINDOWS_DIR = CURSOR_ROOT / "windows"
PREVIEW_PATH = CURSOR_ROOT / "preview.png"
NATIVE_PROOF_PATH = CURSOR_ROOT / "previews" / "native-size-proof.png"
ANIMATION_PROOF_PATH = CURSOR_ROOT / "previews" / "animation-frames.png"
PACKAGE_VERSION = "0.3.0"
DOWNLOAD_DIR = REPO_ROOT / "downloads"
PACKAGE_STEM = f"Crow-Talon-Windows-v{PACKAGE_VERSION}"
PACKAGE_PATH = DOWNLOAD_DIR / f"{PACKAGE_STEM}.zip"
PACKAGE_HASH_PATH = DOWNLOAD_DIR / f"{PACKAGE_STEM}.sha256"
PACKAGE_CONTENT_HASHES_PATH = CURSOR_ROOT / "package-files.sha256"
README_PATH = CURSOR_ROOT / "README.md"
LEGACY_LOCAL_PACKAGES = (
    CURSOR_ROOT / f"Crow-Talon-v{PACKAGE_VERSION}.zip",
    CURSOR_ROOT / f"Crow-Talon-v{PACKAGE_VERSION}.sha256",
)
PREVIEW_WIDTH = 1600
PREVIEW_HEIGHT = 1010

SIZES = (32, 48, 64, 96)
LOGICAL_SIZE = 32
VISIBLE_ART_SCALE = 1.0
ANI_FRAMES = 12
ANI_JIFFIES = 5  # 5 / 60 second per frame.

# Crow Talon v0.3 is intentionally pixel-built from a tiny opaque palette.
# The approved Crow foot informs the four-talon anatomy, black armour, cyan
# edge light, and restrained ultraviolet joint signals. No warm hue is used.
VOID = (2, 3, 10, 255)
INK = (5, 7, 15, 255)
NIGHT = (8, 12, 25, 255)
GUNMETAL = (22, 30, 46, 255)
GUNMETAL_2 = (39, 52, 72, 255)
STEEL = (117, 139, 171, 255)
FROST = (230, 246, 255, 255)
DEEP_INDIGO = (40, 38, 112, 255)
ULTRAVIOLET = (111, 76, 255, 255)
ELECTRIC_VIOLET = (151, 113, 255, 255)
ELECTRIC_BLUE = (37, 139, 255, 255)
SIGNAL_CYAN = (57, 224, 255, 255)
PULSE_MAGENTA = (189, 71, 231, 255)
TRANSPARENT = (0, 0, 0, 0)
PALETTE = {
    VOID,
    INK,
    NIGHT,
    GUNMETAL,
    GUNMETAL_2,
    STEEL,
    FROST,
    DEEP_INDIGO,
    ULTRAVIOLET,
    ELECTRIC_VIOLET,
    ELECTRIC_BLUE,
    SIGNAL_CYAN,
    PULSE_MAGENTA,
    TRANSPARENT,
}


@dataclass(frozen=True)
class CursorSpec:
    role: str
    registry_name: str
    hotspot: tuple[int, int]
    draw: Callable[["Canvas", int], None]
    animated: bool = False
    visible_scale: float = VISIBLE_ART_SCALE


class Canvas:
    """A logical 32-unit drawing surface rendered natively at each size."""

    def __init__(self, output_size: int):
        self.output_size = output_size
        self.scale = output_size / LOGICAL_SIZE
        self.image = Image.new("RGBA", (output_size, output_size), TRANSPARENT)
        self.draw = ImageDraw.Draw(self.image, "RGBA")

    def n(self, value: float) -> int:
        return max(1, round(value * self.scale))

    def p(self, point: tuple[float, float]) -> tuple[int, int]:
        return round(point[0] * self.scale), round(point[1] * self.scale)

    def points(self, values: Sequence[tuple[float, float]]) -> list[tuple[int, int]]:
        return [self.p(value) for value in values]

    def box(self, values: tuple[float, float, float, float]) -> tuple[int, int, int, int]:
        left, top, right, bottom = values
        return (
            round(left * self.scale),
            round(top * self.scale),
            max(round(left * self.scale), math.ceil((right + 1) * self.scale) - 1),
            max(round(top * self.scale), math.ceil((bottom + 1) * self.scale) - 1),
        )

    def polygon(
        self,
        points: Sequence[tuple[float, float]],
        *,
        fill: tuple[int, int, int, int],
        outline: tuple[int, int, int, int] | None = None,
        width: float = 1,
    ) -> None:
        pts = self.points(points)
        self.draw.polygon(pts, fill=fill)
        if outline:
            self.draw.line(pts + [pts[0]], fill=outline, width=self.n(width))

    def line(
        self,
        points: Sequence[tuple[float, float]],
        *,
        fill: tuple[int, int, int, int],
        width: float,
        joint: str = "curve",
    ) -> None:
        self.draw.line(self.points(points), fill=fill, width=self.n(width))

    def ellipse(
        self,
        box: tuple[float, float, float, float],
        *,
        fill: tuple[int, int, int, int] | None = None,
        outline: tuple[int, int, int, int] | None = None,
        width: float = 1,
    ) -> None:
        self.draw.ellipse(self.box(box), fill=fill, outline=outline, width=self.n(width))

    def rectangle(
        self,
        box: tuple[float, float, float, float],
        *,
        fill: tuple[int, int, int, int] | None = None,
        outline: tuple[int, int, int, int] | None = None,
        width: float = 1,
        radius: float = 0,
    ) -> None:
        if radius:
            self.draw.rounded_rectangle(
                self.box(box),
                radius=self.n(radius),
                fill=fill,
                outline=outline,
                width=self.n(width),
            )
        else:
            self.draw.rectangle(
                self.box(box), fill=fill, outline=outline, width=self.n(width)
            )

    def arc(
        self,
        box: tuple[float, float, float, float],
        start: float,
        end: float,
        *,
        fill: tuple[int, int, int, int],
        width: float,
    ) -> None:
        self.draw.arc(self.box(box), start=start, end=end, fill=fill, width=self.n(width))

    def finish(self) -> Image.Image:
        return self.image.copy()


def draw_eye(
    canvas: Canvas,
    center: tuple[int, int],
    *,
    forehead: bool = False,
    bright: bool = True,
) -> None:
    """Draw a hard-edged two- or three-pixel Crow signal eye."""
    x, y = center
    if forehead:
        canvas.polygon(
            [(x, y - 2), (x + 2, y), (x, y + 2), (x - 2, y)],
            fill=ULTRAVIOLET,
            outline=INK,
        )
        canvas.rectangle((x, y, x, y), fill=FROST if bright else SIGNAL_CYAN)
    else:
        canvas.rectangle((x - 2, y - 1, x + 2, y + 1), fill=INK)
        canvas.rectangle(
            (x - 1, y, x + 1, y),
            fill=SIGNAL_CYAN if bright else ELECTRIC_BLUE,
        )
        canvas.rectangle((x, y, x, y), fill=FROST)


def draw_three_eyes(
    canvas: Canvas,
    left: tuple[int, int],
    forehead: tuple[int, int],
    right: tuple[int, int],
    *,
    compact: bool = False,
) -> None:
    if compact:
        canvas.rectangle((left[0], left[1], left[0], left[1]), fill=SIGNAL_CYAN)
        canvas.rectangle(
            (forehead[0], forehead[1], forehead[0], forehead[1]),
            fill=ELECTRIC_VIOLET,
        )
        canvas.rectangle((right[0], right[1], right[0], right[1]), fill=SIGNAL_CYAN)
        return
    draw_eye(canvas, left)
    draw_eye(canvas, forehead, forehead=True)
    draw_eye(canvas, right)


def draw_crow_face(canvas: Canvas, center: tuple[int, int], *, compact: bool) -> None:
    """Front-facing Crow mask: feather crown, three eyes, and long steel beak."""
    cx, cy = center
    if compact:
        canvas.polygon(
            [
                (cx - 6, cy - 2),
                (cx - 5, cy - 6),
                (cx - 2, cy - 4),
                (cx, cy - 8),
                (cx + 2, cy - 4),
                (cx + 5, cy - 6),
                (cx + 6, cy - 2),
                (cx + 5, cy + 4),
                (cx + 2, cy + 4),
                (cx, cy + 9),
                (cx - 2, cy + 4),
                (cx - 5, cy + 4),
            ],
            fill=GUNMETAL,
            outline=SIGNAL_CYAN,
        )
        canvas.polygon(
            [(cx - 2, cy), (cx + 2, cy), (cx, cy + 9)],
            fill=STEEL,
            outline=INK,
        )
        draw_three_eyes(
            canvas,
            (cx - 3, cy - 1),
            (cx, cy - 4),
            (cx + 3, cy - 1),
            compact=True,
        )
        return

    canvas.polygon(
        [
            (cx - 8, cy - 2),
            (cx - 7, cy - 8),
            (cx - 4, cy - 6),
            (cx - 2, cy - 11),
            (cx, cy - 7),
            (cx + 2, cy - 11),
            (cx + 4, cy - 6),
            (cx + 7, cy - 8),
            (cx + 8, cy - 2),
            (cx + 6, cy + 5),
            (cx + 2, cy + 6),
            (cx, cy + 13),
            (cx - 2, cy + 6),
            (cx - 6, cy + 5),
        ],
        fill=GUNMETAL,
        outline=SIGNAL_CYAN,
    )
    canvas.polygon(
        [(cx - 3, cy + 1), (cx + 3, cy + 1), (cx, cy + 13)],
        fill=STEEL,
        outline=INK,
    )
    canvas.line([(cx, cy + 2), (cx, cy + 10)], fill=FROST, width=1)
    draw_three_eyes(
        canvas,
        (cx - 4, cy - 1),
        (cx, cy - 5),
        (cx + 4, cy - 1),
    )


def draw_spinner_ring(
    canvas: Canvas,
    center: tuple[int, int],
    radius: int,
    frame: int,
) -> None:
    """Twelve discrete signal blocks; animation never blurs the pixel silhouette."""
    cx, cy = center
    for segment in range(12):
        angle = math.radians(segment * 30 - 90)
        x = round(cx + math.cos(angle) * radius)
        y = round(cy + math.sin(angle) * radius)
        phase = (segment - frame) % 12
        color = (
            FROST
            if phase == 0
            else SIGNAL_CYAN
            if phase == 1
            else ULTRAVIOLET
            if phase in (2, 3)
            else GUNMETAL_2
        )
        canvas.rectangle((x - 1, y - 1, x + 1, y + 1), fill=INK)
        canvas.rectangle((x, y, x, y), fill=color)


def draw_talon_digit(
    canvas: Canvas,
    points: Sequence[tuple[float, float]],
    *,
    edge_offset: tuple[float, float],
    joints: Sequence[int],
    terminal: bool = True,
) -> None:
    """Draw one segmented avian digit from talon tip toward the foot pad."""
    canvas.line(points, fill=INK, width=5)
    canvas.line(points, fill=GUNMETAL_2, width=3)
    edge_points = [
        (x + edge_offset[0], y + edge_offset[1]) for x, y in points[1:]
    ]
    if len(edge_points) > 1:
        canvas.line(edge_points, fill=SIGNAL_CYAN, width=1)
    for index in joints:
        x, y = points[index]
        canvas.ellipse((x - 2, y - 2, x + 2, y + 2), fill=INK)
        canvas.ellipse(
            (x - 1, y - 1, x + 1, y + 1),
            fill=ULTRAVIOLET,
            outline=SIGNAL_CYAN,
        )
    if terminal:
        tip_x, tip_y = points[0]
        next_x, next_y = points[1]
        canvas.line(
            [(tip_x, tip_y), (next_x, next_y)],
            fill=INK,
            width=4,
        )
        canvas.line(
            [(tip_x, tip_y), (next_x, next_y)],
            fill=FROST,
            width=2,
        )
        canvas.rectangle((tip_x, tip_y, tip_x, tip_y), fill=FROST)


def draw_talon_pointer(canvas: Canvas, _frame: int = 0) -> None:
    """Anisodactyl biomechanical crow foot: three forward toes plus hallux."""
    # Digit III: longest forward toe and click talon. The hook covers (1, 1).
    canvas.polygon(
        [
            (1, 1), (5, 1), (5, 3), (7, 4), (8, 6), (12, 9),
            (17, 14), (19, 17), (16, 20), (14, 17), (10, 14),
            (7, 11), (5, 8), (3, 7), (1, 5),
        ],
        fill=GUNMETAL,
        outline=SIGNAL_CYAN,
        width=1,
    )
    canvas.polygon([(1, 1), (4, 1), (4, 2), (2, 3), (1, 3)], fill=STEEL)
    canvas.line([(5, 4), (8, 7), (12, 10), (16, 15)], fill=DEEP_INDIGO, width=1)
    canvas.line([(7, 6), (5, 8)], fill=STEEL, width=1)
    canvas.line([(12, 10), (10, 13)], fill=DEEP_INDIGO, width=1)
    canvas.rectangle((10, 10, 12, 12), fill=INK)
    canvas.rectangle((11, 11, 11, 11), fill=ULTRAVIOLET)

    # Digit II: forward/up toe, deliberately narrower and shorter.
    canvas.polygon(
        [
            (9, 2), (12, 1), (14, 2), (14, 5), (15, 7), (15, 11),
            (18, 15), (18, 18), (15, 19), (13, 15), (12, 11),
            (11, 8), (10, 6),
        ],
        fill=GUNMETAL_2,
        outline=SIGNAL_CYAN,
        width=1,
    )
    canvas.polygon([(9, 2), (12, 1), (13, 2), (12, 3), (10, 3)], fill=STEEL)
    canvas.line([(13, 4), (14, 8), (15, 12), (17, 16)], fill=DEEP_INDIGO, width=1)
    canvas.line([(12, 7), (15, 7)], fill=STEEL, width=1)
    canvas.rectangle((13, 10, 15, 12), fill=INK)
    canvas.rectangle((14, 11, 14, 11), fill=ULTRAVIOLET)

    # Digit IV: forward/left toe, splayed away from the other two.
    canvas.polygon(
        [
            (1, 9), (3, 10), (4, 12), (7, 13), (10, 14), (15, 17),
            (18, 18), (18, 21), (15, 22), (12, 19), (8, 18),
            (5, 16), (2, 16), (1, 14),
        ],
        fill=GUNMETAL,
        outline=SIGNAL_CYAN,
        width=1,
    )
    canvas.polygon([(1, 9), (3, 10), (3, 11), (2, 12), (1, 11)], fill=STEEL)
    canvas.line([(4, 12), (8, 15), (13, 17), (16, 19)], fill=DEEP_INDIGO, width=1)
    canvas.line([(7, 13), (6, 16)], fill=STEEL, width=1)
    canvas.rectangle((9, 15, 11, 17), fill=INK)
    canvas.rectangle((10, 16, 10, 16), fill=ULTRAVIOLET)

    # Opposed hallux: a single rear toe extends right and hooks back inward.
    canvas.polygon(
        [
            (18, 16), (21, 14), (24, 12), (27, 10), (30, 11),
            (31, 13), (31, 16), (29, 18), (26, 19), (24, 18),
            (25, 16), (28, 15), (29, 13), (27, 12), (25, 14),
            (22, 17), (20, 20),
        ],
        fill=GUNMETAL_2,
        outline=SIGNAL_CYAN,
        width=1,
    )
    canvas.line([(21, 15), (25, 12), (28, 11), (30, 13)], fill=DEEP_INDIGO, width=1)
    canvas.polygon([(24, 18), (26, 16), (27, 17), (25, 19)], fill=STEEL, outline=INK)
    canvas.rectangle((24, 13, 26, 15), fill=INK)
    canvas.rectangle((25, 14, 25, 14), fill=ULTRAVIOLET)

    # Compact palm and ankle keep this unmistakably avian rather than a hand.
    canvas.polygon(
        [(13, 16), (16, 14), (20, 15), (23, 18), (21, 23), (17, 24), (13, 21)],
        fill=INK,
        outline=INK,
        width=2,
    )
    canvas.polygon(
        [(14, 17), (16, 15), (20, 16), (22, 18), (20, 21), (17, 22), (14, 20)],
        fill=NIGHT,
        outline=SIGNAL_CYAN,
    )
    canvas.ellipse((16, 17, 20, 21), fill=ULTRAVIOLET, outline=SIGNAL_CYAN)
    canvas.rectangle((18, 19, 18, 19), fill=FROST)

    # Segmented tarsus trails southeast from the ankle.
    canvas.polygon(
        [
            (16, 20), (20, 19), (23, 22), (25, 24), (29, 27),
            (31, 29), (30, 31), (27, 31), (24, 28), (21, 26), (18, 24),
        ],
        fill=GUNMETAL,
        outline=SIGNAL_CYAN,
        width=1,
    )
    canvas.line([(20, 21), (23, 24), (26, 27), (30, 30)], fill=DEEP_INDIGO, width=1)
    for x, y in ((21, 24), (25, 27)):
        canvas.rectangle((x - 1, y - 1, x + 1, y + 1), fill=INK)
        canvas.rectangle((x, y, x, y), fill=ELECTRIC_VIOLET)


def draw_help(canvas: Canvas, frame: int = 0) -> None:
    draw_talon_pointer(canvas, frame)
    canvas.rectangle((21, 1, 31, 12), fill=INK)
    canvas.rectangle((22, 2, 30, 11), fill=NIGHT, outline=ULTRAVIOLET)
    canvas.line([(24, 5), (25, 3), (28, 3), (29, 4), (29, 6), (27, 7), (27, 8)], fill=SIGNAL_CYAN, width=1)
    canvas.rectangle((27, 10, 27, 10), fill=FROST)


def draw_working(canvas: Canvas, frame: int = 0) -> None:
    draw_talon_pointer(canvas, frame)
    canvas.rectangle((17, 17, 31, 31), fill=INK)
    canvas.rectangle((18, 18, 30, 30), fill=NIGHT, outline=DEEP_INDIGO)
    draw_spinner_ring(canvas, (24, 24), 5, frame)
    canvas.ellipse((21, 21, 27, 27), fill=GUNMETAL, outline=SIGNAL_CYAN)
    canvas.rectangle((23, 23, 25, 25), fill=ULTRAVIOLET)
    canvas.rectangle((24, 24, 24, 24), fill=FROST)


def draw_busy(canvas: Canvas, frame: int = 0) -> None:
    """Centered wait orb encircled by twelve rotating talon-hook plates."""
    cx, cy = 16, 16
    for segment in range(12):
        angle = math.radians(segment * 30 - 90)
        dx, dy = math.cos(angle), math.sin(angle)
        tx, ty = -dy, dx
        outer = (cx + dx * 14, cy + dy * 14)
        elbow = (cx + dx * 11 + tx * 2.2, cy + dy * 11 + ty * 2.2)
        inner = (cx + dx * 9 + tx * 0.6, cy + dy * 9 + ty * 0.6)
        phase = (segment - frame) % ANI_FRAMES
        colour = (
            FROST
            if phase == 0
            else SIGNAL_CYAN
            if phase == 1
            else ELECTRIC_BLUE
            if phase == 2
            else ULTRAVIOLET
            if phase == 3
            else DEEP_INDIGO
            if phase in (4, 5)
            else GUNMETAL_2
        )
        canvas.line([outer, elbow, inner], fill=INK, width=4)
        canvas.line([outer, elbow, inner], fill=colour, width=2)
        canvas.rectangle(
            (outer[0], outer[1], outer[0], outer[1]),
            fill=STEEL if phase > 5 else colour,
        )

    # A compact mechanical orb separates Busy from every pointer-shaped role.
    canvas.polygon(
        [(16, 7), (21, 9), (24, 13), (24, 18), (21, 23), (16, 25),
         (11, 23), (8, 19), (8, 14), (11, 9)],
        fill=INK,
        outline=INK,
        width=2,
    )
    canvas.polygon(
        [(16, 9), (20, 10), (22, 14), (22, 18), (19, 21), (16, 23),
         (12, 21), (10, 18), (10, 14), (12, 11)],
        fill=GUNMETAL,
        outline=SIGNAL_CYAN,
    )
    canvas.ellipse((12, 12, 20, 20), fill=NIGHT, outline=ULTRAVIOLET, width=2)
    canvas.ellipse((14, 14, 18, 18), fill=ULTRAVIOLET, outline=SIGNAL_CYAN)
    canvas.rectangle((16, 16, 16, 16), fill=FROST)


def draw_precision(canvas: Canvas, _frame: int = 0) -> None:
    canvas.line([(16, 1), (16, 11)], fill=INK, width=3)
    canvas.line([(16, 21), (16, 30)], fill=INK, width=3)
    canvas.line([(1, 16), (11, 16)], fill=INK, width=3)
    canvas.line([(21, 16), (30, 16)], fill=INK, width=3)
    canvas.line([(16, 1), (16, 11)], fill=SIGNAL_CYAN, width=1)
    canvas.line([(16, 21), (16, 30)], fill=SIGNAL_CYAN, width=1)
    canvas.line([(1, 16), (11, 16)], fill=SIGNAL_CYAN, width=1)
    canvas.line([(21, 16), (30, 16)], fill=SIGNAL_CYAN, width=1)
    canvas.rectangle((11, 11, 21, 21), fill=INK)
    canvas.polygon(
        [(16, 12), (20, 14), (20, 18), (18, 20), (14, 20), (12, 18), (12, 14)],
        fill=NIGHT,
        outline=SIGNAL_CYAN,
    )
    canvas.ellipse((14, 14, 18, 18), fill=ULTRAVIOLET, outline=SIGNAL_CYAN)
    canvas.rectangle((16, 16, 16, 16), fill=FROST)


def draw_text(canvas: Canvas, _frame: int = 0) -> None:
    """I-beam built as a segmented tarsus with hooked talon caps."""
    canvas.line([(11, 2), (21, 2)], fill=INK, width=4)
    canvas.line([(12, 2), (20, 2)], fill=SIGNAL_CYAN, width=1)
    canvas.line([(11, 2), (9, 4), (11, 6)], fill=INK, width=3)
    canvas.line([(21, 2), (23, 4), (21, 6)], fill=INK, width=3)
    canvas.rectangle((9, 4, 9, 4), fill=STEEL)
    canvas.rectangle((23, 4, 23, 4), fill=STEEL)
    canvas.line([(16, 2), (16, 30)], fill=INK, width=3)
    canvas.line([(16, 3), (16, 29)], fill=GUNMETAL_2, width=1)
    canvas.line([(11, 30), (21, 30)], fill=INK, width=4)
    canvas.line([(12, 30), (20, 30)], fill=SIGNAL_CYAN, width=1)
    canvas.line([(11, 30), (9, 28), (11, 26)], fill=INK, width=3)
    canvas.line([(21, 30), (23, 28), (21, 26)], fill=INK, width=3)
    canvas.rectangle((9, 28, 9, 28), fill=STEEL)
    canvas.rectangle((23, 28, 23, 28), fill=STEEL)
    canvas.rectangle((15, 15, 17, 17), fill=INK)
    canvas.rectangle((16, 16, 16, 16), fill=ULTRAVIOLET)


def draw_handwriting(canvas: Canvas, _frame: int = 0) -> None:
    """A single articulated writing talon with a precise steel nib."""
    canvas.polygon(
        [(3, 29), (4, 24), (8, 20), (11, 14), (18, 8), (27, 2),
         (25, 8), (21, 12), (17, 17), (13, 23), (8, 27)],
        fill=INK,
        outline=INK,
        width=2,
    )
    canvas.polygon(
        [(4, 27), (6, 23), (10, 19), (13, 14), (19, 9), (26, 3),
         (23, 9), (19, 13), (15, 18), (12, 23), (8, 26)],
        fill=GUNMETAL,
        outline=SIGNAL_CYAN,
    )
    canvas.line([(5, 26), (11, 20), (15, 14), (23, 6)], fill=DEEP_INDIGO, width=1)
    for x, y in ((11, 20), (16, 13), (22, 7)):
        canvas.rectangle((x - 1, y - 1, x + 1, y + 1), fill=INK)
        canvas.rectangle((x, y, x, y), fill=ULTRAVIOLET)
    canvas.polygon([(3, 29), (4, 24), (8, 27)], fill=STEEL, outline=INK)


def draw_unavailable(canvas: Canvas, _frame: int = 0) -> None:
    ring = [(9, 2), (23, 2), (30, 9), (30, 23), (23, 30), (9, 30), (2, 23), (2, 9)]
    inner = [(10, 5), (22, 5), (27, 10), (27, 22), (22, 27), (10, 27), (5, 22), (5, 10)]
    canvas.polygon(ring, fill=INK, outline=INK, width=2)
    canvas.polygon(inner, fill=NIGHT, outline=ULTRAVIOLET, width=2)
    canvas.ellipse((12, 12, 20, 20), fill=GUNMETAL, outline=SIGNAL_CYAN)
    for points in (
        [(15, 13), (11, 8), (10, 5)],
        [(16, 12), (16, 7), (17, 4)],
        [(13, 15), (8, 14), (5, 12)],
        [(19, 15), (23, 12), (26, 13)],
    ):
        canvas.line(points, fill=INK, width=4)
        canvas.line(points, fill=GUNMETAL_2, width=2)
    canvas.rectangle((16, 16, 16, 16), fill=ULTRAVIOLET)
    canvas.line([(6, 6), (26, 26)], fill=INK, width=5)
    canvas.line([(6, 6), (26, 26)], fill=ELECTRIC_VIOLET, width=2)


def arrow_head(
    canvas: Canvas,
    tip: tuple[float, float],
    direction: tuple[float, float],
    *,
    color: tuple[int, int, int, int] = SIGNAL_CYAN,
    length: float = 5,
    spread: float = 3,
) -> None:
    """A hooked mechanical talon terminal, not a filled arrow triangle."""
    dx, dy = direction
    norm = math.hypot(dx, dy)
    dx, dy = dx / norm, dy / norm
    px, py = -dy, dx
    base_x, base_y = tip[0] - dx * length, tip[1] - dy * length
    shoulder = (
        tip[0] - dx * 1.5 + px * spread,
        tip[1] - dy * 1.5 + py * spread,
    )
    base = (base_x, base_y)
    canvas.line([base, shoulder, tip], fill=INK, width=5)
    canvas.line([base, shoulder, tip], fill=GUNMETAL_2, width=3)
    canvas.line([shoulder, tip], fill=color, width=1)
    canvas.ellipse(
        (base_x - 1.5, base_y - 1.5, base_x + 1.5, base_y + 1.5),
        fill=INK,
    )
    canvas.rectangle((base_x, base_y, base_x, base_y), fill=ULTRAVIOLET)
    canvas.rectangle((tip[0], tip[1], tip[0], tip[1]), fill=FROST)


def draw_resize_axis(
    canvas: Canvas,
    direction: tuple[float, float],
    _frame: int = 0,
) -> None:
    dx, dy = direction
    norm = math.hypot(dx, dy)
    dx, dy = dx / norm, dy / norm
    a = (16 - dx * 13, 16 - dy * 13)
    b = (16 + dx * 13, 16 + dy * 13)
    canvas.line([a, b], fill=INK, width=5)
    canvas.line([a, b], fill=ELECTRIC_VIOLET, width=2)
    arrow_head(canvas, a, (-dx, -dy), color=SIGNAL_CYAN)
    arrow_head(canvas, b, (dx, dy), color=SIGNAL_CYAN)
    canvas.rectangle((12, 12, 20, 20), fill=INK)
    canvas.polygon(
        [(16, 13), (19, 15), (19, 18), (17, 19), (14, 19), (13, 17), (13, 15)],
        fill=NIGHT,
        outline=SIGNAL_CYAN,
    )
    canvas.ellipse((15, 15, 17, 17), fill=ULTRAVIOLET)


def draw_resize_v(canvas: Canvas, frame: int = 0) -> None:
    draw_resize_axis(canvas, (0, 1), frame)


def draw_resize_h(canvas: Canvas, frame: int = 0) -> None:
    draw_resize_axis(canvas, (1, 0), frame)


def draw_resize_d1(canvas: Canvas, frame: int = 0) -> None:
    draw_resize_axis(canvas, (1, 1), frame)


def draw_resize_d2(canvas: Canvas, frame: int = 0) -> None:
    draw_resize_axis(canvas, (1, -1), frame)


def draw_move(canvas: Canvas, _frame: int = 0) -> None:
    for direction in ((0, -1), (1, 0), (0, 1), (-1, 0)):
        dx, dy = direction
        start = (16 + dx * 3, 16 + dy * 3)
        tip = (16 + dx * 14, 16 + dy * 14)
        canvas.line([start, tip], fill=INK, width=5)
        canvas.line([start, tip], fill=ELECTRIC_VIOLET, width=2)
        arrow_head(canvas, tip, direction, color=SIGNAL_CYAN, length=5, spread=3)
    canvas.rectangle((12, 12, 20, 20), fill=INK)
    canvas.polygon(
        [(16, 13), (19, 15), (19, 18), (17, 19), (14, 19), (13, 17), (13, 15)],
        fill=NIGHT,
        outline=SIGNAL_CYAN,
    )
    canvas.ellipse((15, 15, 17, 17), fill=ULTRAVIOLET)


def draw_alternate(canvas: Canvas, _frame: int = 0) -> None:
    """Extended selection talon with a small opposed hallux."""
    canvas.polygon(
        [
            (16, 1), (19, 2), (19, 5), (17, 7), (18, 12), (18, 28),
            (16, 31), (13, 29), (13, 12), (14, 7), (12, 5), (12, 3),
        ],
        fill=INK,
        outline=INK,
        width=2,
    )
    canvas.polygon(
        [
            (16, 2), (18, 3), (18, 5), (16, 7), (17, 12), (17, 28),
            (16, 30), (14, 28), (14, 12), (15, 7), (13, 5), (13, 4),
        ],
        fill=GUNMETAL,
        outline=SIGNAL_CYAN,
    )
    canvas.polygon(
        [(17, 13), (21, 10), (25, 10), (27, 12), (25, 15), (22, 16), (23, 13), (21, 12), (18, 16)],
        fill=GUNMETAL_2,
        outline=SIGNAL_CYAN,
    )
    canvas.polygon([(24, 15), (26, 13), (27, 14), (25, 17)], fill=STEEL, outline=INK)
    canvas.line([(16, 9), (16, 26)], fill=DEEP_INDIGO, width=1)
    for y in (12, 20, 27):
        canvas.rectangle((15, y, 17, y + 2), fill=INK)
        canvas.rectangle((16, y + 1, 16, y + 1), fill=ULTRAVIOLET)


def draw_link(canvas: Canvas, _frame: int = 0) -> None:
    """The full four-talon pointer carrying two interlocked link plates."""
    draw_talon_pointer(canvas)
    canvas.polygon(
        [(18, 22), (21, 19), (25, 19), (27, 21), (27, 24), (24, 27), (21, 27), (18, 24)],
        fill=NIGHT,
        outline=ULTRAVIOLET,
    )
    canvas.polygon(
        [(22, 25), (25, 22), (29, 22), (31, 24), (31, 27), (28, 30), (25, 30), (22, 28)],
        fill=NIGHT,
        outline=SIGNAL_CYAN,
    )
    canvas.line([(22, 24), (27, 27)], fill=FROST, width=1)


SPECS: tuple[CursorSpec, ...] = (
    CursorSpec("normal", "Arrow", (1, 1), draw_talon_pointer),
    CursorSpec("help", "Help", (1, 1), draw_help),
    CursorSpec(
        "working",
        "AppStarting",
        (1, 1),
        draw_working,
        animated=True,
    ),
    CursorSpec(
        "busy",
        "Wait",
        (16, 16),
        draw_busy,
        animated=True,
    ),
    CursorSpec("precision", "Crosshair", (16, 16), draw_precision),
    CursorSpec("text", "IBeam", (16, 16), draw_text),
    CursorSpec("handwriting", "NWPen", (3, 29), draw_handwriting),
    CursorSpec("unavailable", "No", (16, 16), draw_unavailable),
    CursorSpec("resize-v", "SizeNS", (16, 16), draw_resize_v),
    CursorSpec("resize-h", "SizeWE", (16, 16), draw_resize_h),
    CursorSpec("resize-d1", "SizeNWSE", (16, 16), draw_resize_d1),
    CursorSpec("resize-d2", "SizeNESW", (16, 16), draw_resize_d2),
    CursorSpec("move", "SizeAll", (16, 16), draw_move),
    CursorSpec("alternate", "UpArrow", (16, 1), draw_alternate),
    CursorSpec("link", "Hand", (1, 1), draw_link),
)


def render(spec: CursorSpec, size: int, frame: int = 0) -> Image.Image:
    canvas = Canvas(size)
    spec.draw(canvas, frame)
    image = canvas.finish()
    hot_x, hot_y = hotspot_for_size(spec, size)
    if image.getpixel((hot_x, hot_y))[3] == 0:
        raise ValueError(
            f"{spec.role}: rendered {size}px artwork does not cover hotspot "
            f"{hot_x},{hot_y}"
        )
    return image


def hotspot_for_size(spec: CursorSpec, size: int) -> tuple[int, int]:
    x = min(size - 1, max(0, round(spec.hotspot[0] * size / LOGICAL_SIZE)))
    y = min(size - 1, max(0, round(spec.hotspot[1] * size / LOGICAL_SIZE)))
    return x, y


def build_cur_bytes(spec: CursorSpec, frame: int = 0) -> bytes:
    payloads: list[tuple[int, bytes]] = []
    for size in SIZES:
        buffer = io.BytesIO()
        render(spec, size, frame).save(buffer, format="PNG", optimize=True)
        payloads.append((size, buffer.getvalue()))

    header_size = 6 + 16 * len(payloads)
    payload_offset = header_size
    entries: list[bytes] = []
    body: list[bytes] = []
    for size, payload in payloads:
        hot_x, hot_y = hotspot_for_size(spec, size)
        entries.append(
            struct.pack(
                "<BBBBHHII",
                0 if size == 256 else size,
                0 if size == 256 else size,
                0,
                0,
                hot_x,
                hot_y,
                len(payload),
                payload_offset,
            )
        )
        body.append(payload)
        payload_offset += len(payload)
    return struct.pack("<HHH", 0, 2, len(payloads)) + b"".join(entries + body)


def riff_chunk(tag: bytes, payload: bytes) -> bytes:
    if len(tag) != 4:
        raise ValueError("RIFF tags must be four bytes")
    pad = b"\0" if len(payload) & 1 else b""
    return tag + struct.pack("<I", len(payload)) + payload + pad


def build_ani_bytes(spec: CursorSpec) -> bytes:
    frames = [build_cur_bytes(spec, frame) for frame in range(ANI_FRAMES)]
    anih = struct.pack(
        "<9I",
        36,  # cbSizeOf
        ANI_FRAMES,
        ANI_FRAMES,
        0,
        0,
        0,
        0,
        ANI_JIFFIES,
        0x00000003,  # AF_ICON | AF_SEQUENCE
    )
    rates = struct.pack(f"<{ANI_FRAMES}I", *([ANI_JIFFIES] * ANI_FRAMES))
    sequence = struct.pack(f"<{ANI_FRAMES}I", *range(ANI_FRAMES))
    frame_list = b"fram" + b"".join(riff_chunk(b"icon", frame) for frame in frames)
    info = b"INFO" + riff_chunk(b"INAM", f"Crow Talon {spec.role}\0".encode("ascii"))
    body = (
        b"ACON"
        + riff_chunk(b"anih", anih)
        + riff_chunk(b"rate", rates)
        + riff_chunk(b"seq ", sequence)
        + riff_chunk(b"LIST", frame_list)
        + riff_chunk(b"LIST", info)
    )
    return b"RIFF" + struct.pack("<I", len(body)) + body


def parse_cur(data: bytes, *, label: str) -> list[dict[str, int]]:
    if len(data) < 6:
        raise ValueError(f"{label}: CUR file is truncated")
    reserved, kind, count = struct.unpack_from("<HHH", data, 0)
    if (reserved, kind, count) != (0, 2, len(SIZES)):
        raise ValueError(
            f"{label}: expected CUR header (0, 2, {len(SIZES)}), "
            f"got {(reserved, kind, count)}"
        )
    entries: list[dict[str, int]] = []
    seen_sizes: set[int] = set()
    for index in range(count):
        entry_offset = 6 + index * 16
        if entry_offset + 16 > len(data):
            raise ValueError(f"{label}: CUR directory is truncated")
        width_byte, height_byte, colors, reserved_byte, hot_x, hot_y, length, offset = (
            struct.unpack_from("<BBBBHHII", data, entry_offset)
        )
        width = 256 if width_byte == 0 else width_byte
        height = 256 if height_byte == 0 else height_byte
        if colors != 0 or reserved_byte != 0:
            raise ValueError(f"{label}: invalid CUR directory flags")
        if width != height or width not in SIZES:
            raise ValueError(f"{label}: unexpected image size {width}x{height}")
        if not (0 <= hot_x < width and 0 <= hot_y < height):
            raise ValueError(f"{label}: hotspot {hot_x},{hot_y} outside {width}x{height}")
        if offset < 6 + count * 16 or offset + length > len(data):
            raise ValueError(f"{label}: image payload points outside the file")
        payload = data[offset : offset + length]
        if not payload.startswith(b"\x89PNG\r\n\x1a\n"):
            raise ValueError(f"{label}: {width}px entry is not PNG-compressed")
        seen_sizes.add(width)
        entries.append(
            {
                "size": width,
                "hotspot_x": hot_x,
                "hotspot_y": hot_y,
                "bytes": length,
            }
        )
    if seen_sizes != set(SIZES):
        raise ValueError(f"{label}: missing sizes; found {sorted(seen_sizes)}")
    return sorted(entries, key=lambda entry: entry["size"])


def iter_riff_chunks(data: bytes, start: int, end: int) -> Iterable[tuple[bytes, bytes]]:
    cursor = start
    while cursor < end:
        if cursor + 8 > end:
            raise ValueError("truncated RIFF chunk header")
        tag = data[cursor : cursor + 4]
        length = struct.unpack_from("<I", data, cursor + 4)[0]
        payload_start = cursor + 8
        payload_end = payload_start + length
        if payload_end > end:
            raise ValueError(f"RIFF chunk {tag!r} extends past container")
        yield tag, data[payload_start:payload_end]
        cursor = payload_end + (length & 1)
    if cursor != end:
        raise ValueError("RIFF chunk alignment error")


def validate_ani(data: bytes, *, label: str) -> dict[str, int]:
    if len(data) < 12 or data[:4] != b"RIFF" or data[8:12] != b"ACON":
        raise ValueError(f"{label}: not a RIFF ACON file")
    declared = struct.unpack_from("<I", data, 4)[0]
    if declared + 8 != len(data):
        raise ValueError(f"{label}: RIFF size mismatch")
    anih_payload = None
    rates = None
    sequence = None
    frame_payloads: list[bytes] = []
    for tag, payload in iter_riff_chunks(data, 12, len(data)):
        if tag == b"anih":
            anih_payload = payload
        elif tag == b"rate":
            rates = payload
        elif tag == b"seq ":
            sequence = payload
        elif tag == b"LIST" and payload[:4] == b"fram":
            frame_payloads.extend(
                child_payload
                for child_tag, child_payload in iter_riff_chunks(
                    payload, 4, len(payload)
                )
                if child_tag == b"icon"
            )
    if anih_payload is None or len(anih_payload) != 36:
        raise ValueError(f"{label}: missing or invalid anih chunk")
    (
        header_size,
        frame_count,
        step_count,
        _width,
        _height,
        _bit_count,
        _planes,
        jiffies,
        flags,
    ) = struct.unpack("<9I", anih_payload)
    if header_size != 36 or frame_count != ANI_FRAMES or step_count != ANI_FRAMES:
        raise ValueError(f"{label}: invalid ANI frame metadata")
    if jiffies != ANI_JIFFIES or flags != 3:
        raise ValueError(f"{label}: invalid ANI timing or flags")
    if rates is None or len(rates) != ANI_FRAMES * 4:
        raise ValueError(f"{label}: invalid rate chunk")
    if sequence is None or len(sequence) != ANI_FRAMES * 4:
        raise ValueError(f"{label}: invalid sequence chunk")
    if list(struct.unpack(f"<{ANI_FRAMES}I", sequence)) != list(range(ANI_FRAMES)):
        raise ValueError(f"{label}: ANI sequence is not deterministic")
    if len(frame_payloads) != ANI_FRAMES:
        raise ValueError(
            f"{label}: expected {ANI_FRAMES} icon frames, got {len(frame_payloads)}"
        )
    for index, frame_data in enumerate(frame_payloads):
        parse_cur(frame_data, label=f"{label} frame {index}")
    return {"frames": frame_count, "steps": step_count, "jiffies": jiffies}


def load_cursor_from_file(path: Path) -> None:
    if os.name != "nt":
        return
    user32 = ctypes.WinDLL("user32", use_last_error=True)
    load = user32.LoadCursorFromFileW
    load.argtypes = [ctypes.c_wchar_p]
    load.restype = ctypes.c_void_p
    destroy = user32.DestroyCursor
    destroy.argtypes = [ctypes.c_void_p]
    destroy.restype = ctypes.c_bool
    ctypes.set_last_error(0)
    handle = load(str(path))
    if not handle:
        error = ctypes.get_last_error()
        raise OSError(error, f"LoadCursorFromFileW rejected {path.name}")
    destroy(handle)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest().upper()


def validate_pixel_source(
    spec: CursorSpec,
    image: Image.Image,
    size: int,
) -> dict[str, object]:
    if image.size != (size, size):
        raise ValueError(f"{spec.role}: source grid is not {size}px")
    raw_pixels = image.tobytes()
    pixels = [
        tuple(raw_pixels[offset : offset + 4])
        for offset in range(0, len(raw_pixels), 4)
    ]
    colors = set(pixels)
    unexpected = colors - PALETTE
    if unexpected:
        raise ValueError(
            f"{spec.role}: source contains colours outside the Crow pixel palette: "
            f"{sorted(unexpected)}"
        )
    alpha_values = {color[3] for color in colors}
    if not alpha_values <= {0, 255}:
        raise ValueError(f"{spec.role}: source uses softened alpha values")
    bounds = image.getbbox()
    if bounds is None:
        raise ValueError(f"{spec.role}: source is empty")
    opaque_pixels = sum(1 for pixel in pixels if pixel[3] == 255)
    minimum_opaque = round(24 * (size / LOGICAL_SIZE) ** 2)
    if opaque_pixels < minimum_opaque:
        raise ValueError(f"{spec.role}: source silhouette is too sparse")
    hot_x, hot_y = hotspot_for_size(spec, size)
    if image.getpixel((hot_x, hot_y))[3] != 255:
        raise ValueError(
            f"{spec.role}: {size}px hotspot {(hot_x, hot_y)} is not opaque"
        )
    return {
        "grid": [size, size],
        "alpha": "1-bit",
        "palette_colours_used": len(colors - {TRANSPARENT}),
        "opaque_pixels": opaque_pixels,
        "bounds": list(bounds),
        "hotspot_is_opaque": True,
    }


def validate_normal_anatomy(image: Image.Image, size: int) -> dict[str, object]:
    """Assert the normal pointer retains its four avian landmarks."""
    scale = size / LOGICAL_SIZE

    def scaled(point: tuple[int, int]) -> tuple[int, int]:
        return (
            min(size - 1, round(point[0] * scale)),
            min(size - 1, round(point[1] * scale)),
        )

    anchors = {
        "digit_iii_hotspot": (1, 1),
        "digit_ii_tip": (10, 2),
        "digit_iv_tip": (1, 9),
        "hallux_hook": (25, 18),
        "palm": (18, 19),
        "tarsus": (28, 30),
    }
    missing = [
        name
        for name, point in anchors.items()
        if image.getpixel(scaled(point))[3] != 255
    ]
    if missing:
        raise ValueError(
            f"normal: {size}px anatomy anchors are transparent: {missing}"
        )
    bounds = image.getbbox()
    if bounds is None or bounds[2] - bounds[0] < round(29 * scale):
        raise ValueError(f"normal: {size}px footprint is too narrow")
    if bounds[3] - bounds[1] < round(29 * scale):
        raise ValueError(f"normal: {size}px footprint is too short")
    return {
        "anatomy": "anisodactyl",
        "forward_toes": 3,
        "rear_hallux": 1,
        "compact_palm": True,
        "segmented_tarsus": True,
        "landmark_anchors_opaque": sorted(anchors),
    }


def alpha_mask_fingerprint(image: Image.Image) -> str:
    return hashlib.sha256(image.getchannel("A").tobytes()).hexdigest()


def changed_rgba_pixels(first: Image.Image, second: Image.Image) -> int:
    first_bytes = first.tobytes()
    second_bytes = second.tobytes()
    return sum(
        first_bytes[offset : offset + 4] != second_bytes[offset : offset + 4]
        for offset in range(0, len(first_bytes), 4)
    )


def silhouette_difference(
    first: Image.Image,
    second: Image.Image,
) -> dict[str, object]:
    first_alpha = first.getchannel("A").tobytes()
    second_alpha = second.getchannel("A").tobytes()
    union = sum(
        bool(first_pixel) or bool(second_pixel)
        for first_pixel, second_pixel in zip(first_alpha, second_alpha)
    )
    changed = sum(
        bool(first_pixel) != bool(second_pixel)
        for first_pixel, second_pixel in zip(first_alpha, second_alpha)
    )
    if union == 0:
        raise ValueError("Cannot compare two empty cursor silhouettes")
    return {
        "different_pixels": changed,
        "union_pixels": union,
        "difference_ratio": round(changed / union, 4),
    }


def validate_animation_motion(spec: CursorSpec) -> dict[str, object]:
    """Require unique, visibly changing frames at both native sizes."""
    if not spec.animated:
        raise ValueError(f"{spec.role}: animation validation used on static role")
    result: dict[str, object] = {}
    for size in (32, 48):
        frames = [render(spec, size, frame) for frame in range(ANI_FRAMES)]
        unique = len(
            {hashlib.sha256(frame.tobytes()).hexdigest() for frame in frames}
        )
        if unique != ANI_FRAMES:
            raise ValueError(
                f"{spec.role}: only {unique} unique native {size}px frames"
            )
        changed_per_step = [
            changed_rgba_pixels(
                frames[index],
                frames[(index + 1) % ANI_FRAMES],
            )
            for index in range(ANI_FRAMES)
        ]
        minimum_required = (
            24 if size == 32 else 60
        ) if spec.role == "busy" else (
            4 if size == 32 else 8
        )
        if min(changed_per_step) < minimum_required:
            raise ValueError(
                f"{spec.role}: native {size}px animation changes only "
                f"{min(changed_per_step)} pixels in one step; "
                f"minimum is {minimum_required}"
            )
        result[str(size)] = {
            "unique_frames": unique,
            "minimum_pixels_changed_per_step": min(changed_per_step),
            "maximum_pixels_changed_per_step": max(changed_per_step),
            "mean_pixels_changed_per_step": round(
                sum(changed_per_step) / len(changed_per_step),
                2,
            ),
            "minimum_required": minimum_required,
        }
    return result


def write_preview(specs: Sequence[CursorSpec]) -> None:
    columns, rows = 5, 3
    cell_w, cell_h = 310, 218
    preview = Image.new("RGBA", (PREVIEW_WIDTH, PREVIEW_HEIGHT), VOID)
    draw = ImageDraw.Draw(preview, "RGBA")
    try:
        title_font = ImageFont.load_default(size=24)
        font = ImageFont.load_default(size=17)
        small_font = ImageFont.load_default(size=12)
    except TypeError:
        title_font = ImageFont.load_default()
        font = ImageFont.load_default()
        small_font = font

    for x in range(0, PREVIEW_WIDTH, 20):
        draw.line((x, 0, x, PREVIEW_HEIGHT), fill=(40, 38, 112, 42), width=1)
    for y in range(0, PREVIEW_HEIGHT, 20):
        draw.line((0, y, PREVIEW_WIDTH, y), fill=(40, 38, 112, 42), width=1)
    draw.text((24, 18), "CROW TALON v0.3", font=title_font, fill=FROST)
    draw.text(
        (24, 48),
        "FOUR-TALON CYBERNETIC CROW-FOOT  //  NATIVE 32 + 48  //  DIRECT 64 + 96",
        font=small_font,
        fill=SIGNAL_CYAN,
    )

    for index, spec in enumerate(specs):
        column, row = index % columns, index // columns
        x0, y0 = 20 + column * cell_w, 78 + row * cell_h
        draw.rectangle(
            (x0 + 4, y0 + 4, x0 + cell_w - 8, y0 + cell_h - 8),
            fill=NIGHT,
            outline=DEEP_INDIGO,
            width=2,
        )
        frame = 2 if spec.animated else 0
        native = render(spec, 32, frame)
        art = native.resize((128, 128), Image.Resampling.NEAREST)
        preview.alpha_composite(art, (x0 + (cell_w - 128) // 2, y0 + 20))
        label = spec.role.replace("-", " ").upper()
        box = draw.textbbox((0, 0), label, font=font)
        text_w = box[2] - box[0]
        draw.text(
            (x0 + (cell_w - text_w) / 2, y0 + 154),
            label,
            font=font,
            fill=FROST,
        )
        registry = spec.registry_name.upper()
        registry_box = draw.textbbox((0, 0), registry, font=small_font)
        registry_w = registry_box[2] - registry_box[0]
        draw.text(
            (x0 + (cell_w - registry_w) / 2, y0 + 183),
            registry,
            font=small_font,
            fill=ELECTRIC_VIOLET,
        )
    proof_top = 760
    draw.text(
        (24, proof_top - 26),
        "ACTUAL WINDOWS FOOTPRINTS — DARK / LIGHT",
        font=small_font,
        fill=SIGNAL_CYAN,
    )
    light = (232, 240, 248, 255)
    slot_w = 103
    for index, spec in enumerate(specs):
        x0 = 20 + index * slot_w
        draw.rectangle((x0, proof_top, x0 + 98, proof_top + 104), fill=NIGHT)
        draw.rectangle((x0, proof_top + 108, x0 + 98, proof_top + 212), fill=light)
        frame = 2 if spec.animated else 0
        art32 = render(spec, 32, frame)
        art48 = render(spec, 48, frame)
        preview.alpha_composite(art32, (x0 + 7, proof_top + 34))
        preview.alpha_composite(art48, (x0 + 43, proof_top + 26))
        preview.alpha_composite(art32, (x0 + 7, proof_top + 142))
        preview.alpha_composite(art48, (x0 + 43, proof_top + 134))
        short_label = spec.role.replace("resize-", "r-")[:10].upper()
        draw.text((x0 + 4, proof_top + 5), short_label, font=small_font, fill=FROST)
        draw.text((x0 + 4, proof_top + 113), short_label, font=small_font, fill=NIGHT)
    preview.convert("RGB").save(PREVIEW_PATH, "PNG", optimize=True)
    NATIVE_PROOF_PATH.parent.mkdir(parents=True, exist_ok=True)
    preview.crop((0, proof_top - 32, PREVIEW_WIDTH, PREVIEW_HEIGHT)).convert("RGB").save(
        NATIVE_PROOF_PATH,
        "PNG",
        optimize=True,
    )

    animation_preview = Image.new("RGBA", (1600, 350), VOID)
    animation_draw = ImageDraw.Draw(animation_preview, "RGBA")
    for x in range(0, 1600, 20):
        animation_draw.line((x, 0, x, 350), fill=(40, 38, 112, 42), width=1)
    for y in range(0, 350, 20):
        animation_draw.line((0, y, 1600, y), fill=(40, 38, 112, 42), width=1)
    animation_draw.text(
        (24, 16),
        "CROW TALON v0.3  //  NATIVE 32px ANI FRAME PROOF (3x)",
        font=title_font,
        fill=FROST,
    )
    animated_specs = [spec for spec in specs if spec.animated]
    for row, spec in enumerate(animated_specs):
        y0 = 58 + row * 142
        animation_draw.text(
            (20, y0 + 46),
            spec.role.upper(),
            font=small_font,
            fill=SIGNAL_CYAN,
        )
        for frame in range(ANI_FRAMES):
            x0 = 100 + frame * 124
            animation_draw.rectangle(
                (x0, y0, x0 + 116, y0 + 126),
                fill=NIGHT,
                outline=DEEP_INDIGO,
            )
            native = render(spec, 32, frame)
            magnified = native.resize((96, 96), Image.Resampling.NEAREST)
            animation_preview.alpha_composite(magnified, (x0 + 10, y0 + 17))
            animation_draw.text(
                (x0 + 4, y0 + 3),
                f"{frame:02d}",
                font=small_font,
                fill=STEEL,
            )
    animation_preview.convert("RGB").save(
        ANIMATION_PROOF_PATH,
        "PNG",
        optimize=True,
    )


def install_ps1() -> str:
    return r"""# Crow Talon v0.3 per-user cursor scheme installer.
# Running this script registers the scheme. It only activates it with -Activate.
[CmdletBinding(SupportsShouldProcess)]
param([switch]$Activate)

$ErrorActionPreference = 'Stop'
$schemeName = 'Crow Talon'
$packageVersion = '0.3.0'
$source = Join-Path $PSScriptRoot 'windows'
$destination = Join-Path $env:LOCALAPPDATA 'Crow\Cursors\Crow-Talon'
$schemesKey = 'HKCU:\Control Panel\Cursors\Schemes'
$cursorsKey = 'HKCU:\Control Panel\Cursors'

$roles = [ordered]@{
    Arrow       = 'normal.cur'
    Help        = 'help.cur'
    AppStarting = 'working.ani'
    Wait        = 'busy.ani'
    Crosshair   = 'precision.cur'
    IBeam       = 'text.cur'
    NWPen       = 'handwriting.cur'
    No          = 'unavailable.cur'
    SizeNS      = 'resize-v.cur'
    SizeWE      = 'resize-h.cur'
    SizeNWSE    = 'resize-d1.cur'
    SizeNESW    = 'resize-d2.cur'
    SizeAll     = 'move.cur'
    UpArrow     = 'alternate.cur'
    Hand        = 'link.cur'
}
$registered = $false

foreach ($file in $roles.Values) {
    $candidate = Join-Path $source $file
    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
        throw "Incomplete Crow Talon v$packageVersion package. Extract the entire ZIP before running install.ps1. Missing: $candidate"
    }
}

if ($PSCmdlet.ShouldProcess($destination, 'Install Crow Talon cursor files')) {
    New-Item -ItemType Directory -Path $destination -Force | Out-Null
    foreach ($file in $roles.Values) {
        Copy-Item -LiteralPath (Join-Path $source $file) -Destination $destination -Force
    }
    # Keep static fallbacks available even though the scheme prefers ANI.
    Copy-Item -LiteralPath (Join-Path $source 'working.cur') -Destination $destination -Force
    Copy-Item -LiteralPath (Join-Path $source 'busy.cur') -Destination $destination -Force

    New-Item -Path $schemesKey -Force | Out-Null
    $schemePaths = foreach ($file in $roles.Values) { Join-Path $destination $file }
    New-ItemProperty -Path $schemesKey -Name $schemeName -Value ($schemePaths -join ',') `
        -PropertyType String -Force | Out-Null
    $registered = $true
}

if ($Activate -and $PSCmdlet.ShouldProcess($schemeName, 'Activate cursor scheme')) {
    New-Item -Path $cursorsKey -Force | Out-Null
    foreach ($entry in $roles.GetEnumerator()) {
        Set-ItemProperty -Path $cursorsKey -Name $entry.Key `
            -Value (Join-Path $destination $entry.Value)
    }
    Set-Item -Path $cursorsKey -Value $schemeName

    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class CrowCursorRefresh {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SystemParametersInfo(
        uint uiAction, uint uiParam, IntPtr pvParam, uint fWinIni);
}
'@
    if (-not [CrowCursorRefresh]::SystemParametersInfo(0x0057, 0, [IntPtr]::Zero, 3)) {
        throw "The scheme was registered, but Windows could not reload cursors."
    }
}

if ($registered) {
    Write-Host "Crow Talon v$packageVersion is registered for this Windows account."
} else {
    Write-Host "Crow Talon v$packageVersion registration was not performed."
}
if ($registered -and -not $Activate) {
    Write-Host "Select it in Mouse Properties > Pointers, or rerun with -Activate."
}
"""


def uninstall_ps1() -> str:
    return r"""# Crow Talon v0.3 per-user cursor scheme uninstaller.
[CmdletBinding(SupportsShouldProcess)]
param()

$ErrorActionPreference = 'Stop'
$schemeName = 'Crow Talon'
$destination = Join-Path $env:LOCALAPPDATA 'Crow\Cursors\Crow-Talon'
$schemesKey = 'HKCU:\Control Panel\Cursors\Schemes'
$cursorsKey = 'HKCU:\Control Panel\Cursors'
$registryRoles = @(
    'Arrow','Help','AppStarting','Wait','Crosshair','IBeam','NWPen','No',
    'SizeNS','SizeWE','SizeNWSE','SizeNESW','SizeAll','UpArrow','Hand'
)
$removed = $false

if ($PSCmdlet.ShouldProcess($schemeName, 'Unregister cursor scheme')) {
    Remove-ItemProperty -Path $schemesKey -Name $schemeName -ErrorAction SilentlyContinue

    $wasActive = $false
    foreach ($role in $registryRoles) {
        $current = (Get-ItemProperty -Path $cursorsKey -Name $role `
            -ErrorAction SilentlyContinue).$role
        if ($current -and $current.StartsWith($destination, [StringComparison]::OrdinalIgnoreCase)) {
            Set-ItemProperty -Path $cursorsKey -Name $role -Value ''
            $wasActive = $true
        }
    }
    if ($wasActive) {
        Set-Item -Path $cursorsKey -Value ''
        Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class CrowCursorRefresh {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SystemParametersInfo(
        uint uiAction, uint uiParam, IntPtr pvParam, uint fWinIni);
}
'@
        [void][CrowCursorRefresh]::SystemParametersInfo(0x0057, 0, [IntPtr]::Zero, 3)
    }

    $safeRoot = Join-Path $env:LOCALAPPDATA 'Crow\Cursors'
    if ((Test-Path -LiteralPath $destination) -and
        $destination.StartsWith($safeRoot, [StringComparison]::OrdinalIgnoreCase)) {
        Remove-Item -LiteralPath $destination -Recurse -Force
    }
    $removed = $true
}

if ($removed) {
    Write-Host 'Crow Talon has been removed from this Windows account.'
} else {
    Write-Host 'Crow Talon removal was not performed.'
}
"""


def cursor_inf() -> str:
    files = [
        "normal.cur",
        "help.cur",
        "working.ani",
        "working.cur",
        "busy.ani",
        "busy.cur",
        "precision.cur",
        "text.cur",
        "handwriting.cur",
        "unavailable.cur",
        "resize-v.cur",
        "resize-h.cur",
        "resize-d1.cur",
        "resize-d2.cur",
        "move.cur",
        "alternate.cur",
        "link.cur",
    ]
    scheme_files = [
        "normal.cur",
        "help.cur",
        "working.ani",
        "busy.ani",
        "precision.cur",
        "text.cur",
        "handwriting.cur",
        "unavailable.cur",
        "resize-v.cur",
        "resize-h.cur",
        "resize-d1.cur",
        "resize-d2.cur",
        "move.cur",
        "alternate.cur",
        "link.cur",
    ]
    copy_lines = "\r\n".join(files)
    disk_lines = "\r\n".join(f"{name}=1" for name in files)
    scheme = ",".join(
        rf"%10%\Cursors\Crow-Talon\{name}" for name in scheme_files
    )
    return (
        r"""; Crow Talon v0.3 Windows cursor scheme
; Right-click this file and choose Install. Administrative rights may be
; required because the INF convention stores files under %SystemRoot%\Cursors.
[Version]
Signature="$CHICAGO$"
Class=Mouse

[DefaultInstall]
CopyFiles=CrowTalon.CopyFiles
AddReg=CrowTalon.AddReg

[DefaultInstall.NT]
CopyFiles=CrowTalon.CopyFiles
AddReg=CrowTalon.AddReg

[DestinationDirs]
CrowTalon.CopyFiles=10,"Cursors\Crow-Talon"

[SourceDisksNames]
1="Crow Talon v0.3 Cursor Scheme",,,

[SourceDisksFiles]
"""
        + disk_lines
        + "\r\n\r\n[CrowTalon.CopyFiles]\r\n"
        + copy_lines
        + "\r\n\r\n[CrowTalon.AddReg]\r\n"
        + f'HKCU,"Control Panel\\Cursors\\Schemes","Crow Talon",0x00000000,"{scheme}"\r\n'
    )


def cursor_readme() -> str:
    return f"""# Crow Talon v{PACKAGE_VERSION}

Crow Talon is the original pixel-art Windows pointer family for the Crow Theme.
It uses black and gunmetal anisodactyl crow-foot silhouettes, cyan edge light,
and restrained ultraviolet joint signals. The normal pointer has exactly three
forward hooked toes plus one opposed rear hallux. The 32- and 48-pixel sources
are rendered natively; 64- and 96-pixel resources are direct larger renders.

## Install for the current Windows user

1. Extract the **entire** `{PACKAGE_PATH.name}` archive.
2. Open PowerShell in the extracted `{PACKAGE_STEM}` folder.
3. Run `./install.ps1` to register the scheme.
4. Select **Crow Talon** under **Mouse Properties > Pointers**.

To register and activate it in one step, run `./install.ps1 -Activate`.
To remove the scheme, run `./uninstall.ps1`.

Do not download or run `install.ps1` by itself: it requires the sibling
`windows` payload folder included in the ZIP.

`Crow-Talon.inf` is also provided for the classic system-wide Windows install
flow. That route can require administrator approval.

## Included roles

Arrow, Help, AppStarting, Wait, Crosshair, IBeam, NWPen, No, SizeNS, SizeWE,
SizeNWSE, SizeNESW, SizeAll, UpArrow, and Hand. Working and Busy include both
animated ANI files and static CUR fallbacks.

Busy is a centered mechanical wait orb encircled by twelve hooked talon plates.
Its lead cyan/violet signal visibly advances one plate per animation frame, so
it remains distinct from the Normal pointer at the native 32-pixel size.

## Integrity and source

- `manifest.json` records every role, embedded size, hotspot, and SHA-256.
- `package-files.sha256` records the archive payload checksums.
- `{PACKAGE_HASH_PATH.name}` beside the ZIP validates the archive itself.
- `scripts/build_cursors.py` is the deterministic procedural source.

The approved biomechanical three-eyed Crow was used as the visual identity
reference only; no third-party cursor, system pointer, font glyph, or reference
raster is embedded in the cursor artwork. The visible artwork is calibrated
against the footprint of the standard Windows pointer.
"""


def write_text_outputs() -> None:
    (CURSOR_ROOT / "install.ps1").write_text(install_ps1(), encoding="utf-8", newline="\n")
    (CURSOR_ROOT / "uninstall.ps1").write_text(
        uninstall_ps1(), encoding="utf-8", newline="\n"
    )
    (CURSOR_ROOT / "Crow-Talon.inf").write_text(
        cursor_inf(), encoding="utf-8", newline=""
    )
    README_PATH.write_text(cursor_readme(), encoding="utf-8", newline="\n")


def package_entries() -> list[tuple[Path, str]]:
    entries = [
        (CURSOR_ROOT / "install.ps1", "install.ps1"),
        (CURSOR_ROOT / "uninstall.ps1", "uninstall.ps1"),
        (CURSOR_ROOT / "Crow-Talon.inf", "Crow-Talon.inf"),
        (CURSOR_ROOT / "README.md", "README.md"),
        (CURSOR_ROOT / "manifest.json", "manifest.json"),
        (PREVIEW_PATH, "preview.png"),
        (NATIVE_PROOF_PATH, "previews/native-size-proof.png"),
        (ANIMATION_PROOF_PATH, "previews/animation-frames.png"),
        (REPO_ROOT / "scripts" / "build_cursors.py", "scripts/build_cursors.py"),
        (REPO_ROOT / "LICENSE.md", "LICENSE.md"),
    ]
    entries.extend(
        (path, f"src/{path.relative_to(SOURCE_DIR).as_posix()}")
        for path in sorted(SOURCE_DIR.rglob("*.png"))
    )
    entries.extend(
        (path, f"windows/{path.name}")
        for path in sorted(WINDOWS_DIR.glob("*"))
        if path.is_file()
    )
    return sorted(entries, key=lambda entry: entry[1].casefold())


def write_distribution_package() -> dict[str, object]:
    entries = package_entries()
    missing = [str(path) for path, _ in entries if not path.is_file()]
    if missing:
        raise ValueError(f"Cannot package Crow Talon; missing files: {missing}")

    content_hashes = "".join(
        f"{sha256(path)}  {archive_name}\n" for path, archive_name in entries
    )
    PACKAGE_CONTENT_HASHES_PATH.write_text(
        content_hashes, encoding="utf-8", newline="\n"
    )
    entries.append((PACKAGE_CONTENT_HASHES_PATH, "package-files.sha256"))
    entries.sort(key=lambda entry: entry[1].casefold())

    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    temporary_path = PACKAGE_PATH.with_suffix(".tmp")
    if temporary_path.exists():
        temporary_path.unlink()
    try:
        with zipfile.ZipFile(
            temporary_path,
            "w",
            compression=zipfile.ZIP_DEFLATED,
            compresslevel=9,
        ) as archive:
            for path, archive_name in entries:
                member = zipfile.ZipInfo(
                    f"{PACKAGE_STEM}/{archive_name}",
                    date_time=(2026, 1, 1, 0, 0, 0),
                )
                member.compress_type = zipfile.ZIP_DEFLATED
                member.external_attr = 0o100644 << 16
                member.create_system = 3
                archive.writestr(member, path.read_bytes())
        temporary_path.replace(PACKAGE_PATH)
    finally:
        if temporary_path.exists():
            temporary_path.unlink()

    with zipfile.ZipFile(PACKAGE_PATH, "r") as archive:
        corrupt = archive.testzip()
        if corrupt:
            raise ValueError(f"{PACKAGE_PATH.name}: corrupt member {corrupt}")
        expected_names = {
            f"{PACKAGE_STEM}/{archive_name}" for _, archive_name in entries
        }
        actual_names = set(archive.namelist())
        if actual_names != expected_names:
            raise ValueError(f"{PACKAGE_PATH.name}: archive member mismatch")

    archive_hash = sha256(PACKAGE_PATH)
    PACKAGE_HASH_PATH.write_text(
        f"{archive_hash}  {PACKAGE_PATH.name}\n",
        encoding="utf-8",
        newline="\n",
    )
    for legacy_path in LEGACY_LOCAL_PACKAGES:
        if legacy_path.exists():
            if legacy_path.parent.resolve() != CURSOR_ROOT.resolve():
                raise ValueError(f"Refusing to remove unsafe legacy package: {legacy_path}")
            legacy_path.unlink()
    return {
        "archive": PACKAGE_PATH.name,
        "sha256_file": PACKAGE_HASH_PATH.name,
        "sha256": archive_hash,
        "members": len(entries),
        "bytes": PACKAGE_PATH.stat().st_size,
        "root": PACKAGE_STEM,
    }


def build() -> None:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    SOURCE_32_DIR.mkdir(parents=True, exist_ok=True)
    SOURCE_48_DIR.mkdir(parents=True, exist_ok=True)
    WINDOWS_DIR.mkdir(parents=True, exist_ok=True)

    manifest_roles: list[dict[str, object]] = []
    source_fingerprints: set[str] = set()
    native_alpha_fingerprints: dict[int, dict[str, str]] = {32: {}, 48: {}}
    native_images: dict[int, dict[str, Image.Image]] = {32: {}, 48: {}}
    validation: dict[str, object] = {
        "cur_structure": "passed",
        "ani_structure": "passed",
        "windows_load_cursor_from_file": "passed" if os.name == "nt" else "not-run",
        "pixel_grid_and_palette": "passed",
        "opaque_hotspots": "passed",
        "role_silhouettes_unique": "passed",
        "native_role_alpha_masks_unique": "pending",
        "busy_distinct_from_normal": "pending",
        "animation_motion": "pending",
        "normal_anisodactyl_anatomy": "passed",
        "native_32_and_48_sources": "passed",
        "warm_colours": "none",
    }

    for spec in SPECS:
        source_path = SOURCE_DIR / f"{spec.role}.png"
        source_32_path = SOURCE_32_DIR / f"{spec.role}.png"
        source_48_path = SOURCE_48_DIR / f"{spec.role}.png"
        pixel_source_32 = render(spec, 32, 0)
        pixel_source_48 = render(spec, 48, 0)
        for size, native_image in (
            (32, pixel_source_32),
            (48, pixel_source_48),
        ):
            fingerprint = alpha_mask_fingerprint(native_image)
            duplicate = native_alpha_fingerprints[size].get(fingerprint)
            if duplicate:
                raise ValueError(
                    f"{spec.role}: native {size}px alpha silhouette duplicates "
                    f"{duplicate}"
                )
            native_alpha_fingerprints[size][fingerprint] = spec.role
            native_images[size][spec.role] = native_image.copy()
        pixel_meta = {
            "32": validate_pixel_source(spec, pixel_source_32, 32),
            "48": validate_pixel_source(spec, pixel_source_48, 48),
        }
        if spec.role == "normal":
            pixel_meta["anatomy_32"] = validate_normal_anatomy(pixel_source_32, 32)
            pixel_meta["anatomy_48"] = validate_normal_anatomy(pixel_source_48, 48)
        pixel_source_32.save(source_32_path, "PNG", optimize=True)
        pixel_source_48.save(source_48_path, "PNG", optimize=True)
        render(spec, 256, 0).save(source_path, "PNG", optimize=True)
        source_fingerprint = sha256(source_path)
        if source_fingerprint in source_fingerprints:
            raise ValueError(f"{spec.role}: duplicates another role silhouette")
        source_fingerprints.add(source_fingerprint)

        static_path = WINDOWS_DIR / f"{spec.role}.cur"
        static_path.write_bytes(build_cur_bytes(spec, 0))
        entries = parse_cur(static_path.read_bytes(), label=static_path.name)
        for entry in entries:
            expected = hotspot_for_size(spec, int(entry["size"]))
            actual = int(entry["hotspot_x"]), int(entry["hotspot_y"])
            if actual != expected:
                raise ValueError(
                    f"{static_path.name}: hotspot {actual} does not match {expected}"
                )
        load_cursor_from_file(static_path)

        role_record: dict[str, object] = {
            "role": spec.role,
            "windows_registry_name": spec.registry_name,
            "visible_art_scale": spec.visible_scale,
            "source_png": f"src/{spec.role}.png",
            "native_source_pngs": [
                f"src/32/{spec.role}.png",
                f"src/48/{spec.role}.png",
            ],
            "static_cursor": f"windows/{spec.role}.cur",
            "pixel_source": pixel_meta,
            "embedded_images": entries,
            "sha256": {
                f"src/{spec.role}.png": source_fingerprint,
                f"src/32/{spec.role}.png": sha256(source_32_path),
                f"src/48/{spec.role}.png": sha256(source_48_path),
                f"windows/{spec.role}.cur": sha256(static_path),
            },
        }
        if spec.animated:
            frame_hashes = {
                hashlib.sha256(build_cur_bytes(spec, frame)).hexdigest()
                for frame in range(ANI_FRAMES)
            }
            if len(frame_hashes) != ANI_FRAMES:
                raise ValueError(
                    f"{spec.role}: animation has only {len(frame_hashes)} unique frames"
                )
            ani_path = WINDOWS_DIR / f"{spec.role}.ani"
            ani_path.write_bytes(build_ani_bytes(spec))
            ani_meta = validate_ani(ani_path.read_bytes(), label=ani_path.name)
            ani_meta["unique_frames"] = len(frame_hashes)
            ani_meta["native_motion"] = validate_animation_motion(spec)
            load_cursor_from_file(ani_path)
            role_record["animated_cursor"] = f"windows/{spec.role}.ani"
            role_record["animation"] = ani_meta
            role_record["sha256"][f"windows/{spec.role}.ani"] = sha256(ani_path)  # type: ignore[index]
        manifest_roles.append(role_record)

    validation["native_role_alpha_masks_unique"] = {
        "status": "passed",
        "roles": len(SPECS),
        "sizes": {
            str(size): len(fingerprints)
            for size, fingerprints in native_alpha_fingerprints.items()
        },
    }
    normal_busy_difference = {
        str(size): silhouette_difference(
            native_images[size]["normal"],
            native_images[size]["busy"],
        )
        for size in (32, 48)
    }
    if any(
        float(record["difference_ratio"]) < 0.35
        for record in normal_busy_difference.values()
    ):
        raise ValueError(
            "busy: native silhouette is not sufficiently distinct from normal"
        )
    validation["busy_distinct_from_normal"] = {
        "status": "passed",
        "minimum_ratio": 0.35,
        "sizes": normal_busy_difference,
    }
    validation["animation_motion"] = {
        role["role"]: role["animation"]["native_motion"]  # type: ignore[index]
        for role in manifest_roles
        if "animation" in role
    }

    write_preview(SPECS)
    write_text_outputs()

    manifest = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "name": "Crow Talon",
        "version": PACKAGE_VERSION,
        "description": "Four-talon biomechanical crow-foot Windows cursor family for the Crow Theme.",
        "authorship": {
            "method": "Drawn from original geometric primitives with native 32- and 48-pixel rendering in scripts/build_cursors.py",
            "third_party_art": False,
            "system_cursor_assets_embedded": False,
            "identity_reference": {
                "name": "Approved full biomechanical three-eyed Crow mascot",
                "source_filename": "crow-mascot-v3.png",
                "usage": "Visual identity reference only; raster not embedded",
            },
        },
        "design": {
            "geometry": "hard-edged native 32- and 48-pixel sources with direct 64- and 96-pixel renders",
            "primary_pointer": "anisodactyl cybernetic crow foot with exactly three forward hooked toes, one opposed rear hallux, compact palm, and segmented tarsus",
            "default_visible_art_scale": VISIBLE_ART_SCALE,
            "scale_calibration": "native 32- and 48-pixel footprints calibrated to standard Windows pointer dimensions before larger direct renders",
            "fill": ["black", "night", "gunmetal"],
            "edge": "signal cyan",
            "identity_signal": "restrained ultraviolet mechanical joint nodes",
            "warm_colours": False,
            "alpha": "1-bit",
        },
        "windows_scheme_order": [spec.registry_name for spec in SPECS],
        "embedded_sizes": list(SIZES),
        "animation": {
            "roles": ["working", "busy"],
            "frames": ANI_FRAMES,
            "jiffies_per_frame": ANI_JIFFIES,
            "static_fallbacks": ["windows/working.cur", "windows/busy.cur"],
            "busy_wait_state": "centered mechanical orb with twelve rotating hooked talon plates",
        },
        "installers": {
            "recommended_per_user": "install.ps1",
            "uninstall": "uninstall.ps1",
            "classic_inf": "Crow-Talon.inf",
            "installed_during_build": False,
        },
        "distribution": {
            "archive": f"downloads/{PACKAGE_PATH.name}",
            "archive_sha256": f"downloads/{PACKAGE_HASH_PATH.name}",
            "payload_sha256": "cursors/package-files.sha256",
            "extract_before_install": True,
        },
        "preview": {
            "path": "preview.png",
            "width": PREVIEW_WIDTH,
            "height": PREVIEW_HEIGHT,
            "sha256": sha256(PREVIEW_PATH),
            "native_size_proof": {
                "path": "previews/native-size-proof.png",
                "sha256": sha256(NATIVE_PROOF_PATH),
                "backgrounds": ["dark", "light"],
                "sizes": [32, 48],
            },
            "animation_frame_proof": {
                "path": "previews/animation-frames.png",
                "sha256": sha256(ANIMATION_PROOF_PATH),
                "native_size": 32,
                "magnification": 3,
                "frames_per_role": ANI_FRAMES,
            },
        },
        "roles": manifest_roles,
        "validation": validation,
    }
    manifest_path = CURSOR_ROOT / "manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8", newline="\n"
    )
    package_meta = write_distribution_package()

    print(
        f"Built {len(SPECS)} static CUR files, 2 ANI files, "
        f"{len(SPECS) * 3} source PNGs, {PREVIEW_PATH.name}, and "
        f"{package_meta['archive']} ({package_meta['members']} members)."
    )
    print(
        "Native role distinctness, four-talon anatomy, visible ANI motion, "
        "hotspots, CUR/ANI structure, archive integrity, and "
        "LoadCursorFromFileW validation passed."
    )


if __name__ == "__main__":
    try:
        build()
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise
