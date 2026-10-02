import { useEffect, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { setPlanAutoRenew } from "../lib/api";
import useRole from "../hooks/useRole";
import UpgradeDialog from "./UpgradeDialog";
import { getPlan, hydratePlan, setPlan, subscribe } from "./planStore";
import { toast } from "./toastStore";
import { fmtAmount } from "./billingFormat";
import "./plan.css";

const fmtDay = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "";

/* How the Fleet price was worked out, in the server's own numbers: the first
   cars are free, the rest are charged, with a minimum and a cap. */
function quoteLine(q) {
  const free = q.free_cars ?? 3;
  if (q.fee === q.monthly_cap) {
    return `${q.cars} cars, capped at KES ${fmtAmount(q.monthly_cap)}`;
  }
  const extra = Math.max(q.cars - free, 0);
  if (extra === 0) {
    return `Your ${q.cars === 1 ? "car is" : `${q.cars} cars are`} inside the ${free} free ones, so this is the Fleet minimum`;
  }
  return `Your first ${free} cars are free, ${extra} more at KES ${q.price_per_car}`;
}

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
 * button that opens the upgrade dialog. It reads the shared plan store, so it
 * shows at once on a workspace the shell has already loaded. `compact` is the
 * Settings summary.
 */
export default function PlanCard({ compact = false, onChange }) {
  const { can } = useRole();
  const plan = useSyncExternalStore(subscribe, getPlan);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    hydratePlan().catch((err) => toast(err.message || "Couldn't load your plan", "danger"));
  }, []);

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
  const payer = can("changePlan");

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
              {quoteLine(q)}
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

      {confirming && (
        <UpgradeDialog onClose={() => setConfirming(false)} onUpgraded={() => onChange?.()} />
      )}
    </section>
  );
}
