"""Validate the Crow Brand System release package."""

from __future__ import annotations

import ctypes
import colorsys
import hashlib
import json
import struct
import sys
from pathlib import Path

from fontTools.ttLib import TTFont
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SIZES = {32, 48, 64, 96}
RELEASE_VERSION = "0.2.0"
CANONICAL_MASCOT = "assets/mascots/masters/crow-mascot-v3.png"
LEGACY_MASTERS = {
    "crowHeadIdentityV2": "assets/mascots/masters/crow-head-identity-v2.png",
    "coreArchitectV2": "assets/mascots/masters/core-architect-v2.png",
    "fieldOperatorV2": "assets/mascots/masters/field-operator-v2.png",
    "glitchAscendantV2": "assets/mascots/masters/glitch-ascendant-v2.png",
    "petCompanionV2": "assets/mascots/masters/pet-companion-v2.png",
    "coreArchitectV1": "assets/mascots/masters/core-architect.png",
    "fieldOperatorV1": "assets/mascots/masters/field-operator.png",
    "glitchAscendantV1": "assets/mascots/masters/glitch-ascendant.png",
    "petCompanionV1": "assets/mascots/masters/pet-companion.png",
}


def check(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def validate_required() -> None:
    required = [
        CANONICAL_MASCOT,
        *LEGACY_MASTERS.values(),
        "assets/marks/crow-signal-master.png",
        "assets/icons/favicon.ico",
        "assets/backgrounds/void-grid-neutral.png",
        "assets/social/crow-family-banner.png",
        "fonts/specimens/crow-signal-v0.2.png",
        "cursors/preview.png",
        "tokens/crow-theme.json",
        "brand-manifest.json",
        "checksums.sha256",
    ]
    for relative in required:
        check((ROOT / relative).is_file(), f"Missing required file: {relative}")


def validate_tokens() -> None:
    tokens = json.loads((ROOT / "tokens/crow-theme.json").read_text(encoding="utf-8"))
    check(tokens["version"] == RELEASE_VERSION, "Unexpected token version")
    check(tokens["typography"]["release"] == "Crow Signal v0.2", "Unexpected font release")
    check(tokens["cursor"]["release"] == "Crow Talon v0.2", "Unexpected cursor release")
    check(tokens["mascot"]["invariants"]["eyes"] == 3, "Three-eye rule missing")
    check(len(tokens["mascot"]["forms"]) == 1, "Expected one active mascot")
    check(len(tokens["products"]) == 6, "Expected six product bindings")
    check(
        tokens["mascot"]["identityAnchor"] == CANONICAL_MASCOT,
        "Canonical mascot identity anchor mismatch",
    )

    current_masters = {
        name: record["master"] for name, record in tokens["mascot"]["forms"].items()
    }
    check(
        current_masters == {"canonicalCrow": CANONICAL_MASCOT},
        "Current mascot master set mismatch",
    )

    legacy = tokens["mascot"]["legacyMasters"]
    legacy_masters = {name: legacy[name] for name in LEGACY_MASTERS}
    check(legacy_masters == LEGACY_MASTERS, "Immutable v1 master set mismatch")
    check("physically intact" in legacy["preservation"], "Legacy preservation rule missing")

    canonical = tokens["mascot"]["forms"]["canonicalCrow"]
    check(canonical["id"] == "crow-mascot-v3", "Canonical mascot ID mismatch")
    check(canonical["bodyPlan"] == "adult crow", "Canonical mascot body plan mismatch")
    for product, binding in tokens["products"].items():
        check(
            binding["mascot"] == "crow-mascot-v3"
            and binding["compactMascot"] == "crow-mascot-v3",
            f"{product} must bind both mascot roles to crow-mascot-v3",
        )

    for name, value in tokens["color"]["primitive"].items():
        if not isinstance(value, str) or not value.startswith("#") or len(value) != 7:
            continue
        red, green, blue = (int(value[index : index + 2], 16) / 255 for index in (1, 3, 5))
        hue, saturation, brightness = colorsys.rgb_to_hsv(red, green, blue)
        degrees = hue * 360
        check(
            not (20 <= degrees <= 65 and saturation > 0.25 and brightness > 0.20),
            f"Warm brand token detected: {name}={value}",
        )


def validate_fonts() -> None:
    printable = set(range(0x20, 0x7F))
    font_paths = sorted((ROOT / "fonts/ttf").glob("*.ttf")) + sorted(
        (ROOT / "fonts/woff2").glob("*.woff2")
    )
    check(len(font_paths) == 8, "Expected four TTF and four WOFF2 fonts")
    for path in font_paths:
        font = TTFont(path)
        cmap = set(font.getBestCmap())
        check(printable <= cmap, f"Basic Latin coverage missing in {path.name}")
        check(font["head"].unitsPerEm == 1000, f"Unexpected UPM in {path.name}")
        font.close()


def cursor_entries(path: Path) -> list[tuple[int, int, int]]:
    data = path.read_bytes()
    reserved, kind, count = struct.unpack_from("<HHH", data, 0)
    check((reserved, kind) == (0, 2), f"Invalid CUR header: {path.name}")
    entries = []
    offset = 6
    for _ in range(count):
        width, height, _, _, hotspot_x, hotspot_y, _, _ = struct.unpack_from(
            "<BBBBHHII", data, offset
        )
        width = width or 256
        height = height or 256
        check(0 <= hotspot_x < width, f"Bad X hotspot in {path.name}")
        check(0 <= hotspot_y < height, f"Bad Y hotspot in {path.name}")
        entries.append((width, hotspot_x, hotspot_y))
        offset += 16
    return entries


def validate_cursors() -> None:
    cursor_dir = ROOT / "cursors/windows"
    cur_paths = sorted(cursor_dir.glob("*.cur"))
    ani_paths = sorted(cursor_dir.glob("*.ani"))
    check(len(cur_paths) == 15, "Expected 15 static CUR roles")
    check(len(ani_paths) == 2, "Expected Working and Busy ANI files")
    for path in cur_paths:
        entries = cursor_entries(path)
        check({entry[0] for entry in entries} == SIZES, f"Wrong CUR sizes: {path.name}")

    for path in ani_paths:
        data = path.read_bytes()
        check(data[:4] == b"RIFF" and data[8:12] == b"ACON", f"Invalid ANI: {path.name}")
        check(b"anih" in data and b"fram" in data and b"icon" in data, f"Incomplete ANI: {path.name}")

    if sys.platform == "win32":
        user32 = ctypes.windll.user32
        user32.LoadCursorFromFileW.argtypes = [ctypes.c_wchar_p]
        user32.LoadCursorFromFileW.restype = ctypes.c_void_p
        user32.DestroyCursor.argtypes = [ctypes.c_void_p]
        for path in cur_paths + ani_paths:
            handle = user32.LoadCursorFromFileW(str(path))
            check(bool(handle), f"Windows could not load {path.name}")
            user32.DestroyCursor(handle)


def warm_pixel_ratio(path: Path) -> float:
    with Image.open(path) as source:
        image = source.convert("RGB")
        image.thumbnail((512, 512), Image.Resampling.LANCZOS)
        hsv = image.convert("HSV")
        warm = 0
        total = image.width * image.height
        for hue, saturation, value in hsv.get_flattened_data():
            # Approximately 20-65 degrees, excluding dim and nearly neutral pixels.
            if 14 <= hue <= 46 and saturation > 64 and value > 51:
                warm += 1
        return warm / max(total, 1)


def validate_artwork() -> None:
    required_dimensions = {
        "assets/icons/png/crow-signal-16.png": (16, 16),
        "assets/icons/png/crow-signal-1024.png": (1024, 1024),
        "assets/icons/avatars/crow-signal-avatar-512.png": (512, 512),
        "assets/icons/avatars/crow-mascot-avatar-512.png": (512, 512),
        "assets/social/exports/crow-family-open-graph-1200x630.png": (1200, 630),
        "assets/backgrounds/exports/void-grid-1920x1080.png": (1920, 1080),
    }
    for relative, expected in required_dimensions.items():
        with Image.open(ROOT / relative) as image:
            check(image.size == expected, f"Wrong dimensions: {relative}")

    scan_roots = [
        ROOT / "assets/marks",
        ROOT / "assets/backgrounds",
        ROOT / "assets/product-variants",
        ROOT / "assets/social",
        ROOT / "assets/icons",
    ]
    scanned = 0
    for scan_root in scan_roots:
        for path in scan_root.rglob("*.png"):
            ratio = warm_pixel_ratio(path)
            check(ratio <= 0.0025, f"Warm-colour threshold exceeded in {path}: {ratio:.3%}")
            scanned += 1
    check(scanned >= 20, "Artwork scan did not cover expected outputs")


def validate_manifest() -> None:
    manifest = json.loads((ROOT / "brand-manifest.json").read_text(encoding="utf-8"))
    check(manifest["version"] == RELEASE_VERSION, "Unexpected manifest version")
    check(
        manifest["approved_mascots"] == ["crow-mascot-v3"],
        "Manifest active mascot mismatch",
    )
    check(manifest["canonical_mascot"] == CANONICAL_MASCOT, "Manifest anchor mismatch")
    manifest_files = {record["file"] for record in manifest["files"]}
    required_masters = {CANONICAL_MASCOT, *LEGACY_MASTERS.values()}
    check(
        required_masters <= manifest_files,
        "Manifest must include the canonical mascot and all preserved legacy masters",
    )
    for record in manifest["files"]:
        path = ROOT / record["file"]
        check(path.is_file(), f"Manifest file missing: {record['file']}")
        check(path.stat().st_size == record["bytes"], f"Manifest size mismatch: {record['file']}")
        check(sha256(path) == record["sha256"], f"Manifest checksum mismatch: {record['file']}")


def main() -> None:
    validate_required()
    validate_tokens()
    validate_fonts()
    validate_cursors()
    validate_artwork()
    validate_manifest()
    print("Crow Brand System validation passed.")
    print("  crow-mascot-v3 is the sole active mascot for all 6 products")
    print(f"  {len(LEGACY_MASTERS)} prior mascot files preserved as legacy records")
    print("  8 font binaries")
    print("  15 static and 2 animated Windows cursors")
    print("  6 product bindings")
    print("  manifests, dimensions, colour guard, and checksums")


if __name__ == "__main__":
    main()
