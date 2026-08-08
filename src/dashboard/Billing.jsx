import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageSkeleton from "./PageSkeleton";
import {
  fetchSubscription,
  fetchInvoices,
  payInvoiceMpesa,
  checkInvoiceCharge,
  fetchBillingUsage,
  fetchWalletTransactions,
} from "../lib/api";
import { startTopup, verifyTopup } from "./verificationsStore";
import BillingTimeline from "./charts/BillingTimeline";
import EmptyState, { EMPTY_ICONS } from "./EmptyState";
import { toast } from "./toastStore";
import "./overview.css";
import "./fleet.css";
import "./billing.css";
import "./bookings.css"; // modal + provider-pill + pay-waiting styles

const fmtAmount = (n) => Number(n).toLocaleString("en-KE");

const STATUS_CHIP = {
  trial: "pending",
  active: "active",
  past_due: "cancelled",
};

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-KE", { dateStyle: "medium" });
}

// The wallet-transactions endpoint mixes top-ups (money in) with per-check
// debits (money out); field names aren't pinned down in the docs, so read them
// defensively and treat anything that isn't clearly a check/debit as a top-up.
function normalizeTxn(t) {
  const kind = String(t.type || t.kind || t.category || "").toLowerCase();
  const amount = Math.abs(Number(t.amount) || 0);
  const isTopup = /top|credit|deposit|fund/.test(kind)
    ? true
    : /check|debit|lookup|verif/.test(kind)
    ? false
    : Number(t.amount) > 0;
  return {
    id: t.id || t.reference || `${t.date || ""}-${t.amount}`,
    amount,
    isTopup,
    status: String(t.status || "completed").toLowerCase(),
    method: t.method || t.channel || t.description || (isTopup ? "Top-up" : "Renter check"),
    date: (t.date || t.created_at || "").slice(0, 10),
  };
}

export default function Billing() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [sub, setSub] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [usage, setUsage] = useState(null);
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  // invoice STK push modal
  const [invModal, setInvModal] = useState(null); // the invoice being paid, or null
  const [invPhone, setInvPhone] = useState("");
  const [invProvider, setInvProvider] = useState("mpesa");
  const [invBusy, setInvBusy] = useState(false);
  const [invWaiting, setInvWaiting] = useState(false);
  const invPollRef = useRef(null);
  const invPollDeadlineRef = useRef(null);
  const invPsRefRef = useRef(null);

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
      const [subData, invData, usageData, txData] = await Promise.all([
        fetchSubscription(),
        fetchInvoices(),
        fetchBillingUsage(),
        fetchWalletTransactions({ per_page: 100 }).catch(() => null),
      ]);
      setSub(subData);
      setInvoices(invData.data || []);
      setUsage(usageData);
      const rows = Array.isArray(txData) ? txData : txData?.data || [];
      setTxns(rows.map(normalizeTxn));
    } catch (err) {
      toast(err.message || "Failed to load billing", "danger");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // stop all polling if the user leaves the page mid-payment
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (invPollRef.current) clearInterval(invPollRef.current);
    };
  }, []);

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
        } else if (/fail|cancel|declin|timeout|expire/i.test(status) || Date.now() > pollDeadlineRef.current) {
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

  function stopInvPolling() {
    if (invPollRef.current) { clearInterval(invPollRef.current); invPollRef.current = null; }
    invPsRefRef.current = null;
    setInvWaiting(false);
  }

  function startInvPolling(psRef) {
    invPsRefRef.current = psRef;
    setInvWaiting(true);
    invPollDeadlineRef.current = Date.now() + 3 * 60 * 1000;
    let inFlight = false;

    async function tick() {
      if (inFlight) return;
      inFlight = true;
      try {
        const ref = invPsRefRef.current;
        if (!ref) { stopInvPolling(); return; }

        if (Date.now() > invPollDeadlineRef.current) {
          stopInvPolling();
          toast("STK push expired — please try again.", "warn");
          await load();
          return;
        }

        const res = await checkInvoiceCharge(ref);
        if (res.charge_status === "success") {
          stopInvPolling();
          toast("Payment confirmed! Your subscription is active.");
          navigate("/dashboard");
        } else if (res.charge_status === "failed" || res.charge_status === "timeout") {
          stopInvPolling();
          await load();
          toast(res.message || "Payment was not completed. You can try again.", "danger");
        }
        // pending / error → retry next tick silently
      } catch {
        // network hiccup — retry
      } finally {
        inFlight = false;
      }
    }

    invPollRef.current = setInterval(tick, 10000);
  }

  function openInvModal(inv) {
    setInvModal(inv);
    setInvPhone("");
    setInvProvider("mpesa");
  }

  async function handleInvMpesa(e) {
    e.preventDefault();
    if (invBusy || !invModal) return;
    const phone = invPhone.trim();
    if (!phone) { toast("Enter your M-Pesa phone number.", "danger"); return; }
    setInvBusy(true);
    try {
      const res = await payInvoiceMpesa(invModal.ref, { phone, provider: invProvider });
      setInvModal(null);
      toast(res.message || "STK push sent — enter your PIN.");
      if (res.paystack_reference) startInvPolling(res.paystack_reference);
    } catch (err) {
      toast(err.message || "Failed to send payment request.", "danger");
    } finally {
      setInvBusy(false);
    }
  }

  if (loading) return <PageSkeleton path={pathname} />;

  const totalSpend = usage ? usage.total : 0;
  const paidInvoices = invoices.filter((i) => i.status === "Paid");
  const topups = txns.filter((t) => t.isTopup && t.status === "completed");
  const toppedUpTotal = topups.reduce((sum, t) => sum + t.amount, 0);

  return (
    <>
      {/* ---- Subscription summary strip ---- */}
      {sub && (
        <div className="stat-grid fleet-stats" style={{ marginBottom: "1.5rem" }}>
          <article className="stat-card">
            <p className="stat-label">Plan</p>
            <p className="stat-value">{sub.plan}</p>
            <p className="stat-note">
              <span className={`chip ${STATUS_CHIP[sub.status] || "pending"}`} style={{ fontSize: "11px" }}>
                {sub.status === "trial" ? "Free trial" : sub.status === "past_due" ? "Past due" : "Active"}
              </span>
            </p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Vehicles on plan</p>
            <p className="stat-value">{sub.vehicle_count}</p>
            <p className="stat-note">KES {fmtAmount(sub.rate)} / vehicle / month</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Monthly total</p>
            <p className="stat-value">KES {fmtAmount(sub.monthly_total)}</p>
            <p className="stat-note">KES 2,000 minimum applies</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">
              {sub.status === "trial" ? "Trial ends" : "Launch rate until"}
            </p>
            <p className="stat-value" style={{ fontSize: "1.25rem" }}>
              {fmtDate(sub.status === "trial" ? sub.trial_ends : sub.launch_rate_until)}
            </p>
            <p className="stat-note">
              {sub.status === "trial"
                ? "No charge until trial ends"
                : `KES ${fmtAmount(400)} / vehicle after this`}
            </p>
          </article>
        </div>
      )}

      {/* ---- Charts ---- */}
      <div className="chart-row">
        <section className="chart-card">
          <header className="card-head">
            <h2>What you've paid</h2>
            <p>Your monthly bill over time</p>
          </header>
          {paidInvoices.length > 0 ? (
            <BillingTimeline />
          ) : (
            <EmptyState
              icon={EMPTY_ICONS.payments}
              title="No payments yet"
              message="Your paid invoices will chart here once your first billing cycle closes."
            />
          )}
        </section>

        <section className="chart-card">
          <header className="card-head">
            <h2>This month</h2>
            <p>
              {usage
                ? `KES ${fmtAmount(totalSpend)} · what this month is made of`
                : "Loading usage…"}
            </p>
          </header>

          {usage && (
            <>
              <div className="usage-list">
                {usage.items.map((item) => (
                  <div className="usage-row" key={item.label}>
                    <div className="usage-head">
                      <span className="usage-label">{item.label}</span>
                      <span className="usage-amount">KES {fmtAmount(item.amount)}</span>
                    </div>
                    <span className="usage-bar">
                      <i
                        style={{
                          width: totalSpend ? `${(item.amount / totalSpend) * 100}%` : "0%",
                          background: item.color,
                        }}
                      />
                    </span>
                    <span className="usage-detail">{item.detail}</span>
                  </div>
                ))}
              </div>

              <div className="wallet-strip">
                <div>
                  <p className="wallet-label">Check wallet</p>
                  <p className="wallet-sub">
                    KES {fmtAmount(usage.wallet_balance)} · ≈{" "}
                    {Math.floor(usage.wallet_balance / usage.check_price)} checks left
                  </p>
                </div>
                {topupWaiting ? (
                  <span className="pay-waiting">
                    <span className="pay-waiting-dot" />
                    Waiting for payment…
                    <button type="button" className="icon-btn" onClick={stopTopupPolling}>Stop</button>
                  </span>
                ) : (
                  <button type="button" className="btn wallet-btn" onClick={openTopupModal}>
                    Top up
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {/* ---- Wallet top-ups ---- */}
      <section className="panel-card">
        <header className="card-head">
          <h2>Wallet top-ups</h2>
          <p>Money you've added for renter checks</p>
        </header>
        <p className="util-hero">KES {fmtAmount(toppedUpTotal)}</p>
        <p className="side-hint" style={{ marginTop: 0 }}>
          {topups.length > 0
            ? `Topped up across ${topups.length} payment${topups.length > 1 ? "s" : ""}.`
            : "Nothing topped up yet — use Top up above to add wallet balance."}
          {usage ? ` Current balance KES ${fmtAmount(usage.wallet_balance)}.` : ""}
        </p>
        {topups.length > 0 && (
          <div className="topup-list">
            {topups.slice(0, 6).map((t) => (
              <div className="topup-row" key={t.id}>
                <div className="topup-main">
                  <p className="topup-method">{t.method}</p>
                  <p className="topup-date">{fmtDate(t.date)}</p>
                </div>
                <p className="topup-amount">+ KES {fmtAmount(t.amount)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---- Invoices ---- */}
      <section className="panel-card">
        <header className="card-head">
          <h2>Invoices</h2>
          <p>Pay what's due · past invoices below</p>
        </header>

        <div className="invoice-list">
          {invoices.length === 0 ? (
            <p className="invoice-empty">
              No invoices yet — your first one is generated when your trial ends.
            </p>
          ) : (
            invoices.map((inv) => {
              const due = inv.status === "Due";
              return (
                <div className={`invoice-row ${due ? "is-due" : ""}`} key={inv.ref}>
                  <div className="invoice-main">
                    <p className="invoice-title">{inv.title}</p>
                    <p className="invoice-detail">
                      {inv.detail} · Due {fmtDate(inv.due_date)}
                      {inv.paid_at ? ` · Paid ${fmtDate(inv.paid_at)}` : ""}
                    </p>
                  </div>
                  <p className="invoice-amount">KES {fmtAmount(inv.amount)}</p>
                  {due ? (
                    <button
                      type="button"
                      className="btn btn-primary invoice-pay"
                      disabled={invWaiting}
                      onClick={() => openInvModal(inv)}
                    >
                      {invWaiting ? "Waiting…" : "Pay now"}
                    </button>
                  ) : (
                    <span className="invoice-status">
                      <span className="chip active">Paid</span>
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ---- Top-up modal ---- */}
      {topupModal && (
        <div className="modal-overlay" onClick={() => !topupBusy && setTopupModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">
              <h3>Top up check wallet</h3>
              <button type="button" className="icon-btn" disabled={topupBusy} onClick={() => setTopupModal(false)}>✕</button>
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
                <button type="button" className="btn btn-ghost" disabled={topupBusy} onClick={() => setTopupModal(false)}>Cancel</button>
                <button type="submit" className="btn mpesa-btn" disabled={topupBusy}>
                  {topupBusy ? "Starting…" : "Top up"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- Invoice STK push modal ---- */}
      {invModal && (
        <div className="modal-overlay" onClick={() => !invBusy && setInvModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">
              <h3>Pay subscription</h3>
              <button type="button" className="icon-btn" disabled={invBusy} onClick={() => setInvModal(null)}>✕</button>
            </header>
            <form onSubmit={handleInvMpesa} className="modal-body">
              <p className="side-hint" style={{ marginTop: 0 }}>
                {invModal.title} — <strong>KES {fmtAmount(invModal.amount)}</strong>
              </p>
              <fieldset className="provider-group">
                <legend className="field-label">Payment method</legend>
                <label className="provider-option">
                  <input type="radio" name="inv-provider" value="mpesa" checked={invProvider === "mpesa"} onChange={() => setInvProvider("mpesa")} />
                  <span className="provider-pill mpesa-pill">M-Pesa</span>
                </label>
                <label className="provider-option">
                  <input type="radio" name="inv-provider" value="airtel" checked={invProvider === "airtel"} onChange={() => setInvProvider("airtel")} />
                  <span className="provider-pill airtel-pill">Airtel Money</span>
                </label>
              </fieldset>
              <label className="field-label">
                Phone number
                <input
                  type="tel"
                  className="field-input"
                  value={invPhone}
                  onChange={(e) => setInvPhone(e.target.value)}
                  placeholder="07XXXXXXXX"
                  required
                  autoFocus
                />
              </label>
              <p className="side-hint" style={{ marginTop: 0 }}>
                An STK push will be sent to this number — enter your PIN to confirm.
              </p>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" disabled={invBusy} onClick={() => setInvModal(null)}>Cancel</button>
                <button type="submit" className="btn mpesa-btn" disabled={invBusy}>
                  {invBusy ? "Sending…" : "Send payment request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- Invoice payment waiting indicator ---- */}
      {invWaiting && (
        <div style={{ position: "fixed", bottom: "80px", left: "50%", transform: "translateX(-50%)", zIndex: 200 }}>
          <span className="pay-waiting">
            <span className="pay-waiting-dot" />
            Waiting for payment…
            <button type="button" className="icon-btn" onClick={stopInvPolling}>Stop</button>
          </span>
        </div>
      )}
    </>
  );
}
