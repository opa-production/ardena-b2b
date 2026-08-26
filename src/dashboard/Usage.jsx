/* Usage — one bar per day of the billing period, and nothing else.
 *
 * One of the two Account pages split out of the old single billing screen:
 * Usage answers "what am I running up, and when?", Billing answers "what do I
 * owe?". What the plans cost lives on the public /pricing page.
 *
 * The page is the chart. The header carries the wallet balance because it is
 * the number the bars are drawn against, but it is read-only — this page
 * reports, it does not transact. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import PageSkeleton from "./PageSkeleton";
import { fetchBillingUsage, fetchWalletTransactions } from "../lib/api";
import UsageBars from "./charts/UsageBars";
import EmptyState, { EMPTY_ICONS } from "./EmptyState";
import { toast } from "./toastStore";
import usePageTitle from "../hooks/usePageTitle";
import { fmtAmount, normalizeTxn } from "./billingFormat";
import "./overview.css";
import "./fleet.css";
import "./billing.css";

const DAY = 86_400_000;
const isoDay = (d) => new Date(d).toISOString().slice(0, 10);

/* Build a continuous day-by-day series so the axis has no holes — a day with
 * no checks is a zero-height bar, not a missing one.
 *
 * The usage endpoint sends period totals, not a daily breakdown, so the series
 * is folded up from the dated wallet debits. If the API ever grows a `daily`
 * array, it wins: that would be the authoritative figure. */
function dailySeries(usage, txns) {
  if (Array.isArray(usage?.daily) && usage.daily.length > 0) {
    return usage.daily.map((d) => ({
      date: d.date,
      day: new Date(d.date).getDate(),
      value: Number(d.amount ?? d.value ?? 0),
      checks: Number(d.checks ?? 0),
    }));
  }

  const end = new Date();
  const start = usage?.period_start ? new Date(usage.period_start) : new Date(end - 29 * DAY);
  if (isNaN(start) || start > end) return [];

  const byDay = new Map();
  for (const t of txns) {
    if (t.isTopup || !t.date) continue;
    const cur = byDay.get(t.date) || { value: 0, checks: 0 };
    cur.value += t.amount;
    cur.checks += 1;
    byDay.set(t.date, cur);
  }

  const out = [];
  for (let d = new Date(isoDay(start)); d <= end; d = new Date(d.getTime() + DAY)) {
    const key = isoDay(d);
    const hit = byDay.get(key) || { value: 0, checks: 0 };
    out.push({ date: key, day: d.getDate(), value: hit.value, checks: hit.checks });
    if (out.length > 92) break; // guard against a nonsense period_start
  }
  return out;
}

export default function Usage() {
  usePageTitle("Usage");
  const { pathname } = useLocation();
  const [usage, setUsage] = useState(null);
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [usageData, txData] = await Promise.all([
        fetchBillingUsage(),
        fetchWalletTransactions({ per_page: 100 }).catch(() => null),
      ]);
      setUsage(usageData);
      const rows = Array.isArray(txData) ? txData : txData?.data || [];
      setTxns(rows.map(normalizeTxn));
    } catch (err) {
      toast(err.message || "Failed to load usage", "danger");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const series = useMemo(() => dailySeries(usage, txns), [usage, txns]);

  if (loading) return <PageSkeleton path={pathname} />;

  const walletBalance = usage?.wallet_balance || 0;
  const checkPrice = usage?.check_price || 0;
  const checksLeft = checkPrice ? Math.floor(walletBalance / checkPrice) : 0;
  const spent = series.reduce((sum, d) => sum + d.value, 0);

  return (
    <>
      {/* The card that used to sit here said "Usage" and nothing else — the
          sidebar already says that. The wallet figures it carried are the
          chart's own context, so they live in the chart's subtitle now. */}
      <h1 className="sr-only">Usage</h1>

      <section className="chart-card">
        <header className="card-head">
          <h2>Daily usage</h2>
          <p>
            KES {fmtAmount(spent)} drawn this period · wallet KES{" "}
            {fmtAmount(walletBalance)} · ≈ {checksLeft} check
            {checksLeft === 1 ? "" : "s"} left
          </p>
        </header>

        {series.length === 0 ? (
          <EmptyState
            icon={EMPTY_ICONS.chart}
            title="Nothing used yet"
            message="Once renter checks start running, each day's spend shows up here."
          />
        ) : (
          <UsageBars data={series} label="Wallet spend" />
        )}
      </section>
    </>
  );
}
