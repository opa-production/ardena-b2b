/* The demo *flag* only — deliberately tiny and free of any data imports.
 *
 * api.js imports from here, so the demo dataset and its route table never end
 * up in the customer bundle: they live in demoApi.js, which is loaded with a
 * dynamic import from main.jsx and only when the flag is actually on. Vite
 * then emits them as a separate chunk that a normal build never fetches.
 */

const KEY = "ardena-demo";

// Available in dev, and in a build only when built with VITE_DEMO=1 — so a
// production bundle can't be flipped into fake data by a query string.
export const demoAllowed = import.meta.env.DEV || import.meta.env.VITE_DEMO === "1";

let enabled = false;
try {
  enabled = demoAllowed && localStorage.getItem(KEY) === "1";
} catch {
  /* private mode — stays off */
}

/* Reads ?demo=1 / ?demo=0 and persists the answer. Returns whether demo mode
   is on, so main.jsx knows whether to pull in the demo chunk. */
export function initDemoFlag() {
  if (!demoAllowed) return false;

  const param = new URLSearchParams(window.location.search).get("demo");
  if (param === "1" || param === "0") {
    enabled = param === "1";
    try {
      if (enabled) localStorage.setItem(KEY, "1");
      else localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    // Drop the param so the address bar stays clean in a recording.
    const url = new URL(window.location.href);
    url.searchParams.delete("demo");
    window.history.replaceState({}, "", url);
  }
  return enabled;
}

export function isDemo() {
  return enabled;
}

/* demoApi registers its handlers here once loaded; api.js reads them. */
let handlers = null;

export function setDemoHandlers(h) {
  handlers = h;
}

export function demoRequest(path, opts) {
  return handlers.request(path, opts);
}

export function demoExport(type) {
  return handlers.exportReport(type);
}
