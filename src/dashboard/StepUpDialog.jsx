import { useEffect, useRef, useState } from "react";
import { ApiError, sendStepUpCode, setStepUpHandler } from "../lib/api";
import "./bookings.css";
import "./security.css";

/* The "confirm it's you" prompt for sensitive actions, shown when the account
   has two-step sign-in on. Mounted once in the dashboard; api.js calls it
   whenever the backend asks for a code (428), then replays the request with
   whatever is entered here. It sends the code itself on open, so pages don't
   need to know any of this exists. */
export default function StepUpDialog() {
  const [ask, setAsk] = useState(null); // { reason, resolve, reject }
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(
    () =>
      setStepUpHandler(
        (reason) =>
          new Promise((resolve, reject) => {
            setCode("");
            setError("");
            setAsk({ reason, resolve, reject });
          })
      ),
    []
  );

  async function send() {
    setSending(true);
    setError("");
    try {
      const res = await sendStepUpCode();
      setSentTo(res?.sent_to || "");
    } catch (err) {
      setError(err.message || "Couldn't send a code");
    } finally {
      setSending(false);
    }
  }

  // A fresh code each time the prompt opens.
  useEffect(() => {
    if (ask) {
      send();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [ask]);

  if (!ask) return null;

  function cancel() {
    ask.reject(new ApiError("Cancelled. Nothing was changed.", 0, null));
    setAsk(null);
  }

  function submit(e) {
    e.preventDefault();
    if (code.trim().length < 6) return;
    ask.resolve(code.trim());
    setAsk(null);
  }

  return (
    <div className="modal-overlay" onClick={cancel}>
      <div className="modal-card stepup-card" role="dialog" aria-modal="true" aria-labelledby="stepup-title" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h3 id="stepup-title">Confirm it&apos;s you</h3>
          <button type="button" className="icon-btn" onClick={cancel} aria-label="Close">
            ✕
          </button>
        </header>
        <form className="modal-body" onSubmit={submit}>
          <p className="side-hint" style={{ marginTop: 0 }}>
            {ask.reason || "This change needs a one-time code."}{" "}
            {sending ? "Sending a code…" : sentTo ? `We sent it to ${sentTo}.` : ""}
          </p>
          <input
            ref={inputRef}
            className="field-input otp-input"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="••••••"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            aria-label="One-time code"
          />
          {error && <p className="form-error">{error}</p>}
          <p className="side-hint">
            Didn&apos;t get it?{" "}
            <button type="button" className="auth-linkish" onClick={send} disabled={sending}>
              Send another
            </button>
          </p>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={cancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={code.length < 6}>
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
