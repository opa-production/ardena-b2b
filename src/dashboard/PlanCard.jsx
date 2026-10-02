import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { fetchPlan, setPlanAutoRenew, upgradePlan } from "../lib/api";
import useRole from "../hooks/useRole";
import { toast } from "./toastStore";
import { fmtAmount } from "./billingFormat";
import "../components/confirm.css";
import "./plan.css";

const fmtDay = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

/* One line on what the workspace has right now and until when. */
function statusLine(p) {
  if (p.source === "trial") return `Free Fleet access until ${fmtDay(p.until)}`;
  if (p.source === "paid")
    return `Paid until ${fmtDay(p.until)}${p.auto_renew ? ", renews from your wallet" : ", not renewing"}`;
  if (p.source === "custom") return p.until ? `Custom terms until ${fmtDay(p.until)}` : "Custom terms";
  return `Free, up to ${p.car_limit} cars`;
}

/**
 * The workspace's plan: what it has, what Fleet would cost right now, and the
 * button that pays for it from the wallet.
 *
 * The price shown is the server's quote, and it is sent back with the upgrade
 * as `expected_amount`: if anything changed in between (a car added, app
 * commission landing) the server refuses and this reloads the new figure
 * instead of charging one nobody saw. `compact` is the Settings summary.
 */
export default function PlanCard({ compact = false, onChange }) {
  const { can } = useRole();
  const [plan, setPlan] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setPlan(await fetchPlan());
    } catch (err) {
      toast(err.message || "Couldn't load your plan", "danger");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpgrade() {
    if (busy) return;
    setBusy(true);
    try {
      const next = await upgradePlan(plan.quote.amount, uid());
      setPlan(next);
      setConfirming(false);
      toast(`You're on Fleet until ${fmtDay(next.until)}.`);
      onChange?.();
    } catch (err) {
      toast(err.message || "Couldn't upgrade", "danger");
      if (err.status === 409) await load(); // price moved: show the new one
    } finally {
      setBusy(false);
    }
  }

  async function toggleRenew() {
    try {
      setPlan(await setPlanAutoRenew(!plan.auto_renew));
    } catch (err) {
      toast(err.message || "Couldn't change renewal", "danger");
    }
  }

  if (!plan) {
    return (
      <section className="panel-card plan-card">
        <p className="field-note">Loading your plan…</p>
      </section>
    );
  }

  const q = plan.quote;
  const short = q.amount > plan.wallet_balance;
  const payer = can("changePlan");
  const starts = plan.source === "trial" ? fmtDay(plan.upgrade_starts_at) : "today";

  return (
    <section className={`panel-card plan-card plan-card--${plan.plan}`}>
      <header className="plan-head">
        <div>
          <p className="plan-eyebrow">Your plan</p>
          <h2 className="plan-name">{plan.plan_title}</h2>
          <p className="plan-status">{statusLine(plan)}</p>
        </div>
        {plan.founding_number && <span className="plan-badge">Founding member #{plan.founding_number}</span>}
      </header>

      {plan.plan === "starter" && plan.paused_cars > 0 && (
        <p className="plan-note">
          {plan.paused_cars} of your {plan.cars} cars can&apos;t take new bookings on Starter. New bookings go on{" "}
          {(plan.bookable_plates || []).join(", ")}. Existing bookings are untouched.
        </p>
      )}
      {plan.plan === "starter" && (
        <p className="plan-note">Reports and exports are part of Fleet.</p>
      )}

      {!compact && plan.can_upgrade && (
        <div className="plan-offer">
          <div>
            <p className="plan-price">
              KES {fmtAmount(q.amount)} <span>for 30 days of Fleet</span>
            </p>
            <p className="field-note">
              {q.cars} car{q.cars === 1 ? "" : "s"} at KES {q.price_per_car}
              {q.cars < q.min_billed_cars ? `, billed as ${q.min_billed_cars}` : ""}
              {q.fee === q.monthly_cap ? `, capped at KES ${fmtAmount(q.monthly_cap)}` : ""}
              {q.credit ? `, less KES ${fmtAmount(q.credit)} Ardena app commission` : ""}.
            </p>
          </div>
          {payer ? (
            <button type="button" className="btn btn-primary" onClick={() => setConfirming(true)}>
              {plan.source === "trial" ? "Keep Fleet after the free period" : "Upgrade to Fleet"}
            </button>
          ) : (
            <p className="field-note">The Owner or Finance can upgrade.</p>
          )}
        </div>
      )}

      {!compact && plan.source === "paid" && payer && (
        <div className="plan-offer">
          <p className="field-note">
            {plan.auto_renew
              ? `Renews on ${fmtDay(plan.until)} for about KES ${fmtAmount(q.amount)} from your wallet.`
              : `Ends on ${fmtDay(plan.until)}, then you move to Starter.`}
          </p>
          <button type="button" className="btn btn-ghost" onClick={toggleRenew}>
            {plan.auto_renew ? "Turn off renewal" : "Turn on renewal"}
          </button>
        </div>
      )}

      {compact && (
        <Link to="/dashboard/usage" className="btn btn-ghost pay-btn">
          {plan.can_upgrade ? "See plans and upgrade" : "Manage plan"}
        </Link>
      )}

      {confirming &&
        createPortal(
          <div className="modal-overlay" onMouseDown={() => !busy && setConfirming(false)}>
            <div className="modal-card" role="dialog" aria-modal="true" aria-label="Upgrade to Fleet"
              onMouseDown={(e) => e.stopPropagation()}>
              <h3 className="modal-title">Upgrade to Fleet</h3>
              <p className="modal-message">
                <span className="strong">KES {fmtAmount(q.amount)}</span> from your wallet for 30 days of Fleet,
                starting {starts}. Your wallet has KES {fmtAmount(plan.wallet_balance)}.
              </p>
              <p className="field-note">
                It renews from your wallet every 30 days; you can turn that off any time. If the wallet
                can&apos;t cover a renewal you move to Starter, nothing is locked.
              </p>
              {short && (
                <p className="form-error">
                  Your wallet is KES {fmtAmount(q.amount - plan.wallet_balance)} short.{" "}
                  <Link to="/dashboard/wallet">Top up the wallet</Link> first.
                </p>
              )}
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost modal-btn" disabled={busy}
                  onClick={() => setConfirming(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary modal-btn" disabled={busy || short}
                  onClick={handleUpgrade}>
                  {busy ? "Paying…" : `Pay KES ${fmtAmount(q.amount)}`}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
}
