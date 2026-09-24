import { useState } from "react";
import { generateListingDescription } from "../lib/api";

/* "Write it for me" on the listing's description card.

   The button sits inside the field's bottom-right corner (the textarea is
   passed as `children`) so it's seen where the writing happens.

   The user gives a few words of direction first. Without that the model can
   only restate the spec sheet, and every fleet car would read the same. The
   draft is shown beside the field rather than written into it, so an existing
   description is never overwritten until the user presses Use this. The
   backend returns plain text (no markdown, no dashes), so it drops straight
   into the textarea. */

function SparkleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
    </svg>
  );
}

export default function DescriptionAssist({ plate, context, onAccept, children }) {
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canGenerate = hint.trim().length >= 2 && !busy;

  async function generate() {
    if (!canGenerate) return;
    setBusy(true);
    setError("");
    try {
      const res = await generateListingDescription(plate, { ...context, hint: hint.trim() });
      setDraft(res.description);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setOpen(false);
    setDraft("");
    setError("");
  }

  function accept() {
    onAccept(draft);
    close();
    setHint("");
  }

  return (
    <div className="ai-assist-field">
      {children}
      <button
        type="button"
        className={`ai-assist-btn${open ? " is-open" : ""}`}
        onClick={() => (open ? close() : setOpen(true))}
        title="Write the description with AI"
        aria-expanded={open}
      >
        <SparkleIcon />
        <span>AI enhance</span>
      </button>

      {open && (
        <div className="ai-assist-panel">
          <label htmlFor="ai-hint" className="ai-assist-label">
            Give it a direction
          </label>
          <div className="ai-assist-row">
            <input
              id="ai-hint"
              type="text"
              maxLength={300}
              autoFocus
              placeholder="e.g. clean family SUV, great for safaris"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault(); // don't submit the listing form
                  generate();
                }
              }}
            />
            <button type="button" className="btn btn-primary" disabled={!canGenerate} onClick={generate}>
              {busy ? "Writing…" : draft ? "Try again" : "Generate"}
            </button>
          </div>

          {error && <p className="form-error ai-assist-error">{error}</p>}

          {draft && (
            <div className="ai-assist-draft">
              <p>{draft}</p>
              <div className="ai-assist-actions">
                <button type="button" className="btn btn-primary" onClick={accept}>
                  Use this
                </button>
                <button type="button" className="btn btn-ghost" onClick={close}>
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
