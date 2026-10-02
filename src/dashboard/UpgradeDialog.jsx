import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { fetchPlanQuote, upgradePlan } from "../lib/api";
import useRole from "../hooks/useRole";
import WalletTopup from "./WalletTopup";
import { getPlan, hydratePlan, setPlan, subscribe } from "./planStore";
import { toast } from "./toastStore";
import { fmtAmount } from "./billingFormat";
import "../components/confirm.css";

const fmtDay = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const plural = (n) => `${n} car${n === 1 ? "" : "s"}`;

/**
 * The dialog that pays for Fleet from the wallet. The plan card opens it from
 * its buttons, and the Add vehicle gate opens it (`atLimit`) when the plan is
 * out of cars.
 *
 * It asks how many cars are being added and prices the fleet with them in it,
 * so someone bringing on five cars pays once rather than being stopped at
 * each one (docs/fleet-car-seats.md). On Starter that is the upgrade; on a
 * paid plan it buys the extra cars for the rest of the period.
 *
 * The price shown is the server's quote, and it is sent back with the payment
 * as `expected_amount`: if anything changed in between (a car added, app
 * commission landing) the server refuses and this reloads the new figure
 * instead of charging one nobody saw.
 *
 * It opens on the plan already in the store and asks again behind it, so it
 * is on screen at once and the balance it shows is still the current one.
 */
export default function UpgradeDialog({ atLimit = false, onClose, onUpgraded }) {
  const { can } = useRole();
  const plan = useSyncExternalStore(subscribe, getPlan);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(atLimit ? "1" : "");
  // { cars, quote } for the total last priced, or { cars, error }.
  const [quoted, setQuoted] = useState(null);
  const [quoteMissing, setQuoteMissing] = useState(false);
  const [requote, setRequote] = useState(0);

  useEffect(() => {
    hydratePlan({ force: true }).catch((err) => {
      if (!getPlan()) toast(err.message || "Couldn't load your plan", "danger");
    });
  }, []);

  // A backend that doesn't sell by car count yet: no field, today's flat
  // upgrade. The plan says so up front (`max_cars` arrives with the feature),
  // so the field is either there from the first paint or never shown, rather
  // than appearing and then vanishing when the quote comes back 404.
  const seatsOff = quoteMissing || plan?.max_cars == null;
  const paid = plan?.source === "paid";
  const base = plan ? Math.max(plan.cars || 0, paid ? plan.paid_cars || 0 : 0) : 0;
  const n = Math.max(parseInt(adding, 10) || 0, 0);
  const total = base + n;
  const maxAdd = Math.max((plan?.max_cars ?? 100) - base, 0);
  const ready = Boolean(plan);
  const invalid = !seatsOff && ((paid && n < 1) || n > maxAdd);

  // Price the fleet with the new cars in it. Held back a moment so typing
  // "12" asks once, not for 1 and then 12.
  useEffect(() => {
    if (!ready || seatsOff || invalid) return undefined;
    let alive = true;
    const t = setTimeout(() => {
      fetchPlanQuote(total)
        .then((quote) => alive && setQuoted({ cars: total, quote }))
        .catch((err) => {
          if (!alive) return;
          if (err.status === 404 || err.status === 405) setQuoteMissing(true);
          else setQuoted({ cars: total, error: err.message || "Couldn't price that" });
        });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [ready, seatsOff, invalid, total, requote]);

  const current = quoted?.cars === total ? quoted : null;
  // Nothing added on Starter is the plan's own quote, already in hand.
  const q = seatsOff || (!paid && n === 0 && !current?.quote) ? plan?.quote : current?.quote;
  const payer = can("changePlan");
  const offered = paid ? !seatsOff && plan.paid_cars != null : Boolean(plan?.can_upgrade);
  const canPay = ready && payer && offered;
  const short = canPay && q && q.amount > plan.wallet_balance;
  const starts = plan?.source === "trial" ? fmtDay(plan.upgrade_starts_at) : "today";

  const title = paid ? "Add more cars" : atLimit ? "Upgrade to add more cars" : "Upgrade to Fleet";
  let lead = null;
  if (ready && paid && plan.paid_cars != null) {
    lead = `Your plan covers ${plural(plan.paid_cars)}${atLimit ? " and they are all in your fleet" : ""}.`;
  } else if (ready && atLimit) {
    lead = `Starter covers up to ${plural(plan.car_limit)} and you have ${plan.cars}.`;
  }

  async function handlePay() {
    if (busy || !q || invalid) return;
    setBusy(true);
    try {
      const next = await upgradePlan(q.amount, uid(), seatsOff ? undefined : total);
      setPlan(next);
      toast(
        paid
          ? `Your plan now covers ${plural(next.paid_cars ?? total)}.`
          : `You're on Fleet until ${fmtDay(next.until)}.`
      );
      onClose();
      onUpgraded?.(next);
    } catch (err) {
      toast(err.message || "Couldn't upgrade", "danger");
      if (err.status === 409) {
        // price moved: show the new one
        await hydratePlan({ force: true }).catch(() => {});
        setRequote((v) => v + 1);
      }
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="modal-overlay" onMouseDown={() => !busy && onClose()}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{title}</h3>
        {lead && <p className="modal-message" style={{ marginBottom: 12 }}>{lead}</p>}
        {!ready && <p className="modal-message">Loading your plan…</p>}
        {ready && !canPay && (
          <p className="modal-message">
            {payer ? "Contact support to change this plan." : "The Owner or Finance can upgrade."}
          </p>
        )}
        {canPay && (
          <>
            {!seatsOff && (
              <label className="field-label" style={{ marginBottom: 16 }}>
                Cars you&apos;re adding
                <input
                  type="number"
                  className="field-input"
                  min={paid ? 1 : 0}
                  max={maxAdd}
                  step="1"
                  inputMode="numeric"
                  placeholder="0"
                  value={adding}
                  disabled={busy}
                  onChange={(e) => setAdding(e.target.value)}
                  autoFocus
                />
                <span className="field-note">
                  {n > maxAdd
                    ? `You can add up to ${maxAdd} more.`
                    : `Pay once for all of them. That makes ${plural(total)}.`}
                </span>
              </label>
            )}
            {invalid ? null : !q ? (
              current?.error ? (
                <p className="form-error" style={{ marginBottom: 24 }}>{current.error}</p>
              ) : (
                <p className="modal-message">Working out the price…</p>
              )
            ) : (
              <>
                <p className="modal-message">
                  <span className="strong">KES {fmtAmount(q.amount)}</span> from your wallet{" "}
                  {paid
                    ? `for ${plural(n)} more, until ${fmtDay(plan.until)}.`
                    : `for 30 days of Fleet${seatsOff ? "" : ` with ${plural(total)}`}, starting ${starts}.`}{" "}
                  Your wallet has KES {fmtAmount(plan.wallet_balance)}.
                </p>
                {!paid && (
                  <p className="field-note">
                    It renews from your wallet every 30 days; you can turn that off any time. If the wallet
                    can&apos;t cover a renewal you move to Starter, nothing is locked.
                  </p>
                )}
                {short && (
                  <p className="form-error">
                    Your wallet is KES {fmtAmount(q.amount - plan.wallet_balance)} short. Top it up, then
                    pay here.
                  </p>
                )}
              </>
            )}
          </>
        )}
        {/* Short of the price, the pay button gives way to the top-up itself:
            once the money lands the plan reloads with the new balance and the
            pay button comes back, without leaving the dialog. */}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost modal-btn" disabled={busy} onClick={onClose}>
            {canPay ? "Cancel" : "Close"}
          </button>
          {canPay &&
            (short ? (
              <WalletTopup
                className="btn btn-primary modal-btn"
                suggestedAmount={q.amount - plan.wallet_balance}
                onSettled={() => hydratePlan({ force: true }).catch(() => {})}
              />
            ) : (
              <button type="button" className="btn btn-primary modal-btn" disabled={busy || !q || invalid}
                onClick={handlePay}>
                {busy ? "Paying…" : q ? `Pay KES ${fmtAmount(q.amount)}` : "Pay"}
              </button>
            ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
