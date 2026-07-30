# Crow Talon v0.3.0

Crow Talon is the original pixel-art Windows pointer family for the Crow Theme.
It uses black and gunmetal anisodactyl crow-foot silhouettes, cyan edge light,
and restrained ultraviolet joint signals. The normal pointer has exactly three
forward hooked toes plus one opposed rear hallux. The 32- and 48-pixel sources
are rendered natively; 64- and 96-pixel resources are direct larger renders.

## Install for the current Windows user

1. Extract the **entire** `Crow-Talon-Windows-v0.3.0.zip` archive.
2. Open PowerShell in the extracted `Crow-Talon-Windows-v0.3.0` folder.
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
- `Crow-Talon-Windows-v0.3.0.sha256` beside the ZIP validates the archive itself.
- `scripts/build_cursors.py` is the deterministic procedural source.

The approved biomechanical three-eyed Crow was used as the visual identity
reference only; no third-party cursor, system pointer, font glyph, or reference
raster is embedded in the cursor artwork. The visible artwork is calibrated
against the footprint of the standard Windows pointer.
