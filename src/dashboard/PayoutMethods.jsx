import { useCallback, useEffect, useState } from "react";
import Dropdown from "../components/Dropdown";
import ConfirmDialog from "../components/ConfirmDialog";
import { toast } from "./toastStore";
import useRole from "../hooks/useRole";
import {
  fetchPayoutMethods,
  createPayoutMethod,
  deletePayoutMethod,
} from "../lib/api";
import "./earnings.css";

// Each destination needs different details, and the backend rejects a method
// that's missing any of them — so the form only asks for what applies.
export const METHODS = {
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

/* "mpesa · 0702248984" — the detail that tells two saved destinations apart.
   Exported because the withdraw dropdown needs the same line. */
export function methodDetail(m) {
  return [
    m.method_type,
    m.mpesa_number ||
      m.till_number ||
      [m.paybill_number, m.account_number].filter(Boolean).join(" · ") ||
      [m.bank_name, m.account_number].filter(Boolean).join(" · "),
  ]
    .filter(Boolean)
    .join(" · ");
}

/* Where payout destinations are managed: the Settings page. Withdrawing is a
   money action that belongs on Finances; keeping the account details here
   means the payout form only has to offer a choice, not a CRUD screen. */
export default function PayoutMethods() {
  const { can } = useRole();
  const canManage = can("manageWithdrawals");

  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [methodLabel, setMethodLabel] = useState("M-Pesa");
  const [methodName, setMethodName] = useState("");
  const [methodFields, setMethodFields] = useState({});
  const [removing, setRemoving] = useState(null);

  const load = useCallback(async () => {
    try {
      setMethods((await fetchPayoutMethods()) || []);
    } catch (err) {
      toast(err.message || "Couldn't load payout destinations", "danger");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e) {
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

  async function handleRemove() {
    if (!removing) return;
    try {
      await deletePayoutMethod(removing.id);
      toast("Destination removed.");
      await load();
    } catch (err) {
      toast(err.message || "Couldn't remove that destination", "danger");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <>
      <ConfirmDialog
        open={Boolean(removing)}
        title="Remove payout destination"
        message={`${removing?.name || "This destination"} will no longer be available for withdrawals.`}
        confirmLabel="Remove"
        onConfirm={handleRemove}
        onCancel={() => setRemoving(null)}
      />

      <header className="card-head payout-head">
        <div>
          <h2>Payout destinations</h2>
          <p>Where Ardena app earnings are sent when you withdraw</p>
        </div>
        {!adding && canManage && (
          <button type="button" className="head-link" onClick={() => setAdding(true)}>
            Add destination
          </button>
        )}
      </header>

      {loading ? null : methods.length === 0 && !adding ? (
        <p className="field-note earnings-empty-note">
          {canManage
            ? "No destinations saved yet. Add one before requesting a withdrawal."
            : "No destinations saved yet."}
        </p>
      ) : (
        methods.map((m) => (
          <div className="payout-row" key={m.id}>
            <div>
              <strong>{m.name}</strong>
              <p className="cell-sub">{methodDetail(m)}</p>
            </div>
            {canManage && (
              <button
                type="button"
                className="icon-btn danger"
                onClick={() => setRemoving(m)}
              >
                Remove
              </button>
            )}
          </div>
        ))
      )}

      {adding && (
        <form className="payout-form" onSubmit={handleAdd}>
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
                  setMethodFields((s) => ({ ...s, [f]: e.target.value }))
                }
                placeholder={FIELD_PLACEHOLDERS[f]}
              />
            </div>
          ))}
          <div className="payout-form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              Save destination
            </button>
          </div>
        </form>
      )}
    </>
  );
}
