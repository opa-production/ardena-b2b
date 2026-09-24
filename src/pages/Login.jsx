import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PasswordField from "../components/PasswordField";
import { login, verifyLoginCode, resendLoginCode, takeSessionExpiredNotice } from "../lib/api";
import usePageTitle from "../hooks/usePageTitle";
import AuthWaves from "./AuthWaves";
import "./auth.css";

export default function Login() {
  usePageTitle("Sign in");
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  // Second step when the account has two-step sign-in on.
  const [challenge, setChallenge] = useState(null); // { challenge, sent_to }
  const [code, setCode] = useState("");
  // Sessions end after an hour; say so rather than just showing the form.
  const [expired] = useState(() => takeSessionExpiredNotice());

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await login(email.trim(), password);
      if (res?.two_factor_required) {
        setChallenge(res);
        setCode("");
        setBusy(false);
        return;
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function handleCode(e) {
    e.preventDefault();
    if (busy || code.length < 6) return;
    setBusy(true);
    setError(null);
    try {
      await verifyLoginCode(challenge.challenge, code);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
      setBusy(false);
      // An expired challenge means starting over from the password.
      if (err.status === 401) setChallenge(null);
    }
  }

  async function resend() {
    setError(null);
    try {
      const res = await resendLoginCode(challenge.challenge);
      setChallenge((c) => ({ ...c, sent_to: res.sent_to }));
    } catch (err) {
      setError(err.message);
    }
  }

  if (challenge) {
    return (
      <div className="auth">
        <AuthWaves />
        <main className="auth-card">
          <h1>Enter your code</h1>
          <p>
            We sent a 6-digit code to {challenge.sent_to}. It expires in 10 minutes.
          </p>
          <form className="auth-form" onSubmit={handleCode}>
            <div className="field">
              <label htmlFor="code">One-time code</label>
              <input
                id="code"
                className="auth-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="••••••"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                autoFocus
                required
              />
            </div>
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="btn btn-primary" disabled={busy || code.length < 6}>
              {busy ? "Checking…" : "Sign in"}
            </button>
          </form>
          <p className="auth-switch">
            Didn&apos;t get it?{" "}
            <button type="button" className="auth-linkish" onClick={resend}>
              Send another code
            </button>
          </p>
          <p className="auth-cancel">
            <button type="button" className="auth-linkish" onClick={() => setChallenge(null)}>
              Use a different account
            </button>
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="auth">
      <AuthWaves />

      <main className="auth-card">
        <h1>Welcome back</h1>
        <p>Sign in to your business dashboard.</p>
        {expired && (
          <p className="auth-notice" role="status">
            For your security, sessions end after an hour. Sign in again to carry on.
          </p>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Work email</label>
            <input
              id="email"
              type="email"
              placeholder="you@company.co.ke"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <PasswordField
            id="password"
            label="Password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Link to="/forgot-password" className="auth-forgot">
            Forgot password?
          </Link>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">
          New to Ardena? <Link to="/signup">Request access</Link>
        </p>
        {/* Replaces a floating round back button in the page corner. A word is
            clearer than an arrow about where it goes, and it sits with the
            other choices instead of hovering over the artwork. */}
        <p className="auth-cancel">
          <Link to="/">Cancel</Link>
        </p>
      </main>
    </div>
  );
}
