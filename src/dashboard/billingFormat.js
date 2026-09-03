/* Formatting and normalising shared by the three account pages — Usage,
   Billing. They were one screen until they were split, so these
   lived at the top of Billing.jsx; they sit here now so the three pages can't
   drift into formatting the same shilling figure two different ways. */

export const fmtAmount = (n) => Number(n || 0).toLocaleString("en-KE");

export function fmtDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-KE", { dateStyle: "medium" });
}

/* Subscription status → the shared .chip modifier that colours it. */
export const STATUS_CHIP = {
  trial: "pending",
  active: "active",
  past_due: "cancelled",
};

export function statusLabel(status) {
  if (status === "trial") return "Free trial";
  if (status === "past_due") return "Past due";
  return "Active";
}

/* The wallet-transactions endpoint mixes top-ups (money in) with per-check
   debits (money out); field names aren't pinned down in the docs, so read them
   defensively and treat anything that isn't clearly a check/debit as a top-up. */
export function normalizeTxn(t) {
  const kind = String(t.type || t.kind || t.category || "").toLowerCase();
  const amount = Math.abs(Number(t.amount) || 0);
  const isTopup = /top|credit|deposit|fund/.test(kind)
    ? true
    : /check|debit|lookup|verif/.test(kind)
    ? false
    : Number(t.amount) > 0;
  return {
    id: t.id || t.reference || `${t.date || ""}-${t.amount}`,
    amount,
    isTopup,
    status: String(t.status || "completed").toLowerCase(),
    method: t.method || t.channel || t.description || (isTopup ? "Top-up" : "Renter check"),
    date: (t.date || t.created_at || "").slice(0, 10),
  };
}
