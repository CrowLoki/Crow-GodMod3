#!/usr/bin/env python3
"""Build the original Crow Signal v0.1 font family.

The glyphs in this file are constructed from a hand-authored modular
"feather plate" grammar.  No third-party font files or outlines are read.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from fontTools.agl import UV2AGL
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
FONT_ROOT = ROOT / "fonts"
TTF_DIR = FONT_ROOT / "ttf"
WOFF2_DIR = FONT_ROOT / "woff2"
SPECIMEN_DIR = FONT_ROOT / "specimens"

UPM = 1000
ASCENDER = 900
DESCENDER = -250
CAP_HEIGHT = 700
X_HEIGHT = 500
VERSION = "0.1.0"


def rows(*values: str) -> tuple[str, ...]:
    """Return a readable immutable bitmap pattern."""

    return tuple(values)


# These patterns were drawn for Crow Signal. They are deliberately angular,
# compact, and plate-like rather than traced from an existing typeface.
PATTERNS: dict[str, tuple[str, ...]] = {
    # Uppercase
    "A": rows("01110", "11011", "11011", "11111", "11011", "11011", "11011"),
    "B": rows("11110", "11011", "11011", "11110", "11011", "11011", "11110"),
    "C": rows("01111", "11000", "11000", "11000", "11000", "11000", "01111"),
    "D": rows("11110", "11011", "11011", "11011", "11011", "11011", "11110"),
    "E": rows("11111", "11000", "11000", "11110", "11000", "11000", "11111"),
    "F": rows("11111", "11000", "11000", "11110", "11000", "11000", "11000"),
    "G": rows("01111", "11000", "11000", "11011", "11011", "11011", "01111"),
    "H": rows("11011", "11011", "11011", "11111", "11011", "11011", "11011"),
    "I": rows("11111", "00100", "00100", "00100", "00100", "00100", "11111"),
    "J": rows("00111", "00011", "00011", "00011", "11011", "11011", "01110"),
    "K": rows("11011", "11110", "11100", "11000", "11100", "11110", "11011"),
    "L": rows("11000", "11000", "11000", "11000", "11000", "11000", "11111"),
    "M": rows("1100011", "1110111", "1111111", "1101011", "1100011", "1100011", "1100011"),
    "N": rows("110011", "111011", "111111", "110111", "110011", "110011", "110011"),
    "O": rows("01110", "11011", "11011", "11011", "11011", "11011", "01110"),
    "P": rows("11110", "11011", "11011", "11110", "11000", "11000", "11000"),
    "Q": rows("01110", "11011", "11011", "11011", "11111", "01110", "00011"),
    "R": rows("11110", "11011", "11011", "11110", "11100", "11110", "11011"),
    "S": rows("01111", "11000", "11000", "01110", "00011", "00011", "11110"),
    "T": rows("11111", "00100", "00100", "00100", "00100", "00100", "00100"),
    "U": rows("11011", "11011", "11011", "11011", "11011", "11011", "01110"),
    "V": rows("11011", "11011", "11011", "11011", "11011", "01110", "00100"),
    "W": rows("1100011", "1100011", "1100011", "1101011", "1111111", "1110111", "0100010"),
    "X": rows("11011", "11011", "01110", "00100", "01110", "11011", "11011"),
    "Y": rows("11011", "11011", "01110", "00100", "00100", "00100", "00100"),
    "Z": rows("11111", "00011", "00110", "01100", "11000", "11000", "11111"),
    # Lowercase. Ascenders occupy the cap grid; normal lowercase begins at row 2.
    "a": rows("00000", "00000", "01110", "00011", "01111", "11011", "01111"),
    "b": rows("11000", "11000", "11110", "11011", "11011", "11011", "11110"),
    "c": rows("00000", "00000", "01111", "11000", "11000", "11000", "01111"),
    "d": rows("00011", "00011", "01111", "11011", "11011", "11011", "01111"),
    "e": rows("00000", "00000", "01110", "11011", "11111", "11000", "01111"),
    "f": rows("00111", "01100", "01100", "11110", "01100", "01100", "01100"),
    "g": rows("00000", "00000", "01111", "11011", "11011", "01111", "00011", "11011", "01110"),
    "h": rows("11000", "11000", "11110", "11011", "11011", "11011", "11011"),
    "i": rows("00100", "00000", "01100", "00100", "00100", "00100", "01110"),
    "j": rows("00010", "00000", "00110", "00010", "00010", "00010", "00010", "11010", "01100"),
    "k": rows("11000", "11000", "11011", "11110", "11100", "11110", "11011"),
    "l": rows("01100", "00100", "00100", "00100", "00100", "00100", "01110"),
    "m": rows("0000000", "0000000", "1111110", "1101011", "1101011", "1101011", "1100011"),
    "n": rows("00000", "00000", "11110", "11011", "11011", "11011", "11011"),
    "o": rows("00000", "00000", "01110", "11011", "11011", "11011", "01110"),
    "p": rows("00000", "00000", "11110", "11011", "11011", "11110", "11000", "11000", "11000"),
    "q": rows("00000", "00000", "01111", "11011", "11011", "01111", "00011", "00011", "00011"),
    "r": rows("00000", "00000", "11011", "11110", "11000", "11000", "11000"),
    "s": rows("00000", "00000", "01111", "11000", "01110", "00011", "11110"),
    "t": rows("00100", "00100", "11111", "00100", "00100", "00100", "00011"),
    "u": rows("00000", "00000", "11011", "11011", "11011", "11011", "01111"),
    "v": rows("00000", "00000", "11011", "11011", "11011", "01110", "00100"),
    "w": rows("0000000", "0000000", "1100011", "1100011", "1101011", "1111111", "0100010"),
    "x": rows("00000", "00000", "11011", "01110", "00100", "01110", "11011"),
    "y": rows("00000", "00000", "11011", "11011", "11011", "01111", "00011", "11011", "01110"),
    "z": rows("00000", "00000", "11111", "00011", "01110", "11000", "11111"),
    # Numerals. Zero has a deliberate diagonal signal slash.
    "0": rows("01110", "11011", "11011", "11111", "11011", "11011", "01110"),
    "1": rows("00100", "01100", "11100", "00100", "00100", "00100", "11111"),
    "2": rows("01110", "11011", "00011", "00110", "01100", "11000", "11111"),
    "3": rows("11110", "00011", "00011", "01110", "00011", "00011", "11110"),
    "4": rows("11011", "11011", "11011", "11111", "00011", "00011", "00011"),
    "5": rows("11111", "11000", "11000", "11110", "00011", "00011", "11110"),
    "6": rows("01111", "11000", "11000", "11110", "11011", "11011", "01110"),
    "7": rows("11111", "00011", "00110", "00110", "01100", "01100", "01100"),
    "8": rows("01110", "11011", "11011", "01110", "11011", "11011", "01110"),
    "9": rows("01110", "11011", "11011", "01111", "00011", "00011", "11110"),
    # Printable ASCII punctuation.
    "!": rows("1", "1", "1", "1", "1", "0", "1"),
    '"': rows("101", "101", "101", "000", "000", "000", "000"),
    "#": rows("01010", "11111", "01010", "01010", "11111", "01010", "01010"),
    "$": rows("00100", "01111", "11000", "01110", "00011", "11110", "00100"),
    "%": rows("1100011", "1100110", "0001100", "0011000", "0110000", "1100110", "1100011"),
    "&": rows("01100", "11010", "11000", "01100", "11011", "11011", "01111"),
    "'": rows("1", "1", "1", "0", "0", "0", "0"),
    "(": rows("001", "010", "100", "100", "100", "010", "001"),
    ")": rows("100", "010", "001", "001", "001", "010", "100"),
    "*": rows("00100", "10101", "01110", "11111", "01110", "10101", "00100"),
    "+": rows("00000", "00100", "00100", "11111", "00100", "00100", "00000"),
    ",": rows("0", "0", "0", "0", "0", "1", "1", "1", "0"),
    "-": rows("0000", "0000", "0000", "1111", "0000", "0000", "0000"),
    ".": rows("0", "0", "0", "0", "0", "0", "1"),
    "/": rows("00001", "00010", "00100", "00100", "01000", "10000", "10000"),
    ":": rows("0", "1", "1", "0", "1", "1", "0"),
    ";": rows("0", "1", "1", "0", "1", "1", "1", "1", "0"),
    "<": rows("0001", "0010", "0100", "1000", "0100", "0010", "0001"),
    "=": rows("0000", "0000", "1111", "0000", "1111", "0000", "0000"),
    ">": rows("1000", "0100", "0010", "0001", "0010", "0100", "1000"),
    "?": rows("01110", "11011", "00011", "00110", "00100", "00000", "00100"),
    "@": rows("0111110", "1100011", "1101111", "1101011", "1101111", "1100000", "0111110"),
    "[": rows("111", "100", "100", "100", "100", "100", "111"),
    "\\": rows("10000", "01000", "00100", "00100", "00010", "00001", "00001"),
    "]": rows("111", "001", "001", "001", "001", "001", "111"),
    "^": rows("00100", "01110", "11011", "00000", "00000", "00000", "00000"),
    "_": rows("00000", "00000", "00000", "00000", "00000", "00000", "11111"),
    "`": rows("10", "01", "00", "00", "00", "00", "00"),
    "{": rows("0011", "0110", "0110", "1100", "0110", "0110", "0011"),
    "|": rows("1", "1", "1", "1", "1", "1", "1"),
    "}": rows("1100", "0110", "0110", "0011", "0110", "0110", "1100"),
    "~": rows("00000", "00000", "01101", "10110", "00000", "00000", "00000"),
}


EXTRA_PATTERNS: dict[int, tuple[str, ...]] = {
    0x00A0: rows("0"),  # Non-breaking space
    0x00A9: rows("0111110", "1100011", "1111000", "1110000", "1111000", "1100011", "0111110"),
    0x00AE: rows("0111110", "1100011", "1111011", "1111110", "1111011", "1100011", "0111110"),
    0x2013: rows("00000", "00000", "00000", "11111", "00000", "00000", "00000"),
    0x2014: rows("0000000", "0000000", "0000000", "1111111", "0000000", "0000000", "0000000"),
    0x2018: rows("10", "01", "00", "00", "00", "00", "00"),
    0x2019: rows("01", "10", "00", "00", "00", "00", "00"),
    0x201C: rows("1010", "0101", "0000", "0000", "0000", "0000", "0000"),
    0x201D: rows("0101", "1010", "0000", "0000", "0000", "0000", "0000"),
    0x2022: rows("000", "000", "010", "111", "010", "000", "000"),
    0x2026: rows("00000", "00000", "00000", "00000", "00000", "00000", "10101"),
    0x2122: rows("1111111", "0101010", "0101110", "0101010", "0101010", "0000000", "0000000"),
    0x2190: rows("0000000", "0010000", "0110000", "1111111", "0110000", "0010000", "0000000"),
    0x2191: rows("0001000", "0011100", "0111110", "0001000", "0001000", "0001000", "0001000"),
    0x2192: rows("0000000", "0000100", "0000110", "1111111", "0000110", "0000100", "0000000"),
    0x2193: rows("0001000", "0001000", "0001000", "0001000", "0111110", "0011100", "0001000"),
    0x2194: rows("0000000", "0100010", "1100011", "1111111", "1100011", "0100010", "0000000"),
    0x2195: rows("0001000", "0011100", "0101010", "0001000", "0101010", "0011100", "0001000"),
    0x21A9: rows("0000000", "0010000", "0110000", "1111111", "0000011", "0000011", "0001110"),
    0x21AA: rows("0000000", "0000100", "0000110", "1111111", "1100000", "1100000", "0111000"),
    0x21D2: rows("0000000", "0000110", "0000011", "1111111", "1111111", "0000011", "0000110"),
    0x2212: rows("00000", "00000", "00000", "11111", "00000", "00000", "00000"),
    0x2260: rows("000001", "111110", "001100", "011000", "111111", "100000", "000000"),
    0x2264: rows("00001", "00010", "00100", "01000", "00100", "11111", "00000"),
    0x2265: rows("10000", "01000", "00100", "00010", "00100", "11111", "00000"),
    0x25C6: rows("0001000", "0011100", "0111110", "1111111", "0111110", "0011100", "0001000"),
    0x25C7: rows("0001000", "0010100", "0100010", "1000001", "0100010", "0010100", "0001000"),
    0x2605: rows("0001000", "1001001", "0111110", "0011100", "0111110", "0100010", "1000001"),
}


def glyph_name(codepoint: int) -> str:
    if codepoint == 0x20:
        return "space"
    if codepoint == 0x00A0:
        return "nonbreakingspace"
    return UV2AGL.get(codepoint, f"uni{codepoint:04X}")


def trim_pattern(pattern: tuple[str, ...]) -> tuple[tuple[str, ...], int]:
    width = max((len(row) for row in pattern), default=1)
    padded = [row.ljust(width, "0") for row in pattern]
    filled = [
        col
        for col in range(width)
        if any(row[col] not in {"0", ".", " "} for row in padded)
    ]
    if not filled:
        return tuple("0" for _ in padded), 1
    left, right = min(filled), max(filled)
    return tuple(row[left : right + 1] for row in padded), right - left + 1


def draw_polygon(pen: TTGlyphPen, points: list[tuple[int, int]]) -> None:
    pen.moveTo(points[0])
    for point in points[1:]:
        pen.lineTo(point)
    pen.closePath()


def draw_plate(
    pen: TTGlyphPen,
    x: float,
    y: float,
    width: float,
    height: float,
    weight: int,
    phase: int,
) -> None:
    """Draw one asymmetric feather plate.

    The alternating clipped corners create a subtle layered-feather rhythm
    while retaining the regularity needed for small UI text.
    """

    cut = max(6, round(min(width, height) * (0.14 if weight == 400 else 0.10)))
    x0, y0 = round(x), round(y)
    x1, y1 = round(x + width), round(y + height)

    if phase % 3 == 0:
        points = [
            (x0 + cut, y0),
            (x1, y0),
            (x1, y1 - cut),
            (x1 - cut, y1),
            (x0, y1),
            (x0, y0 + cut),
        ]
    elif phase % 3 == 1:
        points = [
            (x0, y0),
            (x1 - cut, y0),
            (x1, y0 + cut),
            (x1, y1),
            (x0 + cut, y1),
            (x0, y1 - cut),
        ]
    else:
        points = [
            (x0 + cut, y0),
            (x1 - cut, y0),
            (x1, y0 + cut),
            (x1, y1 - cut),
            (x1 - cut, y1),
            (x0 + cut, y1),
            (x0, y1 - cut),
            (x0, y0 + cut),
        ]
    draw_polygon(pen, points)


def make_glyph(
    pattern: tuple[str, ...],
    *,
    weight: int,
    monospaced: bool,
    blank_width: int | None = None,
) -> tuple[object, tuple[int, int]]:
    pen = TTGlyphPen(None)
    cleaned, columns = trim_pattern(pattern)

    if blank_width is not None:
        return pen.glyph(), (blank_width, 0)

    side = 62 if not monospaced else 70
    mono_advance = 720
    if monospaced:
        available = mono_advance - 2 * side
        x_pitch = min(104.0, available / max(columns, 1))
        pattern_width = x_pitch * columns
        origin_x = (mono_advance - pattern_width) / 2
        advance = mono_advance
    else:
        x_pitch = 104.0
        pattern_width = x_pitch * columns
        origin_x = side
        advance = round(pattern_width + 2 * side)

    gap_x = 14 if weight == 400 else 5
    gap_y = 13 if weight == 400 else 4
    plate_width = max(14, x_pitch - gap_x)
    plate_height = 100 - gap_y

    for row_index, row in enumerate(cleaned):
        for column_index, cell in enumerate(row):
            if cell in {"0", ".", " "}:
                continue
            x = origin_x + column_index * x_pitch + gap_x / 2
            y = CAP_HEIGHT - (row_index + 1) * 100 + gap_y / 2
            draw_plate(
                pen,
                x,
                y,
                plate_width,
                plate_height,
                weight,
                row_index + column_index,
            )

    return pen.glyph(), (advance, 0)


def make_notdef(weight: int) -> tuple[object, tuple[int, int]]:
    pen = TTGlyphPen(None)
    stroke = 48 if weight == 400 else 70
    outer = [(70, -20), (570, -20), (570, 720), (70, 720)]
    inner = [
        (70 + stroke, -20 + stroke),
        (70 + stroke, 720 - stroke),
        (570 - stroke, 720 - stroke),
        (570 - stroke, -20 + stroke),
    ]
    draw_polygon(pen, outer)
    # Reverse direction to punch out the centre.
    draw_polygon(pen, list(reversed(inner)))
    return pen.glyph(), (640, 0)


def make_blank(width: int) -> tuple[object, tuple[int, int]]:
    pen = TTGlyphPen(None)
    return pen.glyph(), (width, 0)


def source_map() -> dict[int, tuple[str, ...]]:
    mapping: dict[int, tuple[str, ...]] = {}
    for codepoint in range(0x20, 0x7F):
        if codepoint == 0x20:
            mapping[codepoint] = rows("0")
        else:
            mapping[codepoint] = PATTERNS[chr(codepoint)]
    mapping.update(EXTRA_PATTERNS)
    return mapping


def build_font(family: str, style: str, weight: int, monospaced: bool) -> Path:
    source = source_map()
    glyph_order = [".notdef", ".null", "nonmarkingreturn"]
    cmap: dict[int, str] = {}
    for codepoint in sorted(source):
        name = glyph_name(codepoint)
        if name not in glyph_order:
            glyph_order.append(name)
        cmap[codepoint] = name

    glyphs: dict[str, object] = {}
    metrics: dict[str, tuple[int, int]] = {}
    glyphs[".notdef"], metrics[".notdef"] = make_notdef(weight)
    glyphs[".null"], metrics[".null"] = make_blank(0)
    glyphs["nonmarkingreturn"], metrics["nonmarkingreturn"] = make_blank(0)

    for codepoint, pattern in source.items():
        name = cmap[codepoint]
        if codepoint in {0x20, 0x00A0}:
            width = 720 if monospaced else 320
            glyphs[name], metrics[name] = make_blank(width)
        else:
            glyphs[name], metrics[name] = make_glyph(
                pattern,
                weight=weight,
                monospaced=monospaced,
            )

    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(glyph_order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=ASCENDER, descent=DESCENDER, lineGap=0)

    family_compact = family.replace(" ", "")
    full_name = f"{family} {style}"
    postscript_name = f"{family_compact}-{style}"
    fb.setupNameTable(
        {
            "familyName": family,
            "styleName": style,
            "uniqueFontIdentifier": f"Crow Signal {VERSION}; {full_name}",
            "fullName": full_name,
            "psName": postscript_name,
            "version": f"Version {VERSION}",
            "description": (
                "Original modular cyber-corvid typeface generated from "
                "hand-authored Crow feather-plate glyph patterns."
            ),
            "designer": "Crow",
            "manufacturer": "Crow Brand System",
            "copyright": "Copyright 2026 Crow. All rights reserved.",
        }
    )
    fb.setupOS2(
        sTypoAscender=ASCENDER,
        sTypoDescender=DESCENDER,
        sTypoLineGap=0,
        usWinAscent=ASCENDER,
        usWinDescent=abs(DESCENDER),
        sxHeight=X_HEIGHT,
        sCapHeight=CAP_HEIGHT,
        usWeightClass=weight,
        usWidthClass=5,
        fsSelection=0x0040 if style == "Regular" else 0x0020,
        panose={
            "bFamilyType": 2,
            "bSerifStyle": 12,
            "bWeight": 5 if weight == 400 else 8,
            "bProportion": 9 if monospaced else 3,
            "bContrast": 4,
            "bStrokeVariation": 2,
            "bArmStyle": 2,
            "bLetterForm": 2,
            "bMidline": 2,
            "bXHeight": 4,
        },
    )
    fb.setupPost(isFixedPitch=1 if monospaced else 0)
    fb.setupMaxp()

    font = fb.font
    font["head"].fontRevision = 0.1
    font["head"].lowestRecPPEM = 8
    font["head"].macStyle = 0x0001 if weight >= 700 else 0

    filename = f"{family.replace(' ', '')}-{style}.ttf"
    path = TTF_DIR / filename
    font.save(path)
    return path


def build_woff2(ttf_path: Path) -> Path:
    font = TTFont(ttf_path)
    font.flavor = "woff2"
    output = WOFF2_DIR / f"{ttf_path.stem}.woff2"
    font.save(output)
    return output


def font_for(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size=size)


def fit_text(
    text: str,
    font_path: Path,
    max_size: int,
    min_size: int,
    max_width: int,
) -> ImageFont.FreeTypeFont:
    for size in range(max_size, min_size - 1, -2):
        font = font_for(font_path, size)
        if font.getlength(text) <= max_width:
            return font
    return font_for(font_path, min_size)


def draw_specimen(font_paths: dict[tuple[str, str], Path]) -> Path:
    width, height = 2400, 1760
    image = Image.new("RGB", (width, height), "#050711")
    draw = ImageDraw.Draw(image)

    draw.rounded_rectangle((80, 70, width - 80, height - 70), radius=44, fill="#0A0F20", outline="#29345F", width=3)
    draw.ellipse((168, 155, 204, 191), fill="#32DFFF")
    draw.ellipse((218, 155, 254, 191), fill="#238BFF")
    draw.ellipse((193, 110, 229, 146), fill="#6D4AFF")

    display_bold = font_paths[("Display", "Bold")]
    display_regular = font_paths[("Display", "Regular")]
    mono_bold = font_paths[("Mono", "Bold")]
    mono_regular = font_paths[("Mono", "Regular")]

    title = fit_text("CROW SIGNAL", display_bold, 132, 84, 1900)
    draw.text((300, 105), "CROW SIGNAL", font=title, fill="#F2F7FF")
    draw.text((305, 255), "ORIGINAL TYPE SYSTEM  /  VERSION 0.1", font=font_for(mono_bold, 36), fill="#8B6CFF")

    draw.line((160, 345, width - 160, 345), fill="#29345F", width=3)

    y = 405
    label_font = font_for(mono_bold, 28)
    samples = [
        ("DISPLAY BOLD", display_bold, "THREE EYES / ONE SYSTEM", 82, "#F2F7FF"),
        ("DISPLAY REGULAR", display_regular, "PERCEPTION  REFLECTION  ACTION", 58, "#32DFFF"),
        ("UPPERCASE", display_regular, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", 48, "#8B6CFF"),
        ("LOWERCASE", display_regular, "abcdefghijklmnopqrstuvwxyz", 48, "#F2F7FF"),
        ("NUMERALS", mono_bold, "0 O  1 I l  23456789", 60, "#32DFFF"),
        ("PUNCTUATION", mono_regular, "! \" # $ % & ' ( ) * + , - . / : ; < = > ? @", 40, "#F2F7FF"),
        ("SIGNALS", mono_bold, "← ↑ → ↓ ↔ ↕ ↩ ↪ ⇒  − ≠ ≤ ≥  ◆ ◇ ★", 48, "#8B6CFF"),
        ("MONO", mono_regular, "crow.run(model=\"local\")  =>  score != 0", 43, "#32DFFF"),
    ]
    for label, font_path, text, size, color in samples:
        draw.text((160, y), label, font=label_font, fill="#7F8DA8")
        specimen_font = fit_text(text, font_path, size, max(24, size - 20), width - 700)
        draw.text((600, y - 14), text, font=specimen_font, fill=color)
        y += 150

    draw.rounded_rectangle((160, 1530, width - 160, 1650), radius=22, fill="#11162F", outline="#6D4AFF", width=2)
    draw.text(
        (205, 1565),
        "HAND-AUTHORED MODULAR GLYPHS  •  NO THIRD-PARTY OUTLINES",
        font=fit_text(
            "HAND-AUTHORED MODULAR GLYPHS  •  NO THIRD-PARTY OUTLINES",
            mono_bold,
            34,
            24,
            width - 410,
        ),
        fill="#F2F7FF",
    )

    output = SPECIMEN_DIR / "crow-signal-v0.1.png"
    image.save(output, optimize=True)
    return output


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_font(path: Path, *, monospaced: bool) -> dict[str, object]:
    font = TTFont(path)
    cmap = font.getBestCmap()
    required = set(range(0x20, 0x7F))
    missing = sorted(required - set(cmap))
    if missing:
        raise RuntimeError(f"{path.name} misses Basic Latin: {missing}")
    if font["head"].unitsPerEm != UPM:
        raise RuntimeError(f"{path.name} has wrong UPM")

    hmtx = font["hmtx"].metrics
    ascii_widths = {hmtx[cmap[cp]][0] for cp in range(0x21, 0x7F)}
    if monospaced and len(ascii_widths) != 1:
        raise RuntimeError(f"{path.name} is not monospaced: {ascii_widths}")
    if not monospaced and len(ascii_widths) < 3:
        raise RuntimeError(f"{path.name} lacks proportional widths")

    critical = {char: cmap[ord(char)] for char in "Il1O0"}
    if len(set(critical.values())) != len(critical):
        raise RuntimeError(f"{path.name} aliases critical glyphs")

    return {
        "file": path.relative_to(ROOT).as_posix(),
        "sha256": sha256(path),
        "bytes": path.stat().st_size,
        "glyphs": len(font.getGlyphOrder()),
        "mapped_codepoints": len(cmap),
        "monospaced": monospaced,
    }


def write_manifest(
    records: list[dict[str, object]],
    specimen: Path,
) -> Path:
    manifest = {
        "name": "Crow Signal",
        "version": VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "originality": (
            "All glyph outlines are generated from hand-authored modular "
            "feather-plate patterns in scripts/build_fonts.py. No third-party "
            "font binaries or outlines are consumed."
        ),
        "metrics": {
            "units_per_em": UPM,
            "ascender": ASCENDER,
            "descender": DESCENDER,
            "cap_height": CAP_HEIGHT,
            "x_height": X_HEIGHT,
        },
        "coverage": {
            "printable_basic_latin": "U+0020-U+007E",
            "extras": [f"U+{cp:04X}" for cp in sorted(EXTRA_PATTERNS)],
        },
        "licence": {
            "status": "internal-preview",
            "note": (
                "External redistribution terms have not yet been selected. "
                "Publishing requires Crow's explicit approval."
            ),
        },
        "files": records
        + [
            {
                "file": specimen.relative_to(ROOT).as_posix(),
                "sha256": sha256(specimen),
                "bytes": specimen.stat().st_size,
                "kind": "specimen",
            }
        ],
    }
    path = FONT_ROOT / "manifest.json"
    path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return path


def main() -> None:
    for directory in (TTF_DIR, WOFF2_DIR, SPECIMEN_DIR):
        directory.mkdir(parents=True, exist_ok=True)

    configurations = [
        ("Crow Signal Display", "Display", "Regular", 400, False),
        ("Crow Signal Display", "Display", "Bold", 700, False),
        ("Crow Signal Mono", "Mono", "Regular", 400, True),
        ("Crow Signal Mono", "Mono", "Bold", 700, True),
    ]

    font_paths: dict[tuple[str, str], Path] = {}
    records: list[dict[str, object]] = []
    for family, short_family, style, weight, monospaced in configurations:
        ttf_path = build_font(family, style, weight, monospaced)
        woff2_path = build_woff2(ttf_path)
        font_paths[(short_family, style)] = ttf_path

        ttf_record = validate_font(ttf_path, monospaced=monospaced)
        ttf_record.update(
            {
                "format": "ttf",
                "family": family,
                "style": style,
                "weight": weight,
            }
        )
        records.append(ttf_record)

        woff2_record = validate_font(woff2_path, monospaced=monospaced)
        woff2_record.update(
            {
                "format": "woff2",
                "family": family,
                "style": style,
                "weight": weight,
            }
        )
        records.append(woff2_record)

    specimen = draw_specimen(font_paths)
    manifest = write_manifest(records, specimen)

    print(f"Built {len(configurations)} original Crow Signal fonts.")
    for record in records:
        print(
            f"  {record['file']} "
            f"({record['glyphs']} glyphs, {record['mapped_codepoints']} codepoints)"
        )
    print(f"  {specimen.relative_to(ROOT).as_posix()}")
    print(f"  {manifest.relative_to(ROOT).as_posix()}")


if __name__ == "__main__":
    main()
