/* Billing — what you owe and what you've paid.
 *
 * One of the three Account pages split out of the old single billing screen.
 * This one owns invoices and the M-Pesa/Airtel prompt that settles them; the
 * running period breakdown lives on Usage and the plan itself on Plans.
 *
 * Deliberately sparse: one chart, one list. Fleet size, plan and vehicle
 * counts are all on the Overview already, so repeating them here as KPI tiles
 * would only bury the two things this page exists to answer. */
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageSkeleton from "./PageSkeleton";
import {
  fetchSubscription,
  fetchInvoices,
  payInvoiceMpesa,
  checkInvoiceCharge,
} from "../lib/api";
import BillingTimeline from "./charts/BillingTimeline";
import EmptyState, { EMPTY_ICONS } from "./EmptyState";
import { toast } from "./toastStore";
import usePageTitle from "../hooks/usePageTitle";
import { fmtAmount, fmtDate } from "./billingFormat";
import "./overview.css";
import "./fleet.css";
import "./billing.css";
import "./bookings.css"; // modal + provider-pill + pay-waiting styles

export default function Billing() {
  usePageTitle("Billing");
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [sub, setSub] = useState(null);
  const [invoices, setInvoices] = useState([]);
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

  const load = useCallback(async () => {
    try {
      const [subData, invData] = await Promise.all([
        fetchSubscription().catch(() => null),
        fetchInvoices(),
      ]);
      setSub(subData);
      setInvoices(invData?.data || []);
    } catch (err) {
      toast(err.message || "Failed to load billing", "danger");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // stop polling if the user leaves the page mid-payment
  useEffect(() => {
    return () => {
      if (invPollRef.current) clearInterval(invPollRef.current);
    };
  }, []);

  function stopInvPolling() {
    if (invPollRef.current) {
      clearInterval(invPollRef.current);
      invPollRef.current = null;
    }
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
        if (!ref) {
          stopInvPolling();
          return;
        }

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
    if (!phone) {
      toast("Enter your M-Pesa phone number.", "danger");
      return;
    }
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

  const dueInvoices = invoices.filter((i) => i.status === "Due");
  const paidInvoices = invoices.filter((i) => i.status === "Paid");
  const dueTotal = dueInvoices.reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const nextDue = dueInvoices[0];

  return (
    <>
      <header className="head-card">
        <div className="head-titles">
          <h1>Billing</h1>
          <p>
            Invoices and payments
            {sub?.next_billing_date ? ` · next bill ${fmtDate(sub.next_billing_date)}` : ""}
          </p>
        </div>
      </header>

      {/* An outstanding balance is the one thing on this page that can't wait,
          so it gets its own band. When nothing is due, nothing appears. */}
      {dueInvoices.length > 0 && (
        <section className="due-banner">
          <div>
            <p className="due-banner-label">
              {dueInvoices.length === 1
                ? "1 invoice outstanding"
                : `${dueInvoices.length} invoices outstanding`}
            </p>
            <p className="due-banner-amount">KES {fmtAmount(dueTotal)}</p>
            {nextDue && <p className="due-banner-note">Due {fmtDate(nextDue.due_date)}</p>}
          </div>
          {invWaiting ? (
            <span className="pay-waiting">
              <span className="pay-waiting-dot" />
              Waiting for payment…
              <button type="button" className="icon-btn" onClick={stopInvPolling}>
                Stop
              </button>
            </span>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => openInvModal(nextDue)}>
              Pay now
            </button>
          )}
        </section>
      )}

      <section className="chart-card">
        <header className="card-head">
          <h2>What you've paid</h2>
          <p>Your monthly bill over time</p>
        </header>
        {paidInvoices.length > 0 ? (
          <BillingTimeline />
        ) : (
          <EmptyState
            icon={EMPTY_ICONS.chart}
            title="No payments yet"
            message="Your bill will chart here once your first billing cycle closes."
          />
        )}
      </section>

      <section className="panel-card">
        <header className="card-head">
          <h2>Invoices</h2>
          <p>Newest first</p>
        </header>

        <div className="invoice-list">
          {invoices.length === 0 ? (
            <EmptyState
              compact
              icon={EMPTY_ICONS.payments}
              title="No invoices yet"
              message="Your first invoice is generated when your trial ends."
            />
          ) : (
            invoices.map((inv) => {
              const due = inv.status === "Due";
              return (
                <div className={`invoice-row ${due ? "is-due" : ""}`} key={inv.ref}>
                  <div className="invoice-main">
                    <p className="invoice-title">{inv.title}</p>
                    <p className="invoice-detail">
                      {inv.ref} · {inv.detail} · Due {fmtDate(inv.due_date)}
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

      {/* ---- Invoice STK push modal ---- */}
      {invModal && (
        <div className="modal-overlay" onClick={() => !invBusy && setInvModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">
              <h3>Pay subscription</h3>
              <button
                type="button"
                className="icon-btn"
                disabled={invBusy}
                onClick={() => setInvModal(null)}
              >
                ✕
              </button>
            </header>
            <form onSubmit={handleInvMpesa} className="modal-body">
              <p className="side-hint" style={{ marginTop: 0 }}>
                {invModal.title} — <strong>KES {fmtAmount(invModal.amount)}</strong>
              </p>
              <fieldset className="provider-group">
                <legend className="field-label">Payment method</legend>
                <label className="provider-option">
                  <input
                    type="radio"
                    name="inv-provider"
                    value="mpesa"
                    checked={invProvider === "mpesa"}
                    onChange={() => setInvProvider("mpesa")}
                  />
                  <span className="provider-pill mpesa-pill">M-Pesa</span>
                </label>
                <label className="provider-option">
                  <input
                    type="radio"
                    name="inv-provider"
                    value="airtel"
                    checked={invProvider === "airtel"}
                    onChange={() => setInvProvider("airtel")}
                  />
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
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={invBusy}
                  onClick={() => setInvModal(null)}
                >
                  Cancel
                </button>
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
        <div className="pay-waiting-dock">
          <span className="pay-waiting">
            <span className="pay-waiting-dot" />
            Waiting for payment…
            <button type="button" className="icon-btn" onClick={stopInvPolling}>
              Stop
            </button>
          </span>
        </div>
      )}
    </>
  );
}
