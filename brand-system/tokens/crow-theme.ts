/**
 * Crow Theme v0.1
 * Typed token source for application integrations.
 */

export const crowTheme = {
  id: "crow-theme",
  name: "Crow Theme",
  version: "0.1.0",
  status: "internal-preview",
  color: {
    primitive: {
      void950: "#03040A",
      void900: "#060814",
      navy850: "#0A0E1B",
      navy800: "#10172B",
      navy700: "#18213A",
      gunmetal600: "#222B3F",
      gunmetal500: "#34415D",
      lineQuiet: "#263453",
      lineStrong: "#465C91",
      white: "#F2F7FF",
      mist: "#C5D2EA",
      steel: "#8FA2C5",
      electricBlue: "#2F7BFF",
      cyan: "#45E7FF",
      ultraviolet: "#734CFF",
      indigo: "#3B2D8F",
      indigoBright: "#6876FF",
      violet: "#9B6CFF",
      magentaSpark: "#D649FF",
      success: "#3FE0B3",
      warning: "#95A8FF",
      danger: "#FF637D",
      info: "#45E7FF",
    },
    semantic: {
      background: {
        canvas: "#03040A",
        deep: "#060814",
        surface: "#0A0E1B",
        raised: "#10172B",
        hover: "#18213A",
        selected: "#15254A",
        overlay: "rgba(3, 4, 10, 0.82)",
      },
      border: {
        subtle: "#263453",
        default: "#34415D",
        strong: "#465C91",
        focus: "#45E7FF",
      },
      text: {
        strong: "#F2F7FF",
        default: "#C5D2EA",
        muted: "#8FA2C5",
        link: "#45E7FF",
        onBright: "#03040A",
        onUltraviolet: "#F2F7FF",
      },
      action: {
        primary: "#45E7FF",
        primaryHover: "#82EFFF",
        secondary: "#734CFF",
        secondaryHover: "#896BFF",
        selection: "rgba(47, 123, 255, 0.42)",
      },
      state: {
        success: {
          foreground: "#3FE0B3",
          background: "rgba(63, 224, 179, 0.11)",
          border: "rgba(63, 224, 179, 0.44)",
          onSolid: "#03040A",
        },
        warning: {
          foreground: "#95A8FF",
          background: "rgba(149, 168, 255, 0.12)",
          border: "rgba(149, 168, 255, 0.46)",
          onSolid: "#03040A",
        },
        danger: {
          foreground: "#FF637D",
          background: "rgba(255, 99, 125, 0.11)",
          border: "rgba(255, 99, 125, 0.46)",
          onSolid: "#03040A",
        },
        info: {
          foreground: "#45E7FF",
          background: "rgba(69, 231, 255, 0.10)",
          border: "rgba(69, 231, 255, 0.42)",
          onSolid: "#03040A",
        },
      },
    },
  },
  typography: {
    family: {
      display:
        '"Crow Signal Display", "Segoe UI Variable Display", "Segoe UI", sans-serif',
      body: '"Segoe UI Variable Text", "Segoe UI", sans-serif',
      mono: '"Crow Signal Mono", "Cascadia Mono", Consolas, monospace',
    },
    weight: {
      regular: 400,
      bold: 700,
    },
    tracking: {
      display: "0.045em",
      signal: "0.08em",
    },
  },
  spacing: {
    1: "0.25rem",
    2: "0.5rem",
    3: "0.75rem",
    4: "1rem",
    5: "1.5rem",
    6: "2rem",
    7: "3rem",
  },
  radius: {
    small: "0.5rem",
    medium: "0.75rem",
    large: "1.125rem",
    pill: "999px",
  },
  shadow: {
    raised: "0 18px 60px rgba(0, 0, 0, 0.46)",
    signal: "0 0 28px rgba(47, 123, 255, 0.20)",
    cyan: "0 0 24px rgba(69, 231, 255, 0.18)",
    ultraviolet: "0 0 30px rgba(115, 76, 255, 0.22)",
  },
  motion: {
    duration: {
      instant: "0ms",
      fast: "120ms",
      standard: "200ms",
      deliberate: "320ms",
      ambient: "1600ms",
    },
    easing: {
      enter: "cubic-bezier(0.16, 1, 0.3, 1)",
      exit: "cubic-bezier(0.7, 0, 0.84, 0)",
      signal: "cubic-bezier(0.22, 1, 0.36, 1)",
    },
    distance: "8px",
    reducedMotion: {
      duration: "0ms",
      distance: "0px",
      rule: "Remove decorative movement and retain only non-moving state changes or essential progress indication.",
    },
  },
  cursor: {
    family: "Crow Talon",
    roles: {
      default: { name: "Crow Talon Default", fallback: "default" },
      link: { name: "Crow Talon Link", fallback: "pointer" },
      text: { name: "Crow Talon Text", fallback: "text" },
      precision: { name: "Crow Talon Precision", fallback: "crosshair" },
      move: { name: "Crow Talon Move", fallback: "move" },
      busy: { name: "Crow Talon Busy", fallback: "progress" },
      unavailable: {
        name: "Crow Talon Unavailable",
        fallback: "not-allowed",
      },
    },
  },
  mascot: {
    invariants: {
      eyes: 3,
      eyeRule: "Exactly two physical eyes and one centred forehead eye.",
      head: "A real elongated crow head with a tapered corvid beak.",
      palette:
        "Black, gunmetal, navy, indigo, ultraviolet, electric blue and cyan; magenta only as a restrained iris or pulse accent.",
      forbidden: [
        "moon head",
        "orb head",
        "owl face",
        "plague mask",
        "human face",
        "extra eyes",
        "missing forehead eye",
        "dominant warm metallic colour",
        "baked-in text",
      ],
    },
    forms: {
      coreArchitect: {
        id: "core-architect",
        master: "assets/mascots/masters/core-architect.png",
        role: "Primary flagship intelligence and system architect.",
      },
      fieldOperator: {
        id: "field-operator",
        master: "assets/mascots/masters/field-operator.png",
        role: "Grounded builder, hacker and local operator.",
      },
      glitchAscendant: {
        id: "glitch-ascendant",
        master: "assets/mascots/masters/glitch-ascendant.png",
        role: "Rare transformed state for recursion, power and controlled reality distortion.",
      },
      petCompanion: {
        id: "pet-companion",
        master: "assets/mascots/masters/pet-companion.png",
        role: "Small non-humanoid companion for friendly and compact contexts.",
      },
    },
  },
  products: {
    crowclaw: {
      displayName: "CrowClaw",
      primary: "#45E7FF",
      secondary: "#734CFF",
      signal: "#2F7BFF",
      mascot: "core-architect",
      compactMascot: "pet-companion",
      tone: "Capable, local, precise and action-oriented.",
    },
    "crow-godmod3": {
      displayName: "Crow-GodMod3",
      primary: "#734CFF",
      secondary: "#D649FF",
      signal: "#45E7FF",
      mascot: "glitch-ascendant",
      compactMascot: "core-architect",
      tone: "Recursive, high-power and reality-bending without visual chaos.",
    },
    crowquant: {
      displayName: "CrowQuant",
      primary: "#2F7BFF",
      secondary: "#45E7FF",
      signal: "#3FE0B3",
      mascot: "field-operator",
      compactMascot: "pet-companion",
      tone: "Analytical, exact and data-luminous.",
    },
    crownest: {
      displayName: "CrowNest",
      primary: "#6876FF",
      secondary: "#45E7FF",
      signal: "#9B6CFF",
      mascot: "core-architect",
      compactMascot: "pet-companion",
      tone: "Networked, systemic and inhabited.",
    },
    crowmemory: {
      displayName: "CrowMemory",
      primary: "#9B6CFF",
      secondary: "#45E7FF",
      signal: "#2F7BFF",
      mascot: "core-architect",
      compactMascot: "pet-companion",
      tone: "Familiar, persistent and quietly luminous.",
    },
    crowflix: {
      displayName: "CrowFlix",
      primary: "#2F7BFF",
      secondary: "#9B6CFF",
      signal: "#D649FF",
      mascot: "field-operator",
      compactMascot: "pet-companion",
      tone: "Cinematic, nocturnal and energetic.",
    },
  },
} as const;

export type CrowTheme = typeof crowTheme;
export type CrowProduct = keyof CrowTheme["products"];
export type CrowMascotForm =
  CrowTheme["mascot"]["forms"][keyof CrowTheme["mascot"]["forms"]]["id"];

export function getCrowProductBinding(product: CrowProduct) {
  return crowTheme.products[product];
}
