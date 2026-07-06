import { useMemo, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { fmtDate } from "./bookingsStore";
import {
  LOOKUPS,
  LOOKUP_TYPES,
  STATUS_CHIP,
  CHECK_PRICE,
  WALLET_BALANCE,
  lookupIdentity,
  maskNumber,
} from "./verificationsStore";
import { markStep } from "./onboardingStore";
import { subscribe as subscribeDemo, getSampleData } from "./demoStore";
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
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function Verification() {
  const sampleData = useSyncExternalStore(subscribeDemo, getSampleData);

  const [type, setType] = useState(LOOKUP_TYPES[0]);
  const [number, setNumber] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null); // { entity } | { error }
  const [ownChecks, setOwnChecks] = useState([]); // lookups run this session

  const baseChecks = sampleData ? LOOKUPS : [];
  const checks = [...ownChecks, ...baseChecks];
  const wallet = sampleData ? WALLET_BALANCE : 0;

  const stats = useMemo(() => {
    const thisMonth = checks.filter((c) => c.date.startsWith("2026-07")).length;
    const verified = checks.filter((c) => c.status === "Verified").length;
    return { thisMonth, verified };
  }, [checks]);

  function runCheck(e) {
    e.preventDefault();
    if (!number.trim() || checking) return;
    setChecking(true);
    setResult(null);
    // stand-in for the Dojah lookup call; resolves in a moment
    setTimeout(() => {
      const res = lookupIdentity(type, number.trim());
      setChecking(false);
      markStep("verify");
      if (!res.found) {
        setResult({ error: res.reason });
        return;
      }
      const e2 = res.entity;
      const fullName = [e2.firstName, e2.middleName, e2.lastName].filter(Boolean).join(" ");
      setResult({ entity: e2, fullName });
      setOwnChecks((prev) => [
        {
          id: `CHK-${1043 + prev.length}`,
          customer: fullName,
          idType: type,
          idNumber: number.trim(),
          status: "Verified",
          ref: null,
          date: todayISO(),
        },
        ...prev,
      ]);
      toast(`${fullName} verified · KES ${CHECK_PRICE} from wallet.`);
    }, 900);
  }

  function reset() {
    setNumber("");
    setResult(null);
  }

  const recent = checks.slice(0, 7);

  return (
    <>
      <div className="stat-grid fleet-stats">
        <article className="stat-card">
          <p className="stat-label">Checks this month</p>
          <p className="stat-value">{stats.thisMonth}</p>
          <p className="stat-note">
            KES {(stats.thisMonth * CHECK_PRICE).toLocaleString("en-KE")} from your wallet
          </p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Renters verified</p>
          <p className="stat-value">{stats.verified}</p>
          <p className="stat-note">matched to the registry</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Check wallet</p>
          <p className="stat-value">KES {wallet.toLocaleString("en-KE")}</p>
          <p className="stat-note">
            ≈ {Math.floor(wallet / CHECK_PRICE)} checks ·{" "}
            <Link className="spec-link" to="/dashboard/billing">
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
        <p className="lookup-cost">KES {CHECK_PRICE} per check, drawn from your wallet.</p>

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
                <dd>{result.entity.gender}</dd>
              </div>
              <div>
                <dt>{type}</dt>
                <dd className="mono">{result.entity.idNumber}</dd>
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
          {checks.length > 0 && (
            <Link to="/dashboard/verification/all" className="btn btn-ghost toolbar-btn">
              All checks
            </Link>
          )}
        </div>

        {checks.length === 0 ? (
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
                  <td className="mono">{maskNumber(c.idNumber)}</td>
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
