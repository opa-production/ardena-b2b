/* Stellar wallet (Account → Stellar wallet), stellar.md §1.1.
 *
 * The business's USDC wallet on Stellar: the balance, the address to top it up
 * from an exchange (with a QR code), a test-USDC tap on testnet, sending USDC
 * out with a one-time code, and everything that moved through it, escrowed
 * deposits, waiver fees and transfers, each with its Stellar link.
 *
 * Pilot: a backend without these endpoints shows a quiet "not available"
 * card instead of an error, and the activity feed falls back to the sent
 * transfers list until GET /stellar-wallet/activity ships.
 */
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import PageSkeleton from "./PageSkeleton";
import FilterDropdown from "../components/FilterDropdown";
import RefreshButton from "../components/RefreshButton";
import {
  claimTestnetUsdc,
  createStellarWallet,
  fetchStellarActivity,
  fetchStellarWallet,
  fetchStellarWithdrawals,
  requestStellarWithdrawCode,
  sendStellarWithdraw,
} from "../lib/api";
import { isMissingRoute, isUnavailable, needsPilotSignIn, refreshStellarWallet, stellarCan } from "./stellarStore";
import { PilotGate } from "./StellarPilot";
import {
  CopyButton,
  StellarLink,
  TestnetBadge,
  Usdc,
  actionLabel,
  fmtUsdc,
  fmtWhen,
  shortKey,
  usdcUnits,
} from "./stellarUi";
import { toast } from "./toastStore";
import usePageTitle from "../hooks/usePageTitle";
import "./fleet.css";
import "./bookings.css";
import "./wallet.css";
import "./stellar.css";

const LIMIT = 20;

const KIND_FILTERS = [
  { value: "all", label: "All activity" },
  { value: "escrow", label: "Deposits in escrow" },
  { value: "waiver", label: "Damage waivers" },
  { value: "withdrawal", label: "Sent out" },
];

const KIND_LABEL = { escrow: "Escrow", waiver: "Waiver", withdrawal: "Transfer" };

const SEND_CHIP = { success: "active", pending: "pending", failed: "cancelled" };
const SEND_LABEL = { success: "Sent", pending: "Sending", failed: "Failed" };

const STELLAR_ADDRESS = /^G[A-Z2-7]{55}$/;

export default function StellarWallet() {
  usePageTitle("Stellar wallet");
  return (
    <PilotGate title="Stellar wallet">
      <StellarWalletPage />
    </PilotGate>
  );
}

function StellarWalletPage() {
  const { pathname } = useLocation();
  // On the pilot backend, the pilot account's role decides (it is enforced there).
  const canManage = stellarCan("manageStellarWallet");

  // "loading" | "off" | "none" | "ready" | "error"
  const [state, setState] = useState("loading");
  const [wallet, setWallet] = useState(null);
  const [creating, setCreating] = useState(false);
  const [testBusy, setTestBusy] = useState(false);

  const loadWallet = useCallback(async () => {
    try {
      const w = await fetchStellarWallet();
      setWallet(w);
      setState(w ? "ready" : "none");
    } catch (err) {
      if (needsPilotSignIn(err)) return; // the gate shows the pilot sign-in
      if (err.status === 404 && !isMissingRoute(err)) setState("none");
      else if (isUnavailable(err)) setState("off");
      else {
        setState("error");
        toast(err.message || "Couldn't load the Stellar wallet", "danger");
      }
    }
  }, []);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  async function handleCreate() {
    if (creating) return;
    setCreating(true);
    try {
      const w = await createStellarWallet();
      setWallet(w);
      setState("ready");
      refreshStellarWallet();
      toast("Your Stellar wallet is ready.");
    } catch (err) {
      toast(err.message || "Couldn't create the wallet", "danger");
    } finally {
      setCreating(false);
    }
  }

  async function handleTestUsdc() {
    if (testBusy) return;
    setTestBusy(true);
    try {
      const res = await claimTestnetUsdc();
      toast(`${fmtUsdc(res?.amount_usdc || "20")} test USDC is on its way.`);
      await loadWallet();
      refreshStellarWallet();
    } catch (err) {
      toast(
        isMissingRoute(err) ? "Test USDC isn't available yet." : err.message || "Couldn't get test USDC",
        "danger"
      );
    } finally {
      setTestBusy(false);
    }
  }

  if (state === "loading") return <PageSkeleton path={pathname} />;

  if (state === "off" || state === "error") {
    return (
      <section className="panel-card st-empty">
        <h1 className="st-empty-title">Stellar wallet</h1>
        <p className="cell-sub">
          {state === "off"
            ? "The Stellar wallet is in pilot and isn't switched on for your workspace yet. Everything else works as usual."
            : "We couldn't reach the Stellar wallet just now. Try again in a minute."}
        </p>
        {state === "error" && (
          <button type="button" className="btn btn-ghost" onClick={loadWallet}>
            Try again
          </button>
        )}
      </section>
    );
  }

  if (state === "none") {
    return (
      <section className="panel-card st-empty">
        <h1 className="st-empty-title">Create your Stellar wallet</h1>
        <p className="cell-sub">
          A USDC wallet on the Stellar network for your business. It holds renters&apos;
          deposits in escrow and receives damage-waiver payouts, and every movement can be
          checked on Stellar. Ardena pays all the network fees.
        </p>
        {canManage ? (
          <button type="button" className="btn btn-primary" onClick={handleCreate} disabled={creating}>
            {creating ? "Creating…" : "Create wallet"}
          </button>
        ) : (
          <p className="strong">Ask your owner to create it.</p>
        )}
      </section>
    );
  }

  const network = wallet.network;

  return (
    <>
      <h1 className="sr-only">Stellar wallet</h1>

      <div className="st-wallet-top">
        <section className="panel-card st-head-card">
          <header className="card-head">
            <h2>
              USDC balance <TestnetBadge network={network} />
            </h2>
            <p>
              {wallet.balance_updated_at ? `Updated ${fmtWhen(wallet.balance_updated_at)}` : "On the Stellar network"}
            </p>
          </header>
          <p className="st-balance">
            {fmtUsdc(wallet.balance_usdc || "0")} <span>USDC</span>
          </p>

          <div className="st-address">
            <p className="field-label">Your wallet address</p>
            <p className="mono st-key">{wallet.public_key}</p>
            <div className="st-address-actions">
              <CopyButton text={wallet.public_key} label="Copy address" />
              <StellarLink url={wallet.explorer_url} network={network} />
            </div>
          </div>
        </section>

        <section className="panel-card st-topup-card">
          <header className="card-head">
            <h2>Top up</h2>
            <p>Send USDC on the Stellar network to this address.</p>
          </header>
          <div className="st-qr">
            <QRCodeSVG value={wallet.public_key} size={148} level="M" marginSize={1} />
          </div>
          <p className="cell-sub">
            From an exchange or another wallet, choose USDC on the <strong>Stellar</strong> network.
            No memo is needed.
          </p>
          {network === "testnet" && (
            <button type="button" className="btn btn-ghost" onClick={handleTestUsdc} disabled={testBusy}>
              {testBusy ? "Requesting…" : "Get 20 test USDC"}
            </button>
          )}
        </section>
      </div>

      {canManage && (
        <SendUsdc
          wallet={wallet}
          onSent={() => {
            loadWallet();
            refreshStellarWallet();
          }}
        />
      )}

      <Activity network={network} />
    </>
  );
}

/* ---- Send USDC: destination + amount, then the emailed/texted code ---- */

function SendUsdc({ wallet, onSent }) {
  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [otp, setOtp] = useState("");
  const [hint, setHint] = useState(null); // set once the code is sent
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const body = () => ({
    destination: destination.trim(),
    amount_usdc: amount.trim(),
    memo: memo.trim() || null,
    memo_type: "text",
  });

  function reset() {
    setDestination("");
    setAmount("");
    setMemo("");
    setOtp("");
    setHint(null);
    setError("");
  }

  async function askCode(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setResult(null);
    const dest = destination.trim();
    if (!STELLAR_ADDRESS.test(dest)) {
      setError("That doesn't look like a Stellar address. It starts with G and is 56 characters.");
      return;
    }
    if (dest === wallet.public_key) {
      setError("That's this wallet's own address.");
      return;
    }
    const units = usdcUnits(amount);
    if (!/^\d+(\.\d{1,7})?$/.test(amount.trim()) || units <= 0n) {
      setError("Enter an amount in USDC, like 12.5.");
      return;
    }
    if (units > usdcUnits(wallet.balance_usdc)) {
      setError(`The wallet holds ${fmtUsdc(wallet.balance_usdc)} USDC.`);
      return;
    }
    if (memo.length > 28) {
      setError("A Stellar text memo is at most 28 characters.");
      return;
    }
    setBusy(true);
    try {
      const res = await requestStellarWithdrawCode(body());
      setHint(res || {});
    } catch (err) {
      setError(err.message || "Couldn't send the code");
    } finally {
      setBusy(false);
    }
  }

  async function send(e) {
    e.preventDefault();
    if (busy) return;
    if (!/^\d{4,8}$/.test(otp.trim())) {
      setError("Enter the code we sent you.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const w = await sendStellarWithdraw({ ...body(), otp: otp.trim() });
      setResult(w);
      if (w?.status === "failed") {
        toast("The transfer failed on Stellar. Nothing left your wallet.", "danger");
      } else {
        toast(w?.status === "pending" ? "Sending. It'll show as sent in a moment." : "USDC sent.");
        reset();
      }
      onSent();
    } catch (err) {
      setError(err.message || "Couldn't send");
    } finally {
      setBusy(false);
    }
  }

  const sentTo = [hint?.phone_hint, hint?.email_hint].filter(Boolean).join(" and ");

  return (
    <section className="panel-card st-send">
      <header className="card-head">
        <h2>Send USDC</h2>
        <p>To any Stellar address. We confirm it with a one-time code first.</p>
      </header>

      {!hint ? (
        <form className="st-send-form" onSubmit={askCode}>
          <div className="field st-send-dest">
            <label htmlFor="st-dest">Destination address</label>
            <input
              id="st-dest"
              className="mono"
              value={destination}
              onChange={(e) => setDestination(e.target.value.toUpperCase())}
              placeholder="G…"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="field">
            <label htmlFor="st-amount">Amount (USDC)</label>
            <input
              id="st-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="12.5"
            />
          </div>
          <div className="field">
            <label htmlFor="st-memo">Memo · optional</label>
            <input
              id="st-memo"
              value={memo}
              maxLength={28}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Needed by some exchanges"
            />
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="st-send-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Sending code…" : "Continue"}
            </button>
          </div>
        </form>
      ) : (
        <form className="st-send-form" onSubmit={send}>
          <p className="st-send-summary">
            Sending <strong>{fmtUsdc(amount)} USDC</strong> to{" "}
            <span className="mono">{shortKey(destination)}</span>
            {memo ? ` · memo "${memo}"` : ""}
          </p>
          <div className="field">
            <label htmlFor="st-otp">
              {sentTo ? `We sent a code to ${sentTo}` : hint.message || "Enter the code we sent you"}
            </label>
            <input
              id="st-otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              autoFocus
            />
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="st-send-actions">
            <button type="button" className="btn btn-ghost" onClick={() => { setHint(null); setOtp(""); setError(""); }} disabled={busy}>
              Back
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Sending…" : "Send USDC"}
            </button>
          </div>
        </form>
      )}

      {result && (
        <p className="cell-sub st-send-result">
          Last transfer: {SEND_LABEL[result.status] || result.status}
          {result.url && (
            <>
              {" · "}
              <StellarLink url={result.url} network={wallet.network} />
            </>
          )}
        </p>
      )}
    </section>
  );
}

/* ---- Activity: the feed with its summary, or sent transfers until it ships ---- */

function Activity({ network }) {
  const [kind, setKind] = useState("all");
  const [feed, setFeed] = useState(null); // activity response
  const [fallback, setFallback] = useState(null); // withdrawals, when there is no feed
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchStellarActivity({ kind, page: 1, limit: LIMIT });
      setFeed(res);
      setItems(res?.items || []);
      setPage(1);
      setFallback(null);
    } catch {
      // The feed is still being built; show what we can, the transfers.
      setFeed(null);
      try {
        const res = await fetchStellarWithdrawals({ page: 1, limit: LIMIT });
        setFallback(Array.isArray(res) ? res : res?.items || res?.data || []);
      } catch {
        setFallback([]);
      }
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    load();
  }, [load]);

  async function loadMore() {
    if (more) return;
    setMore(true);
    try {
      const next = page + 1;
      const res = await fetchStellarActivity({ kind, page: next, limit: LIMIT });
      setItems((prev) => [...prev, ...(res?.items || [])]);
      setPage(next);
    } catch (err) {
      toast(err.message || "Couldn't load more", "danger");
    } finally {
      setMore(false);
    }
  }

  const s = feed?.summary;

  return (
    <>
      {s && (
        <div className="stat-grid st-stats">
          <article className="stat-card">
            <p className="stat-label">Deposits locked</p>
            <p className="stat-value">{fmtUsdc(s.deposits_locked_usdc)} USDC</p>
            <p className="stat-note">{s.deposits_locked_count} booking{s.deposits_locked_count === 1 ? "" : "s"}</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Waiver fees held</p>
            <p className="stat-value">{fmtUsdc(s.waivers_held_usdc)} USDC</p>
            <p className="stat-note">{s.waivers_held_count} waiver{s.waivers_held_count === 1 ? "" : "s"}</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Claims awaiting review</p>
            <p className="stat-value">{s.claims_awaiting_review}</p>
            <p className="stat-note">by your owner or finance</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Transactions</p>
            <p className="stat-value">{s.transactions_total}</p>
            <p className="stat-note">on Stellar, all time</p>
          </article>
        </div>
      )}

      <section className="panel-card">
        <div className="fleet-toolbar">
          <header className="card-head no-gap">
            <h2>{fallback ? "Sent transfers" : "Activity"}</h2>
            <p>{fallback ? "USDC sent out of this wallet" : "Every movement, each with its proof on Stellar"}</p>
          </header>
          {!fallback && (
            <FilterDropdown id="st-kind" label="Type" value={kind} onChange={setKind} options={KIND_FILTERS} />
          )}
          <RefreshButton onRefresh={load} />
        </div>

        {loading ? (
          <p className="cell-sub st-pad">Loading…</p>
        ) : fallback ? (
          <WithdrawalsTable rows={fallback} network={network} />
        ) : (
          <>
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>What</th>
                  <th>Booking</th>
                  <th className="num">Amount</th>
                  <th>Proof</th>
                </tr>
              </thead>
              <tbody>
                {items.map((t, i) => (
                  <tr key={t.tx_hash || i}>
                    <td>{fmtWhen(t.at)}</td>
                    <td>
                      <p>{actionLabel(t.action, t.kind)}</p>
                      <p className="cell-sub">{KIND_LABEL[t.kind] || t.kind}</p>
                    </td>
                    <td className="mono">{t.booking_ref || "-"}</td>
                    <td className="num strong">
                      {t.amount_usdc ? <Usdc amount={t.amount_usdc} network={network} /> : "-"}
                    </td>
                    <td>
                      <StellarLink url={t.url} network={network} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && (
              <div className="empty-block fleet-empty">
                <p>Nothing has moved through this wallet yet.</p>
              </div>
            )}
            {items.length < (feed?.total || 0) && (
              <div className="wallet-more">
                <button type="button" className="btn btn-ghost" onClick={loadMore} disabled={more}>
                  {more ? "Loading…" : "Show more"}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}

function WithdrawalsTable({ rows, network }) {
  if (!rows.length) {
    return (
      <div className="empty-block fleet-empty">
        <p>No USDC sent from this wallet yet.</p>
      </div>
    );
  }
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>When</th>
          <th>To</th>
          <th>Status</th>
          <th className="num">Amount</th>
          <th>Proof</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((w, i) => (
          <tr key={w.id || w.tx_hash || i}>
            <td>{fmtWhen(w.created_at || w.at)}</td>
            <td>
              <p className="mono">{shortKey(w.destination)}</p>
              {w.memo && <p className="cell-sub">{w.memo}</p>}
            </td>
            <td>
              <span className={`chip ${SEND_CHIP[w.status] || "pending"}`}>{SEND_LABEL[w.status] || w.status}</span>
            </td>
            <td className="num strong">
              <Usdc amount={w.amount_usdc} network={network} />
            </td>
            <td>
              <StellarLink url={w.url || w.explorer_url} network={network} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
