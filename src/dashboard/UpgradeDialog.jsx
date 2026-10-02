import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { upgradePlan } from "../lib/api";
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

/**
 * The dialog that pays for Fleet from the wallet. The plan card opens it from
 * its upgrade button, and the Add vehicle gate opens it when Starter is out
 * of cars, with `title` and `lead` saying why it appeared.
 *
 * The price shown is the server's quote, and it is sent back with the upgrade
 * as `expected_amount`: if anything changed in between (a car added, app
 * commission landing) the server refuses and this reloads the new figure
 * instead of charging one nobody saw.
 *
 * It opens on the plan already in the store and asks again behind it, so it
 * is on screen at once and the balance it shows is still the current one.
 */
export default function UpgradeDialog({ title = "Upgrade to Fleet", lead, onClose, onUpgraded }) {
  const { can } = useRole();
  const plan = useSyncExternalStore(subscribe, getPlan);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    hydratePlan({ force: true }).catch((err) => {
      if (!getPlan()) toast(err.message || "Couldn't load your plan", "danger");
    });
  }, []);

  async function handleUpgrade() {
    if (busy) return;
    setBusy(true);
    try {
      const next = await upgradePlan(plan.quote.amount, uid());
      setPlan(next);
      toast(`You're on Fleet until ${fmtDay(next.until)}.`);
      onClose();
      onUpgraded?.(next);
    } catch (err) {
      toast(err.message || "Couldn't upgrade", "danger");
      if (err.status === 409) await hydratePlan({ force: true }).catch(() => {}); // price moved: show the new one
    } finally {
      setBusy(false);
    }
  }

  const q = plan?.quote;
  const payer = can("changePlan");
  const canPay = Boolean(plan?.can_upgrade && q && payer);
  const short = canPay && q.amount > plan.wallet_balance;
  const starts = plan?.source === "trial" ? fmtDay(plan.upgrade_starts_at) : "today";

  return createPortal(
    <div className="modal-overlay" onMouseDown={() => !busy && onClose()}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{title}</h3>
        {lead && <p className="modal-message" style={{ marginBottom: 12 }}>{lead}</p>}
        {!plan && <p className="modal-message">Loading your plan…</p>}
        {plan && !canPay && (
          <p className="modal-message">
            {payer ? "Contact support to change this plan." : "The Owner or Finance can upgrade."}
          </p>
        )}
        {canPay && (
          <>
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
                Your wallet is KES {fmtAmount(q.amount - plan.wallet_balance)} short. Top it up, then
                pay for Fleet here.
              </p>
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
              <button type="button" className="btn btn-primary modal-btn" disabled={busy}
                onClick={handleUpgrade}>
                {busy ? "Paying…" : `Pay KES ${fmtAmount(q.amount)}`}
              </button>
            ))}
        </div>
      </div>
    </div>,
    document.body
  );
}
