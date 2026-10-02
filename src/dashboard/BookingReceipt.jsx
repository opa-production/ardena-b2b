import { useEffect } from "react";
import { createPortal } from "react-dom";
import { getBusiness } from "./businessStore";
import { getSession } from "../lib/authStore";
import { fmtDate, rentalDays } from "./bookingsStore";
import { RETURN_HOUR } from "./policyStore";
import "./receipt.css";

const fmtAmount = (n) => Number(n || 0).toLocaleString("en-KE");

const fmtStamp = (iso) =>
  new Date(iso).toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const METHOD_LABEL = { cash: "Cash", mpesa: "M-Pesa", airtel: "Airtel Money", card: "Card" };

/**
 * The customer's receipt for a paid booking, sent to the printer.
 *
 * It is a sheet drawn outside the app (portalled to <body>) that only exists
 * on paper: hidden on screen, and while it is mounted the print stylesheet
 * hides everything else. Mounting it opens the print dialog; closing the
 * dialog calls `onDone`, which unmounts it.
 *
 * Printed by the browser rather than built as a PDF so it works on whatever
 * is plugged in at the counter, an A4 printer or a till roll, and so "Save as
 * PDF" is still there for anyone who wants the file.
 */
export default function BookingReceipt({ booking: b, depositAmount, penalty = 0, onDone }) {
  useEffect(() => {
    document.body.classList.add("printing-receipt");
    window.addEventListener("afterprint", onDone);
    // a beat for the sheet (and the logo) to be laid out before the dialog
    const t = setTimeout(() => window.print(), 120);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", onDone);
      document.body.classList.remove("printing-receipt");
    };
  }, [onDone]);

  const biz = getBusiness();
  const staff = getSession().user;
  const days = rentalDays(b.pickup, b.dropoff);
  const rental = days * b.rate;
  const paid = b.payment_amount ?? rental;
  const method = METHOD_LABEL[b.payment_method] || b.payment_method;

  return createPortal(
    <div className="receipt-sheet">
      <header className="rc-head">
        {biz.logo && <img className="rc-logo" src={biz.logo} alt="" />}
        <div>
          <h1>{biz.name || "Car rental"}</h1>
          <p>{[biz.location, biz.phone, biz.email].filter(Boolean).join(" · ")}</p>
        </div>
      </header>

      <div className="rc-title">
        <h2>Receipt</h2>
        <p>
          No. {b.ref}
          <br />
          {fmtStamp(b.paid_at || Date.now())}
        </p>
      </div>

      <section className="rc-block">
        <h3>Renter</h3>
        <dl>
          <div>
            <dt>Name</dt>
            <dd>{b.customer}</dd>
          </div>
          <div>
            <dt>Mobile</dt>
            <dd>{b.phone || "-"}</dd>
          </div>
          {b.id_number && (
            <div>
              <dt>ID / passport</dt>
              <dd>{b.id_number}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="rc-block">
        <h3>Rental</h3>
        <dl>
          <div>
            <dt>Vehicle</dt>
            <dd>
              {b.vehicle} · {b.plate}
            </dd>
          </div>
          <div>
            <dt>Pickup</dt>
            <dd>
              {fmtDate(b.pickup)}
              {b.location ? `, ${b.location}` : ""}
            </dd>
          </div>
          <div>
            <dt>Return</dt>
            <dd>
              {fmtDate(b.dropoff)}, by {RETURN_HOUR}:00 AM
            </dd>
          </div>
          {b.destination && (
            <div>
              <dt>Going to</dt>
              <dd>{b.destination}</dd>
            </div>
          )}
        </dl>
      </section>

      <table className="rc-lines">
        <tbody>
          <tr>
            <td>
              Rental, {days} day{days > 1 ? "s" : ""} × KES {fmtAmount(b.rate)}
            </td>
            <td>KES {fmtAmount(rental)}</td>
          </tr>
          {penalty > 0 && (
            <tr>
              <td>Late return penalty</td>
              <td>KES {fmtAmount(penalty)}</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td>Paid</td>
            <td>KES {fmtAmount(paid)}</td>
          </tr>
        </tfoot>
      </table>

      <dl className="rc-meta">
        {method && (
          <div>
            <dt>Paid by</dt>
            <dd>
              {method}
              {b.payment_receipt ? ` · ${b.payment_receipt}` : ""}
            </dd>
          </div>
        )}
        {depositAmount > 0 && (
          <div>
            <dt>Security deposit</dt>
            <dd>
              KES {fmtAmount(depositAmount)} · {b.deposit_status}, not included above
            </dd>
          </div>
        )}
        {staff?.name && (
          <div>
            <dt>Served by</dt>
            <dd>{staff.name}</dd>
          </div>
        )}
      </dl>

      <footer className="rc-foot">
        <p>Thank you for renting with {biz.name || "us"}.</p>
        <p className="rc-powered">Powered by Ardena</p>
      </footer>
    </div>,
    document.body
  );
}
