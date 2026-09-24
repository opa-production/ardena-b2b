import { useState } from "react";
import "./refresh.css";

/* Re-fetch this page's data in place — for things that change without the
   user doing anything here: an Ardena review landing, a renter paying, a new
   claim. `onRefresh` is the page's own loader; it must not flip the page back
   to its skeleton, so the content stays put while the icon spins.

   `label={false}` for an icon-only button in tight toolbars. */
export default function RefreshButton({ onRefresh, label = "Refresh", className = "" }) {
  const [busy, setBusy] = useState(false);

  async function run() {
    if (busy) return;
    setBusy(true);
    try {
      await onRefresh();
    } catch {
      /* the page's loader already reports its own errors */
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={`btn btn-ghost refresh-btn${label ? "" : " icon-only"} ${className}`.trim()}
      onClick={run}
      disabled={busy}
      aria-busy={busy}
      title="Get the latest"
      aria-label={label || "Refresh"}
    >
      <svg className={busy ? "is-spinning" : ""} width="15" height="15" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12a9 9 0 11-2.64-6.36" />
        <path d="M21 3v6h-6" />
      </svg>
      {label && <span>{busy ? "Refreshing…" : label}</span>}
    </button>
  );
}
