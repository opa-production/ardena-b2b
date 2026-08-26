import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmptyState, { EMPTY_ICONS } from "./EmptyState";
import Dropdown from "../components/Dropdown";
import CollectionsArea from "./charts/CollectionsArea";
import PaymentDonut from "./charts/PaymentDonut";
import PayoutMethods, { methodDetail } from "./PayoutMethods";
import { toast } from "./toastStore";
import useRole from "../hooks/useRole";
import { createMarketplaceWithdrawal } from "../lib/api";
import "./fleet.css";
import "./bookings.css";
import "./payments.css";
import "./earnings.css";

const fmtAmount = (n) => Number(n || 0).toLocaleString("en-KE");

const WITHDRAWAL_CHIP = {
  pending: "active",
  completed: "confirmed",
  rejected: "cancelled",
  cancelled: "cancelled",
  failed: "cancelled",
};

function fmtDay(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* Net earnings per week from app bookings, same 10-week window and shape the
   direct-bookings chart uses so the two tabs read identically. */
function weeklyNet(transactions) {
  const now = new Date();
  const todayDay = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0=Mon
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - todayDay);
  thisMonday.setHours(0, 0, 0, 0);

  const weeks = Array.from({ length: 10 }, (_, i) => {
    const start = new Date(thisMonday);
    start.setDate(thisMonday.getDate() - (9 - i) * 7);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return {
      start,
      end,
      label: start.toLocaleDateString("en-KE", { day: "numeric", month: "short" }),
      total: 0,
    };
  });

  for (const t of transactions) {
    const d = new Date(t.paid_at);
    if (isNaN(d)) continue;
    for (const w of weeks) {
      if (d >= w.start && d < w.end) {
        w.total += Number(t.net_amount) || 0;
        break;
      }
    }
  }

  return weeks.map((w) => ({ week: w.label, value: w.total }));
}

/* The Ardena-app side of the money page. All of its data is loaded by
   Payments.jsx and handed down, so the KPI row and this panel appear together
   rather than the numbers landing first and the rest filling in after. */
export default function MarketplaceEarningsPanel({
  summary,
  transactions = [],
  withdrawals = [],
  methods = [],
  onChanged,
}) {
  const { can } = useRole();
  const canWithdraw = can("manageWithdrawals");

  const [amount, setAmount] = useState("");
  const [methodId, setMethodId] = useState("");
  const [busy, setBusy] = useState(false);

  // `methods` is loaded by the parent and arrives after mount, so default the
  // selection once it does — and clear it if the chosen destination is deleted.
  useEffect(() => {
    setMethodId((current) => {
      if (current && methods.some((m) => String(m.id) === current)) return current;
      return methods.length ? String(methods[0].id) : "";
    });
  }, [methods]);

  async function handleWithdraw(e) {
    e.preventDefault();
    if (busy) return;
    const value = Number(amount);
    if (!value || value <= 0) {
      toast("Enter an amount to withdraw", "warn");
      return;
    }
    if (!methodId) {
      toast("Add a payout destination first", "warn");
      return;
    }
    setBusy(true);
    try {
      const chosen = methods.find((m) => String(m.id) === String(methodId));
      await createMarketplaceWithdrawal({
        amount: value,
        // The backend still wants the type even when reusing a saved method.
        payment_method_type: chosen?.method_type || "mpesa",
        payout_method_id: Number(methodId),
      });
      toast("Withdrawal requested. Ardena processes payouts within 2 working days.");
      setAmount("");
      onChanged?.();
    } catch (err) {
      toast(err.message || "Couldn't request that withdrawal", "danger");
    } finally {
      setBusy(false);
    }
  }

  // Nothing published yet isn't an error — it just means there's nothing to
  // earn on. Point at the fleet rather than showing zeroes and a payout form.
  if (summary && !summary.marketplace_active) {
    return (
      <EmptyState
        icon={EMPTY_ICONS.payments}
        title="Nothing listed yet"
        message="List a vehicle on the app to start earning."
        action={
          <Link className="btn btn-primary" to="/dashboard/fleet">
            Go to fleet
          </Link>
        }
      />
    );
  }

  const s = summary || {};
  const ratePct = Math.round((s.commission_rate || 0) * 1000) / 10;

  // Two-line labels so a saved destination is identifiable by more than a name.
  const methodOptions = methods.map((m) => ({
    value: String(m.id),
    label: (
      <span className="dd-stack">
        <span className="dd-stack-main">{m.name}</span>
        <span className="dd-stack-sub">{methodDetail(m)}</span>
      </span>
    ),
  }));

  const splitSegments = [
    { label: "Your net earnings", value: Number(s.net_earnings) || 0, color: "#0b7a37" },
    { label: `Ardena commission (${ratePct}%)`, value: Number(s.commission_amount) || 0, color: "#94a3b8" },
  ];

  return (
    <>
      <div className="payments-grid">
        <section className="chart-card">
          <header className="card-head">
            <h2>App earnings over time</h2>
            <p>Your net per week, last 10 weeks</p>
          </header>
          {transactions.length === 0 ? (
            <EmptyState
              icon={EMPTY_ICONS.chart}
              title="No earnings yet"
              message="They build up once renters book."
            />
          ) : (
            <CollectionsArea data={weeklyNet(transactions)} />
          )}
        </section>

        <section className="chart-card">
          <header className="card-head">
            <h2>Where the money went</h2>
            <p>KES {fmtAmount(s.total_gross)} gross, split</p>
          </header>
          {!Number(s.total_gross) ? (
            <EmptyState
              compact
              icon={EMPTY_ICONS.payments}
              title="Nothing earned yet"
              message="Your split shows after the first booking."
            />
          ) : (
            <PaymentDonut segments={splitSegments} />
          )}
        </section>
      </div>

      <div className="earnings-grid">
        <section className="panel-card" id="withdraw">
          <header className="card-head">
            <h2>Withdraw</h2>
            <p>
              {canWithdraw
                ? `KES ${fmtAmount(s.withdrawable)} available`
                : "Your role can view earnings but not request payouts"}
            </p>
          </header>

          {!canWithdraw ? (
            <p className="field-note earnings-empty-note">
              An Owner or Finance user can request withdrawals from here.
            </p>
          ) : methods.length === 0 ? (
            <p className="field-note earnings-empty-note">
              Save a payout destination below before requesting a withdrawal.
            </p>
          ) : (
            <form className="withdraw-form" onSubmit={handleWithdraw}>
              <div className="field">
                <label htmlFor="wd-amount">Amount (KES)</label>
                <input
                  id="wd-amount"
                  type="number"
                  min={1}
                  max={s.withdrawable || undefined}
                  step={100}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={fmtAmount(s.withdrawable)}
                />
              </div>
              <div className="field">
                <label htmlFor="wd-dest">Send to</label>
                <Dropdown
                  id="wd-dest"
                  name="payout_method_id"
                  value={methodId}
                  onChange={setMethodId}
                  options={methodOptions}
                  placeholder="Choose a destination"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                Request withdrawal
              </button>
              <p className="field-note">Manage destinations below.</p>
            </form>
          )}
        </section>

        <section className="panel-card">
          <header className="card-head">
            <h2>Withdrawal history</h2>
            <p>Ardena processes these alongside host payouts</p>
          </header>

          {withdrawals.length === 0 ? (
            <EmptyState
              compact
              icon={EMPTY_ICONS.payments}
              title="No withdrawals yet"
              message="Requests and their status show here."
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Requested</th>
                  <th>To</th>
                  <th className="num">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((w) => (
                  <tr key={w.id}>
                    <td>{fmtDay(w.created_at)}</td>
                    <td>
                      {w.payment_method_type}
                      <span className="cell-sub">
                        {w.mpesa_number || w.till_number || w.paybill_number || w.bank_name}
                      </span>
                    </td>
                    <td className="num">KES {fmtAmount(w.amount)}</td>
                    <td>
                      <span className={`chip ${WITHDRAWAL_CHIP[w.status] || ""}`}>
                        {w.status}
                      </span>
                      {w.mpesa_receipt_number && (
                        <span className="cell-sub">{w.mpesa_receipt_number}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      {/* Destinations used to live on the profile page, a nav section away from
          the only screen that spends them. They belong under the withdrawal
          form that needs one. */}
      <section className="panel-card">
        <PayoutMethods />
      </section>

      <section className="panel-card">
        <header className="card-head">
          <h2>App bookings</h2>
          <p>What each Ardena app booking earned you</p>
        </header>

        {transactions.length === 0 ? (
          <EmptyState
            compact
            icon={EMPTY_ICONS.bookings}
            title="No app bookings yet"
            message="Bookings from the Ardena app land here."
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Booking</th>
                <th>Vehicle</th>
                <th>Renter</th>
                <th className="num">Gross</th>
                <th className="num">Commission</th>
                <th className="num">Net</th>
                <th>Paid</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.booking_id}>
                  <td>
                    <span className="strong">{t.booking_ref || t.booking_id}</span>
                  </td>
                  <td>
                    {t.car_name}
                    {t.plate && <span className="cell-sub">{t.plate}</span>}
                  </td>
                  <td>{t.customer_name || "—"}</td>
                  <td className="num">{fmtAmount(t.amount)}</td>
                  <td className="num">−{fmtAmount(t.commission_amount)}</td>
                  <td className="num strong">{fmtAmount(t.net_amount)}</td>
                  <td>
                    {fmtDay(t.paid_at)}
                    {t.mpesa_receipt_number && (
                      <span className="cell-sub">{t.mpesa_receipt_number}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
