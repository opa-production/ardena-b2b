/* Usage — one bar per day of the billing period, and nothing else.
 *
 * One of the three Account pages split out of the old single billing screen:
 * Usage answers "what am I running up, and when?", Billing answers "what do I
 * owe?", Plans answers "what am I on?".
 *
 * The body is the chart. The wallet balance and the Top up button live in the
 * page header rather than a card of their own — the action has to stay
 * reachable (Verification links here for it) without putting a second block
 * under the bars. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import PageSkeleton from "./PageSkeleton";
import { fetchBillingUsage, fetchWalletTransactions } from "../lib/api";
import { startTopup, verifyTopup } from "./verificationsStore";
import UsageBars from "./charts/UsageBars";
import EmptyState, { EMPTY_ICONS } from "./EmptyState";
import { toast } from "./toastStore";
import usePageTitle from "../hooks/usePageTitle";
import { fmtAmount, normalizeTxn } from "./billingFormat";
import "./overview.css";
import "./fleet.css";
import "./billing.css";
import "./bookings.css"; // modal + provider-pill + pay-waiting styles

const DAY = 86_400_000;
const isoDay = (d) => new Date(d).toISOString().slice(0, 10);

/* Build a continuous day-by-day series so the axis has no holes — a day with
 * no checks is a zero-height bar, not a missing one.
 *
 * The usage endpoint sends period totals, not a daily breakdown, so the series
 * is folded up from the dated wallet debits. If the API ever grows a `daily`
 * array, it wins: that would be the authoritative figure. */
function dailySeries(usage, txns) {
  if (Array.isArray(usage?.daily) && usage.daily.length > 0) {
    return usage.daily.map((d) => ({
      date: d.date,
      day: new Date(d.date).getDate(),
      value: Number(d.amount ?? d.value ?? 0),
      checks: Number(d.checks ?? 0),
    }));
  }

  const end = new Date();
  const start = usage?.period_start ? new Date(usage.period_start) : new Date(end - 29 * DAY);
  if (isNaN(start) || start > end) return [];

  const byDay = new Map();
  for (const t of txns) {
    if (t.isTopup || !t.date) continue;
    const cur = byDay.get(t.date) || { value: 0, checks: 0 };
    cur.value += t.amount;
    cur.checks += 1;
    byDay.set(t.date, cur);
  }

  const out = [];
  for (let d = new Date(isoDay(start)); d <= end; d = new Date(d.getTime() + DAY)) {
    const key = isoDay(d);
    const hit = byDay.get(key) || { value: 0, checks: 0 };
    out.push({ date: key, day: d.getDate(), value: hit.value, checks: hit.checks });
    if (out.length > 92) break; // guard against a nonsense period_start
  }
  return out;
}

export default function Usage() {
  usePageTitle("Usage");
  const { pathname } = useLocation();
  const [usage, setUsage] = useState(null);
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  // top-up modal + polling
  const [topupModal, setTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupMethod, setTopupMethod] = useState("mpesa");
  const [topupPhone, setTopupPhone] = useState("");
  const [topupBusy, setTopupBusy] = useState(false);
  const [topupWaiting, setTopupWaiting] = useState(false);
  const pollRef = useRef(null);
  const pollDeadlineRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [usageData, txData] = await Promise.all([
        fetchBillingUsage(),
        fetchWalletTransactions({ per_page: 100 }).catch(() => null),
      ]);
      setUsage(usageData);
      const rows = Array.isArray(txData) ? txData : txData?.data || [];
      setTxns(rows.map(normalizeTxn));
    } catch (err) {
      toast(err.message || "Failed to load usage", "danger");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // stop polling if the user leaves mid-payment
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const series = useMemo(() => dailySeries(usage, txns), [usage, txns]);

  function stopTopupPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setTopupWaiting(false);
  }

  // Poll the top-up until Paystack confirms it, then refresh the wallet figures.
  // 3-minute cap — STK prompts expire on-device well before then.
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
          await load();
          toast("Wallet topped up.");
        } else if (
          /fail|cancel|declin|timeout|expire/i.test(status) ||
          Date.now() > pollDeadlineRef.current
        ) {
          stopTopupPolling();
          await load();
          toast("Top-up wasn't confirmed — the prompt may have expired. You can try again.", "warn");
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

  if (loading) return <PageSkeleton path={pathname} />;

  const walletBalance = usage?.wallet_balance || 0;
  const checkPrice = usage?.check_price || 0;
  const checksLeft = checkPrice ? Math.floor(walletBalance / checkPrice) : 0;
  const spent = series.reduce((sum, d) => sum + d.value, 0);

  return (
    <>
      <header className="head-card">
        <div className="head-titles">
          <h1>Usage</h1>
          <p>
            Wallet KES {fmtAmount(walletBalance)} · ≈ {checksLeft} check
            {checksLeft === 1 ? "" : "s"} left
          </p>
        </div>
        {topupWaiting ? (
          <span className="pay-waiting">
            <span className="pay-waiting-dot" />
            Waiting for payment…
            <button type="button" className="icon-btn" onClick={stopTopupPolling}>
              Stop
            </button>
          </span>
        ) : (
          <button type="button" className="btn btn-primary" onClick={openTopupModal}>
            Top up
          </button>
        )}
      </header>

      <section className="chart-card">
        <header className="card-head">
          <h2>Daily usage</h2>
          <p>KES {fmtAmount(spent)} drawn from your wallet this period</p>
        </header>

        {series.length === 0 ? (
          <EmptyState
            icon={EMPTY_ICONS.chart}
            title="Nothing used yet"
            message="Once renter checks start running, each day's spend shows up here."
          />
        ) : (
          <UsageBars data={series} label="Wallet spend" />
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
                  ? "An STK push goes to this phone — enter the M-Pesa PIN to complete."
                  : "A Paystack checkout opens in a new tab to complete the card payment."}
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
