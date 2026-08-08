import { useEffect, useState } from "react";
import AssistantPanel from "./AssistantPanel";
import "./support.css";
import "./assistant.css";

/* The assistant is reachable from every dashboard page rather than owning a
   nav slot: a button pinned bottom-right opens it in a slide-over. Mounted
   once by DashboardLayout, so the conversation survives navigation — the
   thread itself lives in assistantStore, not in this component. */
export default function AssistantLauncher() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className={"assist-fab" + (open ? " is-open" : "")}
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-label="Ask the Ardena assistant"
        title="Ask the Ardena assistant"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.5 12.5a7.5 7.5 0 01-7.5 7.5H4.5l2-2.6A7.5 7.5 0 1120.5 12.5z" />
          <path d="M9 11.5h6M9 14.5h3.5" />
        </svg>
      </button>

      {open && (
        <>
          <div
            className="assist-scrim"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside
            className="assist-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Ardena assistant"
          >
            <button
              type="button"
              className="assist-drawer-close"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            {/* Any link the assistant offers navigates the page underneath, so
                the slide-over gets out of the way on the way there. */}
            <AssistantPanel onNavigate={() => setOpen(false)} />
          </aside>
        </>
      )}
    </>
  );
}
