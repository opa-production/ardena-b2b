/* The invoice list, and the M-Pesa/Airtel prompt that settles one.
 *
 * Lifted out of the old Billing page when Usage and Billing merged into one
 * Account screen: the chart answers "what am I running up?", this answers
 * "what do I owe?", and they were never two visits.
 *
 * Deliberately one list. An outstanding invoice doesn't get a banner of its
 * own — it is set apart in place by a heavy rule above and below, and turns
 * red once its due date has passed. The row you must act on is therefore
 * always in the same place as the rows you don't. */
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchSubscription,
  fetchInvoices,
  payInvoiceMpesa,
  checkInvoiceCharge,
} from "../lib/api";
import EmptyState from "./EmptyState";
import { toast } from "./toastStore";
import LoadingOverlay from "../components/LoadingOverlay";
import { fmtAmount, fmtDate } from "./billingFormat";
import { FREE_MONTHS } from "../pages/pricingData";
import "./billing.css";
import "./bookings.css"; // modal + provider-pill styles

export default function InvoicesPanel() {
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
          toast("STK push expired, please try again.", "warn");
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
      toast(res.message || "STK push sent, enter your PIN.");
      if (res.paystack_reference) startInvPolling(res.paystack_reference);
    } catch (err) {
      toast(err.message || "Failed to send payment request.", "danger");
    } finally {
      setInvBusy(false);
    }
  }

  // Midnight today, so "overdue" flips on the day after the due date rather
  // than partway through it.
  const startOfToday = new Date().setHours(0, 0, 0, 0);

  return (
    <>
      <section className="panel-card">
        <header className="card-head">
          <h2>Invoices</h2>
          <p>
            Newest first
            {sub?.next_billing_date ? ` · next bill ${fmtDate(sub.next_billing_date)}` : ""}
          </p>
        </header>

        <div className="invoice-list">
          {loading ? (
            <p className="side-hint" style={{ marginTop: 0 }}>Loading invoices…</p>
          ) : invoices.length === 0 ? (
            <EmptyState minimal title={`Nothing billed, you're in your first ${FREE_MONTHS} free months`} />
          ) : (
            invoices.map((inv) => {
              const due = inv.status === "Due";
              const overdue = due && new Date(inv.due_date).setHours(0, 0, 0, 0) < startOfToday;
              return (
                <div
                  className={
                    "invoice-row" + (due ? " is-due" : "") + (overdue ? " is-overdue" : "")
                  }
                  key={inv.ref}
                >
                  <div className="invoice-main">
                    <p className="invoice-title">{inv.title}</p>
                    <p className="invoice-detail">
                      {inv.ref} · {inv.detail} ·{" "}
                      {overdue ? "Overdue since" : "Due"} {fmtDate(inv.due_date)}
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
                {invModal.title} · <strong>KES {fmtAmount(invModal.amount)}</strong>
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
                An STK push will be sent to this number, enter your PIN to confirm.
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

      {/* Centred, not docked in a corner: the person is holding a phone
          waiting for a prompt, and this is the only thing happening. */}
      {invWaiting && (
        <LoadingOverlay
          label="Waiting for payment…"
          note="Approve the prompt on your phone. This closes on its own once it clears."
          onCancel={stopInvPolling}
        />
      )}
    </>
  );
}
