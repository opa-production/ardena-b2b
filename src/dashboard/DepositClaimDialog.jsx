import { useEffect, useRef, useState } from "react";
import Dropdown from "../components/Dropdown";
import { fileDepositClaim } from "../lib/api";
import { toast } from "./toastStore";
import "../components/confirm.css";
import "./claims.css";

const CLAIM_TYPES = [
  { value: "damage", label: "Damage" },
  { value: "late_return", label: "Late return" },
  { value: "cleaning", label: "Cleaning" },
  { value: "traffic_fine", label: "Traffic fine" },
  { value: "other", label: "Other" },
];

const LABELS = CLAIM_TYPES.map((t) => t.label);
const VALUE_BY_LABEL = Object.fromEntries(CLAIM_TYPES.map((t) => [t.label, t.value]));

/**
 * Claim against a renter's deposit on an Ardena app booking.
 *
 * Ardena holds that money — the renter paid it at checkout, not to the business —
 * so the dashboard's own refund/forfeit buttons are refused for these bookings.
 * This is the route instead: the claim goes to Ardena for review and the money
 * moves once, either back to the renter or to the business.
 *
 * The handover check-in photos are offered as evidence because they are already
 * the record of what the vehicle looked like when it came back.
 */
export default function DepositClaimDialog({ booking, depositAmount, onClose, onFiled }) {
  const [typeLabel, setTypeLabel] = useState(LABELS[0]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [useEvidence, setUseEvidence] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const firstRef = useRef(null);

  // Photos taken at check-in are the natural evidence for damage or cleaning.
  const evidence = (booking?.handover?.inn?.photos || []).map((p) => p.url).filter(Boolean);

  useEffect(() => {
    firstRef.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    setError("");

    const value = Number(amount);
    if (!value || value <= 0) {
      setError("Enter the amount you're claiming.");
      return;
    }
    if (depositAmount && value > depositAmount) {
      setError(`The deposit held is KES ${depositAmount.toLocaleString("en-KE")}. A claim can't exceed it.`);
      return;
    }
    if (description.trim().length < 10) {
      setError("Describe what happened, Ardena reviews this before moving any money.");
      return;
    }

    setSaving(true);
    try {
      await fileDepositClaim(booking.ref, {
        claim_type: VALUE_BY_LABEL[typeLabel],
        requested_amount: value,
        description: description.trim(),
        evidence_urls: useEvidence && evidence.length ? evidence : null,
      });
      toast("Claim filed. Ardena will review it and let you know the outcome.");
      onFiled?.();
      onClose();
    } catch (err) {
      setError(err.message || "Couldn't file that claim");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="modal-card claim-card"
        role="dialog"
        aria-modal="true"
        aria-label="Claim against deposit"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 className="modal-title">Claim against the deposit</h3>
        <p className="modal-message">
          {depositAmount
            ? `Ardena is holding KES ${depositAmount.toLocaleString("en-KE")} for ${booking.ref}. `
            : ""}
          Tell us what happened and how much you&apos;re claiming. Ardena reviews every
          claim before any money moves, and the renter is told the outcome.
        </p>

        <form onSubmit={handleSubmit} className="claim-form">
          <div className="form-row form-row-2">
            <div className="field">
              <label htmlFor="claim-type">Reason</label>
              <Dropdown
                id="claim-type"
                name="claim_type"
                value={typeLabel}
                onChange={setTypeLabel}
                options={LABELS}
              />
            </div>
            <div className="field">
              <label htmlFor="claim-amount">Amount (KES)</label>
              <input
                ref={firstRef}
                id="claim-amount"
                type="number"
                min={1}
                max={depositAmount || undefined}
                step={100}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="5,000"
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="claim-desc">What happened</label>
            <textarea
              id="claim-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Rear bumper scuffed on return, not present at check-out. Quote from the panel beater attached."
            />
            <p className="field-note">
              Be specific, this is what Ardena weighs against the renter&apos;s account.
            </p>
          </div>

          {evidence.length > 0 && (
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={useEvidence}
                onChange={(e) => setUseEvidence(e.target.checked)}
              />
              Attach the {evidence.length} check-in photo
              {evidence.length > 1 ? "s" : ""} as evidence
            </label>
          )}

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost modal-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary modal-btn" disabled={saving}>
              {saving ? "Filing…" : "File claim"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
