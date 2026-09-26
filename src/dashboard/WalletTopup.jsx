import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { startTopup, verifyTopup, hydrateWallet } from "./verificationsStore";
import Dropdown from "../components/Dropdown";
import LoadingOverlay from "../components/LoadingOverlay";
import { toast } from "./toastStore";

/* Value is what the API takes; label is what the person reads. */
const PAYMENT_METHODS = [
  { value: "mpesa", label: "M-Pesa" },
  { value: "card", label: "Card" },
];

/**
 * The "Top up wallet" button, its modal, and the wait for the payment to
 * clear. One wallet pays for ID checks and SMS, so Verification and the
 * Wallet page share this rather than each carrying a copy.
 *
 * `onSettled` runs after a top-up is confirmed (or given up on) so the page
 * can refresh its own figures; `onWaitingChange` reports the wait so a page
 * can say so next to its balance.
 */
export default function WalletTopup({ className = "btn btn-ghost page-action-btn", onSettled, onWaitingChange }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("mpesa");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [waiting, setWaitingState] = useState(false);
  const pollRef = useRef(null);
  const deadlineRef = useRef(null);

  function setWaiting(v) {
    setWaitingState(v);
    onWaitingChange?.(v);
  }

  // stop polling if the user leaves mid-payment
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setWaiting(false);
  }

  // Poll until Paystack confirms, then refresh the balance. 3-minute cap —
  // STK prompts expire on-device well before then.
  function startPolling(reference) {
    setWaiting(true);
    deadlineRef.current = Date.now() + 3 * 60 * 1000;
    let inFlight = false;

    async function tick() {
      if (inFlight) return;
      inFlight = true;
      try {
        const res = await verifyTopup(reference);
        const status = String(res?.status || "");
        if (/success|paid|complete/i.test(status)) {
          stopPolling();
          toast("Wallet topped up.");
          onSettled?.();
        } else if (
          /fail|cancel|declin|timeout|expire/i.test(status) ||
          Date.now() > deadlineRef.current
        ) {
          stopPolling();
          await hydrateWallet().catch(() => {});
          onSettled?.();
          toast("Top-up wasn't confirmed, the prompt may have expired. Try again.", "warn");
        }
        // still pending — retry next tick
      } catch {
        // network hiccup — retry next tick
      } finally {
        inFlight = false;
      }
    }

    pollRef.current = setInterval(tick, 6000);
  }

  function openModal() {
    setAmount("");
    setMethod("mpesa");
    setOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    const value = Number(amount);
    if (!value || value <= 0) {
      toast("Enter a top-up amount.", "danger");
      return;
    }
    if (method === "mpesa" && !phone.trim()) {
      toast("Enter the M-Pesa phone number.", "danger");
      return;
    }
    setBusy(true);
    try {
      const res = await startTopup({
        amount: value,
        method,
        phone: method === "mpesa" ? phone.trim() : undefined,
      });
      const reference = res.reference || res.paystack_reference;
      if (method === "card" && res.checkout_url) {
        window.open(res.checkout_url, "_blank", "noopener,noreferrer");
        toast("Paystack checkout opened, complete your payment there.");
      } else {
        toast("STK push sent, enter your M-Pesa PIN to complete the top-up.");
      }
      setOpen(false);
      if (reference) startPolling(reference);
    } catch (err) {
      toast(err.message || "Failed to start top-up", "danger");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {waiting ? (
        <button type="button" className={className} onClick={stopPolling}>
          Waiting for payment
        </button>
      ) : (
        <button type="button" className={className} onClick={openModal}>
          Top up wallet
        </button>
      )}

      {/* Portalled to <body>: this button sits inside a page section, and every
          top-level section of .dash-content runs a fade-in animation, which makes
          it its own stacking context. Rendered in place, the modal was trapped in
          that layer and painted under the sections that follow it. */}
      {open && createPortal(
        <div className="modal-overlay" onClick={() => !busy && setOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">
              <h3>Top up wallet</h3>
              <button
                type="button"
                className="icon-btn"
                disabled={busy}
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </header>
            <form onSubmit={handleSubmit} className="modal-body">
              <label className="field-label">
                Amount (KES)
                <input
                  type="number"
                  min="1"
                  step="1"
                  className="field-input"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 1000"
                  required
                  autoFocus
                />
              </label>
              {/* A dropdown rather than two radio pills: there are only two
                  today but card is about to grow siblings, and a pill row
                  stops scaling at three. */}
              <label className="field-label">
                Payment method
                <Dropdown
                  id="topup-method"
                  name="topup-method"
                  value={method}
                  onChange={setMethod}
                  options={PAYMENT_METHODS}
                />
              </label>

              {method === "mpesa" && (
                <label className="field-label">
                  M-Pesa phone
                  <input
                    type="tel"
                    className="field-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07XXXXXXXX"
                    required
                  />
                </label>
              )}
              <p className="side-hint" style={{ marginTop: 0 }}>
                {method === "mpesa"
                  ? "An STK push goes to this phone, enter the PIN to complete."
                  : "A Paystack checkout opens in a new tab."}
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn mpesa-btn" disabled={busy}>
                  {busy ? "Starting…" : "Top up"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {waiting && createPortal(
        <LoadingOverlay
          label="Waiting for payment…"
          note="Approve the prompt on your phone. This closes on its own once it clears."
          onCancel={stopPolling}
        />,
        document.body
      )}
    </>
  );
}
