import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchBooking,
  setBookingStatus,
  recordHandoverOut,
  recordHandoverIn,
  bookingDepositAction,
  sendStkPush,
} from "../lib/api";
import { useSyncExternalStore } from "react";
import {
  subscribe as subscribePolicy,
  getPolicy,
  RETURN_HOUR,
} from "./policyStore";
import { STATUS_CHIP, PAY_CHIP } from "./Bookings";
import { fmtDate, rentalDays } from "./bookingsStore";
import { downloadAgreement } from "./pdf";
import { toast } from "./toastStore";
import DatePicker from "./DatePicker";
import Dropdown from "../components/Dropdown";
import "./fleet.css";
import "./bookings.css";

const fmtAmount = (n) => n.toLocaleString("en-KE");

const FUEL_LEVELS = ["Full", "3/4", "1/2", "1/4", "Reserve"];

const TIMES = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  return `${h}:${i % 2 ? "30" : "00"}`;
});

const NEXT_STEP = {
  Pending: { label: "Confirm booking", to: "Confirmed" },
  Confirmed: { label: "Start rental", to: "Active" },
  Active: { label: "Mark completed", to: "Completed" },
};

const CANCELLABLE = ["Pending", "Confirmed"];

const STATUS_TOAST = {
  Confirmed: "Booking confirmed.",
  Active: "Rental started.",
  Completed: "Booking marked completed.",
};

export default function BookingDetails() {
  const policy = useSyncExternalStore(subscribePolicy, getPolicy);
  const { ref } = useParams();
  const [b, setB] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [retDate, setRetDate] = useState(null);
  const [retTime, setRetTime] = useState("10:00");
  const [outFuel, setOutFuel] = useState("Full");
  const [inFuel, setInFuel] = useState("Full");
  const [payModal, setPayModal] = useState(false);
  const [payPhone, setPayPhone] = useState("");
  const [payProvider, setPayProvider] = useState("mpesa");
  const [payBusy, setPayBusy] = useState(false);
  const [payWaiting, setPayWaiting] = useState(false);
  const pollRef = useRef(null);
  const pollDeadlineRef = useRef(null);

  const decodedRef = decodeURIComponent(ref);

  const load = useCallback(async () => {
    try {
      const data = await fetchBooking(decodedRef);
      setB(data);
    } catch (err) {
      toast(err.message || "Failed to load booking", "danger");
    } finally {
      setLoading(false);
    }
  }, [decodedRef]);

  useEffect(() => {
    load();
  }, [load]);

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
    setPayWaiting(false);
  }

  function startPolling() {
    setPayWaiting(true);
    pollDeadlineRef.current = Date.now() + 3 * 60 * 1000; // 3-minute timeout
    let inFlight = false;
    pollRef.current = setInterval(async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        if (Date.now() > pollDeadlineRef.current) {
          // Timed out — fetch one last time to get the real state
          try {
            const updated = await fetchBooking(decodedRef);
            setB(updated);
            toast(
              updated.payment === "Paid"
                ? "Payment confirmed! Booking marked as Paid."
                : "Payment not confirmed — the customer may not have responded. You can resend the request.",
              updated.payment === "Paid" ? undefined : "warn",
            );
          } catch { /* ignore */ }
          stopPolling();
          return;
        }
        const updated = await fetchBooking(decodedRef);
        if (updated.payment === "Paid") {
          setB(updated);
          stopPolling();
          toast("Payment confirmed! Booking marked as Paid.");
        } else if (updated.payment === "Failed") {
          setB(updated);
          stopPolling();
          toast("Payment was declined or timed out. You can resend the request.", "danger");
        }
      } catch {
        // silent — will retry next tick
      } finally {
        inFlight = false;
      }
    }, 4000);
  }

  if (loading) {
    return (
      <>
        <Link to="/dashboard/bookings" className="back-link" aria-label="Back to bookings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="empty-block fleet-empty"><p>Loading…</p></div>
      </>
    );
  }

  if (!b) {
    return (
      <>
        <Link to="/dashboard/bookings" className="back-link" aria-label="Back to bookings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="empty-block fleet-empty">
          <p>This booking doesn't exist.</p>
        </div>
      </>
    );
  }

  const days = rentalDays(b.pickup, b.dropoff);
  const total = days * b.rate;
  const next = NEXT_STEP[b.status];
  const canCancel = CANCELLABLE.includes(b.status);
  const canPrompt = b.payment !== "Paid" && b.payment !== "Refunded" && b.status !== "Cancelled" && b.status !== "Completed";
  const ho = b.handover || { out: null, inn: null };
  const hoOut = ho.out || null;
  const hoIn = ho.inn || null;
  const penalty = hoIn ? hoIn.penalty : 0;
  const depositAmt = b.deposit_amount ?? policy.deposit;

  async function doStatus(newStatus) {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await setBookingStatus(b.ref, newStatus);
      setB(updated);
      toast(STATUS_TOAST[newStatus] || "Booking updated.");
    } catch (err) {
      toast(err.message || "Failed to update status", "danger");
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckOut(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const updated = await recordHandoverOut(b.ref, {
        odometer: Number(f.get("odometer")),
        fuel: outFuel,
        notes: f.get("notes").trim() || null,
      });
      setB(updated);
      toast("Check-out recorded, keys can go out.");
    } catch (err) {
      toast(err.message || "Failed to record check-out", "danger");
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckIn(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const updated = await recordHandoverIn(b.ref, {
        odometer: Number(f.get("odometer")),
        fuel: inFuel,
        notes: f.get("notes").trim() || null,
        return_date: retDate || b.dropoff,
        return_time: retTime,
      });
      setB(updated);
      const late = updated.handover?.inn?.late_hours || 0;
      const pen = updated.handover?.inn?.penalty || 0;
      if (late > 0) {
        toast(`Check-in recorded, ${late} hr${late > 1 ? "s" : ""} late. KES ${pen.toLocaleString("en-KE")} penalty applied.`, "danger");
      } else {
        toast("Check-in recorded, returned on time.");
      }
    } catch (err) {
      toast(err.message || "Failed to record check-in", "danger");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeposit(action) {
    if (busy) return;
    setBusy(true);
    try {
      const updated = await bookingDepositAction(b.ref, action);
      setB(updated);
      toast(action === "refund" ? "Security deposit refunded." : "Security deposit forfeited.", action === "forfeit" ? "danger" : undefined);
    } catch (err) {
      toast(err.message || "Failed", "danger");
    } finally {
      setBusy(false);
    }
  }

  function openPayModal() {
    setPayPhone(b.phone || "");
    setPayProvider("mpesa");
    setPayModal(true);
  }

  async function handleStkPush(e) {
    e.preventDefault();
    if (payBusy) return;
    setPayBusy(true);
    try {
      const result = await sendStkPush(b.ref, payPhone, payProvider);
      const updated = await fetchBooking(b.ref);
      setB(updated);
      setPayModal(false);
      toast(result.message || "STK push sent.", result.success ? undefined : "danger");
      if (result.success) startPolling();
    } catch (err) {
      toast(err.message || "Failed to send STK push", "danger");
    } finally {
      setPayBusy(false);
    }
  }

  return (
    <>
      <header className="head-card">
        <div className="head-left">
          <Link to="/dashboard/bookings" className="back-link" aria-label="Back to bookings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="head-titles">
            <h1>{b.customer}</h1>
            <p>
              {b.ref} · {b.vehicle} ({b.plate}) ·{" "}
              <span className={`chip ${STATUS_CHIP[b.status]}`}>{b.status}</span>
            </p>
          </div>
        </div>
        <div className="details-actions">
          {next && (
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => doStatus(next.to)}
            >
              {next.label}
            </button>
          )}
          {canCancel &&
            (cancelling ? (
              <span className="confirm-inline">
                Cancel this booking?
                <button
                  type="button"
                  className="icon-btn danger"
                  disabled={busy}
                  onClick={() => {
                    doStatus("Cancelled");
                    setCancelling(false);
                  }}
                >
                  Yes
                </button>
                <button type="button" className="icon-btn" onClick={() => setCancelling(false)}>
                  No
                </button>
              </span>
            ) : (
              <button
                type="button"
                className="btn btn-ghost danger-btn"
                onClick={() => setCancelling(true)}
              >
                Cancel booking
              </button>
            ))}
        </div>
      </header>

      <div className="details-grid">
        <div className="settings-main">
          <section className="panel-card">
            <header className="card-head">
              <h2>Booking information</h2>
              <p>Reservation record</p>
            </header>
            <dl className="spec-grid">
              <div className="spec">
                <dt>Customer</dt>
                <dd>{b.customer}</dd>
              </div>
              <div className="spec">
                <dt>Phone</dt>
                <dd>{b.phone}</dd>
              </div>
              <div className="spec">
                <dt>Vehicle</dt>
                <dd>
                  <Link className="spec-link" to={`/dashboard/fleet/${encodeURIComponent(b.plate)}`}>
                    {b.vehicle} · {b.plate}
                  </Link>
                </dd>
              </div>
              <div className="spec">
                <dt>Day rate</dt>
                <dd>KES {fmtAmount(b.rate)}</dd>
              </div>
              <div className="spec">
                <dt>Pickup</dt>
                <dd>{fmtDate(b.pickup)}</dd>
              </div>
              <div className="spec">
                <dt>Return</dt>
                <dd>
                  {fmtDate(b.dropoff)} · by {RETURN_HOUR}:00 AM
                </dd>
              </div>
              <div className="spec">
                <dt>Duration</dt>
                <dd>
                  {days} day{days > 1 ? "s" : ""}
                </dd>
              </div>
              <div className="spec">
                <dt>Pickup location</dt>
                <dd>{b.location}</dd>
              </div>
              <div className="spec">
                <dt>Created</dt>
                <dd>{fmtDate(b.created)}</dd>
              </div>
              {b.notes && (
                <div className="spec spec-full">
                  <dt>Notes</dt>
                  <dd>{b.notes}</dd>
                </div>
              )}
            </dl>
          </section>

          {/* ---- Handover ---- */}
          <section className="panel-card">
            <header className="card-head">
              <h2>Handover</h2>
              <p>Condition recorded at pickup and return</p>
            </header>

            {!hoOut && b.status !== "Cancelled" && (
              <form className="ho-form" onSubmit={handleCheckOut}>
                <p className="ho-step">Check-out · record before handing over keys</p>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="ho-odo">Odometer (km)</label>
                    <input id="ho-odo" name="odometer" type="number" min="0" placeholder="48210" required />
                  </div>
                  <div className="field">
                    <label htmlFor="ho-fuel">Fuel level</label>
                    <Dropdown
                      id="ho-fuel"
                      name="fuel"
                      value={outFuel}
                      onChange={setOutFuel}
                      options={FUEL_LEVELS}
                    />
                  </div>
                  <div className="field form-full">
                    <label htmlFor="ho-notes">Condition notes</label>
                    <textarea id="ho-notes" name="notes" rows="2" placeholder="Scratches, dents, anything the renter should not be charged for" />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={busy}>
                    Record check-out
                  </button>
                </div>
              </form>
            )}

            {hoOut && (
              <>
                <div className="pay-row">
                  <span>Checked out · {hoOut.at}</span>
                  <span className="mini-amount">
                    {fmtAmount(hoOut.odometer)} km · fuel {hoOut.fuel}
                  </span>
                </div>
                {hoOut.notes && <p className="ho-note">Out: {hoOut.notes}</p>}
              </>
            )}

            {hoOut && !hoIn && b.status === "Active" && (
              <form className="ho-form ho-return" onSubmit={handleCheckIn}>
                <p className="ho-step">
                  Check-in · due {fmtDate(b.dropoff)} by {RETURN_HOUR}:00 AM, then KES{" "}
                  {fmtAmount(policy.lateFeePerHour)} per started hour
                </p>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="hi-odo">Odometer (km)</label>
                    <input id="hi-odo" name="odometer" type="number" min={hoOut.odometer} placeholder={String(hoOut.odometer)} required />
                  </div>
                  <div className="field">
                    <label htmlFor="hi-fuel">Fuel level</label>
                    <Dropdown
                      id="hi-fuel"
                      name="fuel"
                      value={inFuel}
                      onChange={setInFuel}
                      options={FUEL_LEVELS}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="hi-at">Return date</label>
                    <DatePicker
                      id="hi-at"
                      value={retDate || b.dropoff}
                      onChange={setRetDate}
                      minDate={b.pickup}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="hi-time">Return time</label>
                    <Dropdown
                      id="hi-time"
                      value={retTime}
                      onChange={setRetTime}
                      options={TIMES}
                    />
                  </div>
                  <div className="field form-full">
                    <label htmlFor="hi-notes">Return notes</label>
                    <input id="hi-notes" name="notes" type="text" placeholder="New damage, missing items" />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={busy}>
                    Record check-in
                  </button>
                </div>
              </form>
            )}

            {hoIn && (
              <>
                <div className="pay-row">
                  <span>Checked in · {hoIn.at}</span>
                  <span className="mini-amount">
                    {fmtAmount(hoIn.odometer)} km · fuel {hoIn.fuel}
                  </span>
                </div>
                <div className="pay-row">
                  <span>Distance driven</span>
                  <span className="mini-amount">{fmtAmount(hoIn.odometer - hoOut.odometer)} km</span>
                </div>
                <div className="pay-row">
                  <span>Late return</span>
                  <span className={`mini-amount${hoIn.late_hours > 0 ? " penalty-red" : ""}`}>
                    {hoIn.late_hours > 0
                      ? `${hoIn.late_hours} hr${hoIn.late_hours > 1 ? "s" : ""} · KES ${fmtAmount(hoIn.penalty)}`
                      : "On time"}
                  </span>
                </div>
                {hoIn.notes && <p className="ho-note">In: {hoIn.notes}</p>}
              </>
            )}

            {!hoOut && b.status === "Cancelled" && (
              <p className="side-hint">Booking was cancelled before handover.</p>
            )}
          </section>
        </div>

        <div className="details-side">
          <section className="panel-card">
            <header className="card-head">
              <h2>Payment</h2>
              <p>Collected from the customer</p>
            </header>
            <p className="util-hero">KES {fmtAmount(total)}</p>
            <div className="pay-row">
              <span>Status</span>
              <span className={`chip ${PAY_CHIP[b.payment]}`}>{b.payment}</span>
            </div>
            <div className="pay-row">
              <span>Security deposit</span>
              <span className="mini-amount">
                KES {fmtAmount(depositAmt)} · {b.deposit_status}
              </span>
            </div>
            {penalty > 0 && (
              <div className="pay-row">
                <span>Late return penalty</span>
                <span className="mini-amount penalty-red">
                  KES {fmtAmount(penalty)} · {hoIn.late_hours} hr{hoIn.late_hours > 1 ? "s" : ""}
                </span>
              </div>
            )}
            {b.deposit_status === "Held" && hoIn && (
              <div className="deposit-actions">
                <button
                  type="button"
                  className="icon-btn"
                  disabled={busy}
                  onClick={() => handleDeposit("refund")}
                >
                  Refund deposit
                </button>
                <button
                  type="button"
                  className="icon-btn danger"
                  disabled={busy}
                  onClick={() => handleDeposit("forfeit")}
                >
                  Forfeit
                </button>
              </div>
            )}
            {payWaiting && (
              <div className="pay-waiting">
                <span className="pay-waiting-dot" />
                Waiting for customer to pay…
                <button type="button" className="icon-btn" onClick={stopPolling}>Stop</button>
              </div>
            )}
            {canPrompt && (
              <>
                <button
                  type="button"
                  className="btn mpesa-btn"
                  disabled={busy || payWaiting}
                  onClick={openPayModal}
                >
                  {b.payment === "Prompt sent" ? "Resend payment request" : b.payment === "Failed" ? "Retry payment request" : "Request payment"}
                </button>
                <p className="side-hint">
                  Sends an STK push to the customer's phone for KES {fmtAmount(total)}.
                </p>
              </>
            )}

            {payModal && (
              <div className="modal-overlay" onClick={() => !payBusy && setPayModal(false)}>
                <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                  <header className="modal-head">
                    <h3>Request payment · KES {fmtAmount(total)}</h3>
                    <button type="button" className="icon-btn" disabled={payBusy} onClick={() => setPayModal(false)}>✕</button>
                  </header>
                  <form onSubmit={handleStkPush} className="modal-body">
                    <label className="field-label">
                      Customer phone
                      <input
                        type="tel"
                        className="field-input"
                        value={payPhone}
                        onChange={(e) => setPayPhone(e.target.value)}
                        placeholder="07XXXXXXXX"
                        required
                        autoFocus
                      />
                    </label>
                    <fieldset className="provider-group">
                      <legend className="field-label">Payment method</legend>
                      <label className="provider-option">
                        <input
                          type="radio"
                          name="provider"
                          value="mpesa"
                          checked={payProvider === "mpesa"}
                          onChange={() => setPayProvider("mpesa")}
                        />
                        <span className="provider-pill mpesa-pill">M-Pesa</span>
                      </label>
                      <label className="provider-option">
                        <input
                          type="radio"
                          name="provider"
                          value="airtel"
                          checked={payProvider === "airtel"}
                          onChange={() => setPayProvider("airtel")}
                        />
                        <span className="provider-pill airtel-pill">Airtel Money</span>
                      </label>
                    </fieldset>
                    <p className="side-hint">
                      An STK push will be sent to the customer's phone. They'll enter their PIN to complete the payment.
                    </p>
                    <div className="modal-actions">
                      <button type="button" className="btn btn-ghost" disabled={payBusy} onClick={() => setPayModal(false)}>Cancel</button>
                      <button type="submit" className="btn mpesa-btn" disabled={payBusy}>
                        {payBusy ? "Sending…" : "Send STK push"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </section>

          <section className="panel-card">
            <header className="card-head">
              <h2>Rental agreement</h2>
              <p>PDF, ready for signing at pickup</p>
            </header>
            <button
              type="button"
              className="btn btn-primary pay-btn"
              onClick={() => downloadAgreement(
                { ...b, depositStatus: b.deposit_status, depositAmount: depositAmt },
                { ...policy, deposit: depositAmt }
              )}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
                <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
              </svg>
              Download agreement
            </button>
            <p className="side-hint">
              Pre-filled with the booking, the KES {fmtAmount(depositAmt)}{" "}
              deposit and the KES {fmtAmount(policy.lateFeePerHour)}/hour late
              clause from your rental policy.
            </p>
          </section>

          <section className="panel-card">
            <header className="card-head">
              <h2>Identity verification</h2>
              <p>Checked via Dojah before pickup</p>
            </header>
            <div className="pay-row">
              <span>Status</span>
              <span className={`chip ${b.verification === "Verified" ? "active" : "pending"}`}>
                {b.verification}
              </span>
            </div>
            <p className="side-hint">
              {b.verification === "Verified"
                ? "ID and driver's licence matched. Safe to hand over keys."
                : "The customer hasn't completed the ID check yet."}
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
