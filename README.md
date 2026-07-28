# Crow-GodMod3

A CrowClaw-inspired chat workbench that reinterprets the interaction shell of
[G0DM0D3](https://godmod3.ai/) with CrowClaw branding, language, and visual
identity.

## Current scope

- Responsive chat workspace with desktop sidebar and mobile drawer
- CrowClaw visual system and product artwork
- Strategy selector, prompt starters, local conversation history, settings,
  theme variants, state export, and deliberate local-history clearing
- Honest provider setup state: no API key is stored or transmitted and no model
  provider is wired in this interface build

## Development

```powershell
npm install
npm run dev
```

Build and test:

```powershell
npm run build
node --test tests/rendered-html.test.mjs
```
