# Crow Bitfeather v0.3.0

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
.\.venv\Scripts\python.exe .\scripts\build_bitfeather_fonts.py
```
