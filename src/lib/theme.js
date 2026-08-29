// Color themes are plain CSS custom-property sets selected via
// documentElement[data-theme="..."] — see the [data-theme] blocks in
// index.css. This module just owns picking/persisting/applying one.

const STORAGE_KEY = "kanban.theme";

export const THEMES = [
  { id: "ocean", label: "Ocean", swatch: "#0c66e4" },
  { id: "grape", label: "Grape", swatch: "#6554c0" },
  { id: "forest", label: "Forest", swatch: "#00875a" },
  { id: "sunset", label: "Sunset", swatch: "#de350b" },
  { id: "midnight", label: "Midnight", swatch: "#0b1220" },
];

const THEME_IDS = new Set(THEMES.map((t) => t.id));
const DEFAULT_THEME = "ocean";

export function getStoredTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return THEME_IDS.has(stored) ? stored : DEFAULT_THEME;
}

export function applyTheme(id) {
  const theme = THEME_IDS.has(id) ? id : DEFAULT_THEME;
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem(STORAGE_KEY, theme);
  return theme;
}
