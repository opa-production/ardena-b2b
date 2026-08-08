import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PageSkeleton from "./PageSkeleton";
import {
  fetchPayments,
  fetchPaymentsSummary,
  fetchMarketplaceEarnings,
  fetchMarketplaceTransactions,
  fetchMarketplaceWithdrawals,
  fetchPayoutMethods,
} from "../lib/api";
import CollectionsArea from "./charts/CollectionsArea";
import PaymentDonut from "./charts/PaymentDonut";
import EmptyState, { EMPTY_ICONS } from "./EmptyState";
import MarketplaceEarningsPanel from "./MarketplaceEarningsPanel";
import useRole from "../hooks/useRole";
import {
  subscribe as subscribeBusiness,
  getBusiness,
} from "./businessStore";
import { toast } from "./toastStore";
import "./fleet.css";
import "./bookings.css";
import "./payments.css";
import "./earnings.css";

export const fmtAmount = (n) => Number(n || 0).toLocaleString("en-KE");

const TYPE_CHIP = {
  payment: "active",
  refund: "cancelled",
};

/* One money page.
 *
 * A rental business takes money two ways — bookings it makes itself (settled
 * via Paystack) and bookings renters make on the Ardena app (settled by Ardena,
 * paid out on request). Those used to be two sidebar entries, which made the
 * obvious question — "how much came in?" — impossible to answer without adding
 * two pages together in your head.
 *
 * So: one KPI row that reconciles both sources, then a tab for the detail of
 * each. `viewMoney` gates the app side (Owner/Finance) while the page itself is
 * `manageBilling` (Owner/Manager/Finance) — a Manager sees direct takings only,
 * exactly as before the merge.
 */
export default function Payments() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { can } = useRole();
  const business = useSyncExternalStore(subscribeBusiness, getBusiness);
  // Two conditions, and both must hold: the role is allowed to see money, AND
  // this workspace is actually on the Ardena app. Without the second, a
  // direct-bookings business got a source toggle, a "From the Ardena app" card
  // reading zero, and a tab leading nowhere — all for a channel it isn't on.
  const canSeeApp = can("viewMoney") && business.appLinked;

  // /dashboard/payments/marketplace still works — it just opens this page on
  // the app tab, so old links and bookmarks land somewhere sensible.
  //
  // Derived from the URL rather than held in state: `canSeeApp` depends on
  // business.appLinked, which arrives a moment after mount via fetchBusiness.
  // A useState initialiser would snapshot it while still false and strand a
  // deep link to /marketplace on the direct tab. Deriving lets it correct
  // itself the instant the profile hydrates, and keeps back/forward honest.
  const tab = pathname.endsWith("/marketplace") && canSeeApp ? "app" : "direct";

  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [app, setApp] = useState({});
  const [loading, setLoading] = useState(true);

  // Everything both tabs need, in one pass. The app-side detail used to be
  // fetched by the panel itself, which made the KPI row pop in first and the
  // charts and tables fill in a beat later — one gate means one paint.
  const load = useCallback(async () => {
    try {
      const [payData, sumData, earn, tx, wd, pm] = await Promise.all([
        fetchPayments({ per_page: 100 }),
        fetchPaymentsSummary(),
        // Only Owner/Finance may see app money; don't even ask otherwise.
        ...(canSeeApp
          ? [
              fetchMarketplaceEarnings().catch(() => null),
              fetchMarketplaceTransactions({ limit: 50 }).catch(() => null),
              fetchMarketplaceWithdrawals({ limit: 20 }).catch(() => null),
              fetchPayoutMethods().catch(() => null),
            ]
          : [null, null, null, null]),
      ]);
      setPayments(payData.data || []);
      setSummary(sumData);
      setApp({
        summary: earn,
        transactions: tx?.transactions || [],
        withdrawals: wd?.withdrawals || [],
        methods: pm || [],
      });
    } catch (err) {
      toast(err.message || "Failed to load payments", "danger");
    } finally {
      setLoading(false);
    }
  }, [canSeeApp]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep the tab and the URL in step, so a refresh or a back-button press
  // returns to the side the user was actually looking at.
  // The URL is the single source of truth for which tab is showing, so
  // switching is just a navigation.
  function switchTab(next) {
    navigate(
      next === "app" ? "/dashboard/payments/marketplace" : "/dashboard/payments",
      { replace: true }
    );
  }

  const stats = summary || {
    collected: 0,
    outstanding: 0,
    refunded: 0,
    net: 0,
    paid_count: 0,
  };
  const earn = app.summary || {};

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

  if (loading) return <PageSkeleton path={pathname} />;

  const totalIn = stats.net + Number(earn.net_earnings || 0);

  return (
    <>
      {/* Source switch sits top-right, above the numbers it reshapes.
          Only Owner/Finance have a second side to switch to. */}
      {canSeeApp && (
        <div className="finance-bar">
          <div className="money-tabs" role="tablist" aria-label="Money source">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "direct"}
              className={tab === "direct" ? "active" : ""}
              onClick={() => switchTab("direct")}
            >
              Direct bookings
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "app"}
              className={tab === "app" ? "active" : ""}
              onClick={() => switchTab("app")}
            >
              Ardena app
            </button>
          </div>
        </div>
      )}

      {/* ---- KPI row: the whole money picture in four numbers ---- */}
      {canSeeApp ? (
        <div className="stat-grid finance-stats">
          <article className="stat-card">
            <p className="stat-label">Total money in</p>
            <p className="stat-value">KES {fmtAmount(totalIn)}</p>
            <p className="stat-note">direct bookings + app, after fees</p>
          </article>
          <article className="stat-card is-clickable" onClick={() => switchTab("direct")}>
            <p className="stat-label">From direct bookings</p>
            <p className="stat-value">KES {fmtAmount(stats.net)}</p>
            <p className="stat-note">
              {stats.paid_count} payments · KES {fmtAmount(stats.outstanding)} still owed
            </p>
          </article>
          <article className="stat-card is-clickable" onClick={() => switchTab("app")}>
            <p className="stat-label">From the Ardena app</p>
            <p className="stat-value">KES {fmtAmount(earn.net_earnings)}</p>
            <p className="stat-note">
              {earn.paid_bookings_count || 0} app bookings, after commission
            </p>
          </article>
          <article className="stat-card stat-card-action">
            <p className="stat-label">Available to withdraw</p>
            <p className="stat-value">KES {fmtAmount(earn.withdrawable)}</p>
            <p className="stat-note">
              {earn.pending_withdrawals_total
                ? `KES ${fmtAmount(earn.pending_withdrawals_total)} pending payout`
                : "nothing pending"}
            </p>
            {/* Only on the app tab: offering a payout while someone is
                reading direct-booking figures is the wrong context, and the
                form it jumps to isn't on screen there anyway. */}
            {tab === "app" && Number(earn.withdrawable) > 0 && (
              <button
                type="button"
                className="btn btn-primary stat-action"
                onClick={() =>
                  document
                    .getElementById("withdraw")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                Withdraw
              </button>
            )}
          </article>
        </div>
      ) : (
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
      )}

      {tab === "app" && canSeeApp ? (
        <MarketplaceEarningsPanel
          summary={app.summary}
          transactions={app.transactions}
          withdrawals={app.withdrawals}
          methods={app.methods}
          onChanged={load}
        />
      ) : (
        <>
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
      )}
    </>
  );
}
