import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Logo from "../components/Logo";
import { acceptInvite } from "../lib/api";
import usePageTitle from "../hooks/usePageTitle";
import "./auth.css";

export default function AcceptInvite() {
  usePageTitle("Accept invite");
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="auth">
        <header className="auth-nav"><Logo /></header>
        <main className="auth-card">
          <h1>Invalid link</h1>
          <p>This invite link is missing or malformed. Ask your workspace admin to resend the invite.</p>
          <Link to="/login" className="btn btn-primary" style={{ marginTop: 20, display: "inline-block" }}>Go to sign in</Link>
        </main>
      </div>
    );
  }

  if (done) {
    return (
      <div className="auth">
        <header className="auth-nav"><Logo /></header>
        <main className="auth-card">
          <h1>Account activated</h1>
          <p>Your account is ready. Sign in with your email and the password you just set.</p>
          <Link to="/login" className="btn btn-primary" style={{ marginTop: 20, display: "inline-block" }}>Sign in</Link>
        </main>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await acceptInvite({ token, password });
      setDone(true);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <header className="auth-nav"><Logo /></header>

      <main className="auth-card">
        <h1>Set your password</h1>
        <p>You've been invited to an Ardena for Business workspace. Choose a password to activate your account.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              autoFocus
            />
          </div>
          <div className="field">
            <label htmlFor="confirm">Confirm password</label>
            <input
              id="confirm"
              type="password"
              placeholder="Re-enter password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
              required
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn btn-primary auth-submit" disabled={busy}>
            {busy ? "Activating…" : "Activate account"}
          </button>
        </form>

        <p className="auth-foot">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </main>
    </div>
  );
}
