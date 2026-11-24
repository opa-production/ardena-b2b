/* Damage claims (Bookings → Damage claims), stellar.md §1.5.
 *
 * The approval console for damage-waiver claims. A claim filed by a Manager or
 * Booking agent waits here for an Owner/Finance decision before it reaches
 * Ardena; one filed by Owner/Finance goes straight on and is listed here to
 * follow. Each row opens a drawer with the description, the evidence, the
 * waiver's transactions on Stellar and, for claims still awaiting the
 * business, the approve / reject form.
 *
 * Pilot: a backend without /waiver-claims shows a quiet "not available"
 * card instead of an error.
 */
import { useCallback, useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import PageSkeleton from "./PageSkeleton";
import FilterDropdown from "../components/FilterDropdown";
import RefreshButton from "../components/RefreshButton";
import ConfirmDialog from "../components/ConfirmDialog";
import { fetchWaiverClaim, fetchWaiverClaims, reviewWaiverClaim } from "../lib/api";
import { isUnavailable, needsPilotSignIn, refreshStellar, stellarCan } from "./stellarStore";
import { PilotGate } from "./StellarPilot";
import { StellarLink, TestnetBadge, TxTimeline, fmtKes, fmtUsdc, fmtWhen, kesToUsdcEstimate } from "./stellarUi";
import { CLAIM_STATUS_LABEL, CLAIM_STATUS_PILL, WAIVER_STATUS_LABEL, decidedByLabel } from "./waiverClaims";
import { toast } from "./toastStore";
import usePageTitle from "../hooks/usePageTitle";
import "./fleet.css";
import "./bookings.css";
import "./wallet.css";
import "./claims.css";
import "../components/confirm.css";
import "./stellar.css";

const LIMIT = 20;

export default function DamageClaims() {
  usePageTitle("Damage claims");
  return (
    <PilotGate title="Damage claims">
      <DamageClaimsPage />
    </PilotGate>
  );
}

function DamageClaimsPage() {
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const openId = params.get("open");

  const [status, setStatus] = useState("");
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  // "loading" | "ready" | "off"
  const [state, setState] = useState("loading");
  const [more, setMore] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchWaiverClaims({ status, page: 1, limit: LIMIT });
      setRows(res?.items || []);
      setCounts(res?.counts || null);
      setTotal(res?.total || 0);
      setPage(1);
      setState("ready");
    } catch (err) {
      if (needsPilotSignIn(err)) return; // the gate shows the pilot sign-in
      if (isUnavailable(err)) setState("off");
      else {
        setState("ready");
        toast(err.message || "Couldn't load claims", "danger");
      }
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  async function loadMore() {
    if (more) return;
    setMore(true);
    try {
      const next = page + 1;
      const res = await fetchWaiverClaims({ status, page: next, limit: LIMIT });
      setRows((prev) => [...prev, ...(res?.items || [])]);
      setPage(next);
    } catch (err) {
      toast(err.message || "Couldn't load more", "danger");
    } finally {
      setMore(false);
    }
  }

  const openClaim = (id) => setParams(id != null ? { open: String(id) } : {}, { replace: true });

  if (state === "loading") return <PageSkeleton path={pathname} />;

  if (state === "off") {
    return (
      <section className="panel-card st-empty">
        <h1 className="st-empty-title">Damage claims</h1>
        <p className="cell-sub">
          Damage-waiver claims are in pilot and aren&apos;t switched on for your workspace yet.
          Everything else works as usual.
        </p>
      </section>
    );
  }

  const c = counts || {};
  const filters = [
    { value: "", label: "All claims" },
    { value: "awaiting_business", label: `Awaiting approval${c.awaiting_business ? ` (${c.awaiting_business})` : ""}` },
    { value: "pending", label: "With Ardena" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];

  return (
    <>
      <h1 className="sr-only">Damage claims</h1>

      {counts && (
        <div className="stat-grid st-stats">
          <article className="stat-card">
            <p className="stat-label">Awaiting your approval</p>
            <p className="stat-value">{c.awaiting_business || 0}</p>
            <p className="stat-note">filed by staff</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">With Ardena</p>
            <p className="stat-value">{c.pending || 0}</p>
            <p className="stat-note">being reviewed</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Approved</p>
            <p className="stat-value">{c.approved || 0}</p>
            <p className="stat-note">paid from the waiver</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Rejected</p>
            <p className="stat-value">{c.rejected || 0}</p>
            <p className="stat-note">all time</p>
          </article>
        </div>
      )}

      <section className="panel-card">
        <div className="fleet-toolbar">
          <header className="card-head no-gap">
            <h2>Claims</h2>
            <p>Damage claims against waivers paid on Stellar</p>
          </header>
          <FilterDropdown id="dc-status" label="Status" value={status} onChange={setStatus} options={filters} />
          <RefreshButton onRefresh={load} />
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Booking</th>
              <th>Car</th>
              <th>Filed by</th>
              <th className="num">Amount</th>
              <th>Status</th>
              <th>Filed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="row-link"
                tabIndex={0}
                onClick={() => openClaim(r.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") openClaim(r.id);
                }}
              >
                <td>
                  <p className="mono strong">{r.booking_ref}</p>
                  <p className="cell-sub">{r.customer_name || (r.booking_kind === "app" ? "Ardena app" : "")}</p>
                </td>
                <td>{r.vehicle_plate || "-"}</td>
                <td>{r.filed_by_name || (r.filed_by === "host" ? "Host" : "Business")}</td>
                <td className="num">
                  <p className="strong">{fmtKes(r.requested_amount_kes)}</p>
                  {r.requested_usdc && <p className="cell-sub">{fmtUsdc(r.requested_usdc)} USDC</p>}
                </td>
                <td>
                  <span className={`st-pill ${CLAIM_STATUS_PILL[r.status] || "grey"}`}>
                    {CLAIM_STATUS_LABEL[r.status] || r.status}
                  </span>
                </td>
                <td>{fmtWhen(r.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="empty-block fleet-empty">
            <p>{status ? "No claims with this status." : "No damage claims yet. They're filed from a booking's waiver card."}</p>
          </div>
        )}

        {rows.length < total && (
          <div className="wallet-more">
            <button type="button" className="btn btn-ghost" onClick={loadMore} disabled={more}>
              {more ? "Loading…" : "Show more"}
            </button>
          </div>
        )}
      </section>

      {openId && (
        <ClaimDrawer
          id={openId}
          onClose={() => openClaim(null)}
          onReviewed={() => {
            load();
            refreshStellar(); // the sidebar badge
          }}
        />
      )}
    </>
  );
}

/* ---- One claim ---- */

function ClaimDrawer({ id, onClose, onReviewed }) {
  const canReview = stellarCan("reviewWaiverClaims");
  const [claim, setClaim] = useState(null);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const c = await fetchWaiverClaim(id);
      setClaim(c);
      setAmount(String(c?.requested_amount_kes ?? ""));
    } catch (err) {
      setError(err.message || "Couldn't load that claim");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && !confirmReject) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, confirmReject]);

  async function review(decision) {
    if (busy) return;
    const body = { decision, note: note.trim() || null };
    if (decision === "approve") {
      const n = Number(amount);
      if (!n || n <= 0) {
        toast("Enter the amount to approve.", "danger");
        return;
      }
      if (n > claim.requested_amount_kes) {
        toast(`You can lower the amount, not raise it above ${fmtKes(claim.requested_amount_kes)}.`, "danger");
        return;
      }
      if (n !== claim.requested_amount_kes) body.amount_kes = n;
    }
    setBusy(true);
    try {
      await reviewWaiverClaim(claim.id, body);
      toast(decision === "approve" ? "Sent to Ardena for payout." : "Claim rejected. The fee goes to Ardena's waiver pool.");
      await load();
      onReviewed();
    } catch (err) {
      toast(err.message || "Couldn't save the review", "danger");
    } finally {
      setBusy(false);
    }
  }

  const waiver = claim?.waiver || null;
  const network = waiver?.network;
  const payTx = waiver?.transactions?.find((t) => t.action === "pay_claim");
  const awaiting = claim?.status === "awaiting_business";

  return (
    <>
    <div className="st-drawer-back" onMouseDown={onClose}>
      <aside
        className="st-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Damage claim"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="st-drawer-head">
          <div>
            <h2>{claim ? `Claim on ${claim.booking_ref}` : "Damage claim"}</h2>
            {claim && (
              <p className="cell-sub">
                {[claim.vehicle_plate, claim.customer_name].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            Close
          </button>
        </header>

        {error && (
          <div className="st-drawer-body">
            <p className="form-error">{error}</p>
            <button type="button" className="btn btn-ghost" onClick={load}>
              Try again
            </button>
          </div>
        )}
        {!claim && !error && <p className="cell-sub st-drawer-body">Loading…</p>}

        {claim && (
          <div className="st-drawer-body">
            <div className="pay-row">
              <span className={`st-pill ${CLAIM_STATUS_PILL[claim.status] || "grey"}`}>
                {CLAIM_STATUS_LABEL[claim.status] || claim.status}
              </span>
              {claim.waiver_status && (
                <span className="cell-sub">{WAIVER_STATUS_LABEL[claim.waiver_status] || claim.waiver_status}</span>
              )}
            </div>

            {claim.status === "approved" && claim.waiver_status === "paid_out" && (
              <p className="st-paid">
                Paid {fmtUsdc(claim.approved_usdc)} USDC to your wallet{" "}
                {payTx && <StellarLink url={payTx.url} network={network} />}
              </p>
            )}

            <dl className="st-facts">
              <div>
                <dt>Requested</dt>
                <dd>
                  {fmtKes(claim.requested_amount_kes)}
                  {claim.requested_usdc && <span className="cell-sub"> · {fmtUsdc(claim.requested_usdc)} USDC</span>}
                </dd>
              </div>
              {claim.drafted_amount_kes != null && claim.drafted_amount_kes !== claim.requested_amount_kes && (
                <div>
                  <dt>First asked for</dt>
                  <dd>{fmtKes(claim.drafted_amount_kes)}</dd>
                </div>
              )}
              {claim.approved_amount_kes != null && (
                <div>
                  <dt>Approved</dt>
                  <dd>
                    {fmtKes(claim.approved_amount_kes)}
                    {claim.approved_usdc && <span className="cell-sub"> · {fmtUsdc(claim.approved_usdc)} USDC</span>}
                  </dd>
                </div>
              )}
              <div>
                <dt>Waiver fee</dt>
                <dd>
                  {fmtUsdc(claim.fee_usdc)} USDC <TestnetBadge network={network} />
                </dd>
              </div>
              {claim.max_payout_usdc && (
                <div>
                  <dt>Most it can pay</dt>
                  <dd>{fmtUsdc(claim.max_payout_usdc)} USDC</dd>
                </div>
              )}
              <div>
                <dt>Filed by</dt>
                <dd>
                  {claim.filed_by_name || claim.filed_by} · {fmtWhen(claim.created_at)}
                </dd>
              </div>
              {claim.claim_window_ends && (
                <div>
                  <dt>Claim window ends</dt>
                  <dd>{fmtWhen(claim.claim_window_ends)}</dd>
                </div>
              )}
            </dl>

            <div className="st-section">
              <p className="field-label">What happened</p>
              <p className="st-desc">{claim.description}</p>
            </div>

            {claim.evidence_urls?.length > 0 && (
              <div className="st-section">
                <p className="field-label">Evidence</p>
                <div className="st-evidence">
                  {claim.evidence_urls.map((u) => (
                    <a key={u} href={u} target="_blank" rel="noopener noreferrer">
                      <img src={u} alt="Evidence" loading="lazy" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {claim.business_review && (
              <p className="claim-outcome">
                {claim.status === "rejected" && claim.decided_by === "business" ? "Rejected" : "Approved"} by{" "}
                {claim.business_review.by_name} · {fmtWhen(claim.business_review.at)}
                {claim.business_review.note ? `: ${claim.business_review.note}` : ""}
              </p>
            )}
            {claim.status === "rejected" && decidedByLabel(claim.decided_by) && (
              <p className="cell-sub">{decidedByLabel(claim.decided_by)}</p>
            )}
            {claim.admin_note && <p className="claim-outcome">Ardena: {claim.admin_note}</p>}

            {awaiting && canReview && (
              <form
                className="st-review"
                onSubmit={(e) => {
                  e.preventDefault();
                  review("approve");
                }}
              >
                <p className="field-label">Your decision</p>
                <div className="field">
                  <label htmlFor="dc-amount">Amount to approve (KES)</label>
                  <input
                    id="dc-amount"
                    type="number"
                    min={1}
                    max={claim.requested_amount_kes}
                    step={100}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <p className="field-note">
                    ≈ {kesToUsdcEstimate(amount)} USDC. You can lower it, not raise it.
                  </p>
                </div>
                <div className="field">
                  <label htmlFor="dc-note">Note · optional</label>
                  <textarea
                    id="dc-note"
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Agreed with the garage quote"
                  />
                </div>
                <div className="st-send-actions">
                  <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setConfirmReject(true)}>
                    Reject
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={busy}>
                    {busy ? "Saving…" : "Approve and send to Ardena"}
                  </button>
                </div>
              </form>
            )}
            {awaiting && !canReview && (
              <p className="cell-sub">Waiting for your owner or finance to approve it.</p>
            )}

            <div className="st-section">
              <p className="field-label">Waiver on Stellar</p>
              <TxTimeline transactions={waiver?.transactions} network={network} kind="waiver" />
            </div>
          </div>
        )}
      </aside>
    </div>

      <ConfirmDialog
        open={confirmReject}
        title="Reject this claim?"
        message="This is final. The claim ends, and the waiver fee goes to Ardena's waiver pool exactly as if no claim had been filed."
        confirmLabel="Reject claim"
        onCancel={() => setConfirmReject(false)}
        onConfirm={() => {
          setConfirmReject(false);
          review("reject");
        }}
      />
    </>
  );
}
