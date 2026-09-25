import { Component } from "react";

/* Two jobs.

   1. After a deploy, a tab that was already open still runs the old build and
      asks for page files by their old names, which no longer exist. The import
      fails, and without a boundary React threw away the whole screen, leaving
      it blank until a manual reload. Here that one case reloads the page once,
      quietly, onto the new build.

   2. Any other crash inside a page shows a message in that page's place
      instead of blanking everything, sidebar included. */

const RELOAD_KEY = "ardena-chunk-reload";

export function isChunkLoadError(error) {
  const msg = String(error?.message || error || "");
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS|ChunkLoadError/i.test(
    msg
  );
}

/* Reload onto the latest build, but never loop: at most once per 10 seconds. */
export function reloadOnce() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 10_000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    /* storage blocked: still reload, the browser won't loop on its own */
  }
  window.location.reload();
  return true;
}

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    if (isChunkLoadError(error)) reloadOnce();
  }

  componentDidUpdate(prev) {
    // Navigating elsewhere clears a page's crash.
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    const updating = isChunkLoadError(this.state.error);
    return (
      <div className="crash">
        <h2>{updating ? "Updating Ardena…" : "Something went wrong on this page"}</h2>
        <p>
          {updating
            ? "A newer version was just released. Loading it now."
            : "Your data is safe. Reload to try again; if it keeps happening, tell us through Support."}
        </p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    );
  }
}
