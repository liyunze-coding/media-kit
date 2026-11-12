export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";

function initialTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export const theme = $state<{ current: Theme }>({ current: initialTheme() });

export function setTheme(next: Theme) {
  theme.current = next;
  document.documentElement.classList.toggle("dark", next === "dark");
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Storage can be unavailable (e.g. private mode); the choice just won't persist.
  }
}

export function toggleTheme() {
  setTheme(theme.current === "dark" ? "light" : "dark");
}
