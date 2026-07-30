# Crow Brand System rules

This repository is the canonical, cross-project visual system for Crow products.

## Approved mascot identities

1. `Core Architect` is the primary mascot.
2. `Field Operator` is the grounded builder/hacker form.
3. `Glitch Ascendant` is the transformed Elyria/corruption form.
4. `Pet Companion` is the small non-humanoid crow companion.

The approved master files live under `assets/mascots/masters/`. Do not overwrite
them. New revisions must use a versioned sibling filename until Crow explicitly
approves replacing a master.

## Non-negotiable visual rules

- Every mascot has exactly three eyes: two physical eyes and one forehead eye.
- The head must read as a real elongated crow head with a tapered beak.
- Never turn the head into a moon, orb, owl, plague mask, or human face.
- Core palette: black, gunmetal, navy, indigo, ultraviolet, electric blue, cyan.
- Magenta is a restrained iris/pulse accent.
- Orange, amber, yellow, and gold must never dominate the Crow Theme.
- Do not bake generated text, product names, or slogans into artwork.
- Product variants must preserve the same character anatomy and identity.

## Asset discipline

- Files under `assets/mascots/masters/` and `assets/mascots/references/` are source
  material; derived assets belong in the other asset folders.
- Generated or converted assets must be reproducible through scripts where
  practical.
- Original font and cursor sources belong in `fonts/src/` and `cursors/src/`.
- Do not substitute third-party fonts or recoloured stock cursor packs for the
  original Crow Theme font and pointer families.
- Record source, prompt, generator, date, dimensions, and checksums in
  `provenance/`.
- Do not publish this repository or integrate it into another Crow project
  without Crow's explicit instruction.

