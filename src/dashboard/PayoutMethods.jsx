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
  requestSettlementVerification,
  confirmSettlementVerification,
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

const TYPE_LABEL = {
  mpesa: "M-Pesa",
  till: "Till",
  paybill: "Paybill",
  bank: "Bank",
};

/* The destination itself, without the type — the table has a column for that.
   Paybill is the one that needs both its numbers: a paybill without an account
   number reaches Safaricom and stops. */
function accountLine(m) {
  if (m.method_type === "paybill") {
    return [m.paybill_number, m.account_number].filter(Boolean).join(" · ");
  }
  if (m.method_type === "bank") {
    return [m.bank_name, m.account_number].filter(Boolean).join(" · ");
  }
  return m.mpesa_number || m.till_number || "-";
}

/* "d***@ardena.co.ke and 07** *** 678" — where the code went. Both values are
   masked by the server; this only joins them. Falls back to something true
   rather than empty if a channel is missing. */
function sentToLine(sent) {
  const parts = [sent?.email, sent?.phone].filter(Boolean);
  if (!parts.length) return "your registered email and phone";
  return parts.join(" and ");
}

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
  const [verifyBusy, setVerifyBusy] = useState(null); // id mid-request
  const [verifying, setVerifying] = useState(null); // the account being confirmed
  const [otp, setOtp] = useState("");
  const [otpSentTo, setOtpSentTo] = useState(null); // { email, phone }, masked

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

  /* Two steps, the same shape as changing a password: ask for a code, then
     send it back. The code goes to the signed-in user's registered email, not
     to anything on the account being verified — the point is proving it is
     still them, not that the account exists. */
  async function startVerify(m) {
    if (verifyBusy) return;
    setVerifyBusy(m.id);
    try {
      const res = await requestSettlementVerification(m.id);
      setOtpSentTo({ email: res?.sent_to_email, phone: res?.sent_to_phone });
      setOtp("");
      setVerifying(m);
    } catch (err) {
      toast(err.message || "Couldn't send the code", "danger");
    } finally {
      setVerifyBusy(null);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    if (busy || !verifying) return;
    setBusy(true);
    try {
      await confirmSettlementVerification(verifying.id, otp.trim());
      toast("Settlement account verified.");
      setVerifying(null);
      setOtp("");
      await load();
    } catch (err) {
      toast(err.message || "That code didn't work", "danger");
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
          /* A row per account rather than a stack of blocks: type, where the
             money lands, and whether it is verified are three short values
             that belong on one line, and the block layout was spending a full
             card width on two of them. */
          <table className="data-table settle-table">
            <thead>
              <tr>
                <th className="num-col">#</th>
                <th>Type</th>
                <th>Details</th>
                <th>Status</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {methods.map((m, i) => {
                const verified = m.status === "verified" || m.verified;
                return (
                  <tr key={m.id}>
                    <td className="num-col">{i + 1}</td>
                    <td>
                      <p className="strong">{TYPE_LABEL[m.method_type] || m.method_type}</p>
                      {m.name && m.name !== TYPE_LABEL[m.method_type] && (
                        <p className="cell-sub">{m.name}</p>
                      )}
                    </td>
                    <td className="mono">{accountLine(m)}</td>
                    <td>
                      <span className={`chip ${verified ? "active" : "pending"}`}>
                        {verified ? "Verified" : "Unverified"}
                      </span>
                    </td>
                    <td className="actions-cell">
                      {/* Verifying is the only action that changes anything
                          about an unverified account, so it leads. */}
                      {!verified && canManage && (
                        <button
                          type="button"
                          className="icon-btn"
                          disabled={verifyBusy === m.id}
                          onClick={() => startVerify(m)}
                        >
                          {verifyBusy === m.id ? "Sending…" : "Verify"}
                        </button>
                      )}
                      {canManage && (
                        <button
                          type="button"
                          className="icon-btn danger"
                          aria-label={`Remove ${m.name || "account"}`}
                          onClick={() => setRemoving(m)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
      {/* ---- Verify by one-time code ---- */}
      {verifying && (
        <div className="modal-overlay" onClick={() => !busy && setVerifying(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">
              <h3>Verify settlement account</h3>
              <button
                type="button"
                className="icon-btn"
                disabled={busy}
                onClick={() => setVerifying(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </header>
            <form className="modal-body" onSubmit={handleVerify}>
              {/* Say which contacts it went to, so someone who has lost one of
                  them knows to check the other rather than assume it failed. */}
              <p className="side-hint" style={{ marginTop: 0 }}>
                We sent a code to {sentToLine(otpSentTo)}. Enter it to confirm{" "}
                <strong>{accountLine(verifying)}</strong> as a settlement
                destination.
              </p>
              <label className="field-label">
                One-time code
                <input
                  className="field-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  autoFocus
                />
              </label>
              <p className="side-hint" style={{ marginTop: 0 }}>
                Didn&apos;t get it?{" "}
                <button
                  type="button"
                  className="auth-linkish"
                  onClick={() => startVerify(verifying)}
                  disabled={Boolean(verifyBusy)}
                >
                  Send another
                </button>
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={() => setVerifying(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={busy || !otp.trim()}>
                  {busy ? "Verifying…" : "Verify account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </>
  );
}