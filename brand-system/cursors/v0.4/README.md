# Crow Talon v0.4.0

Crow Talon v0.4 is the smooth, high-detail Windows cursor family for the Crow
Theme. Normal is built from the approved four-talon RGBA master; Help, Working,
and Link retain that same master silhouette with role-specific mechanical
signals. The remaining roles share the same black/gunmetal, cyan, blue, and
restrained violet material system. There is no orange or warm pink.

## Included

- 15 static `.cur` roles, each containing native 32, 48, 64, and 96px PNG entries
- 12-frame `working.ani` and `busy.ani`; Busy uses a distinct talon-orb
- Explicit per-size hotspots embedded in every CUR and ANI frame
- Native-size, antialias-edge, and animation proofs decoded from packaged files
- Per-user PowerShell installer/uninstaller and classic Windows INF
- Reproducible builder and SHA-256 package ledger

## Install for the current Windows user

1. Extract the **entire** `Crow-Talon-Windows-v0.4.0.zip` archive.
2. Open PowerShell in the extracted `Crow-Talon-Windows-v0.4.0` folder.
3. Run `./install.ps1` to register **Crow Talon v0.4**.
4. Select it under **Mouse Properties > Pointers**.

To register and activate it in one step, run `./install.ps1 -Activate`.
To remove only v0.4, run `./uninstall.ps1`.

v0.4 installs beside v0.3 under
`%LOCALAPPDATA%\Crow\Cursors\Crow-Talon-v0.4`; it does not overwrite v0.3.

## Provenance and validation

Approved master SHA-256: `4B11093BC111889D1D4C719ADDFD8849669A70A7983E1EDEAE32BA21185458AC`

Chroma reference SHA-256: `682B2C3F7EC9625F1812E0DF4A086EC4DE629663B0DEA5B5C733479301316B66`

The build validates RGBA/soft alpha, transparent RGB, cool gamut, hotspots,
footprints, four-talon anatomy, role uniqueness, 12-frame motion, decoded
CUR/ANI structure, Windows loading, archive hashes, and deterministic ZIP bytes.
