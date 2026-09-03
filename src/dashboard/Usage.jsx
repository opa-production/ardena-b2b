/* Usage & billing — what you're running up, then what you owe.
 *
 * The two used to be separate Account pages, which meant the answer to "why is
 * this month's bill that size?" lived one click away from the bill. They are
 * one screen now: the spend chart on top, the invoice list under it, and
 * nothing else. What the plans cost lives on the public /pricing page.
 *
 * The chart leads with the figure — total drawn in the window, and how that
 * compares with the window before it — because the shape of the line is only
 * meaningful against a number. The window switch re-slices data already in
 * hand; it does not re-fetch. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import PageSkeleton from "./PageSkeleton";
import { fetchBillingUsage, fetchWalletTransactions } from "../lib/api";
import UsageTrend from "./charts/UsageTrend";
import InvoicesPanel from "./InvoicesPanel";
import EmptyState from "./EmptyState";
import { toast } from "./toastStore";
import usePageTitle from "../hooks/usePageTitle";
import { fmtAmount, normalizeTxn } from "./billingFormat";
import "./overview.css";
import "./fleet.css";
import "./billing.css";

const DAY = 86_400_000;
const isoDay = (d) => new Date(d).toISOString().slice(0, 10);

/* The windows offered. Each is drawn against the equally long window before
   it, so 30 days needs 60 days of series behind it. */
const RANGES = [
  { key: 7, label: "7 days" },
  { key: 14, label: "14 days" },
  { key: 30, label: "30 days" },
];

const axisLabel = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? "" : d.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
};

/* A continuous day-by-day series, long enough to cover the widest window and
 * its comparison, so the axis has no holes — a day with no checks is a zero,
 * not a gap.
 *
 * The usage endpoint sends period totals, not a daily breakdown, so the series
 * is folded up from the dated wallet debits. If the API ever grows a `daily`
 * array it wins: that would be the authoritative figure. */
function dailySeries(usage, txns, days = 60) {
  const point = (date, value, checks) => ({
    date,
    label: axisLabel(date),
    value: Number(value || 0),
    checks: Number(checks || 0),
  });

  if (Array.isArray(usage?.daily) && usage.daily.length > 0) {
    return usage.daily.map((d) => point(d.date, d.amount ?? d.value, d.checks));
  }

  const byDay = new Map();
  for (const t of txns) {
    if (t.isTopup || !t.date) continue;
    const cur = byDay.get(t.date) || { value: 0, checks: 0 };
    cur.value += t.amount;
    cur.checks += 1;
    byDay.set(t.date, cur);
  }

  const end = new Date(isoDay(new Date()));
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = isoDay(new Date(end.getTime() - i * DAY));
    const hit = byDay.get(key) || { value: 0, checks: 0 };
    out.push(point(key, hit.value, hit.checks));
  }
  return out;
}

const total = (rows) => rows.reduce((sum, d) => sum + d.value, 0);

export default function Usage() {
  usePageTitle("Usage & billing");
  const { pathname } = useLocation();
  const [usage, setUsage] = useState(null);
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);

  const load = useCallback(async () => {
    try {
      const [usageData, txData] = await Promise.all([
        fetchBillingUsage(),
        fetchWalletTransactions({ per_page: 200 }).catch(() => null),
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

  const { current, previous } = useMemo(() => {
    const cur = series.slice(-range);
    const before = series.slice(Math.max(0, series.length - range * 2), series.length - range);
    // Only compare against a window we actually have all of; a half-length one
    // would read as a collapse in spend that never happened.
    return { current: cur, previous: before.length === cur.length ? before : [] };
  }, [series, range]);

  if (loading) return <PageSkeleton path={pathname} />;

  const walletBalance = usage?.wallet_balance || 0;
  const checkPrice = usage?.check_price || 0;
  const checksLeft = checkPrice ? Math.floor(walletBalance / checkPrice) : 0;

  const spent = total(current);
  const spentBefore = total(previous);
  // No baseline means no percentage: "up ∞%" from zero is noise, not news.
  const delta = spentBefore > 0 ? Math.round(((spent - spentBefore) / spentBefore) * 100) : null;

  return (
    <>
      <h1 className="sr-only">Usage &amp; billing</h1>

      <section className="chart-card usage-card">
        {/* The figure and the window switch share a row: the number is what
            the tabs change, and putting them apart makes that a guess. */}
        <header className="usage-head">
          <div className="usage-total">
            <p className="usage-label">Wallet spend</p>
            <p className="usage-figure">
              KES {fmtAmount(spent)}
              {delta !== null && (
                <span className={"usage-delta" + (delta < 0 ? " is-down" : "")}>
                  {delta < 0 ? "↓" : "↑"} {Math.abs(delta)}%
                </span>
              )}
            </p>
            <p className="usage-sub">
              Wallet KES {fmtAmount(walletBalance)} · ≈ {checksLeft} check
              {checksLeft === 1 ? "" : "s"} left
            </p>
          </div>

          <div className="usage-ranges" role="group" aria-label="Time window">
            {RANGES.map((r) => (
              <button
                type="button"
                key={r.key}
                className={"usage-range" + (range === r.key ? " is-on" : "")}
                aria-pressed={range === r.key}
                onClick={() => setRange(r.key)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </header>

        {current.length === 0 ? (
          <EmptyState minimal title="Nothing used yet" />
        ) : (
          <UsageTrend data={current} prev={previous} label="Wallet spend" />
        )}
      </section>

      <InvoicesPanel />
    </>
  );
}
