import { useEffect, useRef, useState } from "react";
import { requestHostLinkCode, verifyHostLink } from "../lib/api";
import { toast } from "./toastStore";
import { hydrateFleet } from "./fleetStore";
import "../components/confirm.css";
import "./hostlink.css";

/**
 * Link an existing Ardena mobile host account to this workspace.
 *
 * Two steps: the owner enters the email of their host account, and one code goes
 * to *both* that email and the phone registered on the account. Linking hands
 * the workspace control of someone's vehicles, conversations and earnings, so
 * one channel alone isn't enough to prove ownership.
 *
 * On success the host's cars land in the fleet. They arrive with temporary
 * `LINK-*` plates because the consumer app never stored a number plate — that's
 * surfaced here rather than left for someone to discover in the fleet list.
 */
export default function HostLinkDialog({ suggestion, onClose, onLinked }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState(suggestion?.suggested_email || "");
  const [otp, setOtp] = useState("");
  const [phoneHint, setPhoneHint] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e) {
      if (e.key === "Escape" && step !== "done") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, step]);

  async function handleRequest(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const res = await requestHostLinkCode(email.trim());
      setPhoneHint(res?.phone_hint || null);
      setStep("otp");
    } catch (err) {
      setError(err.message || "Couldn't send the code");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const res = await verifyHostLink(email.trim(), otp.trim());
      setResult(res);
      setStep("done");
      // The fleet just gained vehicles; refresh it before the user gets there.
      hydrateFleet().catch(() => {});
      onLinked?.(res);
      toast(res?.message || "Host account linked.");
    } catch (err) {
      setError(err.message || "Couldn't verify that code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={step === "done" ? undefined : onClose}>
      <div
        className="modal-card hostlink-card"
        role="dialog"
        aria-modal="true"
        aria-label="Link your Ardena host account"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {step === "email" && (
          <>
            <h3 className="modal-title">Already list cars on the Ardena app?</h3>
            <p className="modal-message">
              {suggestion?.suggested_email
                ? `We found a host account on ${suggestion.suggested_email}${
                    suggestion.suggested_car_count
                      ? ` with ${suggestion.suggested_car_count} vehicle${
                          suggestion.suggested_car_count > 1 ? "s" : ""
                        }`
                      : ""
                  }. Link it and everything comes across — vehicles, reviews, messages and earnings.`
                : "Link it and everything comes across, your vehicles, reviews, messages and earnings. Nothing is re-listed and no bookings are interrupted."}
            </p>
            <form onSubmit={handleRequest} className="hostlink-form">
              <div className="field">
                <label htmlFor="hl-email">Host account email</label>
                <input
                  ref={inputRef}
                  id="hl-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
                <p className="field-note">
                  We&apos;ll send one code to this email and to the phone number on
                  that account.
                </p>
              </div>
              {error && <p className="form-error">{error}</p>}
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost modal-btn" onClick={onClose}>
                  Not now
                </button>
                <button type="submit" className="btn btn-primary modal-btn" disabled={busy}>
                  {busy ? "Sending…" : "Send code"}
                </button>
              </div>
            </form>
          </>
        )}

        {step === "otp" && (
          <>
            <h3 className="modal-title">Enter the code</h3>
            <p className="modal-message">
              Sent to <strong>{email}</strong>
              {phoneHint ? (
                <>
                  {" "}
                  and to the phone ending <strong>{phoneHint.slice(-3)}</strong>
                </>
              ) : null}
              . It expires in 10 minutes.
            </p>
            <form onSubmit={handleVerify} className="hostlink-form">
              <div className="field">
                <label htmlFor="hl-otp">6-digit code</label>
                <input
                  id="hl-otp"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  autoComplete="one-time-code"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="hostlink-otp"
                  placeholder="000000"
                />
              </div>
              {error && <p className="form-error">{error}</p>}
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost modal-btn"
                  onClick={() => {
                    setStep("email");
                    setOtp("");
                    setError("");
                  }}
                >
                  Back
                </button>
                <button type="submit" className="btn btn-primary modal-btn" disabled={busy}>
                  {busy ? "Linking…" : "Link account"}
                </button>
              </div>
            </form>
          </>
        )}

        {step === "done" && (
          <>
            <h3 className="modal-title">Account linked</h3>
            <p className="modal-message">
              {result?.vehicles_imported
                ? `${result.vehicles_imported} vehicle${
                    result.vehicles_imported > 1 ? "s" : ""
                  } added to your fleet. Their reviews, messages and booking history came with them.`
                : "Your host account is now managed from this workspace."}
            </p>

            {/* The consumer app has no plate field, so imported vehicles carry a
                temporary ID. Saying so here avoids a fleet full of LINK-* rows
                that nobody can explain. */}
            {result?.vehicles_needing_plate?.length > 0 && (
              <div className="hostlink-todo">
                <strong>One thing left.</strong> The Ardena app doesn&apos;t store
                number plates, so {result.vehicles_needing_plate.length} vehicle
                {result.vehicles_needing_plate.length > 1 ? "s" : ""} came in with a
                temporary ID. Open each in Fleet and set its real plate.
                <ul>
                  {result.vehicles_needing_plate.slice(0, 6).map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                  {result.vehicles_needing_plate.length > 6 && (
                    <li>+{result.vehicles_needing_plate.length - 6} more</li>
                  )}
                </ul>
              </div>
            )}

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
