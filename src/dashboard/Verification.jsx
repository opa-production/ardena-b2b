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
import LoadingOverlay from "../components/LoadingOverlay";
import WalletTopup from "./WalletTopup";
import { toast } from "./toastStore";
import EmptyState from "./EmptyState";
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
    : "-";

export default function Verification() {
  const { wallet, lookups, walletLoaded } = useSyncExternalStore(subscribe, getState);
  const [type, setType] = useState(LOOKUP_TYPES[0]);
  const [number, setNumber] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null); // { entity, fullName, number } | { error }
  const [lookupOpen, setLookupOpen] = useState(false);

  useEffect(() => {
    hydrateVerification();
  }, []);

  const checkPrice = wallet.checkPrice || CHECK_PRICE;
  const [topupWaiting, setTopupWaiting] = useState(false);

  const stats = useMemo(() => {
    const monthPrefix = new Date().toISOString().slice(0, 7);
    const thisMonth = lookups.filter((c) => (c.date || "").startsWith(monthPrefix)).length;
    const verified = lookups.filter((c) => c.status === "Verified").length;
    return { total: lookups.length, thisMonth, verified };
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

  function openLookup() {
    reset();
    setLookupOpen(true);
  }

  /* The check is already recorded server-side by the time the result renders —
     `runLookup` refreshes the store — so closing is just dismissing the
     receipt. Clearing here means the next open starts on an empty form rather
     than the last person's result. */
  function closeLookup() {
    if (checking) return;
    setLookupOpen(false);
    reset();
  }

  const recent = lookups.slice(0, 7);

  return (
    <>
      {/* Both page actions, top right like every other page. Running a check
          leads: it is what the page is for, and topping up is the errand you
          only do because of it. */}
      <div className="page-actions">
        {/* Shared with the Wallet page: one wallet pays for checks and SMS. */}
        <WalletTopup onWaitingChange={setTopupWaiting} />
        <button
          type="button"
          className="btn btn-primary page-action-btn"
          onClick={openLookup}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New verification
        </button>
      </div>

      {/* Four figures. The wallet leads and carries colour because it is the
          one that stops the work when it runs out; the rest only report. Cream
          rather than ink: this sits above a white table all day, and a black
          slab in that position reads as an alert rather than a balance. */}
      <div className="stat-grid verify-stats">
        <article className="stat-card stat-card--cream">
          <p className="stat-label">KYC wallet</p>
          <p className="stat-value">
            {walletLoaded ? `KES ${wallet.balance.toLocaleString("en-KE")}` : "…"}
          </p>
          <p className="stat-note">
            {topupWaiting
              ? "Waiting for payment…"
              : `≈ ${Math.floor(wallet.balance / checkPrice)} checks left`}
          </p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Total checks</p>
          <p className="stat-value">{stats.total}</p>
          <p className="stat-note">all time</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">This month</p>
          <p className="stat-value">{stats.thisMonth}</p>
          <p className="stat-note">
            KES {(stats.thisMonth * checkPrice).toLocaleString("en-KE")} spent
          </p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Verified</p>
          <p className="stat-value">{stats.verified}</p>
          <p className="stat-note">
            {stats.total
              ? `${Math.round((stats.verified / stats.total) * 100)}% pass rate`
              : "no checks yet"}
          </p>
        </article>
      </div>

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
          <EmptyState minimal title="No checks yet" />
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

      {/* ---- New verification ----
           A modal, because running a check is a discrete errand with a result
           to read, not a permanent fixture of the page. It stays open on the
           result so the name can be read against the person standing there,
           and closing it is what files the check into the list below. */}
      {lookupOpen && (
        <div className="modal-overlay" onClick={() => !checking && closeLookup()}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">
              <h3>{result?.entity ? "Renter verified" : "New verification"}</h3>
              <button
                type="button"
                className="icon-btn"
                disabled={checking}
                onClick={closeLookup}
                aria-label="Close"
              >
                ✕
              </button>
            </header>

            {/* Result first once there is one — the form has done its job. */}
            {result?.entity ? (
              <div className="modal-body">
                <div className="verify-success">
                  <span className="verify-success-mark" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </span>
                  <p className="verify-success-name">{result.fullName}</p>
                  <p className="verify-success-note">Matched against the national registry</p>
                </div>

                <dl className="lookup-fields">
                  <div>
                    <dt>Date of birth</dt>
                    <dd>{fmtDob(result.entity.dob)}</dd>
                  </div>
                  <div>
                    <dt>Gender</dt>
                    <dd>{result.entity.gender || "-"}</dd>
                  </div>
                  <div>
                    <dt>{type}</dt>
                    <dd className="mono">{result.number}</dd>
                  </div>
                </dl>

                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={reset}>
                    Check another
                  </button>
                  <button type="button" className="btn btn-primary" onClick={closeLookup}>
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form className="modal-body" onSubmit={runCheck}>
                <label className="field-label">
                  Document type
                  <Dropdown value={type} onChange={setType} options={LOOKUP_TYPES} />
                </label>

                <label className="field-label">
                  Number
                  <input
                    className="field-input"
                    type="text"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder={PLACEHOLDER[type]}
                    disabled={checking}
                    required
                    autoFocus
                  />
                </label>

                {result?.error && (
                  <p className="verify-failed" role="alert">
                    {result.error}
                  </p>
                )}

                <p className="side-hint" style={{ marginTop: 0 }}>
                  KES {checkPrice} per check, drawn from your wallet.
                </p>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={checking}
                    onClick={closeLookup}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={checking || !number.trim()}
                  >
                    {checking ? "Checking…" : "Run check"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* One centred wait for both slow paths on this page. The registry
          lookup and the STK push are the two things a person actually stands
          and waits for, so the loader goes where the eye already is rather
          than inside the button that started it. */}
      {checking && (
        <LoadingOverlay
          label="Checking the registry…"
          note={`Looking up that ${type.toLowerCase()}.`}
        />
      )}


    </>
  );
}