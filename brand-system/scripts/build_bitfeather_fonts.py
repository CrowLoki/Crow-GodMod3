#!/usr/bin/env python3
"""Build the original Crow Bitfeather v0.3.0 font pack.

The approved source is row 03 BITFEATHER in the CrowClaw letterform audition
v0.6. Uppercase and numeral skeletons are imported from that original proof.
They are rasterised on an eight-times logical grid with an 18-unit regular
stroke instead of the proof's equivalent 16 units: a controlled 12.5 percent
weight increase, not the 50 percent jump caused by changing a two-pixel stroke
to three pixels on the original tiny grid.

All final glyph outlines are hard-edged orthogonal polygons. No third-party
font, bitmap alphabet, or font outline is read.
"""

from __future__ import annotations

import ctypes
import hashlib
import io
import json
import zipfile
from datetime import datetime, timezone
from pathlib import Path

from fontTools.agl import UV2AGL
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from PIL import Image, ImageDraw, ImageFont

from build_font_audition_v2 import GLYPHS, PROPORTIONS
from build_fonts import EXTRA_PATTERNS, PATTERNS


ROOT = Path(__file__).resolve().parents[1]
FONT_ROOT = ROOT / "fonts" / "bitfeather"
TTF_DIR = FONT_ROOT / "ttf"
WOFF2_DIR = FONT_ROOT / "woff2"
SPECIMEN_DIR = FONT_ROOT / "specimens"
DOWNLOAD_DIR = ROOT / "downloads"

VERSION = "0.3.0"
PACKAGE_NAME = f"Crow-Bitfeather-Windows-v{VERSION}"
UPM = 1000
ASCENDER = 900
DESCENDER = -250
CAP_HEIGHT = 700
X_HEIGHT = 500
MONO_ADVANCE = 820

LOGICAL_HEIGHT = 22
SUBPIXEL = 8
PROOF_STROKE = 2 * SUBPIXEL
REGULAR_STROKE = 18
BOLD_STROKE = 21
REGULAR_INCREASE = (REGULAR_STROKE / PROOF_STROKE) - 1
FIXED_BUILD_TIME = "2026-07-30T00:00:00+00:00"
FIXED_MAC_TIMESTAMP = int(
    (
        datetime(2026, 7, 30, tzinfo=timezone.utc)
        - datetime(1904, 1, 1, tzinfo=timezone.utc)
    ).total_seconds()
)


def glyph_name(codepoint: int) -> str:
    if codepoint == 0x20:
        return "space"
    if codepoint == 0x00A0:
        return "nonbreakingspace"
    return UV2AGL.get(codepoint, f"uni{codepoint:04X}")


def draw_polygon(pen: TTGlyphPen, points: list[tuple[int, int]]) -> None:
    pen.moveTo(points[0])
    for point in points[1:]:
        pen.lineTo(point)
    pen.closePath()


def mask_contours(mask: Image.Image) -> list[list[tuple[int, int]]]:
    """Trace the exact union boundary of a binary mask.

    Directly emitting one rectangle per raster row creates hinting seams.
    Cancelling shared cell edges first produces solid outer and counter
    contours while retaining the approved orthogonal pixel steps.
    """

    pixels = mask.load()
    edges: set[tuple[tuple[int, int], tuple[int, int]]] = set()

    def add_edge(start: tuple[int, int], end: tuple[int, int]) -> None:
        reverse = (end, start)
        if reverse in edges:
            edges.remove(reverse)
        else:
            edges.add((start, end))

    for y in range(mask.height):
        for x in range(mask.width):
            if pixels[x, y] == 0:
                continue
            add_edge((x, y), (x + 1, y))
            add_edge((x + 1, y), (x + 1, y + 1))
            add_edge((x + 1, y + 1), (x, y + 1))
            add_edge((x, y + 1), (x, y))

    direction = {
        (1, 0): 0,
        (0, 1): 1,
        (-1, 0): 2,
        (0, -1): 3,
    }
    outgoing_map: dict[tuple[int, int], set[tuple[int, int]]] = {}
    for start, end in edges:
        outgoing_map.setdefault(start, set()).add(end)

    def remove_edge(
        edge: tuple[tuple[int, int], tuple[int, int]]
    ) -> None:
        edges.remove(edge)
        starts = outgoing_map[edge[0]]
        starts.remove(edge[1])
        if not starts:
            del outgoing_map[edge[0]]

    contours: list[list[tuple[int, int]]] = []

    while edges:
        first = min(edges)
        start_vertex, current_vertex = first
        remove_edge(first)
        contour = [start_vertex]
        previous_vertex = start_vertex

        while current_vertex != start_vertex:
            contour.append(current_vertex)
            outgoing = [
                (current_vertex, end)
                for end in sorted(outgoing_map.get(current_vertex, ()))
            ]
            if not outgoing:
                raise RuntimeError(f"Open mask contour at {current_vertex}")
            current_direction = direction[
                (
                    current_vertex[0] - previous_vertex[0],
                    current_vertex[1] - previous_vertex[1],
                )
            ]

            def turn_priority(
                edge: tuple[tuple[int, int], tuple[int, int]]
            ) -> tuple[int, tuple[int, int]]:
                candidate = edge[1]
                candidate_direction = direction[
                    (
                        candidate[0] - current_vertex[0],
                        candidate[1] - current_vertex[1],
                    )
                ]
                turn = (candidate_direction - current_direction) % 4
                priority = {1: 0, 0: 1, 3: 2, 2: 3}[turn]
                return priority, candidate

            chosen = min(outgoing, key=turn_priority)
            remove_edge(chosen)
            previous_vertex, current_vertex = current_vertex, chosen[1]

        simplified: list[tuple[int, int]] = []
        for point in contour:
            simplified.append(point)
            while len(simplified) >= 3:
                a, b, c = simplified[-3:]
                if (b[0] - a[0], b[1] - a[1]) == (
                    c[0] - b[0],
                    c[1] - b[1],
                ):
                    simplified.pop(-2)
                else:
                    break
        if len(simplified) >= 3:
            contours.append(simplified)

    return contours


def skeleton_mask(
    character: str,
    *,
    stroke_width: int,
    lowercase: bool,
) -> tuple[Image.Image, int, int]:
    """Rasterise the approved Bitfeather skeleton on an 8x logical grid."""

    source_character = character.upper() if lowercase else character
    proportion = PROPORTIONS.get(source_character, 0.80)
    if lowercase:
        proportion *= 0.88
    logical_width = max(8, round(proportion * 16))
    padding = 4 * SUBPIXEL
    width = (logical_width + 8) * SUBPIXEL
    height = (LOGICAL_HEIGHT + 8) * SUBPIXEL
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)

    for item in GLYPHS[source_character]:
        points: list[tuple[int, int]] = []
        for px, py in item.points:
            if lowercase:
                py = 0.285 + py * 0.715
            points.append(
                (
                    padding + round(px * (logical_width - 1) * SUBPIXEL),
                    padding + round(py * (LOGICAL_HEIGHT - 1) * SUBPIXEL),
                )
            )
        draw.line(points, fill=255, width=stroke_width, joint="curve")

    return mask, padding, logical_width


def make_skeleton_glyph(
    character: str,
    *,
    weight: int,
    monospaced: bool,
    lowercase: bool = False,
) -> tuple[object, tuple[int, int]]:
    stroke_width = REGULAR_STROKE if weight == 400 else BOLD_STROKE
    mask, padding, _ = skeleton_mask(
        character,
        stroke_width=stroke_width,
        lowercase=lowercase,
    )
    scale = CAP_HEIGHT / ((LOGICAL_HEIGHT - 1) * SUBPIXEL)
    baseline_y = padding + (LOGICAL_HEIGHT - 1) * SUBPIXEL
    contours = mask_contours(mask)
    pen = TTGlyphPen(None)

    mapped: list[list[tuple[int, int]]] = []
    for contour in contours:
        points = [
            (
                round((x - padding) * scale),
                round((baseline_y - y) * scale),
            )
            for x, y in contour
        ]
        # Y inversion reverses winding. Reverse all loops so outer contours
        # are clockwise and counters retain the opposite winding.
        mapped.append(list(reversed(points)))

    min_x = min((point[0] for contour in mapped for point in contour), default=0)
    max_x = max((point[0] for contour in mapped for point in contour), default=0)
    side = 58
    shift = side - min_x
    content_width = max_x - min_x
    natural_advance = content_width + side * 2
    advance = MONO_ADVANCE if monospaced else natural_advance
    if monospaced:
        shift += round((MONO_ADVANCE - natural_advance) / 2)

    for contour in mapped:
        draw_polygon(pen, [(x + shift, y) for x, y in contour])

    return pen.glyph(), (advance, 0)


def trim_pattern(pattern: tuple[str, ...]) -> tuple[tuple[str, ...], int]:
    width = max((len(row) for row in pattern), default=1)
    padded = [row.ljust(width, "0") for row in pattern]
    filled = [
        column
        for column in range(width)
        if any(row[column] not in {"0", ".", " "} for row in padded)
    ]
    if not filled:
        return tuple("0" for _ in padded), 1
    left, right = min(filled), max(filled)
    return tuple(row[left : right + 1] for row in padded), right - left + 1


def filled_runs(row: str) -> list[tuple[int, int]]:
    runs: list[tuple[int, int]] = []
    start: int | None = None
    for column, cell in enumerate(row + "0"):
        filled = cell not in {"0", ".", " "}
        if filled and start is None:
            start = column
        elif not filled and start is not None:
            runs.append((start, column))
            start = None
    return runs


def make_pattern_glyph(
    pattern: tuple[str, ...],
    *,
    weight: int,
    monospaced: bool,
) -> tuple[object, tuple[int, int]]:
    """Build original hard-edged punctuation/symbol patterns."""

    cleaned, columns = trim_pattern(pattern)
    pen = TTGlyphPen(None)
    cell = 92
    side = 58
    embolden = 6 if weight == 400 else 12
    natural = columns * cell + side * 2
    advance = MONO_ADVANCE if monospaced else natural
    origin = side + (MONO_ADVANCE - natural) / 2 if monospaced else side

    for row_index, row in enumerate(cleaned):
        for start, end in filled_runs(row):
            x0 = round(origin + start * cell - embolden)
            x1 = round(origin + end * cell + embolden)
            y1 = CAP_HEIGHT - row_index * 100 + embolden
            y0 = CAP_HEIGHT - (row_index + 1) * 100 - embolden
            draw_polygon(pen, [(x0, y0), (x1, y0), (x1, y1), (x0, y1)])

    return pen.glyph(), (advance, 0)


def make_blank(width: int) -> tuple[object, tuple[int, int]]:
    return TTGlyphPen(None).glyph(), (width, 0)


def make_notdef(weight: int) -> tuple[object, tuple[int, int]]:
    pen = TTGlyphPen(None)
    stroke = 52 if weight == 400 else 64
    draw_polygon(pen, [(70, -20), (570, -20), (570, 720), (70, 720)])
    draw_polygon(
        pen,
        list(
            reversed(
                [
                    (70 + stroke, -20 + stroke),
                    (70 + stroke, 720 - stroke),
                    (570 - stroke, 720 - stroke),
                    (570 - stroke, -20 + stroke),
                ]
            )
        ),
    )
    return pen.glyph(), (640, 0)


def source_codepoints() -> list[int]:
    return list(range(0x20, 0x7F)) + sorted(EXTRA_PATTERNS)


def build_font(family: str, style: str, weight: int, monospaced: bool) -> Path:
    codepoints = source_codepoints()
    glyph_order = [".notdef", ".null", "nonmarkingreturn"]
    cmap: dict[int, str] = {}
    for codepoint in codepoints:
        name = glyph_name(codepoint)
        if name not in glyph_order:
            glyph_order.append(name)
        cmap[codepoint] = name

    glyphs: dict[str, object] = {}
    metrics: dict[str, tuple[int, int]] = {}
    glyphs[".notdef"], metrics[".notdef"] = make_notdef(weight)
    glyphs[".null"], metrics[".null"] = make_blank(0)
    glyphs["nonmarkingreturn"], metrics["nonmarkingreturn"] = make_blank(0)

    for codepoint in codepoints:
        name = cmap[codepoint]
        if codepoint in {0x20, 0x00A0}:
            glyphs[name], metrics[name] = make_blank(
                MONO_ADVANCE if monospaced else 320
            )
        elif 0x41 <= codepoint <= 0x5A or 0x30 <= codepoint <= 0x39:
            glyphs[name], metrics[name] = make_skeleton_glyph(
                chr(codepoint),
                weight=weight,
                monospaced=monospaced,
            )
        elif 0x61 <= codepoint <= 0x7A:
            glyphs[name], metrics[name] = make_skeleton_glyph(
                chr(codepoint),
                weight=weight,
                monospaced=monospaced,
                lowercase=True,
            )
        else:
            pattern = (
                EXTRA_PATTERNS[codepoint]
                if codepoint in EXTRA_PATTERNS
                else PATTERNS[chr(codepoint)]
            )
            glyphs[name], metrics[name] = make_pattern_glyph(
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

    full_name = f"{family} {style}"
    ps_family = family.replace(" ", "")
    fb.setupNameTable(
        {
            "familyName": family,
            "styleName": style,
            "uniqueFontIdentifier": f"Crow Bitfeather {VERSION}; {full_name}",
            "fullName": full_name,
            "psName": f"{ps_family}-{style}",
            "version": f"Version {VERSION}",
            "description": (
                "Original solid stepped-pixel CrowClaw display typeface, "
                "derived from the approved Bitfeather v0.6 proof."
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
            "bWeight": 5 if weight == 400 else 7,
            "bProportion": 9 if monospaced else 3,
            "bContrast": 3,
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
    font["head"].fontRevision = 0.3
    font["head"].lowestRecPPEM = 9
    font["head"].macStyle = 0x0001 if weight >= 700 else 0
    font["head"].created = FIXED_MAC_TIMESTAMP
    font["head"].modified = FIXED_MAC_TIMESTAMP
    font.recalcTimestamp = False

    path = TTF_DIR / f"{family.replace(' ', '')}-{style}.ttf"
    font.save(path)
    return path


def build_woff2(ttf_path: Path) -> Path:
    font = TTFont(ttf_path, recalcTimestamp=False)
    font.recalcTimestamp = False
    font.flavor = "woff2"
    path = WOFF2_DIR / f"{ttf_path.stem}.woff2"
    font.save(path)
    return path


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size=size)


def fit(text: str, path: Path, size: int, max_width: int) -> ImageFont.FreeTypeFont:
    while size > 16:
        candidate = font(path, size)
        if candidate.getlength(text) <= max_width:
            return candidate
        size -= 2
    return font(path, 16)


def draw_specimen(paths: dict[tuple[str, str], Path]) -> Path:
    width, height = 2400, 1860
    image = Image.new("RGB", (width, height), "#050711")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle(
        (70, 60, width - 70, height - 60),
        radius=42,
        fill="#090D19",
        outline="#29345F",
        width=3,
    )

    label_path = Path("C:/Windows/Fonts/segoeuib.ttf")
    label_regular = Path("C:/Windows/Fonts/segoeui.ttf")
    label = ImageFont.truetype(str(label_path), 34)
    body = ImageFont.truetype(str(label_regular), 25)
    display_regular = paths[("Display", "Regular")]
    display_bold = paths[("Display", "Bold")]
    mono_regular = paths[("Mono", "Regular")]

    draw.text((130, 105), "CROW BITFEATHER", font=label, fill="#45E7FF")
    draw.text(
        (130, 160),
        "actual built font • v0.3.0 • approved v0.6 morphology • regular +12.5%",
        font=body,
        fill="#8FA2C5",
    )
    draw.line((130, 220, width - 130, 220), fill="#29345F", width=2)

    rows = [
        ("DISPLAY REGULAR", display_regular, "CROWCLAW / CROW-GODMOD3", 96, "#F2F7FF"),
        ("DISPLAY BOLD", display_bold, "THREE EYES  ONE SYSTEM", 86, "#9B6CFF"),
        ("UPPERCASE", display_regular, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", 58, "#45E7FF"),
        ("LOWERCASE", display_regular, "abcdefghijklmnopqrstuvwxyz", 58, "#F2F7FF"),
        ("NUMERALS", display_regular, "0123456789  O0  I1  B8  S5  G6", 72, "#9B6CFF"),
        ("PUNCTUATION", mono_regular, "! \" # $ % & ' ( ) * + , - . / : ; < = > ? @", 44, "#F2F7FF"),
        ("SIGNALS", mono_regular, "← ↑ → ↓ ↔ ↕ ↩ ↪ ⇒  − ≠ ≤ ≥  ◆ ◇ ★", 52, "#45E7FF"),
    ]
    y = 275
    for title, path, text, size, color in rows:
        draw.text((130, y), title, font=body, fill="#8FA2C5")
        draw.text(
            (510, y - 24),
            text,
            font=fit(text, path, size, width - 650),
            fill=color,
        )
        y += 155

    draw.line((130, 1370, width - 130, 1370), fill="#29345F", width=2)
    draw.text(
        (130, 1410),
        "SMALL-SIZE SURVIVAL — ACTUAL REGULAR TTF",
        font=label,
        fill="#8FA2C5",
    )
    sample = "CROWCLAW 3EYEDCROW"
    placements = (
        (96, 130, 1480),
        (48, 1280, 1505),
        (28, 130, 1670),
        (20, 850, 1670),
        (16, 1510, 1670),
    )
    for size, x, y in placements:
        draw.text((x, y), f"{size}px", font=body, fill="#45E7FF")
        draw.text(
            (x, y + 38),
            sample,
            font=font(display_regular, size),
            fill="#F2F7FF",
        )

    path = SPECIMEN_DIR / f"crow-bitfeather-v{VERSION}.png"
    image.save(path, optimize=True)
    return path


def write_support_files() -> tuple[Path, Path, Path, Path]:
    css = FONT_ROOT / "crow-bitfeather.css"
    css.write_text(
        f"""/*
 * Crow Bitfeather v{VERSION}
 * Original solid stepped-pixel CrowClaw font.
 */

@font-face {{
  font-family: "Crow Bitfeather Display";
  src: url("./woff2/CrowBitfeatherDisplay-Regular.woff2") format("woff2");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}}

@font-face {{
  font-family: "Crow Bitfeather Display";
  src: url("./woff2/CrowBitfeatherDisplay-Bold.woff2") format("woff2");
  font-style: normal;
  font-weight: 700;
  font-display: swap;
}}

@font-face {{
  font-family: "Crow Bitfeather Mono";
  src: url("./woff2/CrowBitfeatherMono-Regular.woff2") format("woff2");
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}}

@font-face {{
  font-family: "Crow Bitfeather Mono";
  src: url("./woff2/CrowBitfeatherMono-Bold.woff2") format("woff2");
  font-style: normal;
  font-weight: 700;
  font-display: swap;
}}
""",
        encoding="utf-8",
        newline="\n",
    )

    install = FONT_ROOT / "install.ps1"
    uninstall = FONT_ROOT / "uninstall.ps1"
    entries = [
        ("CrowBitfeatherDisplay-Regular.ttf", "Crow Bitfeather Display Regular (TrueType)"),
        ("CrowBitfeatherDisplay-Bold.ttf", "Crow Bitfeather Display Bold (TrueType)"),
        ("CrowBitfeatherMono-Regular.ttf", "Crow Bitfeather Mono Regular (TrueType)"),
        ("CrowBitfeatherMono-Bold.ttf", "Crow Bitfeather Mono Bold (TrueType)"),
    ]
    table = "\n".join(
        f"    @{{ File = '{filename}'; Name = '{name}' }}" + ("," if index < len(entries) - 1 else "")
        for index, (filename, name) in enumerate(entries)
    )
    native_source = r"""$nativeSource = @"
using System;
using System.Runtime.InteropServices;

public static class CrowBitfeatherFontNative
{
    [DllImport("gdi32.dll", CharSet = CharSet.Unicode, SetLastError = true, EntryPoint = "AddFontResourceExW")]
    public static extern int AddFontResourceEx(string name, uint flags, IntPtr reserved);

    [return: MarshalAs(UnmanagedType.Bool)]
    [DllImport("gdi32.dll", CharSet = CharSet.Unicode, SetLastError = true, EntryPoint = "RemoveFontResourceExW")]
    public static extern bool RemoveFontResourceEx(string name, uint flags, IntPtr reserved);

    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true, EntryPoint = "SendMessageTimeoutW")]
    public static extern IntPtr SendMessageTimeout(
        IntPtr window,
        uint message,
        IntPtr wParam,
        IntPtr lParam,
        uint flags,
        uint timeout,
        out IntPtr result);
}
"@

function Initialize-CrowBitfeatherNative {
    if ($null -eq ('CrowBitfeatherFontNative' -as [type])) {
        Add-Type -TypeDefinition $nativeSource -ErrorAction Stop
    }
}

function Send-CrowBitfeatherFontChange {
    $result = [IntPtr]::Zero
    $sent = [CrowBitfeatherFontNative]::SendMessageTimeout(
        [IntPtr]0xFFFF,
        [uint32]0x001D,
        [IntPtr]::Zero,
        [IntPtr]::Zero,
        [uint32]0x0002,
        [uint32]5000,
        [ref]$result
    )
    if ($sent -eq [IntPtr]::Zero) {
        $code = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
        throw "WM_FONTCHANGE broadcast failed with Win32 error $code."
    }
}
"""
    install_template = r"""[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'Medium')]
param()
$ErrorActionPreference = 'Stop'
$fontDirectory = Join-Path $env:LOCALAPPDATA 'Microsoft\Windows\Fonts'
$registryPath = 'HKCU:\Software\Microsoft\Windows NT\CurrentVersion\Fonts'
$sourceDirectory = Join-Path $PSScriptRoot 'ttf'
$fonts = @(
__FONT_TABLE__
)

__NATIVE_SOURCE__

foreach ($entry in $fonts) {
    $source = Join-Path $sourceDirectory $entry.File
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
        throw "Missing font file: $source"
    }
}

if (-not (Test-Path -LiteralPath $fontDirectory -PathType Container)) {
    if ($PSCmdlet.ShouldProcess($fontDirectory, 'Create per-user font directory')) {
        New-Item -ItemType Directory -Path $fontDirectory -Force -ErrorAction Stop | Out-Null
    }
}
if (-not (Test-Path -LiteralPath $registryPath)) {
    if ($PSCmdlet.ShouldProcess($registryPath, 'Create per-user font registry key')) {
        New-Item -Path $registryPath -Force -ErrorAction Stop | Out-Null
    }
}
if (-not $WhatIfPreference) {
    if (-not (Test-Path -LiteralPath $fontDirectory -PathType Container)) {
        throw "Per-user font directory was not created: $fontDirectory"
    }
    if (-not (Test-Path -LiteralPath $registryPath)) {
        throw "Per-user font registry key was not created: $registryPath"
    }
}

$attempted = 0
$activated = [Collections.Generic.List[string]]::new()
$failures = [Collections.Generic.List[string]]::new()
$nativeReady = $false

foreach ($entry in $fonts) {
    $source = Join-Path $sourceDirectory $entry.File
    $destination = Join-Path $fontDirectory $entry.File
    if ($PSCmdlet.ShouldProcess($destination, "Install and activate $($entry.Name)")) {
        $attempted++
        try {
            if (-not $nativeReady) {
                Initialize-CrowBitfeatherNative
                $nativeReady = $true
            }
            Copy-Item -LiteralPath $source -Destination $destination -Force -ErrorAction Stop
            New-ItemProperty -LiteralPath $registryPath -Name $entry.Name -Value $destination -PropertyType String -Force -ErrorAction Stop | Out-Null
            $loaded = [CrowBitfeatherFontNative]::AddFontResourceEx(
                $destination,
                [uint32]0,
                [IntPtr]::Zero
            )
            if ($loaded -lt 1) {
                $code = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
                throw "persistent registration succeeded, but current-session activation failed with Win32 error $code"
            }
            [void]$activated.Add($entry.Name)
        }
        catch {
            [void]$failures.Add("$($entry.Name): $($_.Exception.Message)")
        }
    }
}

if ($activated.Count -gt 0) {
    if ($PSCmdlet.ShouldProcess('Windows desktop session', 'Broadcast WM_FONTCHANGE')) {
        try {
            Send-CrowBitfeatherFontChange
        }
        catch {
            [void]$failures.Add($_.Exception.Message)
        }
    }
    else {
        [void]$failures.Add('WM_FONTCHANGE was not broadcast.')
    }
}

if ($WhatIfPreference) {
    Write-Host 'WhatIf preview complete. No changes were made.'
    return
}
if ($failures.Count -gt 0) {
    throw ("Crow Bitfeather installation did not complete:`n - " + ($failures -join "`n - "))
}
if ($attempted -eq 0) {
    Write-Host 'No Crow Bitfeather installation changes were approved.'
    return
}
Write-Host ("Installed and activated {0} Crow Bitfeather fonts for the current Windows user." -f $activated.Count)
"""
    install.write_text(
        install_template.replace("__FONT_TABLE__", table).replace(
            "__NATIVE_SOURCE__", native_source.rstrip()
        ),
        encoding="utf-8",
        newline="\n",
    )

    uninstall_template = r"""[CmdletBinding(SupportsShouldProcess, ConfirmImpact = 'Medium')]
param()
$ErrorActionPreference = 'Stop'
$fontDirectory = Join-Path $env:LOCALAPPDATA 'Microsoft\Windows\Fonts'
$registryPath = 'HKCU:\Software\Microsoft\Windows NT\CurrentVersion\Fonts'
$fonts = @(
__FONT_TABLE__
)

__NATIVE_SOURCE__

function Get-CrowBitfeatherRegistryProperty {
    param([Parameter(Mandatory)][string]$Name)
    if (-not (Test-Path -LiteralPath $registryPath)) {
        return $null
    }
    $properties = Get-ItemProperty -LiteralPath $registryPath -ErrorAction Stop
    return $properties.PSObject.Properties[$Name]
}

$attempted = 0
$removed = 0
$changed = $false
$failures = [Collections.Generic.List[string]]::new()
$nativeReady = $false

foreach ($entry in $fonts) {
    $destination = Join-Path $fontDirectory $entry.File
    $registryProperty = Get-CrowBitfeatherRegistryProperty -Name $entry.Name
    $filePresent = Test-Path -LiteralPath $destination -PathType Leaf
    if (-not $filePresent -and $null -eq $registryProperty) {
        continue
    }

    if ($PSCmdlet.ShouldProcess($destination, "Deactivate and uninstall $($entry.Name)")) {
        $attempted++
        $entryChanged = $false
        try {
            if (-not $nativeReady) {
                Initialize-CrowBitfeatherNative
                $nativeReady = $true
            }
            $resourcePath = $destination
            if (
                $null -ne $registryProperty -and
                -not [string]::IsNullOrWhiteSpace([string]$registryProperty.Value) -and
                [IO.Path]::IsPathRooted([string]$registryProperty.Value)
            ) {
                $resourcePath = [string]$registryProperty.Value
            }

            $resourceRemovals = 0
            while (
                [CrowBitfeatherFontNative]::RemoveFontResourceEx(
                    $resourcePath,
                    [uint32]0,
                    [IntPtr]::Zero
                )
            ) {
                $resourceRemovals++
                $entryChanged = $true
                if ($resourceRemovals -ge 64) {
                    throw 'font resource reference count exceeded the safe removal limit'
                }
            }

            if ($null -ne $registryProperty) {
                Remove-ItemProperty -LiteralPath $registryPath -Name $entry.Name -ErrorAction Stop
                $entryChanged = $true
            }
            if ($filePresent) {
                Remove-Item -LiteralPath $destination -Force -ErrorAction Stop
                $entryChanged = $true
            }
            if ($entryChanged) {
                $changed = $true
                $removed++
            }
        }
        catch {
            if ($entryChanged) {
                $changed = $true
            }
            [void]$failures.Add("$($entry.Name): $($_.Exception.Message)")
        }
    }
}

if ($changed) {
    if ($PSCmdlet.ShouldProcess('Windows desktop session', 'Broadcast WM_FONTCHANGE')) {
        try {
            Send-CrowBitfeatherFontChange
        }
        catch {
            [void]$failures.Add($_.Exception.Message)
        }
    }
    else {
        [void]$failures.Add('WM_FONTCHANGE was not broadcast.')
    }
}

if ($WhatIfPreference) {
    Write-Host 'WhatIf preview complete. No changes were made.'
    return
}
if ($failures.Count -gt 0) {
    throw ("Crow Bitfeather removal did not complete:`n - " + ($failures -join "`n - "))
}
if ($attempted -eq 0) {
    Write-Host 'No installed Crow Bitfeather fonts were found or approved for removal.'
    return
}
Write-Host ("Deactivated and removed {0} Crow Bitfeather fonts for the current Windows user." -f $removed)
"""
    uninstall.write_text(
        uninstall_template.replace("__FONT_TABLE__", table).replace(
            "__NATIVE_SOURCE__", native_source.rstrip()
        ),
        encoding="utf-8",
        newline="\n",
    )

    readme = FONT_ROOT / "README.md"
    readme.write_text(
        f"""# Crow Bitfeather v{VERSION}

Crow Bitfeather is the installable form of the approved row 03 BITFEATHER
direction from `crow-type-audition-v0.6.png`.

Regular uses an eight-times logical construction grid and an 18-unit source
stroke, exactly 12.5% heavier than the proof's equivalent 16-unit stroke. This
keeps the solid stepped feather/talon morphology while improving small-size
survival without the 50% jump of changing two source pixels to three.

The pack contains Display and fixed-width Mono families in Regular and Bold,
TTF and WOFF2. It covers printable Basic Latin, small-cap lowercase codepoints,
and the useful signals recorded in `manifest.json`.

Run `./install.ps1` or `./uninstall.ps1` from the extracted Windows package.
The scripts work per user and do not require administrator access.

Rebuild from `brand-system` with:

```powershell
.\\.venv\\Scripts\\python.exe .\\scripts\\build_bitfeather_fonts.py
```
""",
        encoding="utf-8",
        newline="\n",
    )
    return css, install, uninstall, readme


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def validate_font(path: Path, *, monospaced: bool) -> dict[str, object]:
    font_file = TTFont(path)
    cmap = font_file.getBestCmap()
    required = set(range(0x20, 0x7F))
    if missing := sorted(required - set(cmap)):
        raise RuntimeError(f"{path.name} misses Basic Latin: {missing}")
    if font_file["head"].unitsPerEm != UPM:
        raise RuntimeError(f"{path.name} has wrong UPM")

    if monospaced:
        widths = {
            font_file["hmtx"].metrics[name][0]
            for codepoint, name in cmap.items()
            if 0x21 <= codepoint <= 0x7E
        }
        if widths != {MONO_ADVANCE}:
            raise RuntimeError(f"{path.name} is not fixed width: {sorted(widths)}")

    for name in font_file.getGlyphOrder():
        pen = RecordingPen()
        font_file.getGlyphSet()[name].draw(pen)
        if any(operator in {"curveTo", "qCurveTo"} for operator, _ in pen.value):
            raise RuntimeError(f"{path.name}:{name} contains a curve")

    if path.suffix.lower() == ".ttf" and hasattr(ctypes, "windll"):
        private = 0x10
        loaded = ctypes.windll.gdi32.AddFontResourceExW(str(path), private, 0)
        if loaded == 0:
            raise RuntimeError(f"Windows GDI could not load {path.name}")
        ctypes.windll.gdi32.RemoveFontResourceExW(str(path), private, 0)

    record = {
        "file": path.relative_to(ROOT).as_posix(),
        "sha256": sha256(path),
        "bytes": path.stat().st_size,
        "glyphs": len(font_file.getGlyphOrder()),
        "mapped_codepoints": len(cmap),
        "monospaced": monospaced,
    }
    font_file.close()
    return record


def validate_small_sizes(path: Path) -> dict[str, int]:
    results: dict[str, int] = {}
    for size in (16, 20, 28, 48, 96):
        face = font(path, size)
        image = Image.new("L", (1800, 180), 0)
        ImageDraw.Draw(image).text(
            (10, 10),
            "CROWCLAW 3EYEDCROW B8 O0 I1 S5 G6",
            font=face,
            fill=255,
        )
        pixels = sum(1 for value in image.get_flattened_data() if value)
        if pixels == 0:
            raise RuntimeError(f"{path.name} rendered empty at {size}px")
        results[f"{size}px"] = pixels
    return results


def write_manifest(
    records: list[dict[str, object]],
    specimen: Path,
    support: tuple[Path, Path, Path, Path],
    small_sizes: dict[str, int],
) -> Path:
    files = records[:]
    for path in (specimen, *support):
        files.append(
            {
                "file": path.relative_to(ROOT).as_posix(),
                "sha256": sha256(path),
                "bytes": path.stat().st_size,
            }
        )
    manifest = {
        "name": "Crow Bitfeather",
        "version": VERSION,
        "generated_at": FIXED_BUILD_TIME,
        "approved_source": "fonts/specimens/crow-type-audition-v0.6.png row 03 BITFEATHER",
        "construction": {
            "logical_grid_scale": SUBPIXEL,
            "proof_equivalent_stroke": PROOF_STROKE,
            "regular_stroke": REGULAR_STROKE,
            "regular_weight_increase": f"{REGULAR_INCREASE:.1%}",
            "bold_stroke": BOLD_STROKE,
            "outline": "orthogonal filled polygons; no curves or detached dots",
        },
        "coverage": {
            "printable_basic_latin": "U+0020-U+007E",
            "extras": [f"U+{codepoint:04X}" for codepoint in sorted(EXTRA_PATTERNS)],
        },
        "small_size_render_pixels": small_sizes,
        "files": files,
    }
    path = FONT_ROOT / "manifest.json"
    path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return path


def package(
    records: list[dict[str, object]],
    specimen: Path,
    support: tuple[Path, Path, Path, Path],
    manifest: Path,
) -> tuple[Path, Path, Path]:
    payload: list[tuple[Path, str]] = []
    for record in records:
        path = ROOT / str(record["file"])
        payload.append((path, str(Path(record["file"]).relative_to("fonts/bitfeather"))))
    css, install, uninstall, readme = support
    payload.extend(
        [
            (css, css.name),
            (install, install.name),
            (uninstall, uninstall.name),
            (readme, readme.name),
            (manifest, manifest.name),
            (specimen, f"specimens/{specimen.name}"),
            (ROOT / "LICENSE.md", "LICENSE.md"),
            (ROOT / "scripts/build_bitfeather_fonts.py", "scripts/build_bitfeather_fonts.py"),
            (ROOT / "scripts/build_font_audition_v2.py", "scripts/build_font_audition_v2.py"),
            (ROOT / "scripts/build_fonts.py", "scripts/build_fonts.py"),
        ]
    )
    checksum = FONT_ROOT / "package-files.sha256"
    checksum.write_text(
        "\n".join(
            f"{sha256(path).upper()}  {relative}" for path, relative in payload
        )
        + "\n",
        encoding="ascii",
        newline="\n",
    )
    payload.append((checksum, checksum.name))

    archive_path = DOWNLOAD_DIR / f"{PACKAGE_NAME}.zip"
    with zipfile.ZipFile(
        archive_path,
        "w",
        compression=zipfile.ZIP_DEFLATED,
        compresslevel=9,
    ) as archive:
        for path, relative in payload:
            info = zipfile.ZipInfo(
                f"{PACKAGE_NAME}/{relative}",
                date_time=(2026, 7, 30, 0, 0, 0),
            )
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            archive.writestr(info, path.read_bytes(), compresslevel=9)
    with zipfile.ZipFile(archive_path, "r") as archive:
        if corrupt := archive.testzip():
            raise RuntimeError(f"Corrupt ZIP member: {corrupt}")

    archive_checksum = DOWNLOAD_DIR / f"{PACKAGE_NAME}.sha256"
    archive_checksum.write_text(
        f"{sha256(archive_path).upper()}  {archive_path.name}\n",
        encoding="ascii",
        newline="\n",
    )
    return archive_path, archive_checksum, checksum


def main() -> None:
    for directory in (TTF_DIR, WOFF2_DIR, SPECIMEN_DIR, DOWNLOAD_DIR):
        directory.mkdir(parents=True, exist_ok=True)

    configurations = [
        ("Crow Bitfeather Display", "Display", "Regular", 400, False),
        ("Crow Bitfeather Display", "Display", "Bold", 700, False),
        ("Crow Bitfeather Mono", "Mono", "Regular", 400, True),
        ("Crow Bitfeather Mono", "Mono", "Bold", 700, True),
    ]
    paths: dict[tuple[str, str], Path] = {}
    records: list[dict[str, object]] = []
    for family, short, style, weight, monospaced in configurations:
        ttf = build_font(family, style, weight, monospaced)
        woff2 = build_woff2(ttf)
        paths[(short, style)] = ttf
        for path, format_name in ((ttf, "ttf"), (woff2, "woff2")):
            record = validate_font(path, monospaced=monospaced)
            record.update(
                {
                    "format": format_name,
                    "family": family,
                    "style": style,
                    "weight": weight,
                }
            )
            records.append(record)

    specimen = draw_specimen(paths)
    support = write_support_files()
    small_sizes = validate_small_sizes(paths[("Display", "Regular")])
    manifest = write_manifest(records, specimen, support, small_sizes)
    archive, archive_checksum, package_checksums = package(
        records,
        specimen,
        support,
        manifest,
    )

    print("Built Crow Bitfeather v0.3.0.")
    print(f"  regular proof weight increase: {REGULAR_INCREASE:.1%}")
    for record in records:
        print(
            f"  {record['file']} "
            f"({record['glyphs']} glyphs, {record['mapped_codepoints']} codepoints)"
        )
    print(f"  specimen: {specimen.relative_to(ROOT).as_posix()}")
    print(f"  archive: {archive.relative_to(ROOT).as_posix()}")
    print(f"  archive sha256: {sha256(archive).upper()}")
    print(f"  checksum: {archive_checksum.relative_to(ROOT).as_posix()}")
    print(f"  payload checksums: {package_checksums.relative_to(ROOT).as_posix()}")


if __name__ == "__main__":
    main()
