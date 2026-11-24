/* Stellar pilot chrome: the notice at the top of the dashboard, the pilot
 * sign-in the Stellar pages show first, and the "signed in to the pilot as…"
 * strip. Only used when the pilot runs on its own backend (STELLAR_SPLIT).
 */
import { useState, useSyncExternalStore } from "react";
import { Link, useLocation } from "react-router-dom";
import { pilotLogin, pilotVerifyCode } from "../lib/api";
import { STELLAR } from "../lib/features";
import { STELLAR_SPLIT } from "../lib/stellarConfig";
import {
  subscribe as subscribeStellar,
  getStellar,
  getPilotSession,
  clearPilotSession,
  refreshStellar,
} from "./stellarStore";
import { toast } from "./toastStore";
import "./stellar.css";

const DISMISS_KEY = "ardena-stellar-notice-dismissed";
const STELLAR_PATHS = ["/dashboard/stellar-wallet", "/dashboard/damage-claims"];

/** The banner over every dashboard page while the pilot is on. Dismissible
 *  everywhere except the Stellar pages themselves, where it always explains
 *  what the user is looking at. */
export function StellarPilotNotice() {
  const { pathname } = useLocation();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  if (!STELLAR || !STELLAR_SPLIT) return null;
  const onStellarPage = STELLAR_PATHS.some((p) => pathname.startsWith(p));
  if (dismissed && !onStellarPage) return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="st-notice" role="note">
      <span className="st-notice-tag">Pilot</span>
      <p>
        <strong>Stellar payments are in pilot.</strong> The Stellar wallet and Damage claims run
        on our test network with test USDC, which has no real value, and use a separate pilot
        sign-in. Your bookings, payments and everything else in your dashboard are live and
        not affected.
        {!onStellarPage && (
          <>
            {" "}
            <Link className="st-notice-link" to="/dashboard/stellar-wallet">
              Try the Stellar wallet
            </Link>
          </>
        )}
      </p>
      {!onStellarPage && (
        <button type="button" className="st-notice-close" onClick={dismiss} aria-label="Hide this notice">
          ×
        </button>
      )}
    </div>
  );
}

/** Wraps a Stellar page: the pilot sign-in until there is a pilot session,
 *  then the page with a strip saying which pilot account it is. */
export function PilotGate({ title, children }) {
  const stellar = useSyncExternalStore(subscribeStellar, getStellar);
  if (!STELLAR_SPLIT) return children;
  if (!stellar.signedIn) return <PilotSignIn title={title} />;
  const pilot = getPilotSession();
  return (
    <>
      <div className="st-pilot-strip">
        <span>
          Pilot account: <strong>{pilot?.user?.email || pilot?.user?.name || "signed in"}</strong>
          {pilot?.business?.name ? ` · ${pilot.business.name}` : ""}
          {pilot?.user?.role ? ` · ${pilot.user.role}` : ""}
        </span>
        <button type="button" className="icon-btn" onClick={clearPilotSession}>
          Sign out of pilot
        </button>
      </div>
      {children}
    </>
  );
}

function PilotSignIn({ title }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [challenge, setChallenge] = useState(null); // 2FA step
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      if (challenge) {
        await pilotVerifyCode(challenge.challenge, code.trim());
      } else {
        const res = await pilotLogin(email.trim(), password);
        if (res?.two_factor_required) {
          setChallenge(res);
          return;
        }
      }
      toast("Signed in to the Stellar pilot.");
      refreshStellar();
    } catch (err) {
      setError(
        err.status === 401 || err.status === 400
          ? err.message || "That email and password don't match a pilot account."
          : err.message || "Couldn't sign in to the pilot."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel-card st-empty st-signin">
      <h1 className="st-empty-title">{title}: sign in to the pilot</h1>
      <p className="cell-sub">
        Stellar features are being piloted on a separate test system, so they have their own
        account. Sign in with the pilot login Ardena gave you. This doesn&apos;t change your
        normal dashboard sign-in, and nothing here touches your live bookings or money.
      </p>
      <form className="st-signin-form" onSubmit={submit}>
        {!challenge ? (
          <>
            <div className="field">
              <label htmlFor="pilot-email">Pilot email</label>
              <input
                id="pilot-email"
                type="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="pilot-password">Pilot password</label>
              <input
                id="pilot-password"
                type="password"
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </>
        ) : (
          <div className="field">
            <label htmlFor="pilot-code">
              Enter the code we sent{challenge.sent_to ? ` to ${challenge.sent_to}` : ""}
            </label>
            <input
              id="pilot-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              autoFocus
              required
            />
          </div>
        )}
        {error && <p className="form-error">{error}</p>}
        <div className="st-send-actions">
          {challenge && (
            <button type="button" className="btn btn-ghost" onClick={() => { setChallenge(null); setCode(""); }}>
              Back
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Signing in…" : challenge ? "Verify" : "Sign in to pilot"}
          </button>
        </div>
      </form>
      <p className="cell-sub">No pilot account yet? Ask Ardena support to add your business to the pilot.</p>
    </section>
  );
}
