// Dashboard theme (light / dark). The whole UI is driven by CSS custom
// properties, so a theme is just a `data-theme` attribute on <html> that swaps
// the token values (see the [data-theme="dark"] block in global.css).
//
// The preference is per-device (localStorage), light-first by default to match
// the brand. DashboardLayout applies it on mount and clears it on unmount so the
// marketing/auth pages stay light regardless of the saved choice.

const KEY = "ardena-theme";

function readSaved() {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "dark" || v === "light") return v;
  } catch {
    /* storage blocked — fall through to default */
  }
  return "light";
}

let theme = readSaved();
const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn());
}

export function getTheme() {
  return theme;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Paint the current theme onto <html>. Call when entering the dashboard.
export function applyTheme() {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

// Drop the attribute so pages outside the dashboard render in the light theme.
export function clearTheme() {
  if (typeof document !== "undefined") {
    document.documentElement.removeAttribute("data-theme");
  }
}

export function setTheme(next) {
  theme = next === "dark" ? "dark" : "light";
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* ignore */
  }
  applyTheme();
  emit();
}

export function toggleTheme() {
  setTheme(theme === "dark" ? "light" : "dark");
}
