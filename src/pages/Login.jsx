import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo";
import PasswordField from "../components/PasswordField";
import { login } from "../lib/api";
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

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <AuthWaves />
      <header className="auth-nav">
        <Logo />
      </header>

      <main className="auth-card">
        <h1>Welcome back</h1>
        <p>Sign in to your business dashboard.</p>

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
