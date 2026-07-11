import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPayments, fetchPaymentsSummary } from "../lib/api";
import CollectionsArea from "./charts/CollectionsArea";
import PaymentDonut from "./charts/PaymentDonut";
import EmptyState, { EMPTY_ICONS } from "./EmptyState";
import { toast } from "./toastStore";
import "./fleet.css";
import "./bookings.css";
import "./payments.css";

export const fmtAmount = (n) => n.toLocaleString("en-KE");

const TYPE_CHIP = {
  payment: "active",
  refund: "cancelled",
};

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [payData, sumData] = await Promise.all([
        fetchPayments({ per_page: 100 }),
        fetchPaymentsSummary(),
      ]);
      setPayments(payData.data || []);
      setSummary(sumData);
    } catch (err) {
      toast(err.message || "Failed to load payments", "danger");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const stats = summary || { collected: 0, outstanding: 0, refunded: 0, net: 0, paid_count: 0 };

  // Build last-10-weeks buckets from completed payment records only
  const weeklyCollections = (() => {
    const now = new Date();
    // Align to Monday of the current week
    const todayDay = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0=Mon
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - todayDay);
    thisMonday.setHours(0, 0, 0, 0);

    const weeks = Array.from({ length: 10 }, (_, i) => {
      const start = new Date(thisMonday);
      start.setDate(thisMonday.getDate() - (9 - i) * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      const label = start.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
      return { start, end, label, total: 0 };
    });

    for (const p of payments) {
      if (p.status !== "completed" || p.type !== "payment") continue;
      const d = new Date(p.date);
      for (const w of weeks) {
        if (d >= w.start && d < w.end) { w.total += p.amount; break; }
      }
    }

    return weeks.map((w) => ({ week: w.label, value: w.total }));
  })();

  const donutSegments = [
    { label: "Collected", value: stats.collected, color: "#0b7a37" },
    { label: "Outstanding", value: stats.outstanding, color: "#d97706" },
    { label: "Refunded", value: stats.refunded, color: "#94a3b8" },
  ];

  const processed = payments.filter((p) => p.status === "completed").slice(0, 8);

  if (loading) {
    return <div className="empty-block fleet-empty"><p>Loading payments…</p></div>;
  }

  return (
    <>
      <div className="stat-grid finance-stats">
        <article className="stat-card">
          <p className="stat-label">Collected</p>
          <p className="stat-value">KES {fmtAmount(stats.collected)}</p>
          <p className="stat-note">{stats.paid_count} payments via Paystack</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Outstanding</p>
          <p className="stat-value">KES {fmtAmount(stats.outstanding)}</p>
          <p className="stat-note">owed on live bookings</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Refunded</p>
          <p className="stat-value">KES {fmtAmount(stats.refunded)}</p>
          <p className="stat-note">from cancelled bookings</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Net collected</p>
          <p className="stat-value">KES {fmtAmount(stats.net)}</p>
          <p className="stat-note">after refunds</p>
        </article>
      </div>

      <div className="payments-grid">
        <section className="chart-card">
          <header className="card-head">
            <h2>Collections over time</h2>
            <p>Settled payments per week, last 10 weeks</p>
          </header>
          {payments.length === 0 ? (
            <EmptyState
              icon={EMPTY_ICONS.chart}
              title="No collections yet"
              message="Once customers pay via Paystack, your weekly collections build up here."
            />
          ) : (
            <CollectionsArea data={weeklyCollections} />
          )}
        </section>

        <section className="chart-card">
          <header className="card-head">
            <h2>Where the money is</h2>
            <p>Collected, outstanding &amp; refunded</p>
          </header>
          {payments.length === 0 ? (
            <EmptyState
              compact
              icon={EMPTY_ICONS.payments}
              title="Nothing billed yet"
              message="Your billing breakdown appears here after your first bookings."
            />
          ) : (
            <PaymentDonut segments={donutSegments} />
          )}
        </section>
      </div>

      <section className="panel-card">
        <header className="card-head mini-payments-head">
          <div>
            <h2>Processed payments</h2>
            <p>Cash settled across your bookings</p>
          </div>
          {payments.length > 0 && (
            <Link className="head-link" to="/dashboard/payments/all">
              View all
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          )}
        </header>

        {processed.length === 0 ? (
          <EmptyState
            compact
            icon={EMPTY_ICONS.payments}
            title="No payments received yet"
            message="Settled Paystack payments and refunds land here with their receipt codes."
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Booking</th>
                <th>Customer</th>
                <th>Method</th>
                <th className="num">Amount (KES)</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              {processed.map((p) => (
                <tr key={p.id}>
                  <td>
                    <p className="strong">{p.receipt || "—"}</p>
                    <p className="cell-sub">{p.reference}</p>
                  </td>
                  <td>
                    <Link className="spec-link" to={`/dashboard/bookings/${encodeURIComponent(p.booking_ref)}`}>
                      {p.booking_ref}
                    </Link>
                  </td>
                  <td>{p.customer}</td>
                  <td>Paystack</td>
                  <td className="num">{fmtAmount(p.amount)}</td>
                  <td>
                    <span className={`chip ${TYPE_CHIP[p.type] || "pending"}`}>{p.type}</span>
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
