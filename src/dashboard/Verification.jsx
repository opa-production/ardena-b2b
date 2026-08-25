import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { fmtDate } from "./bookingsStore";
import {
  subscribe,
  getState,
  hydrateVerification,
  runLookup,
  LOOKUP_TYPES,
  STATUS_CHIP,
  CHECK_PRICE,
} from "./verificationsStore";
import Dropdown from "../components/Dropdown";
import { toast } from "./toastStore";
import EmptyState, { EMPTY_ICONS } from "./EmptyState";
import "./fleet.css";
import "./bookings.css";
import "./verification.css";

const PLACEHOLDER = {
  "National ID": "e.g. 29845112",
  "Driver's Licence": "e.g. DLA0492187",
  "KRA PIN": "e.g. A004471019P",
};

const fmtDob = (iso) =>
  iso
    ? new Date(`${String(iso).slice(0, 10)}T00:00:00`).toLocaleDateString("en-KE", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

export default function Verification() {
  const { wallet, lookups, walletLoaded } = useSyncExternalStore(subscribe, getState);
  const [type, setType] = useState(LOOKUP_TYPES[0]);
  const [number, setNumber] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null); // { entity, fullName, number } | { error }

  useEffect(() => {
    hydrateVerification();
  }, []);

  const checkPrice = wallet.checkPrice || CHECK_PRICE;

  const stats = useMemo(() => {
    const monthPrefix = new Date().toISOString().slice(0, 7);
    const thisMonth = lookups.filter((c) => (c.date || "").startsWith(monthPrefix)).length;
    const verified = lookups.filter((c) => c.status === "Verified").length;
    return { thisMonth, verified };
  }, [lookups]);

  async function runCheck(e) {
    e.preventDefault();
    const num = number.trim();
    if (!num || checking) return;
    setChecking(true);
    setResult(null);
    try {
      const res = await runLookup({ type, number: num });
      if (res.status === "Verified") {
        setResult({ entity: res.entity, fullName: res.fullName, number: num });
        toast(`${res.fullName} verified · KES ${checkPrice} from wallet.`);
      } else {
        setResult({
          error:
            res.status === "Mismatch"
              ? "The details didn't match that number."
              : "No record found for that number.",
        });
      }
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setChecking(false);
    }
  }

  function reset() {
    setNumber("");
    setResult(null);
  }

  const recent = lookups.slice(0, 7);

  return (
    <>
      <div className="stat-grid fleet-stats">
        <article className="stat-card">
          <p className="stat-label">Checks this month</p>
          <p className="stat-value">{stats.thisMonth}</p>
          <p className="stat-note">
            KES {(stats.thisMonth * checkPrice).toLocaleString("en-KE")} from your wallet
          </p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Renters verified</p>
          <p className="stat-value">{stats.verified}</p>
          <p className="stat-note">matched to the registry</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Check wallet</p>
          <p className="stat-value">
            {walletLoaded ? `KES ${wallet.balance.toLocaleString("en-KE")}` : "…"}
          </p>
          <p className="stat-note">
            ≈ {Math.floor(wallet.balance / checkPrice)} checks ·{" "}
            <Link className="spec-link" to="/dashboard/usage">
              top up
            </Link>
          </p>
        </article>
      </div>

      <section className="panel-card lookup-card">
        <header className="card-head">
          <h2>Verify a renter</h2>
          <p>Enter their ID or licence number to check it against the national registry.</p>
        </header>

        <form className="lookup-form" onSubmit={runCheck}>
          <div className="lookup-type">
            <Dropdown value={type} onChange={setType} options={LOOKUP_TYPES} />
          </div>
          <input
            className="lookup-input"
            type="text"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder={PLACEHOLDER[type]}
            aria-label="ID or licence number"
          />
          <button type="submit" className="btn btn-primary lookup-btn" disabled={checking || !number.trim()}>
            {checking ? "Checking…" : "Run check"}
          </button>
        </form>
        <p className="lookup-cost">KES {checkPrice} per check, drawn from your wallet.</p>

        {checking && (
          <div className="lookup-result">
            <div className="result-checking">
              <span className="result-spinner" />
              Checking {type}…
            </div>
          </div>
        )}

        {!checking && result?.entity && (
          <div className="lookup-result">
            <div className="lookup-result-head">
              <span className="lookup-verified">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Verified against the registry
              </span>
              <button type="button" className="lookup-new" onClick={reset}>
                New check
              </button>
            </div>
            <dl className="lookup-fields">
              <div>
                <dt>Full name</dt>
                <dd>{result.fullName}</dd>
              </div>
              <div>
                <dt>Date of birth</dt>
                <dd>{fmtDob(result.entity.dob)}</dd>
              </div>
              <div>
                <dt>Gender</dt>
                <dd>{result.entity.gender || "—"}</dd>
              </div>
              <div>
                <dt>{type}</dt>
                <dd className="mono">{result.number}</dd>
              </div>
            </dl>
          </div>
        )}

        {!checking && result?.error && (
          <div className="lookup-result is-error">
            <span className="lookup-failed">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
              {result.error}
            </span>
            <button type="button" className="lookup-new" onClick={reset}>
              Try again
            </button>
          </div>
        )}
      </section>

      <section className="panel-card">
        <div className="fleet-toolbar">
          <header className="card-head no-gap">
            <h2>Recent checks</h2>
            <p>Renters you've run through Dojah</p>
          </header>
          {lookups.length > 0 && (
            <Link to="/dashboard/verification/all" className="btn btn-ghost toolbar-btn">
              All checks
            </Link>
          )}
        </div>

        {lookups.length === 0 ? (
          <EmptyState
            compact
            icon={EMPTY_ICONS.verification}
            title="No checks yet"
            message="Look up a renter's ID or licence above and it appears here."
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Renter</th>
                <th>Type</th>
                <th>Number</th>
                <th>Result</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((c) => (
                <tr key={c.id}>
                  <td>
                    <p className="strong">{c.customer}</p>
                    <p className="cell-sub">
                      {c.ref ? (
                        <Link className="spec-link" to={`/dashboard/bookings/${encodeURIComponent(c.ref)}`}>
                          {c.ref}
                        </Link>
                      ) : (
                        "Walk-in"
                      )}
                    </p>
                  </td>
                  <td>{c.idType}</td>
                  <td className="mono">{c.idNumber}</td>
                  <td>
                    <span className={`chip ${STATUS_CHIP[c.status]}`}>{c.status}</span>
                  </td>
                  <td>{fmtDate(c.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
