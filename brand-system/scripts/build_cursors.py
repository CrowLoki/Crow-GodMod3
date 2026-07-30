#!/usr/bin/env python3
"""Build and validate the original Crow Talon Windows cursor family.

The artwork is procedural: every cursor is drawn from primitives in this file.
No source image, system icon, font glyph, or third-party cursor is embedded.

The builder deliberately creates a normal multi-resolution ICO in memory first,
then changes the container to CUR and replaces each directory entry's
planes/bit-depth fields with explicit x/y hotspots. Animated cursors are RIFF
ACON containers whose frames are independently valid multi-resolution CUR files.
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
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable, Sequence

from PIL import Image, ImageDraw, ImageFont


REPO_ROOT = Path(__file__).resolve().parents[1]
CURSOR_ROOT = REPO_ROOT / "cursors"
SOURCE_DIR = CURSOR_ROOT / "src"
WINDOWS_DIR = CURSOR_ROOT / "windows"
PREVIEW_PATH = CURSOR_ROOT / "preview.png"

SIZES = (32, 48, 64, 96)
LOGICAL_SIZE = 96
SUPERSAMPLE = 4
ANI_FRAMES = 12
ANI_JIFFIES = 5  # 5 / 60 second per frame.

# VOID IRIS / Crow palette. No warm hue is used.
VOID = (2, 3, 10, 255)
NIGHT = (8, 11, 24, 255)
GUNMETAL = (18, 24, 39, 255)
GUNMETAL_2 = (32, 42, 58, 255)
STEEL = (127, 141, 168, 255)
FROST = (242, 247, 255, 255)
DEEP_INDIGO = (49, 46, 129, 255)
ULTRAVIOLET = (109, 74, 255, 255)
ELECTRIC_VIOLET = (139, 108, 255, 255)
ELECTRIC_BLUE = (35, 139, 255, 255)
SIGNAL_CYAN = (50, 223, 255, 255)
PULSE_MAGENTA = (196, 60, 231, 255)
DANGER = (255, 77, 112, 255)
TRANSPARENT = (0, 0, 0, 0)


@dataclass(frozen=True)
class CursorSpec:
    role: str
    registry_name: str
    hotspot: tuple[int, int]
    draw: Callable[["Canvas", int], None]
    animated: bool = False


class Canvas:
    """A 96-unit logical drawing surface rendered with supersampling."""

    def __init__(self, output_size: int):
        self.output_size = output_size
        self.high_size = output_size * SUPERSAMPLE
        self.scale = self.high_size / LOGICAL_SIZE
        self.image = Image.new("RGBA", (self.high_size, self.high_size), TRANSPARENT)
        self.draw = ImageDraw.Draw(self.image, "RGBA")

    def n(self, value: float) -> int:
        return max(1, round(value * self.scale))

    def p(self, point: tuple[float, float]) -> tuple[int, int]:
        return round(point[0] * self.scale), round(point[1] * self.scale)

    def points(self, values: Sequence[tuple[float, float]]) -> list[tuple[int, int]]:
        return [self.p(value) for value in values]

    def box(self, values: tuple[float, float, float, float]) -> tuple[int, int, int, int]:
        return tuple(round(value * self.scale) for value in values)  # type: ignore[return-value]

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
            self.draw.line(pts + [pts[0]], fill=outline, width=self.n(width), joint="curve")

    def line(
        self,
        points: Sequence[tuple[float, float]],
        *,
        fill: tuple[int, int, int, int],
        width: float,
        joint: str = "curve",
    ) -> None:
        self.draw.line(self.points(points), fill=fill, width=self.n(width), joint=joint)

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
        return self.image.resize(
            (self.output_size, self.output_size), Image.Resampling.LANCZOS
        )


def draw_three_eyes(
    canvas: Canvas,
    centers: Sequence[tuple[float, float]],
    radius: float,
    *,
    accent: tuple[int, int, int, int] = SIGNAL_CYAN,
) -> None:
    for index, (x, y) in enumerate(centers):
        canvas.ellipse(
            (x - radius - 1, y - radius - 1, x + radius + 1, y + radius + 1),
            fill=VOID,
            outline=ULTRAVIOLET,
            width=max(1, radius / 2),
        )
        canvas.ellipse(
            (x - radius / 2, y - radius / 2, x + radius / 2, y + radius / 2),
            fill=FROST if index == 1 else accent,
        )


def draw_talon_pointer(canvas: Canvas, _frame: int = 0) -> None:
    # A feather/talon hybrid whose leading crown point remains the cursor tip.
    shadow = [(10, 7), (72, 51), (48, 55), (64, 84), (49, 92), (32, 61), (17, 80)]
    canvas.polygon(
        [(x + 3, y + 3) for x, y in shadow],
        fill=(2, 3, 10, 190),
        outline=(2, 3, 10, 210),
        width=3,
    )
    canvas.polygon(
        shadow,
        fill=GUNMETAL,
        outline=SIGNAL_CYAN,
        width=3,
    )
    canvas.polygon(
        [(10, 7), (64, 48), (38, 49), (18, 70)],
        fill=NIGHT,
        outline=ELECTRIC_VIOLET,
        width=1.6,
    )
    canvas.line([(12, 10), (47, 55), (58, 80)], fill=FROST, width=2.2)
    canvas.line([(23, 27), (39, 27)], fill=ELECTRIC_BLUE, width=2)
    canvas.line([(29, 36), (48, 37)], fill=ULTRAVIOLET, width=2)
    draw_three_eyes(canvas, [(29, 44), (35, 49), (41, 44)], 2.4)


def draw_help(canvas: Canvas, frame: int = 0) -> None:
    draw_talon_pointer(canvas, frame)
    canvas.ellipse((57, 7, 91, 41), fill=NIGHT, outline=ULTRAVIOLET, width=3)
    canvas.arc((66, 13, 83, 29), 190, 530, fill=SIGNAL_CYAN, width=3)
    canvas.line([(74.5, 27), (74.5, 32)], fill=SIGNAL_CYAN, width=3)
    canvas.ellipse((72.3, 34, 76.7, 38.4), fill=FROST)


def draw_spinner(
    canvas: Canvas,
    center: tuple[float, float],
    radius: float,
    frame: int,
    *,
    busy: bool,
) -> None:
    cx, cy = center
    canvas.ellipse(
        (cx - radius, cy - radius, cx + radius, cy + radius),
        fill=(8, 11, 24, 225),
        outline=DEEP_INDIGO,
        width=3,
    )
    for segment in range(3):
        start = frame * 30 + segment * 120 - 44
        color = (SIGNAL_CYAN, ELECTRIC_BLUE, ULTRAVIOLET)[segment]
        canvas.arc(
            (cx - radius + 4, cy - radius + 4, cx + radius - 4, cy + radius - 4),
            start,
            start + 54,
            fill=color,
            width=4,
        )
    if busy:
        draw_three_eyes(
            canvas,
            [(cx - 6, cy + 3), (cx, cy - 5), (cx + 6, cy + 3)],
            2.8,
        )
    else:
        canvas.polygon(
            [(cx - 3, cy - 6), (cx + 5, cy), (cx - 3, cy + 6)],
            fill=FROST,
            outline=ELECTRIC_BLUE,
            width=1,
        )


def draw_working(canvas: Canvas, frame: int = 0) -> None:
    draw_talon_pointer(canvas, frame)
    draw_spinner(canvas, (72, 70), 21, frame, busy=False)


def draw_busy(canvas: Canvas, frame: int = 0) -> None:
    draw_spinner(canvas, (48, 48), 40, frame, busy=True)
    canvas.arc((15, 15, 81, 81), 210, 328, fill=FROST, width=1.5)


def draw_precision(canvas: Canvas, _frame: int = 0) -> None:
    canvas.ellipse((17, 17, 79, 79), fill=(8, 11, 24, 225), outline=ULTRAVIOLET, width=3)
    canvas.ellipse((31, 31, 65, 65), outline=ELECTRIC_BLUE, width=3)
    canvas.ellipse((41, 41, 55, 55), fill=VOID, outline=SIGNAL_CYAN, width=3)
    canvas.ellipse((46, 46, 50, 50), fill=FROST)
    canvas.line([(48, 5), (48, 34)], fill=FROST, width=3)
    canvas.line([(48, 62), (48, 91)], fill=FROST, width=3)
    canvas.line([(5, 48), (34, 48)], fill=FROST, width=3)
    canvas.line([(62, 48), (91, 48)], fill=FROST, width=3)


def draw_text(canvas: Canvas, _frame: int = 0) -> None:
    canvas.rectangle((27, 8, 69, 18), fill=NIGHT, outline=ELECTRIC_VIOLET, width=3, radius=4)
    canvas.rectangle((27, 78, 69, 88), fill=NIGHT, outline=ELECTRIC_VIOLET, width=3, radius=4)
    canvas.rectangle((42, 13, 54, 83), fill=GUNMETAL, outline=SIGNAL_CYAN, width=3, radius=3)
    draw_three_eyes(canvas, [(37, 48), (48, 48), (59, 48)], 2.5)


def draw_handwriting(canvas: Canvas, _frame: int = 0) -> None:
    # A split crow feather ending in a precise writing nib at lower-left.
    canvas.polygon(
        [(13, 84), (24, 48), (71, 9), (61, 53), (22, 88)],
        fill=GUNMETAL,
        outline=SIGNAL_CYAN,
        width=3,
    )
    canvas.polygon(
        [(21, 71), (24, 48), (71, 9), (48, 59)],
        fill=NIGHT,
        outline=ULTRAVIOLET,
        width=2,
    )
    canvas.line([(16, 82), (59, 28)], fill=FROST, width=2)
    canvas.line([(36, 47), (26, 42)], fill=ELECTRIC_BLUE, width=2)
    canvas.line([(44, 39), (37, 31)], fill=ELECTRIC_VIOLET, width=2)
    draw_three_eyes(canvas, [(49, 30), (55, 25), (60, 30)], 2.2)
    canvas.polygon([(11, 86), (18, 77), (22, 88)], fill=FROST, outline=ELECTRIC_BLUE, width=1)


def draw_unavailable(canvas: Canvas, _frame: int = 0) -> None:
    canvas.ellipse((10, 10, 86, 86), fill=(8, 11, 24, 230), outline=DANGER, width=8)
    canvas.line([(23, 23), (73, 73)], fill=DANGER, width=9)
    canvas.polygon(
        [(32, 66), (47, 32), (61, 64), (48, 57)],
        fill=GUNMETAL_2,
        outline=SIGNAL_CYAN,
        width=2,
    )


def arrow_head(
    canvas: Canvas,
    tip: tuple[float, float],
    direction: tuple[float, float],
    *,
    color: tuple[int, int, int, int] = SIGNAL_CYAN,
    length: float = 15,
    spread: float = 9,
) -> None:
    dx, dy = direction
    norm = math.hypot(dx, dy)
    dx, dy = dx / norm, dy / norm
    px, py = -dy, dx
    base_x, base_y = tip[0] - dx * length, tip[1] - dy * length
    canvas.polygon(
        [
            tip,
            (base_x + px * spread, base_y + py * spread),
            (base_x - px * spread, base_y - py * spread),
        ],
        fill=color,
        outline=FROST,
        width=1.4,
    )


def draw_resize_axis(
    canvas: Canvas,
    direction: tuple[float, float],
    _frame: int = 0,
) -> None:
    dx, dy = direction
    norm = math.hypot(dx, dy)
    dx, dy = dx / norm, dy / norm
    a = (48 - dx * 36, 48 - dy * 36)
    b = (48 + dx * 36, 48 + dy * 36)
    canvas.line([a, b], fill=VOID, width=10)
    canvas.line([a, b], fill=ELECTRIC_VIOLET, width=6)
    arrow_head(canvas, a, (-dx, -dy), color=SIGNAL_CYAN)
    arrow_head(canvas, b, (dx, dy), color=ELECTRIC_BLUE)
    canvas.ellipse((41, 41, 55, 55), fill=NIGHT, outline=FROST, width=2)
    draw_three_eyes(canvas, [(45, 49), (48, 45), (51, 49)], 1.4)


def draw_resize_v(canvas: Canvas, frame: int = 0) -> None:
    draw_resize_axis(canvas, (0, 1), frame)


def draw_resize_h(canvas: Canvas, frame: int = 0) -> None:
    draw_resize_axis(canvas, (1, 0), frame)


def draw_resize_d1(canvas: Canvas, frame: int = 0) -> None:
    draw_resize_axis(canvas, (1, 1), frame)


def draw_resize_d2(canvas: Canvas, frame: int = 0) -> None:
    draw_resize_axis(canvas, (1, -1), frame)


def draw_move(canvas: Canvas, _frame: int = 0) -> None:
    canvas.ellipse((38, 38, 58, 58), fill=NIGHT, outline=ULTRAVIOLET, width=3)
    for direction in ((0, -1), (1, 0), (0, 1), (-1, 0)):
        dx, dy = direction
        start = (48 + dx * 5, 48 + dy * 5)
        tip = (48 + dx * 41, 48 + dy * 41)
        canvas.line([start, tip], fill=ELECTRIC_VIOLET, width=6)
        arrow_head(canvas, tip, direction, color=SIGNAL_CYAN, length=13, spread=8)
    draw_three_eyes(canvas, [(44, 50), (48, 44), (52, 50)], 1.5)


def draw_alternate(canvas: Canvas, _frame: int = 0) -> None:
    # Windows' alternate-selection role is traditionally an upward arrow.
    canvas.polygon(
        [(48, 6), (75, 43), (60, 41), (60, 86), (36, 86), (36, 41), (21, 43)],
        fill=GUNMETAL,
        outline=SIGNAL_CYAN,
        width=3,
    )
    canvas.polygon(
        [(48, 11), (61, 36), (53, 34), (48, 58), (43, 34), (35, 36)],
        fill=NIGHT,
        outline=ELECTRIC_VIOLET,
        width=2,
    )
    draw_three_eyes(canvas, [(42, 29), (48, 22), (54, 29)], 2.2)
    canvas.line([(48, 41), (48, 78)], fill=FROST, width=2)


def draw_link(canvas: Canvas, _frame: int = 0) -> None:
    # Recognisable link hand with a talon-like index finger and three-eye cuff.
    canvas.polygon(
        [
            (29, 8),
            (42, 8),
            (42, 36),
            (49, 30),
            (58, 33),
            (64, 38),
            (73, 42),
            (76, 57),
            (69, 82),
            (31, 82),
            (18, 59),
            (18, 49),
            (26, 45),
            (31, 51),
        ],
        fill=GUNMETAL,
        outline=SIGNAL_CYAN,
        width=3,
    )
    canvas.line([(36, 12), (36, 57)], fill=FROST, width=2)
    canvas.line([(49, 34), (49, 56)], fill=ELECTRIC_VIOLET, width=3)
    canvas.line([(59, 36), (59, 58)], fill=ELECTRIC_BLUE, width=3)
    canvas.line([(68, 42), (67, 60)], fill=ULTRAVIOLET, width=3)
    canvas.rectangle((27, 69, 69, 88), fill=NIGHT, outline=ELECTRIC_VIOLET, width=3, radius=5)
    draw_three_eyes(canvas, [(39, 78), (48, 75), (57, 78)], 2.5)


SPECS: tuple[CursorSpec, ...] = (
    CursorSpec("normal", "Arrow", (8, 7), draw_talon_pointer),
    CursorSpec("help", "Help", (8, 7), draw_help),
    CursorSpec("working", "AppStarting", (8, 7), draw_working, animated=True),
    CursorSpec("busy", "Wait", (48, 48), draw_busy, animated=True),
    CursorSpec("precision", "Crosshair", (48, 48), draw_precision),
    CursorSpec("text", "IBeam", (48, 48), draw_text),
    CursorSpec("handwriting", "NWPen", (13, 84), draw_handwriting),
    CursorSpec("unavailable", "No", (48, 48), draw_unavailable),
    CursorSpec("resize-v", "SizeNS", (48, 48), draw_resize_v),
    CursorSpec("resize-h", "SizeWE", (48, 48), draw_resize_h),
    CursorSpec("resize-d1", "SizeNWSE", (48, 48), draw_resize_d1),
    CursorSpec("resize-d2", "SizeNESW", (48, 48), draw_resize_d2),
    CursorSpec("move", "SizeAll", (48, 48), draw_move),
    CursorSpec("alternate", "UpArrow", (48, 7), draw_alternate),
    CursorSpec("link", "Hand", (29, 8), draw_link),
)


def render(spec: CursorSpec, size: int, frame: int = 0) -> Image.Image:
    canvas = Canvas(size)
    spec.draw(canvas, frame)
    return canvas.finish()


def hotspot_for_size(spec: CursorSpec, size: int) -> tuple[int, int]:
    x = min(size - 1, max(0, round(spec.hotspot[0] * size / LOGICAL_SIZE)))
    y = min(size - 1, max(0, round(spec.hotspot[1] * size / LOGICAL_SIZE)))
    return x, y


def ico_to_cur(ico_data: bytes, spec: CursorSpec) -> bytes:
    data = bytearray(ico_data)
    reserved, kind, count = struct.unpack_from("<HHH", data, 0)
    if reserved != 0 or kind != 1:
        raise ValueError(f"{spec.role}: generated container is not ICO")
    struct.pack_into("<H", data, 2, 2)
    for index in range(count):
        offset = 6 + index * 16
        width_byte, height_byte = struct.unpack_from("<BB", data, offset)
        width = 256 if width_byte == 0 else width_byte
        height = 256 if height_byte == 0 else height_byte
        if width != height or width not in SIZES:
            raise ValueError(f"{spec.role}: unexpected ICO entry {width}x{height}")
        hot_x, hot_y = hotspot_for_size(spec, width)
        struct.pack_into("<HH", data, offset + 4, hot_x, hot_y)
    return bytes(data)


def build_cur_bytes(spec: CursorSpec, frame: int = 0) -> bytes:
    # Pillow writes the multi-image ICO directory and PNG payloads. CUR uses the
    # same container; only the type and two entry fields differ.
    master = render(spec, max(SIZES), frame)
    buffer = io.BytesIO()
    master.save(buffer, format="ICO", sizes=[(size, size) for size in SIZES])
    return ico_to_cur(buffer.getvalue(), spec)


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


def write_preview(specs: Sequence[CursorSpec]) -> None:
    columns, rows = 5, 3
    cell_w, cell_h = 220, 180
    preview = Image.new("RGBA", (columns * cell_w, rows * cell_h), VOID)
    draw = ImageDraw.Draw(preview, "RGBA")
    try:
        font = ImageFont.load_default(size=18)
    except TypeError:
        font = ImageFont.load_default()
    for index, spec in enumerate(specs):
        column, row = index % columns, index // columns
        x0, y0 = column * cell_w, row * cell_h
        draw.rounded_rectangle(
            (x0 + 8, y0 + 8, x0 + cell_w - 8, y0 + cell_h - 8),
            radius=18,
            fill=NIGHT,
            outline=DEEP_INDIGO,
            width=2,
        )
        frame = 2 if spec.animated else 0
        art = render(spec, 112, frame)
        preview.alpha_composite(art, (x0 + (cell_w - 112) // 2, y0 + 20))
        label = spec.role.replace("-", " ").upper()
        box = draw.textbbox((0, 0), label, font=font)
        text_w = box[2] - box[0]
        draw.text(
            (x0 + (cell_w - text_w) / 2, y0 + 145),
            label,
            font=font,
            fill=FROST,
        )
    preview.convert("RGB").save(PREVIEW_PATH, "PNG", optimize=True)


def install_ps1() -> str:
    return r"""# Crow Talon per-user cursor scheme installer.
# Running this script registers the scheme. It only activates it with -Activate.
[CmdletBinding(SupportsShouldProcess)]
param([switch]$Activate)

$ErrorActionPreference = 'Stop'
$schemeName = 'Crow Talon'
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

foreach ($file in $roles.Values) {
    $candidate = Join-Path $source $file
    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
        throw "Missing cursor payload: $candidate"
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

Write-Host "Crow Talon is registered for this Windows account."
if (-not $Activate) {
    Write-Host "Select it in Mouse Properties > Pointers, or rerun with -Activate."
}
"""


def uninstall_ps1() -> str:
    return r"""# Crow Talon per-user cursor scheme uninstaller.
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
}

Write-Host 'Crow Talon has been removed from this Windows account.'
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
        r"""; Crow Talon Windows cursor scheme
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
1="Crow Talon Cursor Scheme",,,

[SourceDisksFiles]
"""
        + disk_lines
        + "\r\n\r\n[CrowTalon.CopyFiles]\r\n"
        + copy_lines
        + "\r\n\r\n[CrowTalon.AddReg]\r\n"
        + f'HKCU,"Control Panel\\Cursors\\Schemes","Crow Talon",0x00000000,"{scheme}"\r\n'
    )


def write_text_outputs() -> None:
    (CURSOR_ROOT / "install.ps1").write_text(install_ps1(), encoding="utf-8", newline="\n")
    (CURSOR_ROOT / "uninstall.ps1").write_text(
        uninstall_ps1(), encoding="utf-8", newline="\n"
    )
    (CURSOR_ROOT / "Crow-Talon.inf").write_text(
        cursor_inf(), encoding="utf-8", newline=""
    )


def build() -> None:
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    WINDOWS_DIR.mkdir(parents=True, exist_ok=True)

    manifest_roles: list[dict[str, object]] = []
    validation: dict[str, object] = {
        "cur_structure": "passed",
        "ani_structure": "passed",
        "windows_load_cursor_from_file": "passed" if os.name == "nt" else "not-run",
    }

    for spec in SPECS:
        source_path = SOURCE_DIR / f"{spec.role}.png"
        render(spec, 256, 0).save(source_path, "PNG", optimize=True)

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
            "source_png": f"src/{spec.role}.png",
            "static_cursor": f"windows/{spec.role}.cur",
            "embedded_images": entries,
            "sha256": {f"windows/{spec.role}.cur": sha256(static_path)},
        }
        if spec.animated:
            ani_path = WINDOWS_DIR / f"{spec.role}.ani"
            ani_path.write_bytes(build_ani_bytes(spec))
            ani_meta = validate_ani(ani_path.read_bytes(), label=ani_path.name)
            load_cursor_from_file(ani_path)
            role_record["animated_cursor"] = f"windows/{spec.role}.ani"
            role_record["animation"] = ani_meta
            role_record["sha256"][f"windows/{spec.role}.ani"] = sha256(ani_path)  # type: ignore[index]
        manifest_roles.append(role_record)

    write_preview(SPECS)
    write_text_outputs()

    manifest = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "name": "Crow Talon",
        "version": "1.0.0",
        "description": "Original procedural Windows cursor family for the Crow Theme.",
        "authorship": {
            "method": "Drawn from original geometric primitives in scripts/build_cursors.py",
            "third_party_art": False,
            "system_cursor_assets_embedded": False,
        },
        "windows_scheme_order": [spec.registry_name for spec in SPECS],
        "embedded_sizes": list(SIZES),
        "animation": {
            "roles": ["working", "busy"],
            "frames": ANI_FRAMES,
            "jiffies_per_frame": ANI_JIFFIES,
            "static_fallbacks": ["windows/working.cur", "windows/busy.cur"],
        },
        "installers": {
            "recommended_per_user": "install.ps1",
            "uninstall": "uninstall.ps1",
            "classic_inf": "Crow-Talon.inf",
            "installed_during_build": False,
        },
        "preview": {
            "path": "preview.png",
            "width": 1100,
            "height": 540,
            "sha256": sha256(PREVIEW_PATH),
        },
        "roles": manifest_roles,
        "validation": validation,
    }
    manifest_path = CURSOR_ROOT / "manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8", newline="\n"
    )

    print(
        f"Built {len(SPECS)} static CUR files, 2 ANI files, "
        f"{len(SPECS)} source PNGs, and {PREVIEW_PATH.name}."
    )
    print("CUR/ANI structure and LoadCursorFromFileW validation passed.")


if __name__ == "__main__":
    try:
        build()
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise
