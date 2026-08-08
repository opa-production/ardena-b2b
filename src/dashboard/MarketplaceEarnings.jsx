import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageSkeleton from "./PageSkeleton";
import EmptyState, { EMPTY_ICONS } from "./EmptyState";
import Dropdown from "../components/Dropdown";
import ConfirmDialog from "../components/ConfirmDialog";
import { toast } from "./toastStore";
import usePageTitle from "../hooks/usePageTitle";
import {
  fetchMarketplaceEarnings,
  fetchMarketplaceTransactions,
  fetchMarketplaceWithdrawals,
  createMarketplaceWithdrawal,
  fetchPayoutMethods,
  createPayoutMethod,
  deletePayoutMethod,
} from "../lib/api";
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

// Each destination needs different details, and the backend rejects a method
// that's missing any of them — so the form only asks for what applies.
const METHODS = {
  "M-Pesa": { value: "mpesa", fields: ["mpesa_number"] },
  Paybill: { value: "paybill", fields: ["paybill_number", "account_number"] },
  Till: { value: "till", fields: ["till_number"] },
  Bank: { value: "bank", fields: ["bank_name", "account_number", "account_name"] },
};

const FIELD_LABELS = {
  mpesa_number: "M-Pesa number",
  paybill_number: "Paybill number",
  till_number: "Till number",
  bank_name: "Bank name",
  account_number: "Account number",
  account_name: "Account name (optional)",
};

const FIELD_PLACEHOLDERS = {
  mpesa_number: "254712345678",
  paybill_number: "522522",
  till_number: "8765432",
  bank_name: "Equity Bank",
  account_number: "0123456789",
  account_name: "Acme Car Hire Ltd",
};

function fmtDay(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function MarketplaceEarnings() {
  usePageTitle("Marketplace earnings");

  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // withdrawal form
  const [amount, setAmount] = useState("");
  const [methodId, setMethodId] = useState("");

  // add-destination form
  const [adding, setAdding] = useState(false);
  const [methodLabel, setMethodLabel] = useState("M-Pesa");
  const [methodName, setMethodName] = useState("");
  const [methodFields, setMethodFields] = useState({});
  const [removing, setRemoving] = useState(null);

  const load = useCallback(async () => {
    try {
      const [sum, tx, wd, pm] = await Promise.all([
        fetchMarketplaceEarnings(),
        fetchMarketplaceTransactions({ limit: 50 }),
        fetchMarketplaceWithdrawals({ limit: 20 }),
        fetchPayoutMethods(),
      ]);
      setSummary(sum);
      setTransactions(tx?.transactions || []);
      setWithdrawals(wd?.withdrawals || []);
      setMethods(pm || []);
      if (!methodId && pm?.length) setMethodId(String(pm[0].id));
    } catch (err) {
      toast(err.message || "Failed to load earnings", "danger");
    } finally {
      setLoading(false);
    }
  }, [methodId]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      await load();
    } catch (err) {
      toast(err.message || "Couldn't request that withdrawal", "danger");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddMethod(e) {
    e.preventDefault();
    if (busy) return;
    const spec = METHODS[methodLabel];
    setBusy(true);
    try {
      await createPayoutMethod({
        name: methodName.trim() || methodLabel,
        method_type: spec.value,
        ...Object.fromEntries(
          spec.fields.map((f) => [f, (methodFields[f] || "").trim() || null])
        ),
      });
      toast("Payout destination saved.");
      setAdding(false);
      setMethodName("");
      setMethodFields({});
      await load();
    } catch (err) {
      toast(err.message || "Couldn't save that destination", "danger");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveMethod() {
    if (!removing) return;
    try {
      await deletePayoutMethod(removing.id);
      toast("Destination removed.");
      if (String(removing.id) === String(methodId)) setMethodId("");
      await load();
    } catch (err) {
      toast(err.message || "Couldn't remove that destination", "danger");
    } finally {
      setRemoving(null);
    }
  }

  if (loading) return <PageSkeleton />;

  // Nothing published yet isn't an error — it just means there's nothing to earn
  // on. Point at the fleet rather than showing four zeroes and a payout form.
  if (summary && !summary.marketplace_active) {
    return (
      <>
        <header className="head-card">
          <div className="head-titles">
            <h1>Marketplace earnings</h1>
            <p>What you&apos;ve earned from Ardena app bookings</p>
          </div>
        </header>
        <EmptyState
          icon={EMPTY_ICONS.payments}
          title="No marketplace listings yet"
          message="List a vehicle on the Ardena app and its bookings, earnings and payouts will show up here."
          action={
            <Link className="btn btn-primary" to="/dashboard/fleet">
              Go to fleet
            </Link>
          }
        />
      </>
    );
  }

  const s = summary || {};
  const ratePct = Math.round((s.commission_rate || 0) * 1000) / 10;

  return (
    <>
      <ConfirmDialog
        open={Boolean(removing)}
        title="Remove payout destination"
        message={`${removing?.name || "This destination"} will no longer be available for withdrawals.`}
        confirmLabel="Remove"
        onConfirm={handleRemoveMethod}
        onCancel={() => setRemoving(null)}
      />

      <header className="head-card">
        <div className="head-titles">
          <h1>Marketplace earnings</h1>
          <p>What you&apos;ve earned from Ardena app bookings</p>
        </div>
      </header>

      <div className="stat-grid finance-stats">
        <article className="stat-card">
          <p className="stat-label">Gross</p>
          <p className="stat-value">KES {fmtAmount(s.total_gross)}</p>
          <p className="stat-note">{s.paid_bookings_count || 0} paid app bookings</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Ardena commission</p>
          <p className="stat-value">KES {fmtAmount(s.commission_amount)}</p>
          <p className="stat-note">{ratePct}% of gross</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Net earnings</p>
          <p className="stat-value">KES {fmtAmount(s.net_earnings)}</p>
          <p className="stat-note">after commission</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Available to withdraw</p>
          <p className="stat-value">KES {fmtAmount(s.withdrawable)}</p>
          <p className="stat-note">
            {s.pending_withdrawals_total
              ? `KES ${fmtAmount(s.pending_withdrawals_total)} already requested`
              : "nothing pending"}
          </p>
        </article>
      </div>

      <div className="earnings-grid">
        <section className="panel-card">
          <header className="card-head">
            <h2>Withdraw</h2>
            <p>Paid out to a destination you&apos;ve saved</p>
          </header>

          {methods.length === 0 ? (
            <p className="field-note earnings-empty-note">
              Add a payout destination below before requesting a withdrawal.
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
                  value={
                    methods.find((m) => String(m.id) === String(methodId))?.name ||
                    methods[0]?.name ||
                    ""
                  }
                  onChange={(label) => {
                    const found = methods.find((m) => m.name === label);
                    if (found) setMethodId(String(found.id));
                  }}
                  options={methods.map((m) => m.name)}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                Request withdrawal
              </button>
            </form>
          )}

          <header className="card-head payout-head">
            <h2>Payout destinations</h2>
            {!adding && (
              <button
                type="button"
                className="head-link"
                onClick={() => setAdding(true)}
              >
                Add destination
              </button>
            )}
          </header>

          {methods.map((m) => (
            <div className="payout-row" key={m.id}>
              <div>
                <strong>{m.name}</strong>
                <p className="cell-sub">
                  {m.method_type} ·{" "}
                  {m.mpesa_number ||
                    m.till_number ||
                    [m.paybill_number, m.account_number].filter(Boolean).join(" · ") ||
                    [m.bank_name, m.account_number].filter(Boolean).join(" · ")}
                </p>
              </div>
              <button
                type="button"
                className="icon-btn danger"
                onClick={() => setRemoving(m)}
              >
                Remove
              </button>
            </div>
          ))}

          {adding && (
            <form className="payout-form" onSubmit={handleAddMethod}>
              <div className="field">
                <label htmlFor="pm-type">Type</label>
                <Dropdown
                  id="pm-type"
                  name="method_type"
                  value={methodLabel}
                  onChange={(v) => {
                    setMethodLabel(v);
                    setMethodFields({});
                  }}
                  options={Object.keys(METHODS)}
                />
              </div>
              <div className="field">
                <label htmlFor="pm-name">Label</label>
                <input
                  id="pm-name"
                  value={methodName}
                  onChange={(e) => setMethodName(e.target.value)}
                  placeholder="Main M-Pesa"
                />
              </div>
              {METHODS[methodLabel].fields.map((f) => (
                <div className="field" key={f}>
                  <label htmlFor={`pm-${f}`}>{FIELD_LABELS[f]}</label>
                  <input
                    id={`pm-${f}`}
                    value={methodFields[f] || ""}
                    onChange={(e) =>
                      setMethodFields((s2) => ({ ...s2, [f]: e.target.value }))
                    }
                    placeholder={FIELD_PLACEHOLDERS[f]}
                  />
                </div>
              ))}
              <div className="payout-form-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setAdding(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  Save destination
                </button>
              </div>
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
              message="Requested payouts and their status will appear here."
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
            message="Bookings made by renters on the Ardena app will be itemised here."
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
