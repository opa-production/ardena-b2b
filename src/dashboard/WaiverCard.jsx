/* Booking details: the damage waiver paid on Stellar (stellar.md §1.4).
 *
 * Shows the fee, where the money is, the claim if there is one, and every
 * transaction with its Stellar link, plus "File a claim" while the claim
 * window is open. Who files decides where the claim goes: Owner/Finance send
 * it straight to Ardena, anyone else's waits for their approval in Damage
 * claims. The backend decides; this card just says which happened.
 *
 * Renders nothing when the booking has no waiver or the backend doesn't have
 * the endpoint (pilot).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchBookingWaiver, fileWaiverClaim } from "../lib/api";
import { STELLAR_BOOKINGS as STELLAR } from "./stellarStore";
import useRole from "../hooks/useRole";
import { toast } from "./toastStore";
import { refreshStellar } from "./stellarStore";
import { TestnetBadge, TxTimeline, fmtKes, fmtUsdc, fmtWhen, kesToUsdcEstimate } from "./stellarUi";
import {
  CLAIM_STATUS_LABEL,
  CLAIM_STATUS_PILL,
  WAIVER_STATUS_LABEL,
  filedMessage,
} from "./waiverClaims";
import "../components/confirm.css";
import "./claims.css";

export default function WaiverCard({ booking }) {
  const { can } = useRole();
  const [waiver, setWaiver] = useState(null);
  const [claimOpen, setClaimOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const w = await fetchBookingWaiver(booking.ref);
      setWaiver(w || null);
    } catch {
      setWaiver(null);
    }
  }, [booking.ref]);

  useEffect(() => {
    if (STELLAR) load();
  }, [load]);

  if (!STELLAR || !waiver) return null;

  const network = waiver.network;
  const claim = waiver.claim || null;
  const windowEnds = waiver.claim_window_ends || claim?.claim_window_ends;
  const windowOpen = !windowEnds || new Date(windowEnds) > new Date();
  const canFile = can("fileWaiverClaim") && !claim && waiver.status === "held" && windowOpen;
  const fee = waiver.fee_usdc ?? waiver.amount_usdc;

  return (
    <section className="panel-card st-card">
      <header className="card-head with-action">
        <div>
          <h2>
            Damage waiver <TestnetBadge network={network} />
          </h2>
          <p>Fee paid on Stellar{waiver.payer === "business" ? " from your wallet" : ""}</p>
        </div>
        {waiver.status && <span className="st-pill grey">{WAIVER_STATUS_LABEL[waiver.status] || waiver.status}</span>}
      </header>

      <p className="st-amount">
        {fmtUsdc(fee)} USDC
        {waiver.fee_kes != null && <span className="cell-sub"> · {fmtKes(waiver.fee_kes)}</span>}
      </p>
      {windowEnds && <p className="cell-sub">Claim window ends {fmtWhen(windowEnds)}</p>}

      {claim && (
        <div className="st-claim-box">
          <div className="pay-row">
            <span>Claim · {fmtKes(claim.requested_amount_kes ?? claim.requested_amount)}</span>
            <span className={`st-pill ${CLAIM_STATUS_PILL[claim.status] || "grey"}`}>
              {CLAIM_STATUS_LABEL[claim.status] || claim.status}
            </span>
          </div>
          {claim.status === "approved" && claim.approved_usdc && (
            <p className="cell-sub">Approved: {fmtUsdc(claim.approved_usdc)} USDC to your wallet</p>
          )}
          {claim.id != null && (
            <Link className="spec-link" to={`/dashboard/damage-claims?open=${encodeURIComponent(claim.id)}`}>
              Open in Damage claims
            </Link>
          )}
        </div>
      )}

      <div className="st-section">
        <p className="field-label">On Stellar</p>
        <TxTimeline transactions={waiver.transactions} network={network} kind="waiver" />
      </div>

      {canFile && (
        <div className="deposit-actions">
          <button type="button" className="icon-btn" onClick={() => setClaimOpen(true)}>
            File a damage claim
          </button>
        </div>
      )}

      {claimOpen && (
        <WaiverClaimDialog
          booking={booking}
          onClose={() => setClaimOpen(false)}
          onFiled={(res) => {
            const status = res?.claim?.status || res?.status;
            toast(filedMessage(status));
            load();
            refreshStellar(); // the Damage claims badge
          }}
        />
      )}
    </section>
  );
}

function WaiverClaimDialog({ booking, onClose, onFiled }) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [useEvidence, setUseEvidence] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const firstRef = useRef(null);

  // The check-in photos are the record of how the car came back.
  const evidence = (booking?.handover?.inn?.photos || []).map((p) => p.url).filter(Boolean);

  useEffect(() => {
    firstRef.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    if (saving) return;
    setError("");
    const value = Number(amount);
    if (!value || value <= 0) {
      setError("Enter the repair cost you're claiming.");
      return;
    }
    if (description.trim().length < 10) {
      setError("Describe the damage, this is what gets reviewed.");
      return;
    }
    setSaving(true);
    try {
      const res = await fileWaiverClaim(booking.ref, {
        requested_amount: value,
        description: description.trim(),
        evidence_urls: useEvidence && evidence.length ? evidence : [],
      });
      onFiled(res);
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
        aria-label="File a damage claim"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 className="modal-title">File a damage claim</h3>
        <p className="modal-message">
          The waiver fee is frozen on Stellar as soon as you file, so it can&apos;t settle while
          the claim is reviewed. Owner and Finance claims go straight to Ardena; anyone
          else&apos;s waits for their approval first.
        </p>
        <form onSubmit={submit} className="claim-form">
          <div className="field">
            <label htmlFor="wc-amount">Repair cost (KES)</label>
            <input
              ref={firstRef}
              id="wc-amount"
              type="number"
              min={1}
              step={100}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="15,000"
            />
            {Number(amount) > 0 && <p className="field-note">≈ {kesToUsdcEstimate(amount)} USDC</p>}
          </div>
          <div className="field">
            <label htmlFor="wc-desc">What happened</label>
            <textarea
              id="wc-desc"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Rear bumper cracked on return, not there at check-out. Garage quote attached."
            />
          </div>
          {evidence.length > 0 && (
            <label className="st-check">
              <input type="checkbox" checked={useEvidence} onChange={(e) => setUseEvidence(e.target.checked)} />
              Attach the {evidence.length} check-in photo{evidence.length > 1 ? "s" : ""} as evidence
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
