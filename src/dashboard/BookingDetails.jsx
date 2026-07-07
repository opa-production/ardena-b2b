import { useState, useSyncExternalStore } from "react";
import { Link, useParams } from "react-router-dom";
import {
  subscribe,
  getBookings,
  getBooking,
  setStatus,
  setPayment,
  setDepositStatus,
  recordCheckOut,
  recordCheckIn,
  NEXT_STEP,
  CANCELLABLE,
  fmtDate,
  rentalDays,
} from "./bookingsStore";
import {
  subscribe as subscribePolicy,
  getPolicy,
  RETURN_HOUR,
} from "./policyStore";
import { STATUS_CHIP, PAY_CHIP } from "./Bookings";
import { downloadAgreement } from "./pdf";
import { toast } from "./toastStore";
import DatePicker from "./DatePicker";
import Dropdown from "../components/Dropdown";
import "./fleet.css";
import "./bookings.css";

const fmtAmount = (n) => n.toLocaleString("en-KE");

const FUEL_LEVELS = ["Full", "3/4", "1/2", "1/4", "Reserve"];

// half-hour steps for the return time
const TIMES = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  return `${h}:${i % 2 ? "30" : "00"}`;
});

const STATUS_TOAST = {
  Confirmed: "Booking confirmed.",
  Active: "Rental started.",
  Completed: "Booking marked completed.",
};

const nowLabel = () =>
  new Date().toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function BookingDetails() {
  useSyncExternalStore(subscribe, getBookings); // re-render on store changes
  const policy = useSyncExternalStore(subscribePolicy, getPolicy);
  const { ref } = useParams();
  const [cancelling, setCancelling] = useState(false);
  const [retDate, setRetDate] = useState(null);
  const [retTime, setRetTime] = useState("10:00");
  const [outFuel, setOutFuel] = useState("Full");
  const [inFuel, setInFuel] = useState("Full");

  const b = getBooking(decodeURIComponent(ref));

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
  const ho = b.handover;
  const penalty = ho.in ? ho.in.penalty : 0;
  // per-booking deposit wins over the policy default
  const depositAmt = b.depositAmount ?? policy.deposit;

  function handleCheckOut(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    recordCheckOut(b.ref, {
      odometer: Number(f.get("odometer")),
      fuel: f.get("fuel"),
      at: nowLabel(),
      notes: f.get("notes").trim(),
    });
    toast("Check-out recorded, keys can go out.");
  }

  function handleCheckIn(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const returned = new Date(`${retDate || b.dropoff}T${retTime}:00`);
    const due = new Date(`${b.dropoff}T${String(RETURN_HOUR).padStart(2, "0")}:00:00`);
    const lateHours = Math.max(0, Math.ceil((returned - due) / 3600000));
    const pen = lateHours * policy.lateFeePerHour;
    recordCheckIn(b.ref, {
      odometer: Number(f.get("odometer")),
      fuel: f.get("fuel"),
      at: returned.toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
      lateHours,
      penalty: pen,
      notes: f.get("notes").trim(),
    });
    if (lateHours > 0) {
      toast(
        `Check-in recorded, ${lateHours} hr${lateHours > 1 ? "s" : ""} late. KES ${pen.toLocaleString("en-KE")} penalty applied.`,
        "danger"
      );
    } else {
      toast("Check-in recorded, returned on time.");
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
              onClick={() => {
                setStatus(b.ref, next.to);
                toast(STATUS_TOAST[next.to] || "Booking updated.");
              }}
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
                  onClick={() => {
                    setStatus(b.ref, "Cancelled");
                    setCancelling(false);
                    toast("Booking cancelled.", "danger");
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

          {/* ---- Handover: check-out at pickup, check-in at return ---- */}
          <section className="panel-card">
            <header className="card-head">
              <h2>Handover</h2>
              <p>Condition recorded at pickup and return</p>
            </header>

            {!ho.out && b.status !== "Cancelled" && (
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
                  <button type="submit" className="btn btn-primary">
                    Record check-out
                  </button>
                </div>
              </form>
            )}

            {ho.out && (
              <>
                <div className="pay-row">
                  <span>Checked out · {ho.out.at}</span>
                  <span className="mini-amount">
                    {fmtAmount(ho.out.odometer)} km · fuel {ho.out.fuel}
                  </span>
                </div>
                {ho.out.notes && <p className="ho-note">Out: {ho.out.notes}</p>}
              </>
            )}

            {ho.out && !ho.in && b.status === "Active" && (
              <form className="ho-form ho-return" onSubmit={handleCheckIn}>
                <p className="ho-step">
                  Check-in · due {fmtDate(b.dropoff)} by {RETURN_HOUR}:00 AM, then KES{" "}
                  {fmtAmount(policy.lateFeePerHour)} per started hour
                </p>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="hi-odo">Odometer (km)</label>
                    <input id="hi-odo" name="odometer" type="number" min={ho.out.odometer} placeholder={String(ho.out.odometer)} required />
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
                  <button type="submit" className="btn btn-primary">
                    Record check-in
                  </button>
                </div>
              </form>
            )}

            {ho.in && (
              <>
                <div className="pay-row">
                  <span>Checked in · {ho.in.at}</span>
                  <span className="mini-amount">
                    {fmtAmount(ho.in.odometer)} km · fuel {ho.in.fuel}
                  </span>
                </div>
                <div className="pay-row">
                  <span>Distance driven</span>
                  <span className="mini-amount">{fmtAmount(ho.in.odometer - ho.out.odometer)} km</span>
                </div>
                <div className="pay-row">
                  <span>Late return</span>
                  <span className={`mini-amount${ho.in.lateHours > 0 ? " penalty-red" : ""}`}>
                    {ho.in.lateHours > 0
                      ? `${ho.in.lateHours} hr${ho.in.lateHours > 1 ? "s" : ""} · KES ${fmtAmount(ho.in.penalty)}`
                      : "On time"}
                  </span>
                </div>
                {ho.in.notes && <p className="ho-note">In: {ho.in.notes}</p>}
              </>
            )}

            {!ho.out && b.status === "Cancelled" && (
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
                KES {fmtAmount(depositAmt)} · {b.depositStatus}
              </span>
            </div>
            {penalty > 0 && (
              <div className="pay-row">
                <span>Late return penalty</span>
                <span className="mini-amount penalty-red">
                  KES {fmtAmount(penalty)} · {ho.in.lateHours} hr{ho.in.lateHours > 1 ? "s" : ""}
                </span>
              </div>
            )}
            {b.depositStatus === "Held" && ho.in && (
              <div className="deposit-actions">
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => {
                    setDepositStatus(b.ref, "Refunded");
                    toast("Security deposit refunded.");
                  }}
                >
                  Refund deposit
                </button>
                <button
                  type="button"
                  className="icon-btn danger"
                  onClick={() => {
                    setDepositStatus(b.ref, "Forfeited");
                    toast("Security deposit forfeited.", "danger");
                  }}
                >
                  Forfeit
                </button>
              </div>
            )}
            {canPrompt && (
              <>
                <button
                  type="button"
                  className="btn mpesa-btn"
                  onClick={() => {
                    setPayment(b.ref, "Prompt sent");
                    toast(`M-Pesa prompt sent to ${b.phone}.`);
                  }}
                >
                  {b.payment === "Prompt sent" ? "Resend prompt" : "Send prompt"}
                </button>
                <p className="side-hint">
                  Sends an STK push to {b.phone}. Live payments arrive with the M-Pesa integration.
                </p>
              </>
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
              onClick={() => downloadAgreement(b, { ...policy, deposit: depositAmt })}
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
