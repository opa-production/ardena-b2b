/* Plans — what the business is on, what the other bands cost, what's included.
 *
 * One of the three Account pages split out of the old single billing screen.
 * The bands are read from pricingData.js, the same source the public /pricing
 * page uses, so the dashboard can never quote a price the marketing site
 * disagrees with. */
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import PageSkeleton from "./PageSkeleton";
import { fetchSubscription } from "../lib/api";
import { toast } from "./toastStore";
import usePageTitle from "../hooks/usePageTitle";
import { fmtAmount, fmtDate, STATUS_CHIP, statusLabel } from "./billingFormat";
import { TIERS, CHECK_PRICE } from "../pages/pricingData";
import "./overview.css";
import "./fleet.css";
import "./billing.css";

/* Which band a vehicle count falls in. The tiers carry their range as display
   copy ("1 – 25 vehicles"), so the numeric ceilings live here — kept in the
   same order as TIERS, with the last band open-ended. */
const BAND_CEILINGS = [25, 100, Infinity];

function bandFor(vehicleCount) {
  const i = BAND_CEILINGS.findIndex((ceiling) => vehicleCount <= ceiling);
  return TIERS[i === -1 ? TIERS.length - 1 : i];
}

export default function Plans() {
  usePageTitle("Plans");
  const { pathname } = useLocation();
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setSub(await fetchSubscription());
    } catch (err) {
      toast(err.message || "Failed to load your plan", "danger");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <PageSkeleton path={pathname} />;

  const vehicleCount = sub?.vehicle_count ?? 0;
  const current = bandFor(vehicleCount);
  const onTrial = sub?.status === "trial";

  return (
    <>
      <header className="head-card">
        <div className="head-titles">
          <h1>Plans</h1>
          <p>Your band, what it costs and what it includes</p>
        </div>
        {sub && (
          <span className={`chip ${STATUS_CHIP[sub.status] || "pending"}`}>
            {statusLabel(sub.status)}
          </span>
        )}
      </header>

      {/* ---- The plan you're on ---- */}
      {sub && (
        <section className="plan-current">
          <div className="plan-current-main">
            <p className="plan-current-eyebrow">Your plan</p>
            <h2 className="plan-current-name">{sub.plan || current?.name}</h2>
            <p className="plan-current-price">
              KES {fmtAmount(sub.monthly_total)}
              <span> / month</span>
            </p>
            <p className="plan-current-note">
              {vehicleCount} vehicle{vehicleCount === 1 ? "" : "s"} on plan
              {current ? ` · ${current.range}` : ""}
            </p>
          </div>

          <dl className="plan-current-facts">
            <div>
              <dt>{onTrial ? "Trial ends" : "Next bill"}</dt>
              <dd>{fmtDate(onTrial ? sub.trial_ends : sub.next_billing_date)}</dd>
            </div>
            <div>
              <dt>Launch rate until</dt>
              <dd>{fmtDate(sub.launch_rate_until)}</dd>
            </div>
            <div>
              <dt>Renter checks</dt>
              <dd>KES {fmtAmount(CHECK_PRICE)} each, prepaid</dd>
            </div>
          </dl>
        </section>
      )}

      {/* ---- Every band ---- */}
      <section className="panel-card">
        <header className="card-head">
          <h2>Bands</h2>
          <p>
            One flat price per band, every module included on all of them. Move band
            automatically as your fleet grows.
          </p>
        </header>

        <div className="plan-grid">
          {TIERS.map((tier) => {
            const isCurrent = current?.key === tier.key;
            return (
              <article
                className={`plan-card${isCurrent ? " is-current" : ""}`}
                key={tier.key}
                aria-current={isCurrent ? "true" : undefined}
              >
                <header className="plan-card-head">
                  <h3>{tier.name}</h3>
                  {isCurrent && <span className="plan-badge">Current</span>}
                </header>
                <p className="plan-card-price">
                  KES {fmtAmount(tier.monthly)}
                  <span> / month</span>
                </p>
                <p className="plan-card-range">{tier.range}</p>

                <ul className="plan-card-list">
                  {tier.features.map((f) => (
                    <li key={f}>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      {f}
                    </li>
                  ))}
                  {(tier.muted || []).map((f) => (
                    <li className="is-muted" key={f}>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        <p className="side-hint">
          Bands follow your fleet size, so there's nothing to switch by hand — add or
          retire vehicles in <Link to="/dashboard/fleet">Fleet</Link> and the next
          invoice reflects it. Need something outside these bands?{" "}
          <Link to="/dashboard/support">Talk to us</Link>.
        </p>
      </section>

      <p className="side-hint plan-foot">
        Every module is included on every band — nothing is held back for a higher
        tier. Renter verification is the one thing priced separately: KES{" "}
        {fmtAmount(CHECK_PRICE)} per check, billed from your wallet rather than your
        plan — see <Link to="/dashboard/usage">Usage</Link>.
      </p>
    </>
  );
}
