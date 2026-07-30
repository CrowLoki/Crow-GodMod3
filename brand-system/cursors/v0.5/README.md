# Crow Talon v0.5.0

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

1. Extract the **entire** `Crow-Talon-Windows-v0.5.0.zip` archive.
2. Open PowerShell in the extracted `Crow-Talon-Windows-v0.5.0` folder.
3. Run `./install.ps1` to register **Crow Talon v0.5**.
4. Select it under **Mouse Properties > Pointers**.

To register and activate it in one step, run `./install.ps1 -Activate`.
To remove only v0.5, run `./uninstall.ps1`.

v0.5 installs beside v0.3/v0.4 under
`%LOCALAPPDATA%\Crow\Cursors\Crow-Talon-v0.5`; it does not overwrite them.

## Provenance and validation

Approved master SHA-256: `78547F5935C54630C89F0BF0A03BF72C19DDC9E62CB093AE49493D4C91E183C4`

The build validates RGBA/soft alpha, transparent RGB, cool gamut, hotspots,
footprints, claw-hand anatomy, role uniqueness, 12-frame motion, decoded
CUR/ANI structure, Windows loading, archive hashes, and deterministic ZIP bytes.
