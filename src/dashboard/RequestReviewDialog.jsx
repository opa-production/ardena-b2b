import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchPendingReviews,
  fetchReviewRequestPreview,
  requestBookingRating,
} from "../lib/api";
import { toast } from "./toastStore";
import "../components/confirm.css";
import "./ratings.css";

function fmtRange(start, end) {
  const opts = { day: "numeric", month: "short" };
  const a = new Date(start).toLocaleDateString("en-KE", opts);
  const b = new Date(end).toLocaleDateString("en-KE", { ...opts, year: "numeric" });
  return `${a} – ${b}`;
}

const STEPS = ["pick", "preview", "sent"];

/**
 * Ask a past renter for a review by SMS, and by email too when the client
 * record has an address.
 *
 * Three steps: pick a finished booking that hasn't been reviewed, check the
 * message exactly as it will go out (and what it costs from the wallet), send.
 * The renter gets a link to /r/:token, a one-screen page with stars and a
 * comment box. Opened with `bookingRef` it skips the pick step — that's the
 * star on a bookings-table row.
 */
export default function RequestReviewDialog({ onClose, onSent, bookingRef = null }) {
  const [step, setStep] = useState(bookingRef ? "preview" : "pick");
  const [bookings, setBookings] = useState(null);
  const [pickedRef, setPickedRef] = useState(bookingRef);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (bookingRef) return;
    fetchPendingReviews()
      .then((rows) => setBookings(rows || []))
      .catch((err) => {
        setBookings([]);
        toast(err.message || "Couldn't load finished trips", "danger");
      });
  }, [bookingRef]);

  useEffect(() => {
    if (step !== "preview" || !pickedRef) return;
    let alive = true;
    setPreview(null);
    setPreviewError("");
    fetchReviewRequestPreview(pickedRef)
      .then((p) => alive && setPreview(p))
      .catch((err) => alive && setPreviewError(err.message || "Couldn't prepare the message"));
    return () => {
      alive = false;
    };
  }, [step, pickedRef]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && !sending) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, sending]);

  async function handleSend() {
    if (sending) return;
    setSending(true);
    try {
      const res = await requestBookingRating(pickedRef);
      setResult(res);
      setStep("sent");
      onSent?.(pickedRef, res);
    } catch (err) {
      toast(err.message || "Couldn't send the review request", "danger");
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

  const short = preview && preview.sms_cost > preview.wallet_balance;
  const canSend = preview && preview.can_request && !short;
  const sent = (result?.channels || []).filter((c) => c.status === "sent");
  const failed = (result?.channels || []).filter((c) => c.status === "failed");

  return (
    <div className="modal-overlay" onMouseDown={() => !sending && onClose()}>
      <div
        className="modal-card rr-card"
        role="dialog"
        aria-modal="true"
        aria-label="Request a review"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <ol className="rr-steps" aria-label="Steps">
          {["Booking", "Message", "Sent"].map((label, i) => {
            const idx = STEPS.indexOf(step);
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
              Pick a finished trip. We&apos;ll text the renter a link to rate it, and
              email it too if we have their address.
            </p>

            {!bookings ? (
              <p className="field-note rr-empty">Loading bookings…</p>
            ) : bookings.length === 0 ? (
              <p className="field-note rr-empty">Every finished trip has been reviewed.</p>
            ) : (
              <div className="rr-list" role="radiogroup" aria-label="Bookings without a review">
                {bookings.map((b) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={pickedRef === b.ref}
                    key={b.ref}
                    className={"rr-option" + (pickedRef === b.ref ? " on" : "")}
                    onClick={() => setPickedRef(b.ref)}
                    disabled={!b.can_request}
                    title={b.blocked_reason || undefined}
                  >
                    <span className="rr-option-main">
                      <span className="strong">{b.customer}</span>
                      <span className="cell-sub">
                        {b.blocked_reason ||
                          (b.phone && b.email ? "SMS and email" : b.phone ? "SMS only" : "Email only")}
                      </span>
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
                disabled={!pickedRef}
                onClick={() => setStep("preview")}
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === "preview" && (
          <>
            <h3 className="modal-title">Check the message</h3>

            {previewError ? (
              <p className="modal-message">{previewError}</p>
            ) : !preview ? (
              <p className="field-note rr-empty">Preparing the message…</p>
            ) : (
              <>
                <p className="modal-message">
                  {preview.sms && (
                    <>
                      SMS to <span className="strong">{preview.sms.to}</span>
                    </>
                  )}
                  {preview.sms && preview.email && ", and "}
                  {preview.email && (
                    <>
                      {preview.sms ? "email" : "Email"} to{" "}
                      <span className="strong">{preview.email.to}</span>
                    </>
                  )}
                  .
                </p>
                <div className="rr-sms">{preview.sms?.text || preview.email?.subject}</div>
                <p className="field-note">
                  {preview.sms
                    ? `KES ${preview.sms_cost} from your wallet, which has KES ${Number(
                        preview.wallet_balance || 0
                      ).toLocaleString("en-KE")}.${preview.email ? " Email is free." : ""}`
                    : "Email only, no charge."}
                </p>
                {!preview.can_request && <p className="form-error">{preview.blocked_reason}</p>}
                {preview.can_request && short && (
                  <p className="form-error">
                    Your wallet can&apos;t cover this SMS.{" "}
                    <Link to="/dashboard/wallet" onClick={onClose}>
                      Top up the wallet
                    </Link>
                    .
                  </p>
                )}
              </>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost modal-btn"
                onClick={() => (bookingRef ? onClose() : setStep("pick"))}
                disabled={sending}
              >
                {bookingRef ? "Cancel" : "Back"}
              </button>
              <button
                type="button"
                className="btn btn-primary modal-btn"
                onClick={handleSend}
                disabled={sending || !canSend}
              >
                {sending ? "Sending…" : "Send request"}
              </button>
            </div>
          </>
        )}

        {step === "sent" && result && (
          <>
            <h3 className="modal-title">Review requested</h3>
            <p className="modal-message">
              Sent to <span className="strong">{sent.map((c) => c.sent_to).join(" and ")}</span>.
              Their review shows up on the Reviews page once they submit it.
            </p>
            {failed.length > 0 && (
              <p className="field-note">
                The {failed.map((c) => (c.channel === "sms" ? "SMS" : "email")).join(" and ")}{" "}
                couldn&apos;t be sent
                {failed.some((c) => c.channel === "sms") ? ", so it wasn't charged" : ""}.
              </p>
            )}
            <div className="rr-link">
              <span>{result.link}</span>
              <button type="button" className="btn btn-ghost modal-btn" onClick={copyLink}>
                Copy
              </button>
            </div>

            <div className="modal-actions">
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
