# Crow-GodMod3

A faithful static derivative of
[G0DM0D3](https://github.com/elder-plinius/G0DM0D3), rebranded with the
CrowClaw visual identity.

- Live site: [crow-godmod3.vercel.app](https://crow-godmod3.vercel.app)
- Corresponding source:
  [CrowLoki/Crow-GodMod3](https://github.com/CrowLoki/Crow-GodMod3)

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
v3.0. See `public/ATTRIBUTION.md`, `public/LICENSE.txt`, and the unmodified
upstream material under `vendor/godmod3/`.
