# Crow Signal v0.2

Crow Signal is the original type system for the Crow visual identity. Version
0.2 rebuilds both families as true hard-edged pixel type:

- **Crow Signal Display** for product names, headings, labels, and artwork.
- **Crow Signal Mono** for logs, model names, source code, and telemetry.

Regular and Bold are included for both families. Every filled bitmap cell is a
square and adjacent cells share their edges, producing continuous strokes
instead of a spaced or dotted matrix. Small terminal talon cuts appear only on
selected exposed corners where they cannot interrupt a stroke. `I`, `l`, and
`1`, as well as `O` and slashed `0`, have deliberately different structures.

The generator consumes no external font, bitmap alphabet, or outline. Every
glyph is built from the original hand-authored Crow Signal patterns and pixel
geometry in `scripts/build_fonts.py`.

## Install for the current Windows user

1. Extract the complete `Crow-Signal-Windows-v0.2.0.zip` archive.
2. Open PowerShell in the extracted `Crow-Signal-Windows-v0.2.0` folder.
3. Run `./install.ps1`.

Run `./uninstall.ps1` from the extracted folder to remove all four faces.
The installer is per-user and requires the sibling `ttf` payload, so do not
download or run the script by itself.

## Build

From the repository root on Windows:

```powershell
.\.venv\Scripts\python.exe .\scripts\build_fonts.py
```

The build requires the repository virtual environment with FontTools, Brotli,
and Pillow. It writes:

- Desktop fonts to `fonts/ttf/`
- Web fonts to `fonts/woff2/`
- A visual proof to `fonts/specimens/`
- Checksums and coverage information to `fonts/manifest.json`
- The validated Windows package to
  `downloads/Crow-Signal-Windows-v0.2.0.zip`

## Coverage

Version 0.2 covers all printable Basic Latin characters (`U+0020–U+007E`),
non-breaking space, typographic quotes and dashes, common legal marks, six
direction arrows, return arrows, a double arrow, comparison operators, and
selected geometric symbols.

All fonts use 1000 units per em and a 100-unit square pixel grid. Crow Signal
Mono has a fixed 820-unit advance.

## Integrity

- `manifest.json` records coverage, construction, file sizes, and SHA-256.
- `package-files.sha256` records every archive payload file.
- `Crow-Signal-Windows-v0.2.0.sha256` beside the ZIP validates the archive.
- The build rejects missing ASCII, curved points, non-monospace Mono output,
  visually duplicated `I/l/1/O/0`, corrupt ZIP members, or unloadable packaged
  font binaries.

## Web use

Load `fonts/crow-signal.css`, then use:

```css
.title {
  font-family: "Crow Signal Display", sans-serif;
  font-weight: 700;
}

.telemetry {
  font-family: "Crow Signal Mono", monospace;
  font-weight: 400;
}
```

## Licence status

These v0.2 files are an internal brand-system preview. External redistribution
terms have not yet been selected. Publishing this package requires Crow's
explicit approval.
