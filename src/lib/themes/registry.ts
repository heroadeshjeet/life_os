/**
 * Life_OS v2 — Theme registry.
 *
 * Each theme defines CSS custom properties that override the shadcn/ui
 * defaults. The ThemeProvider injects these as inline styles on <html>.
 *
 * Theme structure:
 *   - Light mode vars (default)
 *   - Dark mode vars (.dark override)
 *   - Optional font family overrides
 */

export type ThemeId = "default" | "frutiger-aero" | "modern" | "classy" | "cybertech";

export interface ThemeDef {
  id: ThemeId;
  name: string;
  description: string;
  icon: string;
  light: Record<string, string>;
  dark: Record<string, string>;
  fonts?: {
    sans?: string;
    serif?: string;
    mono?: string;
  };
}

// ─── Default (current minimal warm gold) ────────────────────────────────────

const defaultTheme: ThemeDef = {
  id: "default",
  name: "Minimal",
  description: "Clean, warm gold accent. The classic Life_OS look.",
  icon: "✨",
  light: {},
  dark: {},
};

// ─── Frutiger Aero (nature 2000s) ───────────────────────────────────────────
// Glossy, vibrant, water bubbles, lush green + sky blue

const frutigerAero: ThemeDef = {
  id: "frutiger-aero",
  name: "Frutiger Aero",
  description: "2000s nature vibe — glossy surfaces, lush greens, sky blues.",
  icon: "🌿",
  fonts: {
    sans: "'Nunito', system-ui, sans-serif",
  },
  light: {
    "--background": "oklch(0.97 0.02 150)",
    "--foreground": "oklch(0.20 0.03 160)",
    "--card": "oklch(0.99 0.01 150)",
    "--card-foreground": "oklch(0.20 0.03 160)",
    "--popover": "oklch(0.99 0.01 150)",
    "--popover-foreground": "oklch(0.20 0.03 160)",
    "--primary": "oklch(0.55 0.18 150)",
    "--primary-foreground": "oklch(0.98 0.01 150)",
    "--secondary": "oklch(0.93 0.04 190)",
    "--secondary-foreground": "oklch(0.25 0.04 160)",
    "--muted": "oklch(0.94 0.02 150)",
    "--muted-foreground": "oklch(0.50 0.03 160)",
    "--accent": "oklch(0.60 0.15 200)",
    "--accent-foreground": "oklch(0.20 0.03 200)",
    "--destructive": "oklch(0.58 0.22 25)",
    "--border": "oklch(0.88 0.03 160)",
    "--input": "oklch(0.88 0.03 160)",
    "--ring": "oklch(0.55 0.18 150)",
    "--radius": "0.75rem",
  },
  dark: {
    "--background": "oklch(0.18 0.03 160)",
    "--foreground": "oklch(0.95 0.02 150)",
    "--card": "oklch(0.22 0.04 160)",
    "--card-foreground": "oklch(0.95 0.02 150)",
    "--popover": "oklch(0.22 0.04 160)",
    "--popover-foreground": "oklch(0.95 0.02 150)",
    "--primary": "oklch(0.65 0.20 150)",
    "--primary-foreground": "oklch(0.15 0.03 160)",
    "--secondary": "oklch(0.28 0.04 170)",
    "--secondary-foreground": "oklch(0.95 0.02 150)",
    "--muted": "oklch(0.28 0.04 170)",
    "--muted-foreground": "oklch(0.70 0.03 160)",
    "--accent": "oklch(0.60 0.15 200)",
    "--accent-foreground": "oklch(0.95 0.02 200)",
    "--border": "oklch(1 0 0 / 12%)",
    "--input": "oklch(1 0 0 / 15%)",
    "--ring": "oklch(0.65 0.20 150)",
  },
};

// ─── Modern (glassmorphism + vibrant gradients) ─────────────────────────────

const modern: ThemeDef = {
  id: "modern",
  name: "Modern",
  description: "Glassmorphism, vibrant gradients, smooth motion.",
  icon: "🌊",
  light: {
    "--background": "oklch(0.98 0.005 270)",
    "--foreground": "oklch(0.15 0.02 270)",
    "--card": "oklch(0.97 0.01 270 / 80%)",
    "--card-foreground": "oklch(0.15 0.02 270)",
    "--popover": "oklch(0.97 0.01 270 / 90%)",
    "--popover-foreground": "oklch(0.15 0.02 270)",
    "--primary": "oklch(0.55 0.25 290)",
    "--primary-foreground": "oklch(0.98 0.01 290)",
    "--secondary": "oklch(0.93 0.02 270)",
    "--secondary-foreground": "oklch(0.20 0.03 270)",
    "--muted": "oklch(0.94 0.01 270)",
    "--muted-foreground": "oklch(0.50 0.02 270)",
    "--accent": "oklch(0.60 0.20 330)",
    "--accent-foreground": "oklch(0.15 0.03 330)",
    "--destructive": "oklch(0.58 0.22 25)",
    "--border": "oklch(0.88 0.01 270)",
    "--input": "oklch(0.88 0.01 270)",
    "--ring": "oklch(0.55 0.25 290)",
    "--radius": "1rem",
  },
  dark: {
    "--background": "oklch(0.13 0.02 280)",
    "--foreground": "oklch(0.95 0.01 270)",
    "--card": "oklch(0.18 0.03 280 / 70%)",
    "--card-foreground": "oklch(0.95 0.01 270)",
    "--popover": "oklch(0.18 0.03 280 / 85%)",
    "--popover-foreground": "oklch(0.95 0.01 270)",
    "--primary": "oklch(0.65 0.25 290)",
    "--primary-foreground": "oklch(0.12 0.02 280)",
    "--secondary": "oklch(0.25 0.03 280)",
    "--secondary-foreground": "oklch(0.95 0.01 270)",
    "--muted": "oklch(0.25 0.03 280)",
    "--muted-foreground": "oklch(0.70 0.02 270)",
    "--accent": "oklch(0.65 0.20 330)",
    "--accent-foreground": "oklch(0.95 0.01 330)",
    "--border": "oklch(1 0 0 / 10%)",
    "--input": "oklch(1 0 0 / 12%)",
    "--ring": "oklch(0.65 0.25 290)",
  },
};

// ─── Classy (from Life_manual.html — warm earth tones) ──────────────────────

const classy: ThemeDef = {
  id: "classy",
  name: "Classy",
  description: "Warm earth tones, serif headings, literary journal feel.",
  icon: "📚",
  light: {
    "--background": "oklch(0.96 0.01 60)",
    "--foreground": "oklch(0.25 0.02 50)",
    "--card": "oklch(0.94 0.015 55)",
    "--card-foreground": "oklch(0.25 0.02 50)",
    "--popover": "oklch(0.94 0.015 55)",
    "--popover-foreground": "oklch(0.25 0.02 50)",
    "--primary": "oklch(0.65 0.12 55)",
    "--primary-foreground": "oklch(0.98 0.01 55)",
    "--secondary": "oklch(0.90 0.02 55)",
    "--secondary-foreground": "oklch(0.30 0.02 50)",
    "--muted": "oklch(0.91 0.015 55)",
    "--muted-foreground": "oklch(0.50 0.02 50)",
    "--accent": "oklch(0.60 0.10 40)",
    "--accent-foreground": "oklch(0.20 0.02 40)",
    "--destructive": "oklch(0.55 0.18 25)",
    "--border": "oklch(0.85 0.02 50)",
    "--input": "oklch(0.85 0.02 50)",
    "--ring": "oklch(0.65 0.12 55)",
    "--radius": "0.5rem",
  },
  dark: {
    "--background": "oklch(0.12 0.015 45)",
    "--foreground": "oklch(0.93 0.02 60)",
    "--card": "oklch(0.16 0.02 45)",
    "--card-foreground": "oklch(0.93 0.02 60)",
    "--popover": "oklch(0.16 0.02 45)",
    "--popover-foreground": "oklch(0.93 0.02 60)",
    "--primary": "oklch(0.70 0.12 55)",
    "--primary-foreground": "oklch(0.12 0.015 45)",
    "--secondary": "oklch(0.22 0.025 45)",
    "--secondary-foreground": "oklch(0.93 0.02 60)",
    "--muted": "oklch(0.22 0.025 45)",
    "--muted-foreground": "oklch(0.68 0.02 55)",
    "--accent": "oklch(0.65 0.10 40)",
    "--accent-foreground": "oklch(0.93 0.02 60)",
    "--border": "oklch(0.30 0.02 45)",
    "--input": "oklch(0.30 0.02 45)",
    "--ring": "oklch(0.70 0.12 55)",
  },
  fonts: {
    serif: "'Fraunces', Georgia, serif",
    sans: "'Outfit', system-ui, sans-serif",
  },
};

// ─── Cybertech (cyberpunk) ──────────────────────────────────────────────────

const cybertech: ThemeDef = {
  id: "cybertech",
  name: "Cybertech",
  description: "Neon cyan, dark surfaces, futuristic monospace vibes.",
  icon: "🤖",
  light: {
    "--background": "oklch(0.95 0.01 200)",
    "--foreground": "oklch(0.15 0.03 200)",
    "--card": "oklch(0.97 0.005 200)",
    "--card-foreground": "oklch(0.15 0.03 200)",
    "--popover": "oklch(0.97 0.005 200)",
    "--popover-foreground": "oklch(0.15 0.03 200)",
    "--primary": "oklch(0.60 0.25 195)",
    "--primary-foreground": "oklch(0.98 0.01 195)",
    "--secondary": "oklch(0.90 0.02 200)",
    "--secondary-foreground": "oklch(0.20 0.03 200)",
    "--muted": "oklch(0.92 0.01 200)",
    "--muted-foreground": "oklch(0.45 0.03 200)",
    "--accent": "oklch(0.60 0.25 320)",
    "--accent-foreground": "oklch(0.98 0.01 320)",
    "--destructive": "oklch(0.55 0.25 25)",
    "--border": "oklch(0.85 0.02 200)",
    "--input": "oklch(0.85 0.02 200)",
    "--ring": "oklch(0.60 0.25 195)",
    "--radius": "0.25rem",
  },
  dark: {
    "--background": "oklch(0.10 0.02 200)",
    "--foreground": "oklch(0.90 0.05 195)",
    "--card": "oklch(0.14 0.03 200)",
    "--card-foreground": "oklch(0.90 0.05 195)",
    "--popover": "oklch(0.14 0.03 200)",
    "--popover-foreground": "oklch(0.90 0.05 195)",
    "--primary": "oklch(0.70 0.25 195)",
    "--primary-foreground": "oklch(0.10 0.02 200)",
    "--secondary": "oklch(0.20 0.03 200)",
    "--secondary-foreground": "oklch(0.90 0.05 195)",
    "--muted": "oklch(0.20 0.03 200)",
    "--muted-foreground": "oklch(0.60 0.04 195)",
    "--accent": "oklch(0.70 0.25 320)",
    "--accent-foreground": "oklch(0.10 0.02 320)",
    "--border": "oklch(0.30 0.04 195)",
    "--input": "oklch(0.30 0.04 195)",
    "--ring": "oklch(0.70 0.25 195)",
  },
  fonts: {
    mono: "'JetBrains Mono', 'Fira Code', monospace",
    sans: "'Inter', system-ui, sans-serif",
  },
};

// ─── Registry ────────────────────────────────────────────────────────────────

export const THEMES: ThemeDef[] = [defaultTheme, frutigerAero, modern, classy, cybertech];
export const DEFAULT_THEME: ThemeId = "default";

export function getTheme(id: ThemeId): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
