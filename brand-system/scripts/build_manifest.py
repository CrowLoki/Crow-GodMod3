"""Create the root asset manifest and checksum ledger."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
EXCLUDED_PARTS = {".git", ".venv", "__pycache__"}
EXCLUDED_FILES = {"brand-manifest.json", "checksums.sha256"}
IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".avif", ".ico"}
CANONICAL_MASCOT = "assets/mascots/masters/crow-mascot-v3.png"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def classify(path: Path) -> str:
    relative = path.relative_to(ROOT).as_posix()
    if relative == CANONICAL_MASCOT:
        return "approved-mascot-master"
    if relative.startswith("assets/mascots/masters/"):
        return "legacy-mascot-master"
    if relative.startswith("assets/mascots/runtime/"):
        return "runtime-mascot"
    if relative.startswith("assets/mascots/references/"):
        return "identity-reference"
    if relative.startswith("assets/marks/"):
        return "brand-mark"
    if relative.startswith("assets/product-variants/"):
        return "product-artwork"
    if relative.startswith("assets/icons/"):
        return "icon"
    if relative.startswith("assets/backgrounds/"):
        return "background"
    if relative.startswith("assets/social/"):
        return "social"
    if (
        relative.startswith("fonts/ttf/")
        or relative.startswith("fonts/woff2/")
        or relative.startswith("fonts/bitfeather/ttf/")
        or relative.startswith("fonts/bitfeather/woff2/")
    ):
        return "font"
    if relative.startswith("cursors/windows/") or (
        relative.startswith("cursors/v") and "/windows/" in relative
    ):
        return "windows-cursor"
    if relative.startswith("downloads/"):
        return "distribution"
    if relative.startswith("tokens/"):
        return "design-token"
    if relative.startswith("scripts/"):
        return "build-source"
    if relative.startswith("docs/") or relative.startswith("prompts/"):
        return "documentation"
    return "project"


def image_metadata(path: Path) -> dict[str, object]:
    if path.suffix.lower() not in IMAGE_SUFFIXES:
        return {}
    try:
        with Image.open(path) as image:
            return {
                "width": image.width,
                "height": image.height,
                "mode": image.mode,
                "format": image.format,
            }
    except Exception:
        return {}


def main() -> None:
    files = []
    checksum_lines = []
    for path in sorted(ROOT.rglob("*")):
        if not path.is_file():
            continue
        relative = path.relative_to(ROOT)
        if any(part in EXCLUDED_PARTS for part in relative.parts):
            continue
        if path.name in EXCLUDED_FILES:
            continue

        digest = sha256(path)
        record = {
            "file": relative.as_posix(),
            "kind": classify(path),
            "bytes": path.stat().st_size,
            "sha256": digest,
        }
        record.update(image_metadata(path))
        files.append(record)
        checksum_lines.append(f"{digest}  {relative.as_posix()}")

    manifest = {
        "id": "crow-brand-system",
        "name": "Crow Brand System",
        "version": (ROOT / "VERSION").read_text(encoding="utf-8").strip(),
        "status": "internal-preview",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "approved_mascots": ["crow-mascot-v3"],
        "canonical_mascot": CANONICAL_MASCOT,
        "legacy_mascot_policy": (
            "Earlier mascot files remain physically intact for provenance and "
            "reference, but are not active product identities."
        ),
        "original_asset_families": ["Crow Bitfeather", "Crow Talon"],
        "products": [
            "CrowClaw",
            "Crow-GodMod3",
            "CrowQuant",
            "CrowNest",
            "CrowMemory",
            "CrowFlix",
        ],
        "files": files,
    }
    (ROOT / "brand-manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    (ROOT / "checksums.sha256").write_text(
        "\n".join(checksum_lines) + "\n",
        encoding="utf-8",
    )
    print(f"Manifested {len(files)} files.")


if __name__ == "__main__":
    main()
