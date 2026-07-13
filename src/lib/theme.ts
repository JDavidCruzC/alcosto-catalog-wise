export const THEMES = [
  { id: "default", name: "Corporativo", swatch: "oklch(0.45 0.15 250)" },
  { id: "ocean", name: "Océano", swatch: "oklch(0.55 0.14 210)" },
  { id: "forest", name: "Bosque", swatch: "oklch(0.45 0.14 155)" },
  { id: "sunset", name: "Atardecer", swatch: "oklch(0.6 0.19 40)" },
  { id: "graphite", name: "Grafito", swatch: "oklch(0.3 0.02 260)" },
  { id: "rose", name: "Rosa", swatch: "oklch(0.62 0.18 5)" },
  { id: "violet", name: "Violeta", swatch: "oklch(0.5 0.2 295)" },
  { id: "amber", name: "Ámbar", swatch: "oklch(0.68 0.16 75)" },
  { id: "cherry", name: "Cereza", swatch: "oklch(0.5 0.22 20)" },
  { id: "contrast", name: "Alto Contraste", swatch: "oklch(0.1 0 0)" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export type Mode = "light" | "dark";

const THEME_KEY = "alcosto.theme";
const MODE_KEY = "alcosto.mode";

export function applyTheme(themeId: ThemeId, mode: Mode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  // remove old theme-* classes
  root.classList.forEach((c) => {
    if (c.startsWith("theme-")) root.classList.remove(c);
  });
  if (themeId !== "default") root.classList.add(`theme-${themeId}`);
  root.classList.toggle("dark", mode === "dark");
}

export function loadThemePrefs(): { theme: ThemeId; mode: Mode } {
  if (typeof window === "undefined") return { theme: "default", mode: "light" };
  const theme = (localStorage.getItem(THEME_KEY) as ThemeId) || "default";
  const mode = (localStorage.getItem(MODE_KEY) as Mode) || "light";
  return { theme, mode };
}

export function saveThemePrefs(theme: ThemeId, mode: Mode) {
  if (typeof window === "undefined") return;
  localStorage.setItem(THEME_KEY, theme);
  localStorage.setItem(MODE_KEY, mode);
}
