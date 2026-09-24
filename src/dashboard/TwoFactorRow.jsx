import { useEffect, useState } from "react";
import {
  askForStepUpCode,
  confirmTwoFactorSetup,
  disableTwoFactor,
  fetchTwoFactor,
  startTwoFactorSetup,
} from "../lib/api";
import { toast } from "./toastStore";
import "./security.css";

/* Two-step sign-in, as one row of the Password & security card.

   Setup is a small dialog: pick where codes go (the login email, or a mobile
   number added here), receive a code there, type it back. Only then is it on —
   so a mistyped number can't lock anyone out. Turning it off asks for a code
   too; otherwise it would be the easy way around it. */
export default function TwoFactorRow() {
  const [status, setStatus] = useState(null);
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState("choose"); // choose → code
  const [channel, setChannel] = useState("email");
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchTwoFactor()
      .then(setStatus)
      .catch(() => setStatus({ enabled: false }));
  }, []);

  function openSetup() {
    setStage("choose");
    setChannel("email");
    setPhone(status?.phone || "");
    setCode("");
    setOpen(true);
  }

  async function sendCode(e) {
    e?.preventDefault();
    if (busy) return;
    if (channel === "sms" && !phone.trim()) {
      toast("Add the mobile number codes should go to.", "danger");
      return;
    }
    setBusy(true);
    try {
      const res = await startTwoFactorSetup(channel, channel === "sms" ? phone.trim() : null);
      setSentTo(res.sent_to);
      setStage("code");
    } catch (err) {
      toast(err.message || "Couldn't send a code", "danger");
    } finally {
      setBusy(false);
    }
  }

  async function confirm(e) {
    e.preventDefault();
    if (busy || code.length < 6) return;
    setBusy(true);
    try {
      const next = await confirmTwoFactorSetup(code);
      setStatus(next);
      setOpen(false);
      toast("Two-step sign-in is on. You'll need a code each time you sign in.");
    } catch (err) {
      toast(err.message || "That code didn't work", "danger");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    try {
      const c = await askForStepUpCode("Turning off two-step sign-in needs a code.");
      const next = await disableTwoFactor(c);
      setStatus(next);
      toast("Two-step sign-in is off.");
    } catch (err) {
      toast(err.message || "Couldn't turn it off", "danger");
    }
  }

  const on = Boolean(status?.enabled);

  return (
    <>
      <div className="sec-row">
        <div className="sec-row-text">
          <strong>Two-step sign-in (2FA)</strong>
          {status == null ? (
            <span>Checking…</span>
          ) : on ? (
            <span>
              <span className="sec-on">On</span> · codes go to {status.sent_to} at sign-in and
              before sensitive changes
            </span>
          ) : (
            <span>Off · add a code by email or SMS at sign-in</span>
          )}
        </div>
        {status != null &&
          (on ? (
            <button type="button" className="btn btn-ghost" onClick={turnOff}>
              Turn off
            </button>
          ) : (
            <button type="button" className="btn btn-2fa" onClick={openSetup}>
              Set up 2FA
            </button>
          ))}
      </div>

      {open && (
        <div className="modal-overlay" onClick={() => !busy && setOpen(false)}>
          <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="tfa-title" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">
              <h3 id="tfa-title">Set up two-step sign-in</h3>
              <button type="button" className="icon-btn" disabled={busy} onClick={() => setOpen(false)} aria-label="Close">
                ✕
              </button>
            </header>

            {stage === "choose" ? (
              <form className="modal-body" onSubmit={sendCode}>
                <p className="side-hint" style={{ marginTop: 0 }}>
                  After your password, we&apos;ll ask for a 6-digit code. We&apos;ll also ask
                  for one before sensitive changes like staff roles. Where should codes go?
                </p>
                <div className="channel-opts" role="radiogroup" aria-label="Where codes go">
                  <label className={`channel-opt${channel === "email" ? " is-on" : ""}`}>
                    <input type="radio" name="tfa-channel" checked={channel === "email"} onChange={() => setChannel("email")} />
                    <div>
                      <strong>Email</strong>
                      <span>{status?.email}</span>
                    </div>
                  </label>
                  <label className={`channel-opt${channel === "sms" ? " is-on" : ""}`}>
                    <input type="radio" name="tfa-channel" checked={channel === "sms"} onChange={() => setChannel("sms")} />
                    <div>
                      <strong>Text message (SMS)</strong>
                      <span>To a mobile number you add below</span>
                    </div>
                  </label>
                </div>
                {channel === "sms" && (
                  <label className="field-label">
                    Mobile number
                    <input
                      className="field-input"
                      type="tel"
                      autoComplete="tel"
                      placeholder="0712 345 678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoFocus
                    />
                  </label>
                )}
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={busy}>
                    {busy ? "Sending…" : "Send code"}
                  </button>
                </div>
              </form>
            ) : (
              <form className="modal-body" onSubmit={confirm}>
                <p className="side-hint" style={{ marginTop: 0 }}>
                  Enter the code we sent to {sentTo}. It&apos;s on once this checks out.
                </p>
                <input
                  className="field-input otp-input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="••••••"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  aria-label="One-time code"
                  autoFocus
                />
                <p className="side-hint">
                  Didn&apos;t get it?{" "}
                  <button type="button" className="auth-linkish" onClick={sendCode} disabled={busy}>
                    Send another
                  </button>{" "}
                  ·{" "}
                  <button type="button" className="auth-linkish" onClick={() => setStage("choose")} disabled={busy}>
                    Change where it goes
                  </button>
                </p>
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={busy || code.length < 6}>
                    {busy ? "Checking…" : "Turn on"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
