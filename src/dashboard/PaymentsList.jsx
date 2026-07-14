import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPayments, refundPayment } from "../lib/api";
import { PAY_CHIP } from "./Bookings";
import { fmtAmount } from "./Payments";
import EmptyState, { EMPTY_ICONS } from "./EmptyState";
import { toast } from "./toastStore";
import "./fleet.css";
import "./bookings.css";
import "./payments.css";

const TYPE_FILTERS = ["All", "payment", "refund"];
const STATUS_FILTERS = ["All", "completed", "pending", "failed"];

const STATUS_CHIP = {
  completed: "active",
  pending: "pending",
  failed: "cancelled",
};

export default function PaymentsList() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchPayments({ per_page: 100 });
      setPayments(data.data || []);
    } catch (err) {
      toast(err.message || "Failed to load payments", "danger");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return payments.filter((p) => {
      if (typeFilter !== "All" && p.type !== typeFilter) return false;
      if (statusFilter !== "All" && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (p.customer || "").toLowerCase().includes(q) ||
        p.reference.toLowerCase().includes(q) ||
        p.booking_ref.toLowerCase().includes(q)
      );
    });
  }, [payments, query, typeFilter, statusFilter]);

  async function handleRefund(p) {
    if (busy) return;
    setBusy(p.id);
    try {
      await refundPayment(p.id);
      toast(`Refund initiated for ${p.reference}.`);
      await load();
    } catch (err) {
      toast(err.message || "Refund failed", "danger");
    } finally {
      setBusy(null);
    }
  }


  return (
    <>
      <header className="head-card">
        <div className="head-left">
          <Link className="back-link" to="/dashboard/payments" aria-label="Back to payments">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="head-titles">
            <h1>All payments</h1>
            <p>Every transaction across your bookings.</p>
          </div>
        </div>
      </header>

      <section className="panel-card">
        <div className="fleet-toolbar">
          <div className="search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="search"
              placeholder="Search customer, reference or booking"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search payments"
            />
          </div>
          <div className="seg" role="group" aria-label="Filter by type">
            {TYPE_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={f === typeFilter ? "active" : ""}
                onClick={() => setTypeFilter(f)}
              >
                {f === "All" ? "All types" : f.charAt(0).toUpperCase() + f.slice(1) + "s"}
              </button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="Filter by status">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={f === statusFilter ? "active" : ""}
                onClick={() => setStatusFilter(f)}
              >
                {f === "All" ? "All statuses" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="sk-rows" style={{ marginTop: 20 }}>
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className="sk" style={{ height: 15, width: "100%" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            compact
            icon={EMPTY_ICONS.payments}
            title="No payments found"
            message="No payments match your current filters."
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Booking</th>
                <th>Customer</th>
                <th className="num">Amount (KES)</th>
                <th>Receipt</th>
                <th>Type</th>
                <th>Status</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>
                    <p className="strong">{p.reference}</p>
                    <p className="cell-sub">{p.paystack_reference || "—"}</p>
                  </td>
                  <td>
                    <Link
                      className="spec-link"
                      to={`/dashboard/bookings/${encodeURIComponent(p.booking_ref)}`}
                    >
                      {p.booking_ref}
                    </Link>
                  </td>
                  <td>{p.customer || "—"}</td>
                  <td className="num">{fmtAmount(p.amount)}</td>
                  <td>{p.receipt || "—"}</td>
                  <td>
                    <span className={`chip ${p.type === "refund" ? "cancelled" : "active"}`}>
                      {p.type}
                    </span>
                  </td>
                  <td>
                    <span className={`chip ${STATUS_CHIP[p.status] || "pending"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="actions-cell">
                    {p.status === "completed" && p.type === "payment" && (
                      <button
                        type="button"
                        className="icon-btn"
                        disabled={busy === p.id}
                        onClick={() => handleRefund(p)}
                      >
                        {busy === p.id ? "…" : "Refund"}
                      </button>
                    )}
                    {p.status === "pending" && p.type === "payment" && p.booking_ref && (
                      <Link
                        className="icon-btn prompt-green"
                        to={`/dashboard/bookings/${encodeURIComponent(p.booking_ref)}`}
                      >
                        Request payment
                      </Link>
                    )}
                    <Link
                      className="icon-btn"
                      to={`/dashboard/bookings/${encodeURIComponent(p.booking_ref)}`}
                    >
                      View
                    </Link>
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
