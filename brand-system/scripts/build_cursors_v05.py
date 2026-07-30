#!/usr/bin/env python3
"""Build Crow Talon v0.5: smooth high-detail Windows cursors.

The approved RGBA cybernetic claw-hand is the exact visual source for Normal and the
base for Help, Working, and Link. The remaining roles use a shared
supersampled gunmetal/cyan/violet renderer. Crow Talon v0.3 is imported only
for its proven CUR/ANI parsers and Windows loader; no older artifact is written.
"""

from __future__ import annotations

import ctypes
import colorsys
import hashlib
import importlib.util
import io
import json
import math
import os
import struct
import sys
import tempfile
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable, Sequence

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont


def load_legacy_cursor_codec():
    """Load the frozen CUR/ANI codec locally or from the packaged helper."""
    current = Path(__file__).resolve()
    candidates = [current.with_name("build_cursors_legacy.py")]
    if current.name != "build_cursors.py":
        candidates.append(current.with_name("build_cursors.py"))
    for candidate in candidates:
        if not candidate.is_file() or candidate.resolve() == current:
            continue
        spec = importlib.util.spec_from_file_location(
            "_crow_talon_legacy_codec",
            candidate,
        )
        if spec is None or spec.loader is None:
            continue
        module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        return module
    raise FileNotFoundError(
        "Crow Talon legacy CUR/ANI codec not found beside the v0.5 builder"
    )


v03 = load_legacy_cursor_codec()


REPO_ROOT = Path(__file__).resolve().parents[1]
CURSOR_ROOT = REPO_ROOT / "cursors"
V05_ROOT = CURSOR_ROOT / "v0.5"
SOURCE_ROOT = V05_ROOT / "src"
WINDOWS_DIR = V05_ROOT / "windows"
PREVIEW_DIR = V05_ROOT / "previews"
MASTER_PATH = CURSOR_ROOT / "masters" / "crow-claw-hand-master-v0.5.png"
BUILDER_PATH = Path(__file__).resolve()
V03_BUILDER_PATH = Path(v03.__file__).resolve()
V04_BUILDER_PATH = REPO_ROOT / "scripts" / "build_cursors_v04.py"
TEMPLATE_ROOT = REPO_ROOT / "templates"

PACKAGE_VERSION = "0.5.0"
PACKAGE_STEM = f"Crow-Talon-Windows-v{PACKAGE_VERSION}"
DOWNLOAD_DIR = REPO_ROOT / "downloads"
PACKAGE_PATH = DOWNLOAD_DIR / f"{PACKAGE_STEM}.zip"
PACKAGE_HASH_PATH = DOWNLOAD_DIR / f"{PACKAGE_STEM}.sha256"
PACKAGE_CONTENT_HASHES_PATH = V05_ROOT / "package-files.sha256"
README_PATH = V05_ROOT / "README.md"
MANIFEST_PATH = V05_ROOT / "manifest.json"
INSTALL_PATH = V05_ROOT / "install.ps1"
UNINSTALL_PATH = V05_ROOT / "uninstall.ps1"
INF_PATH = V05_ROOT / "Crow-Talon.inf"
LICENSE_PATH = V05_ROOT / "LICENSE.md"
PREVIEW_PATH = PREVIEW_DIR / "crow-talon-v0.5-preview.png"
NORMAL_PROOF_PATH = PREVIEW_DIR / "normal-native-proof.png"
EDGE_PROOF_PATH = PREVIEW_DIR / "antialias-edge-proof.png"
ANIMATION_PROOF_PATH = PREVIEW_DIR / "animation-frames.png"

SIZES = (32, 48, 64, 96)
ANI_FRAMES = 12
ANI_JIFFIES = 5
SUPERSAMPLE = {32: 8, 48: 8, 64: 6, 96: 4}
MASTER_PROFILES = {
    32: {"offset": (2, 1), "width": 22, "brightness": 1.34, "contrast": 1.14},
    48: {"offset": (3, 2), "width": 34, "brightness": 1.22, "contrast": 1.10},
    64: {"offset": (4, 2), "width": 45, "brightness": 1.12, "contrast": 1.07},
    96: {"offset": (6, 3), "width": 68, "brightness": 1.06, "contrast": 1.04},
}
NORMAL_HOTSPOTS = {32: (6, 2), 48: (9, 3), 64: (11, 3), 96: (17, 5)}
V03_ZIP_HASH = "1DEDE15B2BBE4790D05845F2375AA1FE1FF84FED1CFE3AECC78F4C587BFBCC16"
V03_SIDECAR_HASH = "C7196E475CE4E3B4E76F1BE3603219E7B8CD9A338F75D14CF62AA2BC25D533CC"
V04_ZIP_HASH = "878E3F0F49B3B12CD3D9E36D02D30FC70C6F9E4D999A62AE927E3897842BBD6D"
V04_SIDECAR_HASH = "317FB1A661325C694BAF3179176A6ACE0334F40439A477866234A70A95744A8A"
V04_BUILDER_HASH = "C1B3293C8DD4D8D2C318C739A0CD8D976539F31C0B18376D8A224D3679B31622"
MASTER_HASH = "78547F5935C54630C89F0BF0A03BF72C19DDC9E62CB093AE49493D4C91E183C4"

VOID = (2, 4, 10, 255)
INK = (3, 6, 13, 255)
NIGHT = (7, 11, 22, 255)
GUNMETAL_DARK = (16, 23, 35, 255)
GUNMETAL = (40, 53, 72, 255)
GUNMETAL_LIGHT = (83, 105, 135, 255)
STEEL = (163, 190, 218, 255)
FROST = (230, 246, 255, 255)
CYAN = (57, 224, 255, 255)
BLUE = (46, 135, 255, 255)
VIOLET = (105, 74, 242, 255)
VIOLET_LIGHT = (151, 117, 255, 255)
TRANSPARENT = (0, 0, 0, 0)


@dataclass(frozen=True)
class CursorSpec:
    role: str
    registry_name: str
    hotspot: Callable[[int], tuple[int, int]]
    animated: bool = False


def normal_hotspot(size: int) -> tuple[int, int]:
    return NORMAL_HOTSPOTS[size]


def centered_hotspot(size: int) -> tuple[int, int]:
    return size // 2, size // 2


def handwriting_hotspot(size: int) -> tuple[int, int]:
    return round(3 * size / 32), min(size - 1, round(29 * size / 32))


def alternate_hotspot(size: int) -> tuple[int, int]:
    return size // 2, max(1, round(size / 32))


SPECS: tuple[CursorSpec, ...] = (
    CursorSpec("normal", "Arrow", normal_hotspot),
    CursorSpec("help", "Help", normal_hotspot),
    CursorSpec("working", "AppStarting", normal_hotspot, animated=True),
    CursorSpec("busy", "Wait", centered_hotspot, animated=True),
    CursorSpec("precision", "Crosshair", centered_hotspot),
    CursorSpec("text", "IBeam", centered_hotspot),
    CursorSpec("handwriting", "NWPen", handwriting_hotspot),
    CursorSpec("unavailable", "No", centered_hotspot),
    CursorSpec("resize-v", "SizeNS", centered_hotspot),
    CursorSpec("resize-h", "SizeWE", centered_hotspot),
    CursorSpec("resize-d1", "SizeNWSE", centered_hotspot),
    CursorSpec("resize-d2", "SizeNESW", centered_hotspot),
    CursorSpec("move", "SizeAll", centered_hotspot),
    CursorSpec("alternate", "UpArrow", alternate_hotspot),
    CursorSpec("link", "Hand", normal_hotspot),
)

SPEC_BY_ROLE = {spec.role: spec for spec in SPECS}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest().upper()


def cubic_points(
    p0: tuple[float, float],
    p1: tuple[float, float],
    p2: tuple[float, float],
    p3: tuple[float, float],
    steps: int = 28,
) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for index in range(steps + 1):
        t = index / steps
        mt = 1 - t
        x = (
            mt**3 * p0[0]
            + 3 * mt**2 * t * p1[0]
            + 3 * mt * t**2 * p2[0]
            + t**3 * p3[0]
        )
        y = (
            mt**3 * p0[1]
            + 3 * mt**2 * t * p1[1]
            + 3 * mt * t**2 * p2[1]
            + t**3 * p3[1]
        )
        points.append((x, y))
    return points


def premultiplied_downsample(image: Image.Image, size: int) -> Image.Image:
    """Lanczos-resize RGBA without black/white matte fringes."""
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    channels = [
        ImageChops.multiply(channel, alpha)
        for channel in rgba.convert("RGB").split()
    ]
    target = (size, size)
    resized_alpha = alpha.resize(target, Image.Resampling.LANCZOS)
    resized_channels = [
        channel.resize(target, Image.Resampling.LANCZOS) for channel in channels
    ]
    output = Image.new("RGBA", target, TRANSPARENT)
    pixels: list[tuple[int, int, int, int]] = []
    alpha_bytes = resized_alpha.tobytes()
    channel_bytes = [channel.tobytes() for channel in resized_channels]
    for index, alpha_value in enumerate(alpha_bytes):
        if alpha_value == 0:
            pixels.append(TRANSPARENT)
            continue
        rgb = tuple(
            min(255, round(channel[index] * 255 / alpha_value))
            for channel in channel_bytes
        )
        pixels.append((*rgb, alpha_value))
    output.putdata(pixels)
    return output


class SmoothCanvas:
    """Floating-point 32-unit canvas rendered above target resolution."""

    def __init__(self, size: int):
        self.size = size
        self.factor = SUPERSAMPLE[size]
        self.work_size = size * self.factor
        self.scale = self.work_size / 32
        self.image = Image.new("RGBA", (self.work_size, self.work_size), TRANSPARENT)
        self.draw = ImageDraw.Draw(self.image, "RGBA")

    def point(self, point: tuple[float, float]) -> tuple[int, int]:
        return round(point[0] * self.scale), round(point[1] * self.scale)

    def points(
        self,
        points: Sequence[tuple[float, float]],
    ) -> list[tuple[int, int]]:
        return [self.point(point) for point in points]

    def width(self, value: float) -> int:
        return max(1, round(value * self.scale))

    def box(
        self,
        box: tuple[float, float, float, float],
    ) -> tuple[int, int, int, int]:
        return tuple(round(value * self.scale) for value in box)  # type: ignore[return-value]

    def line(
        self,
        points: Sequence[tuple[float, float]],
        fill: tuple[int, int, int, int],
        width: float,
    ) -> None:
        native = self.points(points)
        self.draw.line(native, fill=fill, width=self.width(width), joint="curve")
        radius = self.width(width) // 2
        if radius:
            for x, y in (native[0], native[-1]):
                self.draw.ellipse(
                    (x - radius, y - radius, x + radius, y + radius),
                    fill=fill,
                )

    def curve(
        self,
        p0: tuple[float, float],
        p1: tuple[float, float],
        p2: tuple[float, float],
        p3: tuple[float, float],
        fill: tuple[int, int, int, int],
        width: float,
    ) -> None:
        self.line(cubic_points(p0, p1, p2, p3), fill, width)

    def ellipse(
        self,
        box: tuple[float, float, float, float],
        fill: tuple[int, int, int, int] | None = None,
        outline: tuple[int, int, int, int] | None = None,
        width: float = 1,
    ) -> None:
        self.draw.ellipse(
            self.box(box),
            fill=fill,
            outline=outline,
            width=self.width(width),
        )

    def rounded(
        self,
        box: tuple[float, float, float, float],
        radius: float,
        fill: tuple[int, int, int, int],
        outline: tuple[int, int, int, int] | None = None,
        width: float = 1,
    ) -> None:
        self.draw.rounded_rectangle(
            self.box(box),
            radius=self.width(radius),
            fill=fill,
            outline=outline,
            width=self.width(width),
        )

    def polygon(
        self,
        points: Sequence[tuple[float, float]],
        fill: tuple[int, int, int, int],
        outline: tuple[int, int, int, int] | None = None,
        width: float = 1,
    ) -> None:
        native = self.points(points)
        self.draw.polygon(native, fill=fill)
        if outline:
            self.draw.line(
                native + [native[0]],
                fill=outline,
                width=self.width(width),
                joint="curve",
            )

    def glow(
        self,
        center: tuple[float, float],
        radius: float,
        colour: tuple[int, int, int, int],
    ) -> None:
        layer = Image.new("RGBA", self.image.size, TRANSPARENT)
        layer_draw = ImageDraw.Draw(layer, "RGBA")
        cx, cy = self.point(center)
        native_radius = self.width(radius)
        layer_draw.ellipse(
            (
                cx - native_radius,
                cy - native_radius,
                cx + native_radius,
                cy + native_radius,
            ),
            fill=colour,
        )
        layer = layer.filter(ImageFilter.GaussianBlur(self.width(radius * 0.7)))
        self.image.alpha_composite(layer)
        self.draw = ImageDraw.Draw(self.image, "RGBA")

    def composite(self, layer: Image.Image) -> None:
        self.image.alpha_composite(layer)
        self.draw = ImageDraw.Draw(self.image, "RGBA")

    def finish(self) -> Image.Image:
        return premultiplied_downsample(self.image, self.size)


def metal_curve(
    canvas: SmoothCanvas,
    points: Sequence[tuple[float, float]],
    width: float,
    *,
    cyan_edge: bool = True,
) -> None:
    canvas.line(points, INK, width + 2.1)
    canvas.line(points, GUNMETAL_DARK, width + 1.2)
    canvas.line(points, GUNMETAL, width)
    highlight = [(x - 0.35, y - 0.35) for x, y in points]
    canvas.line(highlight, STEEL, max(0.45, width * 0.18))
    if cyan_edge:
        rim = [(x + 0.4, y + 0.4) for x, y in points]
        canvas.line(rim, CYAN, max(0.32, width * 0.12))


def servo(
    canvas: SmoothCanvas,
    center: tuple[float, float],
    radius: float,
    *,
    bright: bool = True,
) -> None:
    canvas.glow(center, radius * 1.8, (75, 75, 255, 55 if bright else 30))
    x, y = center
    canvas.ellipse(
        (x - radius * 1.35, y - radius * 1.35, x + radius * 1.35, y + radius * 1.35),
        fill=INK,
        outline=CYAN,
        width=0.35,
    )
    canvas.ellipse(
        (x - radius, y - radius, x + radius, y + radius),
        fill=GUNMETAL,
        outline=STEEL,
        width=0.35,
    )
    canvas.ellipse(
        (x - radius * 0.55, y - radius * 0.55, x + radius * 0.55, y + radius * 0.55),
        fill=VIOLET_LIGHT if bright else VIOLET,
        outline=VIOLET,
        width=0.3,
    )
    canvas.ellipse(
        (x - radius * 0.18, y - radius * 0.18, x + radius * 0.18, y + radius * 0.18),
        fill=FROST if bright else VIOLET_LIGHT,
    )


def talon_hook(
    canvas: SmoothCanvas,
    tip: tuple[float, float],
    direction: tuple[float, float],
    *,
    length: float = 6,
    width: float = 2.3,
) -> None:
    dx, dy = direction
    norm = math.hypot(dx, dy)
    dx, dy = dx / norm, dy / norm
    px, py = -dy, dx
    base = (tip[0] - dx * length, tip[1] - dy * length)
    c1 = (base[0] + px * 1.8, base[1] + py * 1.8)
    c2 = (tip[0] - dx * 1.4 + px * 2.3, tip[1] - dy * 1.4 + py * 2.3)
    points = cubic_points(base, c1, c2, tip, 22)
    metal_curve(canvas, points, width)
    canvas.glow(tip, 0.55, (57, 224, 255, 45))
    canvas.ellipse(
        (tip[0] - 0.35, tip[1] - 0.35, tip[0] + 0.35, tip[1] + 0.35),
        fill=FROST,
    )


_MASTER: Image.Image | None = None
_MASTER_BBOX: tuple[int, int, int, int] | None = None


def load_master() -> tuple[Image.Image, tuple[int, int, int, int]]:
    global _MASTER, _MASTER_BBOX
    if _MASTER is None:
        _MASTER = Image.open(MASTER_PATH).convert("RGBA")
        alpha = _MASTER.getchannel("A")
        bbox = alpha.getbbox()
        if bbox is None:
            raise ValueError("Approved v0.5 RGBA claw-hand master is empty")
        _MASTER_BBOX = bbox
    assert _MASTER_BBOX is not None
    return _MASTER.copy(), _MASTER_BBOX


def enhance_rgba(
    image: Image.Image,
    *,
    brightness: float,
    contrast: float,
) -> Image.Image:
    alpha = image.getchannel("A")
    rgb = image.convert("RGB")
    rgb = ImageEnhance.Brightness(rgb).enhance(brightness)
    rgb = ImageEnhance.Contrast(rgb).enhance(contrast)
    rgb = ImageEnhance.Color(rgb).enhance(1.06)
    output = Image.merge("RGBA", (*rgb.split(), alpha))
    # The approved source contains a handful of legacy warm glints. Keep its
    # geometry and material luminance exactly intact while remapping only those
    # chromatic outliers into Crow's cyan/blue/violet gamut.
    graded: list[tuple[int, int, int, int]] = []
    for red, green, blue, alpha_value in output.getdata():
        if alpha_value == 0:
            graded.append(TRANSPARENT)
            continue
        high, low = max(red, green, blue), min(red, green, blue)
        if high >= 16 and high - low >= 12:
            hue, saturation, value = colorsys.rgb_to_hsv(
                red / 255,
                green / 255,
                blue / 255,
            )
            hue_degrees = hue * 360
            if saturation >= 0.12 and not 178 <= hue_degrees <= 278:
                target_hue = 268 / 360 if hue_degrees > 278 else 205 / 360
                red_f, green_f, blue_f = colorsys.hsv_to_rgb(
                    target_hue,
                    min(saturation, 0.82),
                    value,
                )
                red, green, blue = (
                    round(red_f * 255),
                    round(green_f * 255),
                    round(blue_f * 255),
                )
        graded.append((red, green, blue, alpha_value))
    output.putdata(graded)
    return output


def alpha_ring(
    alpha: Image.Image,
    radius: int,
    opacity: float,
) -> Image.Image:
    kernel = max(3, radius * 2 + 1)
    if kernel % 2 == 0:
        kernel += 1
    expanded = alpha.filter(ImageFilter.MaxFilter(kernel))
    ring = ImageChops.subtract(expanded, alpha)
    return ring.point(lambda value: min(255, round(value * opacity)))


def solid_layer(
    size: tuple[int, int],
    colour: tuple[int, int, int],
    alpha: Image.Image,
) -> Image.Image:
    layer = Image.new("RGBA", size, (*colour, 0))
    layer.putalpha(alpha)
    return layer


def master_geometry(size: int) -> tuple[int, int, int, int, float]:
    master, bbox = load_master()
    del master
    profile = MASTER_PROFILES[size]
    offset_x, offset_y = profile["offset"]  # type: ignore[misc]
    width = int(profile["width"])
    crop_width = bbox[2] - bbox[0]
    crop_height = bbox[3] - bbox[1]
    height = round(crop_height * width / crop_width)
    return int(offset_x), int(offset_y), width, height, width / crop_width


def map_master_point(size: int, point: tuple[int, int]) -> tuple[float, float]:
    _, bbox = load_master()
    offset_x, offset_y, _width, _height, scale = master_geometry(size)
    return (
        offset_x + (point[0] - bbox[0]) * scale,
        offset_y + (point[1] - bbox[1]) * scale,
    )


def render_master_work(size: int) -> SmoothCanvas:
    master, bbox = load_master()
    profile = MASTER_PROFILES[size]
    canvas = SmoothCanvas(size)
    crop = master.crop(bbox)
    offset_x, offset_y, width, height, _scale = master_geometry(size)
    work_width = width * canvas.factor
    work_height = height * canvas.factor
    resized = crop.resize((work_width, work_height), Image.Resampling.LANCZOS)
    resized = enhance_rgba(
        resized,
        brightness=float(profile["brightness"]),
        contrast=float(profile["contrast"]),
    )
    placed = Image.new("RGBA", canvas.image.size, TRANSPARENT)
    placed.alpha_composite(
        resized,
        (offset_x * canvas.factor, offset_y * canvas.factor),
    )
    alpha = placed.getchannel("A")

    # Black outer keyline holds the silhouette on light backgrounds. A thinner
    # cyan subpixel rim restores the approved cool edge on dark backgrounds.
    keyline = alpha_ring(
        alpha,
        max(1, round(0.72 * canvas.factor)),
        0.72,
    )
    cyan_rim = alpha_ring(
        alpha,
        max(1, round(0.34 * canvas.factor)),
        0.62 if size <= 48 else 0.48,
    )
    canvas.composite(solid_layer(canvas.image.size, INK[:3], keyline))
    canvas.composite(solid_layer(canvas.image.size, CYAN[:3], cyan_rim))
    canvas.composite(placed)

    # Reinforce approved articulated hand servos only at small native sizes.
    # Positions map from the exact RGBA master; anatomy and footprint never change.
    if size <= 48:
        reinforcements = (
            ((526, 359), 0.34),
            ((615, 526), 0.38),
            ((612, 714), 0.48),
            ((755, 1005), 0.42),
            ((935, 743), 0.32),
        )
        reinforcement = SmoothCanvas(size)
        for source_point, radius in reinforcements:
            center = map_master_point(size, source_point)
            reinforcement.glow(center, radius * 1.5, (91, 76, 255, 40))
            x, y = center
            reinforcement.ellipse(
                (x - radius, y - radius, x + radius, y + radius),
                fill=VIOLET_LIGHT,
                outline=CYAN,
                width=0.18,
            )
            reinforcement.ellipse(
                (x - radius * 0.25, y - radius * 0.25, x + radius * 0.25, y + radius * 0.25),
                fill=FROST,
            )
        # Highlights may never float outside the approved claw-hand. Masking
        # them to native alpha preserves its exact four-digit silhouette.
        reinforcement_alpha = ImageChops.multiply(
            reinforcement.image.getchannel("A"),
            alpha,
        )
        reinforcement.image.putalpha(reinforcement_alpha)
        canvas.composite(reinforcement.image)
    return canvas


def render_normal(size: int) -> Image.Image:
    return finish_cursor(
        render_master_work(size),
        size,
        NORMAL_HOTSPOTS[size],
        harden_hotspot=True,
    )


def finish_cursor(
    canvas: SmoothCanvas,
    size: int,
    hotspot: tuple[int, int],
    *,
    harden_hotspot: bool = False,
) -> Image.Image:
    """Finish a cursor with clean transparent RGB and one-pixel breathing room."""
    image = canvas.finish()
    pixels = list(image.getdata())
    cleaned: list[tuple[int, int, int, int]] = []
    for index, pixel in enumerate(pixels):
        x, y = index % size, index // size
        if x in (0, size - 1) or y in (0, size - 1):
            cleaned.append(TRANSPARENT)
        elif pixel[3] == 0:
            cleaned.append(TRANSPARENT)
        else:
            cleaned.append(pixel)
    # A final native-grid gamut pass catches low-value master glints that only
    # become measurable after Lanczos filtering. It changes hue only; alpha,
    # silhouette, material brightness, and master geometry remain untouched.
    for index, (red, green, blue, alpha_value) in enumerate(cleaned):
        if alpha_value == 0:
            continue
        high, low = max(red, green, blue), min(red, green, blue)
        if high < 12 or high - low < 6:
            continue
        hue, saturation, value = colorsys.rgb_to_hsv(
            red / 255,
            green / 255,
            blue / 255,
        )
        hue_degrees = hue * 360
        if saturation >= 0.10 and not 178 <= hue_degrees <= 278:
            target_hue = 268 / 360 if hue_degrees > 278 else 205 / 360
            red_f, green_f, blue_f = colorsys.hsv_to_rgb(
                target_hue,
                min(saturation, 0.82),
                value,
            )
            cleaned[index] = (
                round(red_f * 255),
                round(green_f * 255),
                round(blue_f * 255),
                alpha_value,
            )
    hotspot_index = hotspot[1] * size + hotspot[0]
    hot_red, hot_green, hot_blue, hot_alpha = cleaned[hotspot_index]
    if harden_hotspot and 32 <= hot_alpha < 240:
        cleaned[hotspot_index] = (
            hot_red,
            hot_green,
            hot_blue,
            240,
        )
    if harden_hotspot:
        for y in range(max(1, hotspot[1] - 1), min(size - 1, hotspot[1] + 2)):
            for x in range(max(1, hotspot[0] - 1), min(size - 1, hotspot[0] + 2)):
                index = y * size + x
                red, green, blue, alpha_value = cleaned[index]
                if 64 <= alpha_value < 192:
                    cleaned[index] = (red, green, blue, 192)
    image.putdata(cleaned)
    hot_alpha = image.getpixel(hotspot)[3]
    if hot_alpha < 224:
        raise ValueError(
            f"{size}px cursor hotspot {hotspot} has weak alpha {hot_alpha}"
        )
    return image


def radial(
    center: tuple[float, float],
    angle: float,
    radius: float,
) -> tuple[float, float]:
    return (
        center[0] + math.cos(angle) * radius,
        center[1] + math.sin(angle) * radius,
    )


def badge_plate(
    canvas: SmoothCanvas,
    center: tuple[float, float],
    radius: float = 4.2,
) -> None:
    x, y = center
    canvas.glow(center, radius * 1.45, (57, 224, 255, 36))
    canvas.ellipse(
        (x - radius - 0.7, y - radius - 0.7, x + radius + 0.7, y + radius + 0.7),
        fill=INK,
        outline=CYAN,
        width=0.42,
    )
    canvas.ellipse(
        (x - radius, y - radius, x + radius, y + radius),
        fill=GUNMETAL_DARK,
        outline=STEEL,
        width=0.38,
    )


def draw_help_badge(canvas: SmoothCanvas) -> None:
    badge_plate(canvas, (25.8, 7.1), 4.0)
    canvas.curve(
        (24.2, 5.4),
        (24.5, 3.8),
        (27.8, 4.0),
        (27.4, 6.2),
        FROST,
        1.2,
    )
    canvas.curve(
        (27.4, 6.2),
        (27.2, 7.0),
        (25.6, 7.0),
        (25.6, 8.2),
        VIOLET_LIGHT,
        1.15,
    )
    canvas.ellipse((25.0, 9.0, 26.2, 10.2), fill=CYAN)


def draw_working_badge(canvas: SmoothCanvas, frame: int) -> None:
    center = (25.8, 24.7)
    badge_plate(canvas, center, 4.05)
    phase = frame * math.tau / ANI_FRAMES
    for index in range(8):
        angle = phase + index * math.tau / 8
        x, y = radial(center, angle, 2.55)
        strength = (index + frame) % 8
        colour = (
            FROST
            if strength == 0
            else CYAN
            if strength in (1, 7)
            else VIOLET_LIGHT
            if strength in (2, 6)
            else GUNMETAL_LIGHT
        )
        radius = 0.48 if strength == 0 else 0.32
        canvas.ellipse((x - radius, y - radius, x + radius, y + radius), fill=colour)
    servo(canvas, center, 0.72, bright=True)


def draw_link_badge(canvas: SmoothCanvas) -> None:
    center = (25.5, 15.0)
    canvas.glow(center, 5.0, (57, 224, 255, 34))
    canvas.polygon(
        ((20.9, 13.6), (24.0, 10.5), (28.8, 12.6), (29.5, 17.0), (26.2, 20.3), (21.5, 18.4)),
        INK,
        outline=CYAN,
        width=0.45,
    )
    first = cubic_points((21.9, 15.4), (21.3, 12.0), (25.7, 11.8), (25.9, 14.1), 18)
    second = cubic_points((25.1, 15.8), (25.2, 19.1), (29.4, 18.9), (29.1, 14.7), 18)
    metal_curve(canvas, first, 1.15)
    metal_curve(canvas, second, 1.15)
    canvas.line(((24.3, 15.3), (26.8, 14.0)), FROST, 0.55)


def talon_arrowhead(
    canvas: SmoothCanvas,
    tip: tuple[float, float],
    angle: float,
    length: float = 4.2,
    spread: float = 2.7,
) -> None:
    ux, uy = math.cos(angle), math.sin(angle)
    px, py = -uy, ux
    base = (tip[0] - ux * length, tip[1] - uy * length)
    left = (base[0] + px * spread, base[1] + py * spread)
    right = (base[0] - px * spread, base[1] - py * spread)
    canvas.polygon((tip, left, base, right), GUNMETAL, outline=INK, width=0.65)
    canvas.line((tip, base), STEEL, 0.55)
    canvas.line((tip, right), CYAN, 0.38)


def draw_busy(canvas: SmoothCanvas, frame: int) -> None:
    center = (16, 16)
    phase = frame * math.tau / ANI_FRAMES
    canvas.glow(center, 8.4, (73, 70, 255, 45))
    canvas.ellipse((8.4, 8.4, 23.6, 23.6), fill=INK, outline=CYAN, width=0.7)
    canvas.ellipse((10.0, 10.0, 22.0, 22.0), fill=GUNMETAL_DARK, outline=STEEL, width=0.65)
    for index in range(4):
        angle = phase + index * math.tau / 4
        tip = radial(center, angle, 12.1)
        talon_hook(canvas, tip, (math.cos(angle), math.sin(angle)), length=6.2, width=1.8)
    for index in range(12):
        angle = phase + index * math.tau / 12
        x, y = radial(center, angle, 7.0)
        colour = FROST if index == 0 else CYAN if index in (1, 11) else VIOLET
        radius = 0.7 if index == 0 else 0.34
        canvas.ellipse((x - radius, y - radius, x + radius, y + radius), fill=colour)
    servo(canvas, center, 3.2, bright=True)


def draw_precision(canvas: SmoothCanvas) -> None:
    center = (16, 16)
    canvas.glow(center, 7.0, (57, 224, 255, 28))
    canvas.ellipse((7.0, 7.0, 25.0, 25.0), outline=STEEL, width=1.15)
    canvas.ellipse((9.0, 9.0, 23.0, 23.0), outline=CYAN, width=0.45)
    for angle in (0, math.pi / 2, math.pi, 3 * math.pi / 2):
        start = radial(center, angle, 4.0)
        end = radial(center, angle, 13.2)
        metal_curve(canvas, (start, end), 1.15)
        talon_arrowhead(canvas, end, angle, 2.6, 1.45)
    servo(canvas, center, 2.15)


def draw_text(canvas: SmoothCanvas) -> None:
    canvas.glow((16, 16), 5.5, (105, 74, 242, 38))
    metal_curve(canvas, ((16, 5.0), (16, 27.0)), 2.6)
    metal_curve(canvas, ((10.0, 5.0), (22.0, 5.0)), 2.1)
    metal_curve(canvas, ((10.0, 27.0), (22.0, 27.0)), 2.1)
    talon_hook(canvas, (8.0, 4.5), (-1, -0.15), length=4.1, width=1.2)
    talon_hook(canvas, (24.0, 27.5), (1, 0.15), length=4.1, width=1.2)
    servo(canvas, (16, 16), 1.9)


def draw_handwriting(canvas: SmoothCanvas) -> None:
    path = cubic_points((26.5, 4.7), (23.0, 11.0), (12.0, 18.0), (3.2, 28.8), 34)
    metal_curve(canvas, path, 3.1)
    servo(canvas, (20.1, 12.0), 2.0)
    canvas.polygon(
        ((3.0, 29.0), (5.2, 23.8), (7.4, 26.0)),
        GUNMETAL_LIGHT,
        outline=CYAN,
        width=0.45,
    )
    canvas.ellipse((2.45, 28.25, 3.65, 29.45), fill=FROST)


def draw_unavailable(canvas: SmoothCanvas) -> None:
    center = (16, 16)
    canvas.glow(center, 10.0, (105, 74, 242, 35))
    canvas.ellipse((5.0, 5.0, 27.0, 27.0), fill=INK, outline=CYAN, width=1.0)
    canvas.ellipse((7.0, 7.0, 25.0, 25.0), fill=GUNMETAL_DARK, outline=STEEL, width=0.7)
    metal_curve(canvas, ((8.0, 8.0), (24.0, 24.0)), 3.3)
    talon_hook(canvas, (6.3, 6.3), (-1, -1), length=4.0, width=1.25)
    talon_hook(canvas, (25.7, 25.7), (1, 1), length=4.0, width=1.25)
    servo(canvas, center, 2.0, bright=False)


def draw_resize_axis(canvas: SmoothCanvas, angle: float) -> None:
    center = (16, 16)
    start = radial(center, angle + math.pi, 11.8)
    end = radial(center, angle, 11.8)
    metal_curve(canvas, (start, end), 2.15)
    talon_arrowhead(canvas, end, angle, 4.0, 2.7)
    talon_arrowhead(canvas, start, angle + math.pi, 4.0, 2.7)
    servo(canvas, center, 2.0)


def draw_move(canvas: SmoothCanvas) -> None:
    center = (16, 16)
    for angle in (0, math.pi / 2, math.pi, 3 * math.pi / 2):
        end = radial(center, angle, 12.0)
        metal_curve(canvas, (radial(center, angle, 2.0), end), 1.75)
        talon_arrowhead(canvas, end, angle, 3.7, 2.25)
    servo(canvas, center, 2.2)


def draw_alternate(canvas: SmoothCanvas) -> None:
    center = (16, 16)
    metal_curve(canvas, ((16, 28.0), (16, 4.9)), 3.0)
    talon_arrowhead(canvas, (16, 1.1), -math.pi / 2, 6.0, 4.2)
    canvas.polygon(((14.9, 0.35), (17.1, 0.35), (16.7, 2.55), (15.3, 2.55)), FROST)
    talon_hook(canvas, (9.4, 8.0), (-0.8, -0.6), length=5.1, width=1.45)
    talon_hook(canvas, (22.6, 8.0), (0.8, -0.6), length=5.1, width=1.45)
    servo(canvas, center, 2.25)


def render_role(role: str, size: int, frame: int = 0) -> Image.Image:
    if role not in SPEC_BY_ROLE:
        raise KeyError(f"Unknown cursor role: {role}")
    spec = SPEC_BY_ROLE[role]
    if role in {"normal", "help", "working", "link"}:
        canvas = render_master_work(size)
        if role == "help":
            draw_help_badge(canvas)
        elif role == "working":
            draw_working_badge(canvas, frame)
        elif role == "link":
            draw_link_badge(canvas)
    else:
        canvas = SmoothCanvas(size)
        if role == "busy":
            draw_busy(canvas, frame)
        elif role == "precision":
            draw_precision(canvas)
        elif role == "text":
            draw_text(canvas)
        elif role == "handwriting":
            draw_handwriting(canvas)
        elif role == "unavailable":
            draw_unavailable(canvas)
        elif role == "resize-v":
            draw_resize_axis(canvas, -math.pi / 2)
        elif role == "resize-h":
            draw_resize_axis(canvas, 0)
        elif role == "resize-d1":
            draw_resize_axis(canvas, math.pi / 4)
        elif role == "resize-d2":
            draw_resize_axis(canvas, -math.pi / 4)
        elif role == "move":
            draw_move(canvas)
        elif role == "alternate":
            draw_alternate(canvas)
        else:
            raise AssertionError(role)
    return finish_cursor(
        canvas,
        size,
        spec.hotspot(size),
        harden_hotspot=role in {"normal", "help", "working", "link"},
    )


def png_bytes(image: Image.Image) -> bytes:
    buffer = io.BytesIO()
    image.save(buffer, "PNG", optimize=True)
    return buffer.getvalue()


def build_cur_bytes(spec: CursorSpec, frame: int = 0) -> bytes:
    payloads = [(size, png_bytes(render_role(spec.role, size, frame))) for size in SIZES]
    payload_offset = 6 + 16 * len(payloads)
    entries: list[bytes] = []
    bodies: list[bytes] = []
    for size, payload in payloads:
        hot_x, hot_y = spec.hotspot(size)
        entries.append(
            struct.pack(
                "<BBBBHHII",
                size,
                size,
                0,
                0,
                hot_x,
                hot_y,
                len(payload),
                payload_offset,
            )
        )
        bodies.append(payload)
        payload_offset += len(payload)
    return struct.pack("<HHH", 0, 2, len(payloads)) + b"".join(entries + bodies)


def riff_chunk(tag: bytes, payload: bytes) -> bytes:
    pad = b"\0" if len(payload) & 1 else b""
    return tag + struct.pack("<I", len(payload)) + payload + pad


def build_ani_bytes(spec: CursorSpec) -> bytes:
    frames = [build_cur_bytes(spec, frame) for frame in range(ANI_FRAMES)]
    header = struct.pack(
        "<9I",
        36,
        ANI_FRAMES,
        ANI_FRAMES,
        0,
        0,
        0,
        0,
        ANI_JIFFIES,
        3,
    )
    rates = struct.pack(f"<{ANI_FRAMES}I", *([ANI_JIFFIES] * ANI_FRAMES))
    sequence = struct.pack(f"<{ANI_FRAMES}I", *range(ANI_FRAMES))
    frames_list = b"fram" + b"".join(riff_chunk(b"icon", frame) for frame in frames)
    info_list = b"INFO" + riff_chunk(
        b"INAM",
        f"Crow Talon v0.5 {spec.role}\0".encode("ascii"),
    )
    body = (
        b"ACON"
        + riff_chunk(b"anih", header)
        + riff_chunk(b"rate", rates)
        + riff_chunk(b"seq ", sequence)
        + riff_chunk(b"LIST", frames_list)
        + riff_chunk(b"LIST", info_list)
    )
    return b"RIFF" + struct.pack("<I", len(body)) + body


def decode_cur(
    data: bytes,
    *,
    label: str,
) -> dict[int, tuple[tuple[int, int], Image.Image, bytes]]:
    parsed = v03.parse_cur(data, label=label)
    count = len(parsed)
    expected_offset = 6 + 16 * count
    decoded: dict[int, tuple[tuple[int, int], Image.Image, bytes]] = {}
    for index in range(count):
        width, height, colors, reserved, hot_x, hot_y, length, offset = struct.unpack_from(
            "<BBBBHHII",
            data,
            6 + index * 16,
        )
        size = 256 if width == 0 else width
        actual_height = 256 if height == 0 else height
        if size != actual_height or colors or reserved:
            raise ValueError(f"{label}: malformed {size}px directory entry")
        if offset != expected_offset:
            raise ValueError(f"{label}: non-contiguous image payload at {size}px")
        payload = data[offset : offset + length]
        expected_offset += length
        with Image.open(io.BytesIO(payload)) as opened:
            image = opened.convert("RGBA")
        if image.size != (size, size):
            raise ValueError(
                f"{label}: embedded {size}px PNG decodes as {image.size}"
            )
        decoded[size] = ((hot_x, hot_y), image, payload)
    if expected_offset != len(data):
        raise ValueError(f"{label}: trailing bytes after final image payload")
    return decoded


def decode_ani_frames(
    data: bytes,
    *,
    label: str,
) -> list[dict[int, tuple[tuple[int, int], Image.Image, bytes]]]:
    v03.validate_ani(data, label=label)
    frame_payloads: list[bytes] = []
    rate_seen = 0
    seq_seen = 0
    header_seen = 0
    frame_list_seen = 0
    for tag, payload in v03.iter_riff_chunks(data, 12, len(data)):
        if tag == b"anih":
            header_seen += 1
        elif tag == b"rate":
            rate_seen += 1
            values = struct.unpack(f"<{ANI_FRAMES}I", payload)
            if values != (ANI_JIFFIES,) * ANI_FRAMES:
                raise ValueError(f"{label}: rate values are not all {ANI_JIFFIES}")
        elif tag == b"seq ":
            seq_seen += 1
        elif tag == b"LIST" and payload[:4] == b"fram":
            frame_list_seen += 1
            frame_payloads.extend(
                child_payload
                for child_tag, child_payload in v03.iter_riff_chunks(
                    payload,
                    4,
                    len(payload),
                )
                if child_tag == b"icon"
            )
    if (header_seen, rate_seen, seq_seen, frame_list_seen) != (1, 1, 1, 1):
        raise ValueError(
            f"{label}: expected one header/rate/sequence/frame-list chunk"
        )
    return [
        decode_cur(frame_data, label=f"{label} frame {index}")
        for index, frame_data in enumerate(frame_payloads)
    ]


def threshold_bbox(image: Image.Image, threshold: int = 8) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A")
    mask = alpha.point(lambda value: 255 if value >= threshold else 0)
    bbox = mask.getbbox()
    if bbox is None:
        raise ValueError("cursor source is empty")
    return bbox


def validate_source(
    spec: CursorSpec,
    size: int,
    image: Image.Image,
) -> dict[str, object]:
    if image.mode != "RGBA" or image.size != (size, size):
        raise ValueError(
            f"{spec.role} {size}px: expected RGBA {size}x{size}, got "
            f"{image.mode} {image.size}"
        )
    pixels = list(image.getdata())
    alpha_values = {pixel[3] for pixel in pixels}
    intermediate = sorted(value for value in alpha_values if 0 < value < 255)
    soft_pixels = sum(1 for pixel in pixels if 0 < pixel[3] < 224)
    visible_pixels = sum(1 for pixel in pixels if pixel[3] >= 8)
    if len(intermediate) < {32: 10, 48: 14, 64: 18, 96: 22}[size]:
        raise ValueError(f"{spec.role} {size}px: insufficient antialias levels")
    if soft_pixels < {32: 24, 48: 40, 64: 56, 96: 88}[size]:
        raise ValueError(f"{spec.role} {size}px: insufficient soft-edge pixels")
    if any(pixel[:3] != (0, 0, 0) for pixel in pixels if pixel[3] == 0):
        raise ValueError(f"{spec.role} {size}px: RGB contamination under alpha zero")
    total_alpha = sum(pixel[3] for pixel in pixels)
    core_alpha = sum(pixel[3] for pixel in pixels if pixel[3] >= 224)
    if not total_alpha or core_alpha / total_alpha < 0.52:
        raise ValueError(f"{spec.role} {size}px: weak core alpha mass")

    warm: list[tuple[int, int, int]] = []
    violet_alpha = 0
    chroma_alpha = 0
    for red, green, blue, alpha_value in pixels:
        if alpha_value < 16:
            continue
        high, low = max(red, green, blue), min(red, green, blue)
        if high < 16 or high - low < 12:
            continue
        hue, saturation, _value = colorsys.rgb_to_hsv(
            red / 255,
            green / 255,
            blue / 255,
        )
        hue_degrees = hue * 360
        if saturation >= 0.12:
            chroma_alpha += alpha_value
            if not 176 <= hue_degrees <= 280:
                warm.append((red, green, blue))
            if 248 <= hue_degrees <= 280:
                violet_alpha += alpha_value
    if warm:
        raise ValueError(
            f"{spec.role} {size}px: {len(warm)} warm/green/pink pixels; "
            f"sample {warm[:3]}"
        )
    if chroma_alpha and violet_alpha / chroma_alpha > 0.48:
        raise ValueError(f"{spec.role} {size}px: violet overwhelms cyan/blue")

    hot_x, hot_y = spec.hotspot(size)
    hot_alpha = image.getpixel((hot_x, hot_y))[3]
    if hot_alpha < 240:
        raise ValueError(
            f"{spec.role} {size}px: hotspot {hot_x},{hot_y} alpha is {hot_alpha}"
        )
    neighbour_core = 0
    for y in range(max(0, hot_y - 1), min(size, hot_y + 2)):
        for x in range(max(0, hot_x - 1), min(size, hot_x + 2)):
            if image.getpixel((x, y))[3] >= 192:
                neighbour_core += 1
    if neighbour_core < {32: 2, 48: 3, 64: 3, 96: 4}[size]:
        raise ValueError(f"{spec.role} {size}px: hotspot neighbourhood is too thin")

    bbox = threshold_bbox(image)
    if bbox[0] == 0 or bbox[1] == 0 or bbox[2] == size or bbox[3] == size:
        raise ValueError(f"{spec.role} {size}px: visible pixels touch the canvas edge")
    width, height = bbox[2] - bbox[0], bbox[3] - bbox[1]
    occupancy = visible_pixels / (size * size)
    if not 0.025 <= occupancy <= 0.68:
        raise ValueError(
            f"{spec.role} {size}px: alpha footprint occupancy {occupancy:.3f}"
        )
    return {
        "soft_pixels": soft_pixels,
        "alpha_levels": len(alpha_values),
        "bbox": list(bbox),
        "footprint": [width, height],
        "occupancy": round(occupancy, 4),
        "hotspot": [hot_x, hot_y],
    }


def validate_normal_anatomy(size: int, image: Image.Image) -> dict[str, object]:
    alpha = image.getchannel("A")
    zones = {
        "digit_I_upper": (0.10, 0.02, 0.38, 0.30),
        "digit_II_middle": (0.01, 0.16, 0.34, 0.48),
        "digit_III_lower": (0.01, 0.34, 0.38, 0.67),
        "opposed_thumb": (0.52, 0.34, 0.92, 0.72),
    }
    anchors: dict[str, tuple[int, int]] = {}
    for label, (left, top, right, bottom) in zones.items():
        candidates: list[tuple[int, int, int]] = []
        for y in range(round(top * size), min(size, round(bottom * size))):
            for x in range(round(left * size), min(size, round(right * size))):
                value = alpha.getpixel((x, y))
                if value >= 224:
                    # Prefer the most distal strong-alpha point in each zone.
                    if label == "digit_I_upper":
                        score = -y
                    elif label == "digit_II_middle":
                        score = -(x + y * 0.3)
                    elif label == "digit_III_lower":
                        score = -x + y * 0.1
                    else:
                        score = -y + x * 0.05
                    candidates.append((round(score * 1000), x, y))
        if not candidates:
            raise ValueError(f"normal {size}px: missing strong {label} anchor")
        _score, x, y = max(candidates)
        anchors[label] = (x, y)
    pairs = [
        math.hypot(ax - bx, ay - by)
        for index, (ax, ay) in enumerate(anchors.values())
        for bx, by in list(anchors.values())[index + 1 :]
    ]
    if min(pairs) < size * 0.10:
        raise ValueError(f"normal {size}px: claw-hand digits collapse together")
    joint_box = (
        round(size * 0.24),
        round(size * 0.43),
        round(size * 0.72),
        round(size * 0.82),
    )
    joint_pixels = [
        image.getpixel((x, y))
        for y in range(joint_box[1], joint_box[3])
        for x in range(joint_box[0], joint_box[2])
        if image.getpixel((x, y))[3] >= 224
    ]
    if len(joint_pixels) < max(4, round(size * size * 0.012)):
        raise ValueError(f"normal {size}px: central mechanical joint is too weak")
    signal_pixels = sum(
        1
        for red, green, blue, alpha_value in joint_pixels
        if alpha_value >= 224 and blue > red * 1.05 and blue > green
    )
    if signal_pixels < max(1, round(size / 24)):
        raise ValueError(f"normal {size}px: central cyan/violet servo is unreadable")
    wrist_pixels = sum(
        image.getpixel((x, y))[3] >= 224
        for y in range(round(size * 0.72), size)
        for x in range(round(size * 0.38), round(size * 0.90))
    )
    if wrist_pixels < max(3, round(size * size * 0.018)):
        raise ValueError(f"normal {size}px: diagonal wrist is not preserved")
    return {
        "tips": {label: list(point) for label, point in anchors.items()},
        "joint_core_pixels": len(joint_pixels),
        "joint_signal_pixels": signal_pixels,
        "wrist_core_pixels": wrist_pixels,
    }


def mask_difference(left: Image.Image, right: Image.Image, threshold: int) -> float:
    left_mask = [value >= threshold for value in left.getchannel("A").getdata()]
    right_mask = [value >= threshold for value in right.getchannel("A").getdata()]
    union = sum(a or b for a, b in zip(left_mask, right_mask))
    changed = sum(a != b for a, b in zip(left_mask, right_mask))
    return changed / union if union else 0.0


def validate_role_uniqueness(
    rendered: dict[tuple[str, int], Image.Image],
) -> dict[str, object]:
    minimum_pair = 1.0
    for size in SIZES:
        rgba_hashes: dict[str, str] = {}
        mask_hashes: dict[str, str] = {}
        for spec in SPECS:
            image = rendered[(spec.role, size)]
            rgba_hashes[spec.role] = hashlib.sha256(image.tobytes()).hexdigest()
            alpha_mask = bytes(
                255 if value >= 128 else 0
                for value in image.getchannel("A").getdata()
            )
            mask_hashes[spec.role] = hashlib.sha256(alpha_mask).hexdigest()
        if len(set(rgba_hashes.values())) != len(SPECS):
            raise ValueError(f"{size}px roles contain duplicate RGBA artwork")
        if len(set(mask_hashes.values())) != len(SPECS):
            raise ValueError(f"{size}px roles contain duplicate alpha silhouettes")
        for left_index, left_spec in enumerate(SPECS):
            for right_spec in SPECS[left_index + 1 :]:
                difference = mask_difference(
                    rendered[(left_spec.role, size)],
                    rendered[(right_spec.role, size)],
                    32,
                )
                minimum_pair = min(minimum_pair, difference)
                shared_master_pair = {
                    left_spec.role,
                    right_spec.role,
                } <= {"normal", "help", "working", "link"}
                required = (
                    0.015
                    if shared_master_pair
                    else 0.045
                    if size == 32
                    else 0.06
                )
                if difference < required:
                    raise ValueError(
                        f"{size}px {left_spec.role}/{right_spec.role} masks are "
                        f"only {difference:.3f} different"
                    )
        busy_difference = mask_difference(
            rendered[("normal", size)],
            rendered[("busy", size)],
            32,
        )
        if busy_difference < 0.35:
            raise ValueError(
                f"{size}px Busy is insufficiently distinct from Normal "
                f"({busy_difference:.3f})"
            )
    return {"minimum_pairwise_mask_difference": round(minimum_pair, 4)}


def changed_pixel_count(left: Image.Image, right: Image.Image) -> int:
    return sum(
        max(abs(a - b) for a, b in zip(left_pixel, right_pixel)) >= 12
        and (left_pixel[3] >= 16 or right_pixel[3] >= 16)
        for left_pixel, right_pixel in zip(left.getdata(), right.getdata())
    )


def validate_animation(
    role: str,
    frames: list[dict[int, tuple[tuple[int, int], Image.Image, bytes]]],
    normal_by_size: dict[int, Image.Image],
) -> dict[str, object]:
    spec = SPEC_BY_ROLE[role]
    if len(frames) != ANI_FRAMES:
        raise ValueError(f"{role}: expected {ANI_FRAMES} ANI frames")
    report: dict[str, object] = {}
    for size in SIZES:
        images = [frame[size][1] for frame in frames]
        if len({hashlib.sha256(image.tobytes()).digest() for image in images}) != ANI_FRAMES:
            raise ValueError(f"{role} {size}px: ANI frames are not unique")
        expected_hotspot = spec.hotspot(size)
        if any(frame[size][0] != expected_hotspot for frame in frames):
            raise ValueError(f"{role} {size}px: ANI hotspot changes between frames")
        changes = [
            changed_pixel_count(images[index], images[(index + 1) % ANI_FRAMES])
            for index in range(ANI_FRAMES)
        ]
        minimum = (
            {32: 8, 48: 18, 64: 32, 96: 72}[size]
            if role == "working"
            else {32: 24, 48: 54, 64: 96, 96: 216}[size]
        )
        if min(changes) < minimum:
            raise ValueError(
                f"{role} {size}px: motion step changes only {min(changes)} pixels"
            )
        if role == "working":
            base = normal_by_size[size]
            base_mask = [value >= 32 for value in base.getchannel("A").getdata()]
            for index, image in enumerate(images):
                frame_mask = [value >= 32 for value in image.getchannel("A").getdata()]
                intersection = sum(a and b for a, b in zip(base_mask, frame_mask))
                union = sum(a or b for a, b in zip(base_mask, frame_mask))
                if intersection / union < 0.72:
                    raise ValueError(
                        f"working {size}px frame {index}: master-base IoU is too low"
                    )
        report[str(size)] = {
            "unique_frames": ANI_FRAMES,
            "min_changed_pixels": min(changes),
            "max_changed_pixels": max(changes),
        }
    return report


def checkerboard(size: tuple[int, int], step: int = 8) -> Image.Image:
    image = Image.new("RGB", size, (222, 226, 233))
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], step):
        for x in range(0, size[0], step):
            if (x // step + y // step) % 2:
                draw.rectangle(
                    (x, y, min(size[0] - 1, x + step - 1), min(size[1] - 1, y + step - 1)),
                    fill=(177, 184, 196),
                )
    return image


def write_normal_proof(
    packaged: dict[int, tuple[tuple[int, int], Image.Image, bytes]] | None = None,
) -> None:
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    rendered: dict[int, Image.Image] = {}
    for size in SIZES:
        if packaged is None:
            path = SOURCE_ROOT / str(size) / "normal.png"
            path.parent.mkdir(parents=True, exist_ok=True)
            rendered[size] = render_normal(size)
            rendered[size].save(path, "PNG", optimize=True)
        else:
            hotspot, image, _payload = packaged[size]
            if hotspot != NORMAL_HOTSPOTS[size]:
                raise ValueError(
                    f"normal {size}px packaged hotspot {hotspot} is unexpected"
                )
            rendered[size] = image

    width, height = 1500, 820
    proof = Image.new("RGB", (width, height), VOID[:3])
    draw = ImageDraw.Draw(proof)
    try:
        title_font = ImageFont.load_default(size=24)
        label_font = ImageFont.load_default(size=15)
        small_font = ImageFont.load_default(size=12)
    except TypeError:
        title_font = ImageFont.load_default()
        label_font = title_font
        small_font = title_font
    draw.text(
        (24, 18),
        "CROW TALON v0.5  //  EXACT CLAW-HAND RGBA MASTER  //  NORMAL NATIVE GATE",
        font=title_font,
        fill=FROST[:3],
    )
    draw.text(
        (24, 50),
        (
            "PACKAGED CUR-DECODED // " if packaged is not None else "EARLY SOURCE GATE // "
        )
        + "COOL-METAL OPTICAL LIFT; CLAW-HAND FOOTPRINT UNCHANGED",
        font=small_font,
        fill=CYAN[:3],
    )

    backgrounds = (
        ("DARK", NIGHT[:3]),
        ("LIGHT", (239, 244, 250)),
        ("MID", (92, 101, 116)),
        ("CHECK", None),
    )
    for row, (label, colour) in enumerate(backgrounds):
        y0 = 86 + row * 140
        if colour is None:
            strip = checkerboard((940, 126), 9)
        else:
            strip = Image.new("RGB", (940, 126), colour)
        proof.paste(strip, (20, y0))
        label_colour = NIGHT[:3] if label == "LIGHT" else FROST[:3]
        draw.text((28, y0 + 8), label, font=small_font, fill=label_colour)
        x = 112
        for size in SIZES:
            art = rendered[size]
            proof.paste(art, (x, y0 + 22), art)
            draw.text(
                (x, y0 + 103),
                f"{size}px  HS {NORMAL_HOTSPOTS[size]}",
                font=small_font,
                fill=label_colour,
            )
            x += size + 92

    draw.text((1000, 95), "32px EDGE DETAIL (8x)", font=label_font, fill=FROST[:3])
    draw.text((1000, 385), "48px EDGE DETAIL (6x)", font=label_font, fill=FROST[:3])
    for index, size in enumerate((32, 48)):
        scale = 8 if size == 32 else 6
        art = rendered[size].resize(
            (size * scale, size * scale),
            Image.Resampling.NEAREST,
        )
        x, y = 1000, 126 + index * 290
        backdrop = checkerboard(art.size, 16)
        backdrop.paste(art, (0, 0), art)
        proof.paste(backdrop, (x, y))
        hot_x, hot_y = NORMAL_HOTSPOTS[size]
        draw.rectangle(
            (
                x + hot_x * scale,
                y + hot_y * scale,
                x + (hot_x + 1) * scale - 1,
                y + (hot_y + 1) * scale - 1,
            ),
            outline=(103, 255, 232),
            width=2,
        )
    proof.save(NORMAL_PROOF_PATH, "PNG", optimize=True)


def proof_fonts() -> tuple[ImageFont.ImageFont, ImageFont.ImageFont, ImageFont.ImageFont]:
    try:
        return (
            ImageFont.load_default(size=24),
            ImageFont.load_default(size=14),
            ImageFont.load_default(size=11),
        )
    except TypeError:
        default = ImageFont.load_default()
        return default, default, default


def load_packaged_cursors() -> dict[str, dict[int, tuple[tuple[int, int], Image.Image, bytes]]]:
    return {
        spec.role: decode_cur(
            (WINDOWS_DIR / f"{spec.role}.cur").read_bytes(),
            label=f"{spec.role}.cur",
        )
        for spec in SPECS
    }


def write_packaged_preview(
    decoded: dict[str, dict[int, tuple[tuple[int, int], Image.Image, bytes]]],
) -> None:
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    title_font, label_font, small_font = proof_fonts()
    row_height = 120
    width = 1370
    height = 86 + row_height * len(SPECS)
    proof = Image.new("RGB", (width, height), VOID[:3])
    draw = ImageDraw.Draw(proof)
    draw.text(
        (20, 16),
        "CROW TALON v0.5 // PACKAGED CUR ENTRIES // NATIVE SIZE MATRIX",
        font=title_font,
        fill=FROST[:3],
    )
    draw.text(
        (20, 51),
        "Every image below is decoded from the shipped .cur file; no preview-only render.",
        font=small_font,
        fill=CYAN[:3],
    )
    backgrounds = (
        ("DARK", NIGHT[:3]),
        ("LIGHT", (239, 244, 250)),
        ("MID", (92, 101, 116)),
        ("CHECK", None),
    )
    for row, spec in enumerate(SPECS):
        top = 82 + row * row_height
        draw.text((18, top + 45), spec.role.upper(), font=label_font, fill=FROST[:3])
        for column, (background_label, colour) in enumerate(backgrounds):
            left = 145 + column * 302
            tile_size = (294, 108)
            tile = (
                checkerboard(tile_size, 8)
                if colour is None
                else Image.new("RGB", tile_size, colour)
            )
            tile_draw = ImageDraw.Draw(tile)
            label_colour = NIGHT[:3] if background_label == "LIGHT" else FROST[:3]
            tile_draw.text((5, 4), background_label, font=small_font, fill=label_colour)
            x_offsets = {32: 8, 48: 54, 64: 116, 96: 195}
            for size in SIZES:
                art = decoded[spec.role][size][1]
                x = x_offsets[size]
                y = 105 - size
                tile.paste(art, (x, y), art)
                tile_draw.text(
                    (x, 18),
                    str(size),
                    font=small_font,
                    fill=label_colour,
                )
            proof.paste(tile, (left, top))
    proof.save(PREVIEW_PATH, "PNG", optimize=True)


def write_packaged_edge_proof(
    decoded: dict[str, dict[int, tuple[tuple[int, int], Image.Image, bytes]]],
) -> None:
    title_font, label_font, small_font = proof_fonts()
    cell_width, cell_height = 420, 250
    columns = 3
    rows = math.ceil(len(SPECS) / columns)
    proof = Image.new(
        "RGB",
        (cell_width * columns, 74 + cell_height * rows),
        VOID[:3],
    )
    draw = ImageDraw.Draw(proof)
    draw.text(
        (20, 14),
        "CROW TALON v0.5 // PACKAGED CUR ANTIALIAS EDGE AUDIT",
        font=title_font,
        fill=FROST[:3],
    )
    draw.text(
        (20, 48),
        "Nearest-neighbour magnification exposes the shipped alpha edge exactly.",
        font=small_font,
        fill=CYAN[:3],
    )
    for index, spec in enumerate(SPECS):
        column, row = index % columns, index // columns
        left, top = column * cell_width, 74 + row * cell_height
        draw.text((left + 12, top + 8), spec.role.upper(), font=label_font, fill=FROST[:3])
        for offset_x, size, scale in ((12, 32, 5), (216, 48, 4)):
            art = decoded[spec.role][size][1].resize(
                (size * scale, size * scale),
                Image.Resampling.NEAREST,
            )
            backdrop = checkerboard(art.size, 10)
            backdrop.paste(art, (0, 0), art)
            proof.paste(backdrop, (left + offset_x, top + 38))
            draw.text(
                (left + offset_x, top + 210),
                f"{size}px x{scale} // HS {decoded[spec.role][size][0]}",
                font=small_font,
                fill=FROST[:3],
            )
    proof.save(EDGE_PROOF_PATH, "PNG", optimize=True)


def write_packaged_animation_proof() -> None:
    title_font, label_font, small_font = proof_fonts()
    width, height = 1390, 520
    proof = Image.new("RGB", (width, height), VOID[:3])
    draw = ImageDraw.Draw(proof)
    draw.text(
        (20, 14),
        "CROW TALON v0.5 // PACKAGED ANI CONTACT SHEET // 12 MEANINGFUL FRAMES",
        font=title_font,
        fill=FROST[:3],
    )
    draw.text(
        (20, 49),
        "Each frame is decoded from the shipped .ani, then shown at 48px and 2x.",
        font=small_font,
        fill=CYAN[:3],
    )
    for row, role in enumerate(("working", "busy")):
        frames = decode_ani_frames(
            (WINDOWS_DIR / f"{role}.ani").read_bytes(),
            label=f"{role}.ani",
        )
        top = 84 + row * 214
        draw.text((16, top + 72), role.upper(), font=label_font, fill=FROST[:3])
        for frame_index, frame in enumerate(frames):
            art = frame[48][1].resize((96, 96), Image.Resampling.NEAREST)
            background = (
                Image.new("RGB", art.size, NIGHT[:3])
                if frame_index % 2 == 0
                else checkerboard(art.size, 8)
            )
            background.paste(art, (0, 0), art)
            left = 105 + frame_index * 106
            proof.paste(background, (left, top))
            draw.text(
                (left + 36, top + 101),
                f"{frame_index:02}",
                font=small_font,
                fill=FROST[:3],
            )
        draw.text(
            (105, top + 130),
            "48px native source magnified 2x // alternating dark and checker backgrounds",
            font=small_font,
            fill=STEEL[:3],
        )
    proof.save(ANIMATION_PROOF_PATH, "PNG", optimize=True)


def immutable_snapshot() -> dict[str, str]:
    paths = [
        path
        for path in CURSOR_ROOT.rglob("*")
        if path.is_file() and V05_ROOT not in path.parents
    ]
    historical = (
        DOWNLOAD_DIR / "Crow-Talon-Windows-v0.3.0.zip",
        DOWNLOAD_DIR / "Crow-Talon-Windows-v0.3.0.sha256",
        DOWNLOAD_DIR / "Crow-Talon-Windows-v0.4.0.zip",
        DOWNLOAD_DIR / "Crow-Talon-Windows-v0.4.0.sha256",
        V03_BUILDER_PATH,
        V04_BUILDER_PATH,
    )
    paths.extend(path for path in historical if path.is_file())
    unique = sorted(set(paths), key=lambda path: path.as_posix().lower())
    snapshot = {str(path.resolve()): sha256(path) for path in unique}
    expected = {str(MASTER_PATH.resolve()): MASTER_HASH}
    known_history = {
        DOWNLOAD_DIR / "Crow-Talon-Windows-v0.3.0.zip": V03_ZIP_HASH,
        DOWNLOAD_DIR / "Crow-Talon-Windows-v0.3.0.sha256": V03_SIDECAR_HASH,
        DOWNLOAD_DIR / "Crow-Talon-Windows-v0.4.0.zip": V04_ZIP_HASH,
        DOWNLOAD_DIR / "Crow-Talon-Windows-v0.4.0.sha256": V04_SIDECAR_HASH,
        V04_BUILDER_PATH: V04_BUILDER_HASH,
    }
    expected.update(
        {
            str(path.resolve()): digest
            for path, digest in known_history.items()
            if path.is_file()
        }
    )
    for path, digest in expected.items():
        if snapshot.get(path) != digest:
            raise ValueError(f"Immutable source guard failed for {path}")
    return snapshot


def write_cursor_payloads() -> None:
    WINDOWS_DIR.mkdir(parents=True, exist_ok=True)
    for size in SIZES:
        (SOURCE_ROOT / str(size)).mkdir(parents=True, exist_ok=True)
    for spec in SPECS:
        for size in SIZES:
            render_role(spec.role, size, 0).save(
                SOURCE_ROOT / str(size) / f"{spec.role}.png",
                "PNG",
                optimize=True,
            )
        (WINDOWS_DIR / f"{spec.role}.cur").write_bytes(build_cur_bytes(spec))
        if spec.animated:
            (WINDOWS_DIR / f"{spec.role}.ani").write_bytes(build_ani_bytes(spec))


def validate_local_payloads() -> dict[str, object]:
    decoded = load_packaged_cursors()
    rendered: dict[tuple[str, int], Image.Image] = {}
    source_report: dict[str, object] = {}
    for spec in SPECS:
        role_report: dict[str, object] = {}
        for size in SIZES:
            hotspot, embedded, _payload = decoded[spec.role][size]
            source_path = SOURCE_ROOT / str(size) / f"{spec.role}.png"
            with Image.open(source_path) as opened:
                source = opened.convert("RGBA")
            if embedded.tobytes() != source.tobytes():
                raise ValueError(
                    f"{spec.role} {size}px: CUR entry differs from native source"
                )
            if hotspot != spec.hotspot(size):
                raise ValueError(
                    f"{spec.role} {size}px: CUR hotspot {hotspot} != "
                    f"{spec.hotspot(size)}"
                )
            role_report[str(size)] = validate_source(spec, size, source)
            rendered[(spec.role, size)] = source
        source_report[spec.role] = role_report
        v03.load_cursor_from_file(WINDOWS_DIR / f"{spec.role}.cur")

    anatomy = {
        str(size): validate_normal_anatomy(
            size,
            rendered[("normal", size)],
        )
        for size in SIZES
    }
    uniqueness = validate_role_uniqueness(rendered)
    animation: dict[str, object] = {}
    normal_by_size = {size: rendered[("normal", size)] for size in SIZES}
    for role in ("working", "busy"):
        ani_path = WINDOWS_DIR / f"{role}.ani"
        frames = decode_ani_frames(ani_path.read_bytes(), label=ani_path.name)
        animation[role] = validate_animation(role, frames, normal_by_size)
        v03.load_cursor_from_file(ani_path)
    return {
        "source_validation": source_report,
        "normal_anatomy": anatomy,
        "role_uniqueness": uniqueness,
        "animation": animation,
        "windows_load": "all 15 CUR and 2 ANI accepted",
    }


def write_text_outputs(report: dict[str, object]) -> None:
    def template_text(name: str) -> str:
        packaged = TEMPLATE_ROOT / name
        repository = CURSOR_ROOT / name
        source = packaged if packaged.is_file() else repository
        return source.read_text(encoding="utf-8")

    install = template_text("install.ps1")
    install = (
        install.replace("Crow Talon v0.3", "Crow Talon v0.5")
        .replace("$schemeName = 'Crow Talon'", "$schemeName = 'Crow Talon v0.5'")
        .replace("$packageVersion = '0.3.0'", "$packageVersion = '0.5.0'")
        .replace(
            "'Crow\\Cursors\\Crow-Talon'",
            "'Crow\\Cursors\\Crow-Talon-v0.5'",
        )
    )
    INSTALL_PATH.write_text(install, encoding="utf-8", newline="\n")

    uninstall = template_text("uninstall.ps1")
    uninstall = (
        uninstall.replace("Crow Talon v0.3", "Crow Talon v0.5")
        .replace("$schemeName = 'Crow Talon'", "$schemeName = 'Crow Talon v0.5'")
        .replace(
            "'Crow\\Cursors\\Crow-Talon'",
            "'Crow\\Cursors\\Crow-Talon-v0.5'",
        )
        .replace(
            "'Crow Talon has been removed",
            "'Crow Talon v0.5 has been removed",
        )
    )
    UNINSTALL_PATH.write_text(uninstall, encoding="utf-8", newline="\n")

    inf = template_text("Crow-Talon.inf")
    inf = (
        inf.replace("Crow Talon v0.3", "Crow Talon v0.5")
        .replace("Cursors\\Crow-Talon", "Cursors\\Crow-Talon-v0.5")
        .replace('"Crow Talon"', '"Crow Talon v0.5"')
    )
    for spec in SPECS:
        inf = inf.replace(
            f"{spec.role}.cur=1",
            f"{spec.role}.cur=1,windows",
        )
    for role in ("working", "busy"):
        inf = inf.replace(
            f"{role}.ani=1",
            f"{role}.ani=1,windows",
        )
    INF_PATH.write_text(inf, encoding="utf-8", newline="\n")
    LICENSE_PATH.write_bytes((REPO_ROOT / "LICENSE.md").read_bytes())

    readme = f"""# Crow Talon v{PACKAGE_VERSION}

Crow Talon v0.5 is the smooth, high-detail Windows cursor family for the Crow
Theme. Normal is built from the approved cybernetic claw-hand RGBA master:
three long articulated talons, one opposed hooked thumb, mechanical palm, and
diagonal wrist. Help, Working, and Link retain that exact hand silhouette with
role-specific signals. The remaining roles share the same black/gunmetal,
cyan, blue, and restrained violet language. There is no orange or warm pink.

## Included

- 15 static `.cur` roles, each containing native 32, 48, 64, and 96px PNG entries
- 12-frame `working.ani` and `busy.ani`; Busy uses a distinct talon-orb
- Explicit per-size hotspots embedded in every CUR and ANI frame
- Native-size, antialias-edge, and animation proofs decoded from packaged files
- Per-user PowerShell installer/uninstaller and classic Windows INF
- Reproducible builder and SHA-256 package ledger

## Install for the current Windows user

1. Extract the **entire** `{PACKAGE_STEM}.zip` archive.
2. Open PowerShell in the extracted `{PACKAGE_STEM}` folder.
3. Run `./install.ps1` to register **Crow Talon v0.5**.
4. Select it under **Mouse Properties > Pointers**.

To register and activate it in one step, run `./install.ps1 -Activate`.
To remove only v0.5, run `./uninstall.ps1`.

v0.5 installs beside v0.3/v0.4 under
`%LOCALAPPDATA%\\Crow\\Cursors\\Crow-Talon-v0.5`; it does not overwrite them.

## Provenance and validation

Approved master SHA-256: `{MASTER_HASH}`

The build validates RGBA/soft alpha, transparent RGB, cool gamut, hotspots,
footprints, claw-hand anatomy, role uniqueness, 12-frame motion, decoded
CUR/ANI structure, Windows loading, archive hashes, and deterministic ZIP bytes.
"""
    README_PATH.write_text(readme, encoding="utf-8", newline="\n")

    manifest_files = {
        f"{root_name}/{path.relative_to(root).as_posix()}": sha256(path)
        for root_name, root in (("src", SOURCE_ROOT), ("windows", WINDOWS_DIR))
        for path in sorted(root.rglob("*"))
        if path.is_file()
    }
    manifest_files.update(
        {
            "preview.png": sha256(PREVIEW_PATH),
            "previews/normal-native-proof.png": sha256(NORMAL_PROOF_PATH),
            "previews/antialias-edge-proof.png": sha256(EDGE_PROOF_PATH),
            "previews/animation-frames.png": sha256(ANIMATION_PROOF_PATH),
        }
    )
    manifest = {
        "name": "Crow Talon",
        "scheme": "Crow Talon v0.5",
        "version": PACKAGE_VERSION,
        "palette": ["black", "gunmetal", "cyan", "blue", "violet"],
        "master": {
            "repository_file": MASTER_PATH.relative_to(REPO_ROOT).as_posix(),
            "package_file": "cursors/masters/crow-claw-hand-master-v0.5.png",
            "sha256": MASTER_HASH,
        },
        "sizes": list(SIZES),
        "roles": [
            {
                "role": spec.role,
                "registry_name": spec.registry_name,
                "animated": spec.animated,
                "hotspots": {
                    str(size): list(spec.hotspot(size)) for size in SIZES
                },
            }
            for spec in SPECS
        ],
        "files": manifest_files,
        "validation": report,
        "immutable_v03_zip_sha256": V03_ZIP_HASH,
        "immutable_v04_zip_sha256": V04_ZIP_HASH,
    }
    MANIFEST_PATH.write_text(
        json.dumps(manifest, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def package_members() -> dict[str, Path]:
    def template_source(name: str) -> Path:
        packaged = TEMPLATE_ROOT / name
        return packaged if packaged.is_file() else CURSOR_ROOT / name

    members: dict[str, Path] = {
        "Crow-Talon.inf": INF_PATH,
        "install.ps1": INSTALL_PATH,
        "LICENSE.md": LICENSE_PATH,
        "manifest.json": MANIFEST_PATH,
        "README.md": README_PATH,
        "uninstall.ps1": UNINSTALL_PATH,
        "preview.png": PREVIEW_PATH,
        "previews/normal-native-proof.png": NORMAL_PROOF_PATH,
        "previews/antialias-edge-proof.png": EDGE_PROOF_PATH,
        "previews/animation-frames.png": ANIMATION_PROOF_PATH,
        "cursors/masters/crow-claw-hand-master-v0.5.png": MASTER_PATH,
        "scripts/build_cursors.py": BUILDER_PATH,
        "scripts/build_cursors_legacy.py": V03_BUILDER_PATH,
        "templates/install.ps1": template_source("install.ps1"),
        "templates/uninstall.ps1": template_source("uninstall.ps1"),
        "templates/Crow-Talon.inf": template_source("Crow-Talon.inf"),
        "requirements.txt": REPO_ROOT / "requirements.txt",
    }
    for root_name, root in (("src", SOURCE_ROOT), ("windows", WINDOWS_DIR)):
        for path in sorted(root.rglob("*")):
            if path.is_file():
                members[
                    f"{root_name}/{path.relative_to(root).as_posix()}"
                ] = path
    return members


def deterministic_zip_bytes(members: dict[str, Path]) -> bytes:
    buffer = io.BytesIO()
    prefix = f"{PACKAGE_STEM}/"
    with zipfile.ZipFile(
        buffer,
        "w",
        compression=zipfile.ZIP_DEFLATED,
        compresslevel=9,
    ) as archive:
        for relative, path in sorted(members.items()):
            info = zipfile.ZipInfo(prefix + relative, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, path.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    return buffer.getvalue()


def write_distribution_package() -> dict[str, object]:
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    members = package_members()
    ledger = "\n".join(
        f"{sha256(path)}  {relative}"
        for relative, path in sorted(members.items())
    ) + "\n"
    PACKAGE_CONTENT_HASHES_PATH.write_text(
        ledger,
        encoding="ascii",
        newline="\n",
    )
    members["package-files.sha256"] = PACKAGE_CONTENT_HASHES_PATH
    first = deterministic_zip_bytes(members)
    second = deterministic_zip_bytes(members)
    if first != second:
        raise ValueError("Deterministic ZIP double-build comparison failed")
    PACKAGE_PATH.write_bytes(first)
    package_digest = sha256(PACKAGE_PATH)
    PACKAGE_HASH_PATH.write_text(
        f"{package_digest}  {PACKAGE_PATH.name}\n",
        encoding="ascii",
        newline="\n",
    )
    return {
        "sha256": package_digest,
        "bytes": len(first),
        "members": len(members),
        "deterministic": True,
    }


def validate_archive(expected: dict[str, Path]) -> dict[str, object]:
    prefix = f"{PACKAGE_STEM}/"
    with zipfile.ZipFile(PACKAGE_PATH) as archive:
        names = archive.namelist()
        if len(names) != len(set(name.lower() for name in names)):
            raise ValueError("Archive contains duplicate or case-colliding names")
        if any(
            not name.startswith(prefix)
            or ".." in Path(name).parts
            or name.startswith(("/", "\\"))
            for name in names
        ):
            raise ValueError("Archive contains an unsafe member path")
        expected_names = {prefix + relative for relative in expected}
        if set(names) != expected_names:
            missing = sorted(expected_names - set(names))
            extra = sorted(set(names) - expected_names)
            raise ValueError(f"Archive member mismatch; missing={missing}, extra={extra}")
        ledger_text = archive.read(prefix + "package-files.sha256").decode("ascii")
        ledger_entries = {}
        for line in ledger_text.splitlines():
            digest, relative = line.split("  ", 1)
            ledger_entries[relative] = digest
        expected_ledger = {
            name.removeprefix(prefix)
            for name in names
            if name != prefix + "package-files.sha256"
        }
        if set(ledger_entries) != expected_ledger:
            missing = sorted(expected_ledger - set(ledger_entries))
            extra = sorted(set(ledger_entries) - expected_ledger)
            raise ValueError(
                f"Archive ledger coverage mismatch; missing={missing}, extra={extra}"
            )
        for relative, digest in ledger_entries.items():
            payload = archive.read(prefix + relative)
            actual = hashlib.sha256(payload).hexdigest().upper()
            if actual != digest:
                raise ValueError(f"Archive ledger mismatch for {relative}")
        for relative, source_path in expected.items():
            payload = archive.read(prefix + relative)
            if hashlib.sha256(payload).hexdigest().upper() != sha256(source_path):
                raise ValueError(f"Archive/source mismatch for {relative}")

        with tempfile.TemporaryDirectory(prefix="crow-talon-v05-") as temporary:
            target = Path(temporary)
            for name in names:
                relative = name.removeprefix(prefix)
                if relative.startswith("windows/"):
                    destination = target / relative
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    destination.write_bytes(archive.read(name))
            for spec in SPECS:
                v03.load_cursor_from_file(target / "windows" / f"{spec.role}.cur")
            for role in ("working", "busy"):
                v03.load_cursor_from_file(target / "windows" / f"{role}.ani")
    return {
        "safe_names": True,
        "ledger_verified": True,
        "windows_load_after_extract": True,
    }


def build() -> None:
    before = immutable_snapshot()
    write_cursor_payloads()
    decoded = load_packaged_cursors()
    write_normal_proof(decoded["normal"])
    report = validate_local_payloads()
    write_packaged_preview(decoded)
    write_packaged_edge_proof(decoded)
    write_packaged_animation_proof()
    write_text_outputs(report)
    package_report = write_distribution_package()
    expected = package_members()
    expected["package-files.sha256"] = PACKAGE_CONTENT_HASHES_PATH
    archive_report = validate_archive(expected)
    after = immutable_snapshot()
    if before != after:
        changed = sorted(
            path
            for path in set(before) | set(after)
            if before.get(path) != after.get(path)
        )
        raise ValueError(f"Immutable v0.3/v0.4 guard changed: {changed}")
    print(
        json.dumps(
            {
                "package": str(PACKAGE_PATH),
                "package_report": package_report,
                "archive_report": archive_report,
                "v03_preserved": V03_ZIP_HASH,
                "v04_preserved": V04_ZIP_HASH,
            },
            indent=2,
        )
    )


def main_normal_proof() -> None:
    write_normal_proof()
    print(f"Wrote {NORMAL_PROOF_PATH}")


if __name__ == "__main__":
    if "--normal-proof" in sys.argv:
        main_normal_proof()
    else:
        build()
