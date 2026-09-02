import { useCallback, useEffect, useState } from "react";
import Dropdown from "../components/Dropdown";
import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState from "./EmptyState";
import { toast } from "./toastStore";
import useRole from "../hooks/useRole";
import {
  fetchPayoutMethods,
  createPayoutMethod,
  deletePayoutMethod,
} from "../lib/api";
import "./earnings.css";

// Each destination needs different details, and the backend rejects a method
// that's missing any of them, so the form only asks for what applies.
export const METHODS = {
  "M-Pesa": { value: "mpesa", fields: ["mpesa_number"] },
  Paybill: { value: "paybill", fields: ["paybill_number", "account_number"] },
  Till: { value: "till", fields: ["till_number"] },
  Bank: { value: "bank", fields: ["bank_name", "account_number", "account_name"] },
};

/* The banks a Kenyan rental business is realistically settling into, ordered
   roughly by how often that is true. "Other" keeps the long tail reachable
   without a list nobody can scan: picking it swaps in a free-text field. */
export const KENYAN_BANKS = [
  "Equity Bank",
  "KCB Bank",
  "Co-operative Bank",
  "NCBA Bank",
  "Absa Bank Kenya",
  "Standard Chartered",
  "Stanbic Bank",
  "Diamond Trust Bank",
  "I&M Bank",
  "Family Bank",
  "National Bank of Kenya",
  "Sidian Bank",
  "Gulf African Bank",
  "Prime Bank",
  "Ecobank Kenya",
  "HFC Bank",
  "Other",
];

const FIELD_LABELS = {
  mpesa_number: "M-Pesa number",
  paybill_number: "Paybill number",
  account_number: "Account number",
  till_number: "Till number",
  bank_name: "Bank",
  account_name: "Account name",
};

const FIELD_PLACEHOLDERS = {
  mpesa_number: "0712 345 678",
  paybill_number: "522522",
  account_number: "0123456789",
  till_number: "8765432",
  account_name: "Acme Car Hire Ltd",
};

/* Which fields a type needs filled in. account_name is the one optional field
   — a bank will settle without it, and businesses often don't know the exact
   registered string. */
const OPTIONAL = new Set(["account_name"]);

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

/* Where payout destinations are managed. Rendered on Finances, under the
   withdrawal form: the account you pay out to and the act of paying out are
   the same errand, and splitting them across two nav sections meant the
   withdrawal form had to send you away to complete itself. Kept a component
   rather than inlined so the payout form only has to offer a choice, not a
   CRUD screen. */
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
      toast(err.message || "Couldn't load settlement accounts", "danger");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setMethodLabel("M-Pesa");
    setMethodName("");
    setMethodFields({});
    setAdding(true);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (busy) return;
    const spec = METHODS[methodLabel];
    setBusy(true);
    try {
      const values = Object.fromEntries(
        spec.fields.map((f) => [f, (methodFields[f] || "").trim() || null])
      );
      // "Other" is a picker option, never a bank. Send what they typed.
      if (values.bank_name === "Other") {
        values.bank_name = (methodFields.bank_other || "").trim() || null;
      }
      await createPayoutMethod({
        name: methodName.trim() || methodLabel,
        method_type: spec.value,
        ...values,
      });
      toast("Settlement account saved.");
      setAdding(false);
      setMethodName("");
      setMethodFields({});
      await load();
    } catch (err) {
      toast(err.message || "Couldn't save that account", "danger");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!removing) return;
    try {
      await deletePayoutMethod(removing.id);
      toast("Account removed.");
      await load();
    } catch (err) {
      toast(err.message || "Couldn't remove that account", "danger");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <>
      <ConfirmDialog
        open={Boolean(removing)}
        title="Remove settlement account"
        message={`${removing?.name || "This account"} will no longer receive settlements.`}
        confirmLabel="Remove"
        onConfirm={handleRemove}
        onCancel={() => setRemoving(null)}
      />

      {/* Top-right page action, the same control as "New booking" — adding a
          settlement account is a page-level errand, not a card ornament. */}
      {canManage && (
        <div className="page-actions">
          <button type="button" className="btn btn-primary page-action-btn" onClick={openAdd}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add account
          </button>
        </div>
      )}

      <section className="panel-card">
        <header className="card-head">
          <h2>Settlement accounts</h2>
          <p>Settled within one business day</p>
        </header>

        {loading ? null : methods.length === 0 ? (
          <EmptyState minimal title="No account saved yet" />
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
      </section>

      {adding && (
        <div className="modal-overlay" onClick={() => !busy && setAdding(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">
              <h3>Add settlement account</h3>
              <button
                type="button"
                className="icon-btn"
                disabled={busy}
                onClick={() => setAdding(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </header>
            <form className="modal-body" onSubmit={handleAdd}>
              <label className="field-label">
                Type
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
              </label>

              {METHODS[methodLabel].fields.map((f) =>
                f === "bank_name" ? (
                  <label className="field-label" key={f}>
                    Bank
                    <Dropdown
                      id="pm-bank"
                      name="bank_name"
                      value={methodFields.bank_name || KENYAN_BANKS[0]}
                      onChange={(v) =>
                        setMethodFields((st) => ({ ...st, bank_name: v, bank_other: "" }))
                      }
                      options={KENYAN_BANKS}
                    />
                  </label>
                ) : (
                  <label className="field-label" key={f}>
                    {FIELD_LABELS[f]}
                    {OPTIONAL.has(f) && (
                      <span className="ho-photos-hint"> · optional</span>
                    )}
                    <input
                      id={`pm-${f}`}
                      className="field-input"
                      value={methodFields[f] || ""}
                      onChange={(e) =>
                        setMethodFields((st) => ({ ...st, [f]: e.target.value }))
                      }
                      placeholder={FIELD_PLACEHOLDERS[f]}
                      required={!OPTIONAL.has(f)}
                    />
                  </label>
                )
              )}

              {/* "Other" is the escape hatch for the long tail of banks the
                  list doesn't carry — picking it has to ask which one. */}
              {methodLabel === "Bank" && methodFields.bank_name === "Other" && (
                <label className="field-label">
                  Bank name
                  <input
                    className="field-input"
                    value={methodFields.bank_other || ""}
                    onChange={(e) =>
                      setMethodFields((st) => ({ ...st, bank_other: e.target.value }))
                    }
                    placeholder="Which bank?"
                    required
                  />
                </label>
              )}

              <label className="field-label">
                Label <span className="ho-photos-hint">· optional</span>
                <input
                  id="pm-name"
                  className="field-input"
                  value={methodName}
                  onChange={(e) => setMethodName(e.target.value)}
                  placeholder={`Main ${methodLabel}`}
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={() => setAdding(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? "Saving…" : "Save account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
