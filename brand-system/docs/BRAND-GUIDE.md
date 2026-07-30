# Crow Brand Guide

Status: Crow-GodMod3 integration release

Token version: `0.2.0`

The Crow Brand System is the shared visual language for CrowClaw,
Crow-GodMod3, CrowQuant, CrowNest, CrowMemory and CrowFlix. Product interfaces
may vary in density and emphasis, but they must look like members of one
nocturnal, technical family.

The machine-readable sources are:

- [`tokens/crow-theme.json`](../tokens/crow-theme.json)
- [`tokens/crow-theme.ts`](../tokens/crow-theme.ts)
- [`tokens/crow-theme.css`](../tokens/crow-theme.css)

## Core direction

Crow is black feather, gunmetal structure, deep navy space and cold signal
light. Ultraviolet, electric blue and cyan carry the identity. Magenta is a
small pulse: an iris, data event or exceptional emphasis.

Orange, amber, yellow and gold are not Crow brand colours. Do not use them for
brand gradients, calls to action, glows, metallic surfaces or warning states.
The warning token is deliberately periwinkle so products do not reintroduce a
warm accent through their state system.

### Palette

| Role | Token | Value | Use |
| --- | --- | --- | --- |
| Canvas | `void950` | `#03040A` | Primary application and artwork ground |
| Deep surface | `void900` | `#060814` | Navigation and recessed regions |
| Surface | `navy850` | `#0A0E1B` | Cards and panels |
| Raised surface | `navy800` | `#10172B` | Dialogs, menus and active layers |
| Gunmetal | `gunmetal600` | `#222B3F` | Structural detail, not body text |
| Strong text | `white` | `#F2F7FF` | Headings and critical copy |
| Body text | `mist` | `#C5D2EA` | Default readable copy |
| Muted text | `steel` | `#8FA2C5` | Secondary copy and metadata |
| Electric blue | `electricBlue` | `#2F7BFF` | Data and product signal |
| Cyan | `cyan` | `#45E7FF` | Focus, links and primary action |
| Ultraviolet | `ultraviolet` | `#734CFF` | Secondary action and deep identity |
| Bright indigo | `indigoBright` | `#6876FF` | Network and system emphasis |
| Violet | `violet` | `#9B6CFF` | Memory and atmospheric depth |
| Magenta spark | `magentaSpark` | `#D649FF` | Rare eye or pulse accent only |

Magenta should normally occupy less than ten percent of a composition. It
must not become a page wash, large panel colour or default text colour.

## Typography

`Crow Signal Display` is the identity face. Use it for product names, hero
headings, short labels and large numerical statements. Keep display lines
short and use regular or bold weights only.

`Crow Signal Mono` is the signal face. Use it for code, telemetry, timestamps,
keyboard hints, identifiers and small uppercase eyebrow labels.

Crow Signal v0.2 is built from connected, hard-edged square-pixel strokes. The
letters should read as deliberate pixel typography, not a separated dot-matrix
display. Do not round, blur, or disconnect its source geometry.

Body copy uses the system UI family for sustained reading. The supplied CSS
provides safe fallbacks:

```css
font-family: var(--crow-font-display);
font-family: var(--crow-font-body);
font-family: var(--crow-font-mono);
```

Do not stretch, outline or artificially italicise Crow Signal. Avoid setting
long paragraphs in the display or mono face.

## Crow Talon cursor family

The cursor family is named `Crow Talon`. Official role names are:

- Crow Talon Default
- Crow Talon Link
- Crow Talon Text
- Crow Talon Precision
- Crow Talon Move
- Crow Talon Busy
- Crow Talon Unavailable

Crow Talon v0.2 is drawn as crisp 32 px pixel art and exported at 32, 48, 64,
and 96 px for Windows. Integrations use the CSS fallback keywords in the token
files when the native scheme is not installed. Cursors must remain immediately
recognisable at Windows accessibility sizes; silhouette clarity outranks
ornament.

## Mascot identity anchor

`assets/mascots/masters/crow-mascot-v3.png` is the sole active Crow mascot
master. It is the same naturally proportioned adult biomechanical crow across
CrowClaw, Crow-GodMod3, CrowQuant, CrowNest, CrowMemory, CrowFlix and future
Crow products.

Product derivatives may change only:

- crop;
- background or surrounding scene;
- emphasis among the approved cyan, electric-blue, indigo, ultraviolet,
  violet and restrained-magenta accents.

Do not alter the character's anatomy, proportions, pose language or
biomechanical construction to create a product role. Do not introduce a
humanoid body, clothing, pet/chick proportions, a separate head-only identity,
or another character.

All earlier head, humanoid, companion/pet, v1 and v2 files remain physically
intact as inactive legacy/reference records. They must not be overwritten,
deleted, substituted for `crow-mascot-v3.png`, or used as an active identity
reference.

## Product bindings

Set `data-crow-product` on a product root to receive its CSS binding.

| Product | Attribute value | Suggested crop | Background direction | Colour emphasis |
| --- | --- | --- | --- | --- |
| CrowClaw | `crowclaw` | Full crow or close portrait | Local system space and permission geometry | Cyan, ultraviolet, electric blue |
| Crow-GodMod3 | `crow-godmod3` | Full crow | Controlled recursion and data-space distortion | Ultraviolet, cyan, restrained magenta |
| CrowQuant | `crowquant` | Full crow or wing-and-head crop | Quantitative lattice and analytical signals | Electric blue, cyan, success teal |
| CrowNest | `crownest` | Full crow | Linked nodes and system stewardship | Bright indigo, cyan, violet |
| CrowMemory | `crowmemory` | Portrait or full crow | Protected archive and recall geometry | Violet, cyan, electric blue |
| CrowFlix | `crowflix` | Full crow or cinematic portrait | Projection, framing and signal flow | Electric blue, violet, restrained magenta |

Bindings create environmental and accent emphasis around the one active
mascot; they never create a new mascot form. Products must still use the
shared surfaces, text colours, semantic states and exact v3 mascot identity.

## Accessibility

- Default text pairs are designed for dark surfaces. Do not place them on
  untested photography or uncontrolled gradients.
- `#C5D2EA` is the normal body text colour. Reserve `#8FA2C5` for genuinely
  secondary text.
- Cyan focus indication is three pixels and must not be removed. Pair focus
  colour with a visible shape or outline.
- Never communicate status by colour alone. Include an icon and explicit text.
- Solid success, warning, danger and info controls use `#03040A` text. Soft
  state panels use their state foreground, background and border tokens.
- Ultraviolet solid controls use `#F2F7FF`; cyan and other bright solid controls
  use `#03040A`.
- Check new text/background pairs against WCAG 2.2 AA: at least 4.5:1 for
  normal text and 3:1 for large text and essential graphics.

## Shape, light and texture

- Use crisp rectangular systems softened by the supplied small, medium and
  large radii.
- Borders should feel machined and quiet. Use strong borders only for focus,
  active state and hierarchy.
- Signal glows are local and restrained. Avoid covering an entire interface
  with bloom.
- Grid, circuit and feather textures should sit below content at low opacity.
- Black remains visibly layered: use navy and gunmetal separation rather than
  lifting every surface to grey.

## Motion

Motion should feel like a signal resolving, not a game HUD constantly moving.

- `120ms`: hover, focus and small control feedback.
- `200ms`: ordinary panel and state transitions.
- `320ms`: deliberate dialog or scene entrance.
- `1600ms`: rare ambient pulse; never on body text or essential controls.
- Use the supplied enter, exit and signal easing tokens.
- Keep travel to eight pixels or less in product UI.

Under `prefers-reduced-motion: reduce`, all decorative duration and travel
tokens become zero. Preserve state changes without movement. Essential
progress may use a static indicator or a gentle opacity change without
continuous sweeping, zooming or parallax.

## Implementation

```html
<main data-crow-theme data-crow-product="crowclaw">
  ...
</main>
```

```css
@import "../fonts/crow-signal.css";
@import "../tokens/crow-theme.css";

.primary-action {
  color: var(--crow-text-on-bright);
  background: var(--crow-product-primary);
  transition:
    background-color var(--crow-motion-fast) var(--crow-ease-enter),
    box-shadow var(--crow-motion-fast) var(--crow-ease-enter);
}

.primary-action:focus-visible {
  outline: 2px solid var(--crow-border-focus);
  outline-offset: 2px;
  box-shadow: var(--crow-focus-ring);
}
```

## Release discipline

Crow approved this copy for the public Crow-GodMod3 integration. Product teams
should still pin the token version, copy only approved derivatives and record
the source version used by each release.
