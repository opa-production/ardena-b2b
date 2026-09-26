import { useState } from "react";
import { Link } from "react-router-dom";
import { fmtRange, rentalDays, STATUS_CHIP } from "./bookingsStore";
import useRole from "../hooks/useRole";
import { REVIEW_REQUESTS } from "../lib/features";
import RequestReviewDialog from "./RequestReviewDialog";

const fmtAmount = (n) => n.toLocaleString("en-KE");

/* Ask-for-a-rating, offered on a booking that finished. A star rather than a
   word: it sits in a row of actions that has room for one control, and the
   label rides in the title and aria-label where it can be read in full. */
const StarIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3.6l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.8l5.9-.9z" />
  </svg>
);

/* The bookings table, shared by the Bookings overview (latest five) and the
   All bookings page (everything, filtered). `numberOf` maps a ref to its
   running number so a row keeps the same number on both pages. */
export default function BookingsTable({ rows, numberOf }) {
  const { can } = useRole();
  // Bookings already asked this session. The backend is the real guard against
  // asking twice (3 days apart, 3 at most); this is so the button doesn't
  // invite a second click.
  const [asked, setAsked] = useState(() => new Set());
  const [asking, setAsking] = useState(null);

  /* Asking a client to rate their rental opens the review dialog on that
     booking. It used to send straight from the row, but the SMS now costs the
     business from its wallet, so the message and the price are shown first. */
  const canAsk = (b) =>
    REVIEW_REQUESTS && can("sendMarketing") && b.status === "Completed" && b.source !== "marketplace";

  return (
    <>
      <table className="data-table">
        <thead>
          <tr>
            <th>Customer</th>
            <th>Vehicle</th>
            <th>Dates</th>
            <th className="num rate-col">Amount</th>
            <th>Status</th>
            <th className="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => {
            const days = rentalDays(b.pickup, b.dropoff);
            const askLabel = asked.has(b.ref)
              ? `${b.customer} has been asked to rate this rental`
              : `Ask ${b.customer} to rate this rental`;
            return (
              <tr key={b.ref}>
                <td>
                  <div className="row-name">
                    <span className="row-no">{numberOf?.get(b.ref)}</span>
                    <span className="strong">{b.customer}</span>
                  </div>
                </td>
                <td>
                  <p className="strong">{b.vehicle}</p>
                  <p className="cell-sub">{b.plate}</p>
                </td>
                <td>
                  <p>{fmtRange(b.pickup, b.dropoff)}</p>
                  <p className="cell-sub">
                    {days} day{days > 1 ? "s" : ""}
                  </p>
                </td>
                <td className="num rate-col">{fmtAmount(days * b.rate)}</td>
                <td>
                  <span className={`chip ${STATUS_CHIP[b.status]}`}>{b.status}</span>
                </td>
                <td className="actions-cell">
                  {/* A finished rental is the moment to ask — the client still
                      has the vehicle in mind, and this is the row that knows
                      which vehicle it was. */}
                  {canAsk(b) && (
                    <button
                      type="button"
                      className={"icon-btn icon-only" + (asked.has(b.ref) ? " is-done" : "")}
                      disabled={asked.has(b.ref)}
                      title={askLabel}
                      aria-label={askLabel}
                      onClick={() => setAsking(b.ref)}
                    >
                      <StarIcon />
                    </button>
                  )}
                  <Link className="icon-btn" to={`/dashboard/bookings/${encodeURIComponent(b.ref)}`}>
                    View
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {asking && (
        <RequestReviewDialog
          bookingRef={asking}
          onClose={() => setAsking(null)}
          onSent={(ref) => setAsked((prev) => new Set(prev).add(ref))}
        />
      )}
    </>
  );
}
