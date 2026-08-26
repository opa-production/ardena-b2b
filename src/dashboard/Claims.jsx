import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import PageSkeleton from "./PageSkeleton";
import EmptyState, { EMPTY_ICONS } from "./EmptyState";
import { toast } from "./toastStore";
import useRole from "../hooks/useRole";
import usePageTitle from "../hooks/usePageTitle";
import {
  fetchDepositClaims,
  fetchExtensionRequests,
  decideExtension,
} from "../lib/api";
import "./fleet.css";
import "./bookings.css";
import "./claims.css";

const CLAIM_CHIP = {
  pending: "claim-pending",
  approved: "claim-approved",
  partial: "claim-partial",
  rejected: "claim-rejected",
};

const CLAIM_LABEL = {
  damage: "Damage",
  late_return: "Late return",
  cleaning: "Cleaning",
  traffic_fine: "Traffic fine",
  other: "Other",
};

const fmtAmount = (n) => Number(n || 0).toLocaleString("en-KE");

function fmtDay(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Claims() {
  usePageTitle("Claims & requests");
  const { pathname } = useLocation();
  const { can } = useRole();
  const canDecide = can("decideExtensions");
  // Both queues live on one page but have different audiences. Showing a
  // permanently-empty card to someone whose role can't load it reads as a bug.
  const canSeeClaims = can("fileDepositClaim");

  const [claims, setClaims] = useState([]);
  const [extensions, setExtensions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [notes, setNotes] = useState({});

  const load = useCallback(async () => {
    try {
      // Either call can legitimately 403 depending on role, so they're settled
      // independently — a Finance user should still see claims without the
      // extensions call blanking the page.
      const [claimRes, extRes] = await Promise.allSettled([
        fetchDepositClaims(),
        fetchExtensionRequests(true),
      ]);
      if (claimRes.status === "fulfilled") setClaims(claimRes.value || []);
      if (extRes.status === "fulfilled") setExtensions(extRes.value || []);
      if (claimRes.status === "rejected" && extRes.status === "rejected") {
        toast(claimRes.reason?.message || "Failed to load", "danger");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDecide(ext, approve) {
    if (busyId) return;
    setBusyId(ext.id);
    try {
      await decideExtension(ext.id, {
        approve,
        note: (notes[ext.id] || "").trim() || null,
      });
      toast(
        approve
          ? `Extension approved. ${ext.customer_name || "The renter"} can pay for the extra days.`
          : "Extension declined."
      );
      await load();
    } catch (err) {
      // Approving re-checks availability, so this can 409 if the vehicle was
      // booked for those dates since the renter asked. The message says so.
      toast(err.message || "Couldn't record that decision", "danger");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <PageSkeleton path={pathname} />;

  return (
    <>
      <h1 className="sr-only">Claims &amp; requests</h1>

      <div className="claims-grid">
        <section className="panel-card">
          <header className="card-head">
            <h2>Extension requests</h2>
            <p>Renters asking for more days</p>
          </header>

          {extensions.length === 0 ? (
            <EmptyState
              compact
              icon={EMPTY_ICONS.bookings}
              title="No open requests"
              message="Renters asking for more days land here."
            />
          ) : (
            extensions.map((ext) => (
              <div className="ext-row" key={ext.id}>
                <div className="claim-row-head">
                  <strong>
                    {ext.customer_name || "Renter"} · {ext.plate || ext.booking_ref}
                  </strong>
                  <span className="num">KES {fmtAmount(ext.extra_amount)}</span>
                </div>
                <p className="ext-dates">
                  Until <strong>{fmtDay(ext.old_end_date)}</strong> → asking for{" "}
                  <strong>{fmtDay(ext.requested_end_date)}</strong> ({ext.extra_days} extra
                  day{ext.extra_days === 1 ? "" : "s"})
                </p>
                {canDecide && (
                  <div className="ext-actions">
                    <input
                      className="ext-note"
                      placeholder="Note for the renter (optional)"
                      value={notes[ext.id] || ""}
                      onChange={(e) =>
                        setNotes((n) => ({ ...n, [ext.id]: e.target.value }))
                      }
                    />
                    <button
                      type="button"
                      className="icon-btn"
                      disabled={busyId === ext.id}
                      onClick={() => handleDecide(ext, true)}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      disabled={busyId === ext.id}
                      onClick={() => handleDecide(ext, false)}
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </section>

        {canSeeClaims && <section className="panel-card">
          <header className="card-head">
            <h2>Deposit claims</h2>
            <p>Filed against Ardena app bookings</p>
          </header>

          {claims.length === 0 ? (
            <EmptyState
              compact
              icon={EMPTY_ICONS.payments}
              title="No claims filed"
              message="Raise one from a finished app booking."
            />
          ) : (
            claims.map((c) => (
              <div className="claim-row" key={c.id}>
                <div className="claim-row-head">
                  <strong>
                    {CLAIM_LABEL[c.claim_type] || c.claim_type} ·{" "}
                    {c.plate || c.booking_ref || "—"}
                  </strong>
                  <span className={`chip ${CLAIM_CHIP[c.status] || ""}`}>{c.status}</span>
                </div>
                <p className="claim-desc">{c.description}</p>
                <p className="cell-sub">
                  Claimed KES {fmtAmount(c.requested_amount)}
                  {c.approved_amount != null && (
                    <> · approved KES {fmtAmount(c.approved_amount)}</>
                  )}
                  {c.created_at && <> · {fmtDay(c.created_at)}</>}
                </p>
                {c.admin_note && <p className="claim-outcome">{c.admin_note}</p>}
              </div>
            ))
          )}
        </section>}
      </div>
    </>
  );
}
