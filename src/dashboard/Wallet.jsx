/* Wallet — the one prepaid balance the dashboard spends.
 *
 * It started life as the "KYC wallet" on Verification, because ID checks were
 * the only thing it paid for. Review-request SMS draw on it too now, and plan
 * subscriptions will, so it gets a page of its own under Account: what's in
 * it, what each thing costs, where this month's money went, and every
 * movement. Verification keeps its own top-up button, because that is the
 * screen that stops working when the balance runs out.
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import PageSkeleton from "./PageSkeleton";
import FilterDropdown from "../components/FilterDropdown";
import RefreshButton from "../components/RefreshButton";
import WalletTopup from "./WalletTopup";
import { fetchWalletCenter, fetchWalletLedger } from "../lib/api";
import { fmtAmount, fmtDate } from "./billingFormat";
import { toast } from "./toastStore";
import usePageTitle from "../hooks/usePageTitle";
import "./fleet.css";
import "./bookings.css";
import "./verification.css";
import "./wallet.css";

const PER_PAGE = 25;

const CATEGORY_LABEL = {
  topup: "Top-up",
  verification: "ID check",
  sms: "SMS",
  subscription: "Subscription",
};

const FILTERS = [
  { value: "", label: "All activity" },
  { value: "topup", label: "Top-ups" },
  { value: "verification", label: "ID checks" },
  { value: "sms", label: "SMS" },
];

/* Ledger status → the shared .chip modifier. A reversed debit was refunded. */
const STATUS_CHIP = {
  completed: "active",
  pending: "pending",
  failed: "cancelled",
  reversed: "pending",
};

const STATUS_LABEL = {
  completed: "Done",
  pending: "Pending",
  failed: "Failed",
  reversed: "Refunded",
};

export default function Wallet() {
  usePageTitle("Wallet");
  const { pathname } = useLocation();
  const [center, setCenter] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [waiting, setWaiting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, ledger] = await Promise.all([
        fetchWalletCenter(),
        fetchWalletLedger({ category, page: 1, per_page: PER_PAGE }),
      ]);
      setCenter(c);
      setRows(ledger?.data || []);
      setTotal(ledger?.total || 0);
      setPage(1);
    } catch (err) {
      toast(err.message || "Failed to load the wallet", "danger");
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    load();
  }, [load]);

  async function loadMore() {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const ledger = await fetchWalletLedger({ category, page: next, per_page: PER_PAGE });
      setRows((prev) => [...prev, ...(ledger?.data || [])]);
      setTotal(ledger?.total || 0);
      setPage(next);
    } catch (err) {
      toast(err.message || "Couldn't load more", "danger");
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading) return <PageSkeleton path={pathname} />;

  const balance = center?.balance || 0;
  const prices = center?.prices || {};
  const month = center?.this_month || {};
  const checkPrice = prices.verification_check || 0;
  const smsPrice = prices.sms || 0;
  const spent = (month.verification || 0) + (month.sms || 0) + (month.subscription || 0);

  return (
    <>
      <h1 className="sr-only">Wallet</h1>

      <div className="page-actions">
        <WalletTopup
          className="btn btn-primary page-action-btn"
          onSettled={load}
          onWaitingChange={setWaiting}
        />
      </div>

      <div className="stat-grid verify-stats">
        <article className="stat-card stat-card--cream">
          <p className="stat-label">Balance</p>
          <p className="stat-value">KES {fmtAmount(balance)}</p>
          <p className="stat-note">
            {waiting
              ? "Waiting for payment…"
              : checkPrice
              ? `≈ ${Math.floor(balance / checkPrice)} ID checks or ${fmtAmount(
                  smsPrice ? Math.floor(balance / smsPrice) : 0
                )} SMS`
              : "Prepaid, in shillings"}
          </p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Spent this month</p>
          <p className="stat-value">KES {fmtAmount(spent)}</p>
          <p className="stat-note">KES {fmtAmount(month.topup)} topped up</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">ID checks</p>
          <p className="stat-value">KES {fmtAmount(month.verification)}</p>
          <p className="stat-note">this month</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">SMS</p>
          <p className="stat-value">KES {fmtAmount(month.sms)}</p>
          <p className="stat-note">this month</p>
        </article>
      </div>

      <section className="panel-card wallet-prices">
        <header className="card-head">
          <h2>What it pays for</h2>
          <p>Charged only when the thing actually happens</p>
        </header>
        <ul className="wallet-price-list">
          <li>
            <div>
              <p className="strong">ID checks</p>
              <p className="cell-sub">
                A renter&apos;s ID, licence or KRA PIN against the registry.{" "}
                <Link className="spec-link" to="/dashboard/verification">
                  Verification
                </Link>
              </p>
            </div>
            <p className="wallet-price">KES {fmtAmount(checkPrice)} <span>per check</span></p>
          </li>
          <li>
            <div>
              <p className="strong">SMS</p>
              <p className="cell-sub">
                Review requests to past renters. Refunded if it doesn&apos;t send; email is free.{" "}
                <Link className="spec-link" to="/dashboard/reviews">
                  Reviews
                </Link>
              </p>
            </div>
            <p className="wallet-price">KES {fmtAmount(smsPrice)} <span>per SMS</span></p>
          </li>
          <li className="is-soon">
            <div>
              <p className="strong">Subscription</p>
              <p className="cell-sub">Pay your plan from the wallet. Coming soon.</p>
            </div>
            <p className="wallet-price">
              <Link className="spec-link" to="/dashboard/usage">
                Usage &amp; billing
              </Link>
            </p>
          </li>
        </ul>
      </section>

      <section className="panel-card">
        <div className="fleet-toolbar">
          <header className="card-head no-gap">
            <h2>Activity</h2>
            <p>Every top-up and every charge</p>
          </header>
          <FilterDropdown
            id="wallet-category"
            label="Type"
            value={category}
            onChange={setCategory}
            options={FILTERS}
          />
          <RefreshButton onRefresh={load} />
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>What</th>
              <th>Type</th>
              <th>Status</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const credit = t.type === "topup";
              return (
                <tr key={t.id}>
                  <td>{fmtDate(t.date)}</td>
                  <td>
                    <p>{t.description}</p>
                    <p className="cell-sub mono">{t.receipt || t.reference}</p>
                  </td>
                  <td>{CATEGORY_LABEL[t.category] || t.category}</td>
                  <td>
                    <span className={`chip ${STATUS_CHIP[t.status] || "pending"}`}>
                      {STATUS_LABEL[t.status] || t.status}
                    </span>
                  </td>
                  <td className={"num strong" + (credit ? " wallet-credit" : "")}>
                    {credit ? "+" : "−"} KES {fmtAmount(t.amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="empty-block fleet-empty">
            <p>{category ? "Nothing of this type yet." : "No wallet activity yet. Top up to get started."}</p>
          </div>
        )}

        {rows.length < total && (
          <div className="wallet-more">
            <button type="button" className="btn btn-ghost" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? "Loading…" : "Show more"}
            </button>
          </div>
        )}
      </section>
    </>
  );
}
