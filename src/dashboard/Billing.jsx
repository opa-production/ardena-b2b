import { useSyncExternalStore } from "react";
import { subscribe as subscribeFleet, getVehicles } from "./fleetStore";
import { CHECK_PRICE, WALLET_BALANCE } from "./verificationsStore";
import "./fleet.css";
import "./bookings.css";
import "./workspace.css";
import "./billing.css";

// Swap these slugs for the live Paystack payment links
const PAYSTACK = {
  payInvoice: "https://paystack.com/pay/ardena-fleet-monthly",
  topUpWallet: "https://paystack.com/pay/ardena-check-topup",
  updateCard: "https://paystack.com/pay/ardena-update-card",
};

// Per-vehicle pricing (mock, real numbers come with the billing engine)
const PLAN = {
  rate: 400, // KES / vehicle / month, standard
  launchRate: 200, // first 3 months
  launchMonthsLeft: 1,
  minimum: 2000, // KES / month floor
};

const CHECKS_USED = 5; // this cycle, from the verification log

const INVOICES = [
  { ref: "INV-2026-007", detail: "July · 12 vehicles × KES 200", issued: "1 Jul 2026", amount: 2400, status: "Due" },
  { ref: "TOP-2026-043", detail: "Verification top-up · 15 checks", issued: "28 Jun 2026", amount: 1500, status: "Paid" },
  { ref: "INV-2026-006", detail: "June · 12 vehicles × KES 200", issued: "1 Jun 2026", amount: 2400, status: "Paid" },
  { ref: "INV-2026-005", detail: "May · 11 vehicles × KES 200", issued: "1 May 2026", amount: 2200, status: "Paid" },
  { ref: "INV-2026-004", detail: "April · monthly minimum", issued: "1 Apr 2026", amount: 2000, status: "Paid" },
];

const fmtAmount = (n) => n.toLocaleString("en-KE");

export default function Billing() {
  const vehicles = useSyncExternalStore(subscribeFleet, getVehicles);

  const monthly = Math.max(PLAN.minimum, vehicles.length * PLAN.launchRate);
  const standardMonthly = Math.max(PLAN.minimum, vehicles.length * PLAN.rate);
  const due = INVOICES.find((i) => i.status === "Due");

  const usage = [
    { label: `Vehicles on plan × KES ${PLAN.launchRate}`, value: vehicles.length, amount: `KES ${fmtAmount(monthly)}` },
    { label: "Renter checks used", value: CHECKS_USED, amount: `KES ${fmtAmount(CHECKS_USED * CHECK_PRICE)} from wallet` },
    { label: "M-Pesa prompts sent", value: 112, amount: "Included" },
    { label: "Staff seats", value: 6, amount: "Included" },
  ];

  return (
    <>
      <div className="stat-grid fleet-stats">
        <article className="stat-card">
          <p className="stat-label">Rate per vehicle</p>
          <p className="stat-value">KES {PLAN.launchRate}</p>
          <p className="stat-note">
            launch price · {PLAN.launchMonthsLeft} month left, then KES {PLAN.rate}
          </p>
        </article>
        <article className="stat-card">
          <p className="stat-label">This month</p>
          <p className="stat-value">KES {fmtAmount(monthly)}</p>
          <p className="stat-note">
            {vehicles.length} vehicles · due 15 Jul 2026
          </p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Check wallet</p>
          <p className="stat-value">KES {fmtAmount(WALLET_BALANCE)}</p>
          <p className="stat-note">
            ≈ {Math.floor(WALLET_BALANCE / CHECK_PRICE)} renter checks left
          </p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Next renewal</p>
          <p className="stat-value">1 Aug</p>
          <p className="stat-note">2026 · billed monthly</p>
        </article>
      </div>

      <div className="details-grid">
        <div className="settings-main">
          <section className="panel-card">
            <header className="card-head">
              <h2>Usage this cycle</h2>
              <p>1 – 31 July 2026 · what July's bill is made of</p>
            </header>
            {usage.map((u) => (
              <div className="pay-row" key={u.label}>
                <span>
                  {u.label} · <strong>{u.value}</strong>
                </span>
                <span className="mini-amount">{u.amount}</span>
              </div>
            ))}
            <p className="side-hint">
              Bookings, staff seats and M-Pesa prompts are unlimited on the
              Fleet plan. You only ever pay per vehicle, plus KES {CHECK_PRICE}{" "}
              per renter check.
            </p>
          </section>

          <section className="panel-card">
            <header className="card-head">
              <h2>Invoices &amp; top-ups</h2>
              <p>Your billing history on Ardena</p>
            </header>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Issued</th>
                  <th className="num">Amount (KES)</th>
                  <th>Status</th>
                  <th className="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {INVOICES.map((inv) => (
                  <tr key={inv.ref}>
                    <td>
                      <p className="strong">{inv.ref}</p>
                      <p className="cell-sub">{inv.detail}</p>
                    </td>
                    <td>{inv.issued}</td>
                    <td className="num">{fmtAmount(inv.amount)}</td>
                    <td>
                      <span className={`chip ${inv.status === "Paid" ? "active" : "pending"}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="actions-cell">
                      {inv.status === "Due" ? (
                        <a
                          className="icon-btn prompt-green"
                          href={PAYSTACK.payInvoice}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Pay now
                        </a>
                      ) : (
                        <button type="button" className="icon-btn" disabled title="PDF receipts arrive with the billing engine">
                          Receipt
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <div className="details-side">
          <section className="panel-card">
            <header className="card-head">
              <h2>Pay with card</h2>
              <p>Settle the July invoice</p>
            </header>
            <p className="util-hero">KES {fmtAmount(due ? due.amount : 0)}</p>
            <p className="invoice-sub">{due ? `${due.ref} · due 15 Jul 2026` : "Nothing due right now"}</p>
            <a
              className="btn btn-primary pay-btn"
              href={PAYSTACK.payInvoice}
              target="_blank"
              rel="noreferrer"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
              </svg>
              Pay with card
            </a>
            <p className="paystack-note">
              You'll be redirected to Paystack's secure checkout. Visa,
              Mastercard and Verve accepted. M-Pesa billing is coming soon.
            </p>
          </section>

          <section className="panel-card">
            <header className="card-head">
              <h2>Check wallet</h2>
              <p>Prepaid renter verifications</p>
            </header>
            <p className="util-hero">KES {fmtAmount(WALLET_BALANCE)}</p>
            <p className="invoice-sub">
              ≈ {Math.floor(WALLET_BALANCE / CHECK_PRICE)} checks at KES {CHECK_PRICE} each
            </p>
            <a
              className="btn btn-ghost pay-btn"
              href={PAYSTACK.topUpWallet}
              target="_blank"
              rel="noreferrer"
            >
              Top up wallet
            </a>
            <p className="paystack-note">
              Top up like airtime, via M-Pesa or card. Credits never expire,
              and every check (ID + selfie + licence) draws KES {CHECK_PRICE}.
            </p>
          </section>

          <section className="panel-card">
            <header className="card-head">
              <h2>Billing details</h2>
              <p>Card and plan on file</p>
            </header>
            <div className="pay-row">
              <span>Plan</span>
              <span className="mini-amount">Fleet · per vehicle</span>
            </div>
            <div className="pay-row">
              <span>Card</span>
              <span className="mini-amount">Visa •••• 4081</span>
            </div>
            <div className="pay-row">
              <span>Billing email</span>
              <span className="mini-amount">hello@acmecarhire.co.ke</span>
            </div>
            <div className="action-stack">
              <a className="btn btn-ghost" href={PAYSTACK.updateCard} target="_blank" rel="noreferrer">
                Update card
              </a>
            </div>
            <p className="side-hint">
              Your launch price of KES {PLAN.launchRate}/vehicle ends 1 Sep
              2026. From then it's KES {PLAN.rate}/vehicle (KES{" "}
              {fmtAmount(standardMonthly)}/month at your current fleet size).
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
