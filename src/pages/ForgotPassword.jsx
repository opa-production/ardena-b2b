import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import usePageTitle from "../hooks/usePageTitle";
import { forgotPassword, resetPassword } from "../lib/api";
import "./auth.css";

/* OTP reset flow: we email a one-time code, then take code + new password.
   `startAtReset` serves /reset-password for users who already have a code. */
export default function ForgotPassword({ startAtReset = false }) {
  usePageTitle("Reset password");
  const [stage, setStage] = useState(startAtReset ? "reset" : "email"); // email → reset → done
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleSendCode(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await forgotPassword(email.trim());
      setStage("reset");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    if (busy) return;
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await resetPassword({ email: email.trim(), otp: otp.trim(), newPassword: password });
      setStage("done");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <Link to="/login" className="auth-back" aria-label="Back to sign in">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </Link>
      <header className="auth-nav">
        <Logo />
      </header>

      {stage === "done" ? (
        <main className="auth-card">
          <span className="request-check" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </span>
          <h1>Password updated.</h1>
          <p>You can now sign in with your new password.</p>
          <Link to="/login" className="btn btn-primary">
            Sign in
          </Link>
        </main>
      ) : stage === "email" ? (
        <main className="auth-card">
          <h1>Reset your password</h1>
          <p>Enter your work email and we'll send you a one-time code.</p>

          <form className="auth-form" onSubmit={handleSendCode}>
            <div className="field">
              <label htmlFor="fp-email">Work email</label>
              <input
                id="fp-email"
                type="email"
                placeholder="you@company.co.ke"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Sending…" : "Email me a code"}
            </button>
          </form>

          <p className="auth-switch">
            Already have a code?{" "}
            <button type="button" className="auth-linkish" onClick={() => setStage("reset")}>
              Enter it here
            </button>
          </p>
        </main>
      ) : (
        <main className="auth-card">
          <h1>Enter your code</h1>
          <p>
            {email
              ? `We sent a one-time code to ${email}.`
              : "Enter the one-time code we emailed you."}
          </p>

          <form className="auth-form" onSubmit={handleReset}>
            {!email && (
              <div className="field">
                <label htmlFor="fp-email2">Work email</label>
                <input
                  id="fp-email2"
                  type="email"
                  placeholder="you@company.co.ke"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="field">
              <label htmlFor="fp-otp">One-time code</label>
              <input
                id="fp-otp"
                type="text"
                inputMode="numeric"
                placeholder="123456"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="fp-pass">New password</label>
              <input
                id="fp-pass"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="fp-confirm">Confirm new password</label>
              <input
                id="fp-confirm"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Updating…" : "Set new password"}
            </button>
          </form>

          <p className="auth-switch">
            Didn't get it?{" "}
            <button type="button" className="auth-linkish" onClick={() => setStage("email")}>
              Send another code
            </button>
          </p>
        </main>
      )}
    </div>
  );
}
