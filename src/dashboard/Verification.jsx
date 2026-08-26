import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { fmtDate } from "./bookingsStore";
import {
  subscribe,
  getState,
  hydrateVerification,
  hydrateWallet,
  runLookup,
  startTopup,
  verifyTopup,
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
    return { total: lookups.length, thisMonth };
  }, [lookups]);

  /* ---- Top up the check wallet ----
     This lived on the Usage page until Usage became the chart and nothing
     else. It belongs here: this is the only screen that spends the wallet,
     so it should also be the one that fills it. */
  const [topupModal, setTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupMethod, setTopupMethod] = useState("mpesa");
  const [topupPhone, setTopupPhone] = useState("");
  const [topupBusy, setTopupBusy] = useState(false);
  const [topupWaiting, setTopupWaiting] = useState(false);
  const pollRef = useRef(null);
  const pollDeadlineRef = useRef(null);

  // stop polling if the user leaves mid-payment
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function stopTopupPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setTopupWaiting(false);
  }

  // Poll until Paystack confirms, then refresh the balance. 3-minute cap —
  // STK prompts expire on-device well before then.
  function startTopupPolling(reference) {
    setTopupWaiting(true);
    pollDeadlineRef.current = Date.now() + 3 * 60 * 1000;
    let inFlight = false;

    async function tick() {
      if (inFlight) return;
      inFlight = true;
      try {
        const res = await verifyTopup(reference);
        const status = String(res?.status || "");
        if (/success|paid|complete/i.test(status)) {
          stopTopupPolling();
          toast("Wallet topped up.");
        } else if (
          /fail|cancel|declin|timeout|expire/i.test(status) ||
          Date.now() > pollDeadlineRef.current
        ) {
          stopTopupPolling();
          await hydrateWallet().catch(() => {});
          toast("Top-up wasn't confirmed — the prompt may have expired. Try again.", "warn");
        }
        // still pending — retry next tick
      } catch {
        // network hiccup — retry next tick
      } finally {
        inFlight = false;
      }
    }

    pollRef.current = setInterval(tick, 6000);
  }

  function openTopupModal() {
    setTopupAmount("");
    setTopupMethod("mpesa");
    setTopupModal(true);
  }

  async function handleTopup(e) {
    e.preventDefault();
    if (topupBusy) return;
    const amount = Number(topupAmount);
    if (!amount || amount <= 0) {
      toast("Enter a top-up amount.", "danger");
      return;
    }
    if (topupMethod === "mpesa" && !topupPhone.trim()) {
      toast("Enter the M-Pesa phone number.", "danger");
      return;
    }
    setTopupBusy(true);
    try {
      const res = await startTopup({
        amount,
        method: topupMethod,
        phone: topupMethod === "mpesa" ? topupPhone.trim() : undefined,
      });
      const reference = res.reference || res.paystack_reference;
      if (topupMethod === "card" && res.checkout_url) {
        window.open(res.checkout_url, "_blank", "noopener,noreferrer");
        toast("Paystack checkout opened — complete your payment there.");
      } else {
        toast("STK push sent — enter your M-Pesa PIN to complete the top-up.");
      }
      setTopupModal(false);
      if (reference) startTopupPolling(reference);
    } catch (err) {
      toast(err.message || "Failed to start top-up", "danger");
    } finally {
      setTopupBusy(false);
    }
  }

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
      {/* Two numbers and the one action they lead to: how many checks you have
          run, what is left to run more, and the button that buys more. */}
      <div className="stat-grid verify-stats">
        <article className="stat-card">
          <p className="stat-label">Total checks</p>
          <p className="stat-value">{stats.total}</p>
          <p className="stat-note">{stats.thisMonth} this month</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Wallet</p>
          <p className="stat-value">
            {walletLoaded ? `KES ${wallet.balance.toLocaleString("en-KE")}` : "…"}
          </p>
          <p className="stat-note">
            ≈ {Math.floor(wallet.balance / checkPrice)} checks left
          </p>
        </article>
        <article className="stat-card stat-action">
          {topupWaiting ? (
            <>
              <p className="stat-label">Top up</p>
              <span className="pay-waiting">
                <span className="pay-waiting-dot" />
                Waiting…
              </span>
              <button type="button" className="stat-note stat-cancel" onClick={stopTopupPolling}>
                Stop waiting
              </button>
            </>
          ) : (
            <>
              <p className="stat-label">Top up</p>
              <button type="button" className="btn btn-primary stat-btn" onClick={openTopupModal}>
                Top up wallet
              </button>
              <p className="stat-note">M-Pesa or card</p>
            </>
          )}
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
            message="Look up a renter above to start."
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

      {/* ---- Top-up modal ---- */}
      {topupModal && (
        <div className="modal-overlay" onClick={() => !topupBusy && setTopupModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">
              <h3>Top up check wallet</h3>
              <button
                type="button"
                className="icon-btn"
                disabled={topupBusy}
                onClick={() => setTopupModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </header>
            <form onSubmit={handleTopup} className="modal-body">
              <label className="field-label">
                Amount (KES)
                <input
                  type="number"
                  min="1"
                  step="1"
                  className="field-input"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  placeholder="e.g. 1000"
                  required
                  autoFocus
                />
              </label>
              <fieldset className="provider-group">
                <legend className="field-label">Payment method</legend>
                <label className="provider-option">
                  <input
                    type="radio"
                    name="topup-method"
                    value="mpesa"
                    checked={topupMethod === "mpesa"}
                    onChange={() => setTopupMethod("mpesa")}
                  />
                  <span className="provider-pill mpesa-pill">M-Pesa</span>
                </label>
                <label className="provider-option">
                  <input
                    type="radio"
                    name="topup-method"
                    value="card"
                    checked={topupMethod === "card"}
                    onChange={() => setTopupMethod("card")}
                  />
                  <span className="provider-pill card-pill">Card</span>
                </label>
              </fieldset>
              {topupMethod === "mpesa" && (
                <label className="field-label">
                  M-Pesa phone
                  <input
                    type="tel"
                    className="field-input"
                    value={topupPhone}
                    onChange={(e) => setTopupPhone(e.target.value)}
                    placeholder="07XXXXXXXX"
                    required
                  />
                </label>
              )}
              <p className="side-hint" style={{ marginTop: 0 }}>
                {topupMethod === "mpesa"
                  ? "An STK push goes to this phone — enter the PIN to complete."
                  : "A Paystack checkout opens in a new tab."}
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={topupBusy}
                  onClick={() => setTopupModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn mpesa-btn" disabled={topupBusy}>
                  {topupBusy ? "Starting…" : "Top up"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
