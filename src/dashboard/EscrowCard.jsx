/* Booking details: the deposit held in Stellar escrow (stellar.md §1.3).
 *
 * Draws nothing at all when the booking has no escrow, or when the backend
 * doesn't have the endpoint (pilot), so a booking page without escrow looks
 * exactly as it always has. `onLoad` tells the page whether the deposit is
 * escrowed, which changes the Refund / Forfeit copy.
 *
 * The chain catches up a minute or two after the backend answers, so while
 * something is in motion (locking, a release asked for, USDC coming back) the
 * card re-reads itself every 15 s.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchBookingEscrow } from "../lib/api";
import { STELLAR_BOOKINGS as STELLAR } from "./stellarStore";
import {
  CopyButton,
  StellarLink,
  TestnetBadge,
  TxTimeline,
  fmtKes,
  fmtUsdc,
  fmtWhen,
} from "./stellarUi";

const POLL_MS = 15_000;

const FINAL = new Set(["released", "resolved", "refunded", "failed"]);

function pill(e) {
  switch (e.status) {
    case "pending":
      return { cls: "st-pill grey", text: "Locking…" };
    case "locked":
      return { cls: "st-pill blue", text: "Locked in escrow" };
    case "disputed":
      return { cls: "st-pill amber", text: "Frozen for a decision" };
    case "released":
    case "refunded":
      return { cls: "st-pill green", text: "Released" };
    case "resolved":
      return {
        cls: "st-pill green",
        text: e.to_business_usdc ? `Settled: ${fmtUsdc(e.to_business_usdc)} USDC to you` : "Settled",
      };
    case "failed":
      return { cls: "st-pill red", text: "Not escrowed" };
    default:
      return { cls: "st-pill grey", text: e.status };
  }
}

export default function EscrowCard({ bookingRef, refreshKey = 0, onLoad }) {
  const [escrow, setEscrow] = useState(null);
  const timer = useRef(null);
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  const load = useCallback(async () => {
    try {
      const e = await fetchBookingEscrow(bookingRef);
      setEscrow(e || null);
      onLoadRef.current?.(e || null);
    } catch {
      // No endpoint, no escrow, or Stellar unreachable: show nothing.
      setEscrow(null);
      onLoadRef.current?.(null);
    }
  }, [bookingRef]);

  useEffect(() => {
    if (STELLAR) load();
  }, [load, refreshKey]);

  // Poll while the chain still has work to do. "locked" only counts once a
  // deposit action has been taken here (refreshKey > 0): a deposit can sit
  // locked for days, and nobody needs that re-read every 15 s.
  const moving =
    escrow &&
    (escrow.status === "pending" ||
      (escrow.status === "locked" && refreshKey > 0) ||
      escrow.return?.status === "pending");

  useEffect(() => {
    if (!moving) return undefined;
    timer.current = setInterval(() => {
      if (!document.hidden) load();
    }, POLL_MS);
    return () => clearInterval(timer.current);
  }, [moving, load]);

  if (!STELLAR || !escrow) return null;

  const p = pill(escrow);
  const network = escrow.network;

  return (
    <section className="panel-card st-card">
      <header className="card-head with-action">
        <div>
          <h2>
            Deposit on Stellar <TestnetBadge network={network} />
          </h2>
          <p>{escrow.funded_by === "renter" ? "Funded by the renter in the Ardena app" : "Held in escrow from your wallet"}</p>
        </div>
        <span className={p.cls}>{p.text}</span>
      </header>

      <p className="st-amount">
        {fmtUsdc(escrow.amount_usdc)} USDC
        {escrow.amount_kes != null && <span className="cell-sub"> · {fmtKes(escrow.amount_kes)}</span>}
      </p>

      {escrow.status === "locked" && escrow.release_after && (
        <p className="cell-sub">Auto-releases after {fmtWhen(escrow.release_after)}</p>
      )}

      {escrow.return && (
        <p className="cell-sub">
          {escrow.return.status === "done"
            ? `${fmtUsdc(escrow.return.amount_usdc)} USDC back in your wallet`
            : escrow.return.status === "pending"
              ? "USDC on its way back to your wallet…"
              : `Return: ${escrow.return.status}`}
          {escrow.return.url && (
            <>
              {" · "}
              <StellarLink url={escrow.return.url} network={network} />
            </>
          )}
        </p>
      )}

      {escrow.last_error && !FINAL.has(escrow.status) && (
        <p className="st-retry">Stellar is retrying: {escrow.last_error}</p>
      )}

      <div className="st-section">
        <p className="field-label">On Stellar</p>
        <TxTimeline transactions={escrow.transactions} network={network} kind="escrow" />
      </div>

      <div className="st-links">
        <StellarLink url={escrow.contract_url} network={network}>
          Escrow contract
        </StellarLink>
        {escrow.public_url && (
          <div className="st-renter-view">
            <span className="cell-sub">Renter&apos;s view:</span>
            <a className="spec-link" href={escrow.public_url} target="_blank" rel="noopener noreferrer">
              {escrow.public_url.replace(/^https?:\/\//, "")}
            </a>
            <CopyButton text={escrow.public_url} />
          </div>
        )}
      </div>
    </section>
  );
}
