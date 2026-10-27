import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PasswordField from "../components/PasswordField";
import { login, verifyLoginCode, resendLoginCode, takeSessionExpiredNotice } from "../lib/api";
import usePageTitle from "../hooks/usePageTitle";
import AuthSplit from "./AuthSplit";
import "./auth.css";
import { submitWhenComplete } from "../lib/autoSubmit";

const SWAP = {
  title: "New to Ardena?",
  text: "Request access for your rental business. We verify every business and send logins within 24 hours.",
  to: "/signup",
  cta: "Request access",
  prompt: "New to Ardena?",
};

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
      <AuthSplit
        title="Enter your code"
        lede={<p>We sent a 6-digit code to {challenge.sent_to}. It expires in 10 minutes.</p>}
        swap={SWAP}
      >
        <form className="auth-form split-form" onSubmit={handleCode}>
          <div className="split-box">
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
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, ""));
                  submitWhenComplete(e);
                }}
                autoFocus
                required
              />
            </div>
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
      </AuthSplit>
    );
  }

  return (
    <AuthSplit
      title="Welcome back"
      lede={
        <>
          <p>Sign in to your business dashboard.</p>
          {expired && (
            <p className="auth-notice" role="status">
              For your security, sessions end after an hour. Sign in again to carry on.
            </p>
          )}
        </>
      }
      swap={SWAP}
    >
      <form className="auth-form split-form" onSubmit={handleSubmit}>
        {/* both fields in one sharp box, like Request access */}
        <div className="split-box">
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
        </div>
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

      <p className="auth-cancel">
        <Link to="/">Cancel</Link>
      </p>
    </AuthSplit>
  );
}
