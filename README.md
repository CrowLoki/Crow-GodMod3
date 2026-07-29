# Crow-GodMod3

A faithful static derivative of
[G0DM0D3](https://github.com/elder-plinius/G0DM0D3), rebranded with the
CrowClaw visual identity.

- Live site: [crow-godmod3.vercel.app](https://crow-godmod3.vercel.app)
- Corresponding source:
  [CrowLoki/Crow-GodMod3](https://github.com/CrowLoki/Crow-GodMod3)

## Project status

This repository is an ongoing project.

- **Phase 1:** establish the faithful standalone Crow-GodMod3 application,
  preserve the upstream functionality, and apply the CrowClaw identity.
- **Phase 2:** expand Crow-GodMod3 with additional features defined during the
  next development phase.
- **CrowClaw:** keep Crow-GodMod3 independently usable while making it available
  as an optional CrowClaw plugin in a future phase.

## Provenance

- The live site was mirrored with HTTrack and compared with its public source.
- `vendor/godmod3/index.html` is the unmodified upstream snapshot from commit
  `f6301765fb90eb7b336bdf365319cd2fe44b1187`.
- `scripts/build-crow-static.mjs` applies the deterministic Crow-GodMod3 brand,
  palette, privacy, and attribution layer.
- The generated application is served directly at `/` from
  `public/crow-godmod3.html`; there is no iframe or imitation shell.
- Application telemetry is disabled. Provider requests still go to the
  provider or local endpoint configured by the user.

## Crow Theme integration

Crow-GodMod3 includes the complete approved Crow Brand System under
[`brand-system/`](brand-system/):

- Glitch Ascendant as the primary Crow-GodMod3 form
- Core Architect as its compact form
- Field Operator and Pet Companion for the wider approved mascot family
- Crow Signal Display and Mono fonts
- Crow Talon static and animated Windows pointers
- signal marks, favicon and application icons
- backgrounds, six product heroes and social artwork
- shared CSS, JSON and TypeScript design tokens
- brand, mascot, prompt, provenance and reproducible-build sources

The build copies the pack into the deployed `/crow-theme/` catalogue and
applies its product binding, typography, pointers, hero, icons, social preview
and colour tokens to the application. The upstream snapshot remains unchanged.

## Development

```powershell
npm install
npm run dev
```

Build and test:

```powershell
npm test
```

## Licence

This modified derivative remains under the GNU Affero General Public License
v3.0. See `LICENSE`, `public/ATTRIBUTION.md`, and the unmodified upstream
material under `vendor/godmod3/`. Original Crow Brand System assets are covered
by the separate notice in [`brand-system/LICENSE.md`](brand-system/LICENSE.md).
