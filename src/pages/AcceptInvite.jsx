import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { acceptInvite } from "../lib/api";
import usePageTitle from "../hooks/usePageTitle";
import "./auth.css";

/* Why the activation failed, said in a sentence the person can act on.
 *
 * The backend answers a duplicate email with a 500 and a generic body — the
 * unique-constraint violation never reaches the browser — so "Something went
 * wrong. Please try again." was the whole message, and trying again produced
 * exactly the same wall. These map the statuses this endpoint can actually
 * return onto the two things that are really happening: the link is spent, or
 * the address already has an account.
 *
 * The API's own message wins wherever it says something specific; this only
 * fills the silence. */
function explainFailure(err) {
  const raw = String(err?.message || "");
  const detail = raw.toLowerCase();
  const generic =
    !raw || detail.startsWith("something went wrong") || detail.includes("internal server");

  if (detail.includes("already exists") || detail.includes("duplicate") || err?.status === 409) {
    return {
      title: "That email already has an account",
      body: "Sign in with your existing password instead — the invite doesn't need accepting. If you've forgotten it, use “Forgot password” on the sign-in page.",
    };
  }

  if (err?.status === 400 || err?.status === 404 || err?.status === 410) {
    return {
      title: generic ? "This invite link is no longer valid" : raw,
      body: "It may have already been used, or it has expired. Ask your workspace admin to send a fresh invite.",
    };
  }

  if (err?.status === 0) {
    return { title: raw, body: "" };
  }

  if (err?.status >= 500 || generic) {
    return {
      title: "We couldn't activate this account",
      body: "This usually means the email on the invite already has an Ardena account — try signing in instead. If that isn't it, ask your admin to re-send the invite and let us know.",
    };
  }

  return { title: raw, body: "" };
}

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
      setError({ title: "Passwords don't match.", body: "" });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await acceptInvite({ token, password });
      setDone(true);
    } catch (err) {
      setError(explainFailure(err));
      setBusy(false);
    }
  }

  return (
    <div className="auth">

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

          {error && (
            <div className="auth-error" role="alert">
              <strong>{error.title}</strong>
              {error.body && <span>{error.body}</span>}
            </div>
          )}

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
