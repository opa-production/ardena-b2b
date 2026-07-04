import { useMemo, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import {
  subscribe,
  getBookings,
  setPayment,
  fmtRange,
  rentalDays,
} from "./bookingsStore";
import { PAY_CHIP } from "./Bookings";
import CollectionsTrend from "./charts/CollectionsTrend";
import "./fleet.css";
import "./bookings.css";
import "./payments.css";

export const fmtAmount = (n) => n.toLocaleString("en-KE");

// mock M-Pesa receipt code, deterministic per booking, until Daraja is wired in
export const receiptFor = (ref) =>
  `TG${ref.slice(-4)}${"KQXWLM"[Number(ref.slice(-1)) % 6]}J`;

const bookingAmount = (b) => rentalDays(b.pickup, b.dropoff) * b.rate;

export default function Payments() {
  const bookings = useSyncExternalStore(subscribe, getBookings);
  const [selectedRef, setSelectedRef] = useState("");
  const [sentTo, setSentTo] = useState(null);

  const stats = useMemo(() => {
    let collected = 0;
    let outstanding = 0;
    let refunded = 0;
    let prompts = 0;
    bookings.forEach((b) => {
      const amount = bookingAmount(b);
      if (b.payment === "Paid") collected += amount;
      if (b.payment === "Refunded") refunded += amount;
      if (b.payment === "Prompt sent") prompts += 1;
      if (
        (b.payment === "Unpaid" || b.payment === "Prompt sent") &&
        b.status !== "Cancelled"
      ) {
        outstanding += amount;
      }
    });
    return { collected, outstanding, refunded, prompts };
  }, [bookings]);

  // bookings you can still prompt: money owed on a live booking
  const promptable = useMemo(
    () =>
      bookings.filter(
        (b) =>
          (b.payment === "Unpaid" || b.payment === "Prompt sent") &&
          b.status !== "Cancelled" &&
          b.status !== "Completed"
      ),
    [bookings]
  );

  const selected =
    promptable.find((b) => b.ref === selectedRef) ?? promptable[0] ?? null;

  function sendPrompt() {
    if (!selected) return;
    setPayment(selected.ref, "Prompt sent");
    setSentTo({ customer: selected.customer, phone: selected.phone });
  }

  const settled = bookings
    .filter((b) => b.payment === "Paid" || b.payment === "Refunded")
    .slice(0, 4);

  return (
    <>
      <div className="stat-grid fleet-stats">
        <article className="stat-card">
          <p className="stat-label">Collected</p>
          <p className="stat-value">KES {fmtAmount(stats.collected)}</p>
          <p className="stat-note">paid via M-Pesa</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Outstanding</p>
          <p className="stat-value">KES {fmtAmount(stats.outstanding)}</p>
          <p className="stat-note">on live bookings</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Prompts awaiting</p>
          <p className="stat-value">{stats.prompts}</p>
          <p className="stat-note">STK pushes not yet paid</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Refunded</p>
          <p className="stat-value">KES {fmtAmount(stats.refunded)}</p>
          <p className="stat-note">from cancelled bookings</p>
        </article>
      </div>

      <div className="payments-grid">
        <section className="chart-card">
          <header className="card-head">
            <h2>Collections</h2>
            <p>KES '000 per week, last 8 weeks</p>
          </header>
          <CollectionsTrend />
        </section>

        <div className="payments-side">
          <section className="panel-card">
            <header className="card-head">
              <h2>Send payment prompt</h2>
              <p>Push an M-Pesa STK prompt to the customer's phone</p>
            </header>

            {promptable.length === 0 ? (
              <p className="prompt-empty">
                Nothing outstanding, every live booking is paid up.
              </p>
            ) : (
              <>
                <div className="field">
                  <label htmlFor="prompt-booking">Booking</label>
                  <select
                    id="prompt-booking"
                    value={selected.ref}
                    onChange={(e) => {
                      setSelectedRef(e.target.value);
                      setSentTo(null);
                    }}
                  >
                    {promptable.map((b) => (
                      <option key={b.ref} value={b.ref}>
                        {b.customer} · {b.ref}, KES {fmtAmount(bookingAmount(b))}
                      </option>
                    ))}
                  </select>
                </div>

                <dl className="prompt-meta">
                  <div>
                    <dt>Phone</dt>
                    <dd>{selected.phone}</dd>
                  </div>
                  <div>
                    <dt>Vehicle</dt>
                    <dd>
                      {selected.vehicle} · {selected.plate}
                    </dd>
                  </div>
                  <div>
                    <dt>Dates</dt>
                    <dd>{fmtRange(selected.pickup, selected.dropoff)}</dd>
                  </div>
                  <div>
                    <dt>Amount due</dt>
                    <dd className="prompt-amount">
                      KES {fmtAmount(bookingAmount(selected))}
                    </dd>
                  </div>
                </dl>

                <button type="button" className="btn prompt-send" onClick={sendPrompt}>
                  {selected.payment === "Prompt sent" ? "Resend prompt" : "Send prompt"}
                </button>

                {sentTo && (
                  <p className="prompt-sent-note" role="status">
                    STK push sent to {sentTo.customer} ({sentTo.phone}).
                  </p>
                )}
              </>
            )}
          </section>

          <section className="panel-card">
            <header className="card-head mini-payments-head">
              <div>
                <h2>Payments</h2>
                <p>Latest receipts</p>
              </div>
              <Link
                className="card-arrow"
                to="/dashboard/payments/all"
                aria-label="View all payments"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </header>

            <ul className="mini-list">
              {settled.map((b) => (
                <li key={b.ref}>
                  <div>
                    <p className="strong">{b.customer}</p>
                    <p className="cell-sub">{receiptFor(b.ref)}</p>
                  </div>
                  <div className="mini-pay-right">
                    <span className="mini-amount">
                      KES {fmtAmount(bookingAmount(b))}
                    </span>
                    <span className={`chip ${PAY_CHIP[b.payment]}`}>{b.payment}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
