/* Small pieces every Stellar surface shares: the USDC figure with its TESTNET
 * badge, the "View on Stellar" link, a copy button, the action labels and the
 * transaction timeline.
 *
 * USDC comes from the API as a decimal string ("12.5"). It is shown as given
 * and compared with `usdcUnits`, which works in whole stroops (7 decimals) as
 * BigInt, so no float ever touches an amount. The one exception is the KES →
 * USDC estimate on the booking form, which is labelled "≈" for that reason.
 */
import { useState } from "react";
import { getConfig } from "./configStore";
import "./stellar.css";

/* ---- Amounts ---- */

/** "12.5" → 125000000n (stroops). Anything unparseable is 0n. */
export function usdcUnits(value) {
  const m = /^\s*(-?)(\d*)(?:\.(\d*))?\s*$/.exec(String(value ?? ""));
  if (!m || (!m[2] && !m[3])) return 0n;
  const frac = (m[3] || "").slice(0, 7).padEnd(7, "0");
  const n = BigInt(m[2] || "0") * 10_000_000n + BigInt(frac || "0");
  return m[1] ? -n : n;
}

/** A USDC string as shown: thousands separated, trailing zeros as sent. */
export function fmtUsdc(value) {
  if (value == null || value === "") return "-";
  const [whole, frac] = String(value).split(".");
  const w = Number(whole).toLocaleString("en-KE");
  return frac ? `${w}.${frac}` : w;
}

export const fmtKes = (n) => `KES ${Number(n || 0).toLocaleString("en-KE")}`;

/* What one USDC costs in shillings, for estimates only. The backend can send
   it on GET /config (`kes_per_usdc`); until it does this is close enough for
   a "≈" line, and the backend quotes the real figure on the booking. */
const FALLBACK_KES_PER_USDC = 130;

export function kesPerUsdc() {
  const r = Number(getConfig().kesPerUsdc);
  return r > 0 ? r : FALLBACK_KES_PER_USDC;
}

/** KES → an approximate USDC string with 2 decimals. */
export function kesToUsdcEstimate(kes) {
  const n = Number(kes) || 0;
  if (n <= 0) return "0";
  return (Math.ceil((n / kesPerUsdc()) * 100) / 100).toFixed(2);
}

/* ---- Bits of UI ---- */

export function TestnetBadge({ network }) {
  if (network !== "testnet") return null;
  return <span className="st-testnet">Testnet</span>;
}

export function Usdc({ amount, network, className = "" }) {
  return (
    <span className={"st-usdc " + className}>
      {fmtUsdc(amount)} USDC
      <TestnetBadge network={network} />
    </span>
  );
}

export function StellarLink({ url, network, children = "View on Stellar" }) {
  if (!url) return null;
  return (
    <a className="st-link" href={url} target="_blank" rel="noopener noreferrer">
      {children}
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7 17L17 7M8 7h9v9" />
      </svg>
      <TestnetBadge network={network} />
    </a>
  );
}

export function CopyButton({ text, label = "Copy" }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      /* clipboard blocked; the text is on screen to select */
    }
  }
  return (
    <button type="button" className="icon-btn st-copy" onClick={copy} disabled={!text}>
      {done ? "Copied" : label}
    </button>
  );
}

export const shortKey = (k) => (k && k.length > 14 ? `${k.slice(0, 6)}…${k.slice(-6)}` : k || "-");

export function fmtWhen(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });
}

/* ---- Actions ---- */

export const ACTION_LABEL = {
  fund: "Deposit funded from your wallet",
  lock: "Deposit locked in escrow",
  release: "Deposit released",
  release_early: "Deposit released",
  refund: "Returned (booking cancelled)",
  dispute: "Deposit frozen for a decision",
  resolve: "Dispute settled",
  return: "USDC returned to your wallet",
  set_release_after: "Release date set",
  collect: "Waiver fee collected",
  settle: "Waiver fee settled to Ardena",
  claim: "Claim filed on Stellar",
  pay_claim: "Claim paid to you",
  reject_claim: "Claim turned down",
  set_settle_after: "Settle date set",
  send: "Sent out",
};

/* A waiver `refund` is the fee going back, not a cancelled booking's deposit. */
export function actionLabel(action, kind) {
  if (kind === "waiver" && action === "refund") return "Waiver fee refunded";
  return ACTION_LABEL[action] || action;
}

/** Vertical list of on-chain transactions, newest last, each with its link. */
export function TxTimeline({ transactions, network, kind }) {
  if (!transactions?.length) return <p className="cell-sub">No transactions on Stellar yet.</p>;
  return (
    <ol className="st-timeline">
      {transactions.map((t, i) => (
        <li key={t.tx_hash || i}>
          <span className="st-dot" aria-hidden="true" />
          <div>
            <p className="strong">{actionLabel(t.action, kind)}</p>
            <p className="cell-sub">
              {fmtWhen(t.at)}
              {t.amount_usdc ? ` · ${fmtUsdc(t.amount_usdc)} USDC` : ""}
            </p>
          </div>
          <StellarLink url={t.url} network={network} />
        </li>
      ))}
    </ol>
  );
}
