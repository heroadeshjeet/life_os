"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { getTheme, DEFAULT_THEME, type ThemeId } from "@/lib/themes/registry";

/**
 * Life_OS v2 — Theme provider.
 *
 * Injects theme CSS variables via a <style> tag (NOT inline styles, which
 * would override the .dark class). Uses proper CSS selectors:
 *   html[data-theme="X"]          → light mode vars
 *   html[data-theme="X"].dark     → dark mode vars
 *
 * Also sets body[data-theme="X"] for per-theme visual effects (backgrounds,
 * glassmorphism, scanlines, etc.) defined in globals.css.
 *
 * Loads Google Fonts per theme:
 *   Classy  → Fraunces (serif) + Outfit (sans)
 *   Cybertech → JetBrains Mono
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const profile = useAuthStore((s) => s.profile);
  const themeId = (profile?.preferences as Record<string, unknown>)?.theme_id as ThemeId ?? DEFAULT_THEME;

  useEffect(() => {
    const theme = getTheme(themeId);

    // ─── Build the style tag with both light and dark rules ──────────────
    let styleEl = document.getElementById("lifeos-theme-vars") as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "lifeos-theme-vars";
      document.head.appendChild(styleEl);
    }

    const lightVars = Object.entries(theme.light)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join("\n");
    const darkVars = Object.entries(theme.dark)
      .map(([key, value]) => `  ${key}: ${value};`)
      .join("\n");

    // For the default theme, we don't override anything (use the base :root vars)
    // For other themes, we override with both light and dark selectors
    if (themeId !== "default") {
      styleEl.textContent = `
html[data-theme="${themeId}"] {
${lightVars}
}
html[data-theme="${themeId}"].dark {
${darkVars}
}
`;
    } else {
      // Default theme: clear any overrides
      styleEl.textContent = "";
    }

    // ─── Set data-theme on both html and body ─────────────────────────────
    document.documentElement.setAttribute("data-theme", themeId);
    document.body.setAttribute("data-theme", themeId);

    // ─── Load Google Fonts per theme ──────────────────────────────────────
    const fontsToLoad: string[] = [];

    if (theme.fonts?.serif?.includes("Fraunces")) {
      fontsToLoad.push("Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900");
    }
    if (theme.fonts?.sans?.includes("Outfit")) {
      fontsToLoad.push("Outfit:wght@200..800");
    }
    if (theme.fonts?.mono?.includes("JetBrains")) {
      fontsToLoad.push("JetBrains+Mono:wght@400;500;700");
    }

    // Always load Nunito for Frutiger Aero
    if (themeId === "frutiger-aero") {
      fontsToLoad.push("Nunito:wght@400;600;700;800");
    }

    for (const font of fontsToLoad) {
      const linkId = `font-${font.split(":")[0]}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?family=${font}&display=swap`;
        link.id = linkId;
        document.head.appendChild(link);
      }
    }

    // ─── Apply font family overrides ──────────────────────────────────────
    const root = document.documentElement;

    if (theme.fonts?.sans) {
      root.style.setProperty("--font-geist-sans", theme.fonts.sans);
    } else if (themeId === "frutiger-aero") {
      root.style.setProperty("--font-geist-sans", "'Nunito', system-ui, sans-serif");
    } else {
      root.style.setProperty("--font-geist-sans", "'Geist', system-ui, sans-serif");
    }

    if (theme.fonts?.serif) {
      root.style.setProperty("--font-serif", theme.fonts.serif);
    } else {
      root.style.setProperty("--font-serif", "Georgia, serif");
    }

    if (theme.fonts?.mono) {
      root.style.setProperty("--font-geist-mono", theme.fonts.mono);
      // For cybertech, make the default body font mono too
      if (themeId === "cybertech") {
        root.style.setProperty("--font-geist-sans", "'JetBrains Mono', monospace");
      }
    } else {
      root.style.setProperty("--font-geist-mono", "'Geist Mono', monospace");
    }
  }, [themeId]);

  return <>{children}</>;
}
