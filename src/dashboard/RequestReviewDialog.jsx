import { useEffect, useState } from "react";
import { fetchPendingReviews, sendReviewRequest, smsText } from "../lib/reviewRequestsMock";
import { toast } from "./toastStore";
import "../components/confirm.css";
import "./ratings.css";

function fmtRange(start, end) {
  const opts = { day: "numeric", month: "short" };
  const a = new Date(start).toLocaleDateString("en-KE", opts);
  const b = new Date(end).toLocaleDateString("en-KE", { ...opts, year: "numeric" });
  return `${a} – ${b}`;
}

/**
 * Ask a past renter for a review by SMS.
 *
 * Three steps: pick a finished booking that hasn't been reviewed, check the
 * message, send. The renter gets a link to /r/:token, a one-screen page with
 * stars and a comment box. Mocked for now (see lib/reviewRequestsMock.js).
 */
export default function RequestReviewDialog({ onClose }) {
  const [step, setStep] = useState("pick"); // pick → preview → sent
  const [bookings, setBookings] = useState(null);
  const [picked, setPicked] = useState(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchPendingReviews().then(setBookings);
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSend() {
    if (sending) return;
    setSending(true);
    try {
      setResult(await sendReviewRequest(picked.ref));
      setStep("sent");
    } catch (err) {
      toast(err.message || "Couldn't send that SMS", "danger");
    } finally {
      setSending(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(result.link);
      toast("Link copied");
    } catch {
      toast("Couldn't copy the link", "danger");
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="modal-card rr-card"
        role="dialog"
        aria-modal="true"
        aria-label="Request a review"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <ol className="rr-steps" aria-label="Steps">
          {["Booking", "Message", "Sent"].map((label, i) => {
            const idx = ["pick", "preview", "sent"].indexOf(step);
            return (
              <li key={label} className={i < idx ? "done" : i === idx ? "on" : ""}>
                {label}
              </li>
            );
          })}
        </ol>

        {step === "pick" && (
          <>
            <h3 className="modal-title">Request a review</h3>
            <p className="modal-message">
              Pick a finished trip. We&apos;ll text the renter a link to rate it.
            </p>

            {!bookings ? (
              <p className="field-note">Loading bookings…</p>
            ) : bookings.length === 0 ? (
              <p className="field-note">Every finished trip has been reviewed. Nice.</p>
            ) : (
              <div className="rr-list" role="radiogroup" aria-label="Bookings without a review">
                {bookings.map((b) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={picked?.ref === b.ref}
                    key={b.ref}
                    className={"rr-option" + (picked?.ref === b.ref ? " on" : "")}
                    onClick={() => setPicked(b)}
                  >
                    <span className="rr-option-main">
                      <span className="strong">{b.customer}</span>
                      <span className="cell-sub">{b.phone}</span>
                    </span>
                    <span className="rr-option-side">
                      <span>{b.vehicle}</span>
                      <span className="cell-sub">{fmtRange(b.start, b.end)}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="modal-actions">
              <button type="button" className="btn btn-ghost modal-btn" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary modal-btn"
                disabled={!picked}
                onClick={() => setStep("preview")}
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === "preview" && picked && (
          <>
            <h3 className="modal-title">Check the message</h3>
            <p className="modal-message">
              Sent by SMS to <span className="strong">{picked.phone}</span>.
            </p>
            <div className="rr-sms">{smsText(picked)}</div>
            <p className="field-note">One SMS, charged at your usual rate.</p>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost modal-btn"
                onClick={() => setStep("pick")}
                disabled={sending}
              >
                Back
              </button>
              <button
                type="button"
                className="btn btn-primary modal-btn"
                onClick={handleSend}
                disabled={sending}
              >
                {sending ? "Sending…" : "Send SMS"}
              </button>
            </div>
          </>
        )}

        {step === "sent" && result && (
          <>
            <h3 className="modal-title">Review requested</h3>
            <p className="modal-message">
              {picked.customer} will get the link at{" "}
              <span className="strong">{result.sent_to}</span>. Their review shows up
              here once they submit it.
            </p>
            <div className="rr-link">
              <span>{result.link}</span>
              <button type="button" className="btn btn-ghost modal-btn" onClick={copyLink}>
                Copy
              </button>
            </div>

            <div className="modal-actions">
              <a className="btn btn-ghost modal-btn" href={result.link} target="_blank" rel="noreferrer">
                Open review page
              </a>
              <button type="button" className="btn btn-primary modal-btn" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
