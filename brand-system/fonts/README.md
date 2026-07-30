# Crow Signal v0.1

Crow Signal is the original type system for the Crow visual identity. Version
0.1 contains two deliberately modular families:

- **Crow Signal Display** for product names, headings, labels, and artwork.
- **Crow Signal Mono** for logs, model names, source code, and telemetry.

Regular and Bold are included for both families. The design uses an asymmetric
feather-plate construction, clipped beak-like corners, and compact cybernetic
proportions. `I`, `l`, and `1`, as well as `O` and slashed `0`, have deliberately
different structures.

The generator consumes no external font file or outline. Every glyph is built
from the hand-authored patterns and original plate geometry in
`scripts/build_fonts.py`.

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

## Coverage

Version 0.1 covers all printable Basic Latin characters (`U+0020–U+007E`),
non-breaking space, typographic quotes and dashes, common legal marks, six
direction arrows, return arrows, a double arrow, comparison operators, and
selected geometric symbols.

All fonts use 1000 units per em. Crow Signal Mono has a fixed 720-unit advance.

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

These v0.1 files are an internal brand-system preview. External redistribution
terms have not yet been selected. Publishing this package requires Crow's
explicit approval.
