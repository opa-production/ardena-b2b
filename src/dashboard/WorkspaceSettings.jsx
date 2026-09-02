/* Settings — the things you configure once and then leave alone.
 *
 * Split out of the profile page, which was eight cards deep and mixed "who
 * this business is" with "how it is set up". Identity stayed there; the rental
 * policy, the plan figure and the tenant block moved here, behind the gear in
 * the profile header.
 *
 * Notification preferences are not here: they belong beside the feed they
 * shape, so they live behind the gear on the Notifications page instead. */
import { useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { subscribe as subscribeFleet, getVehicles } from "./fleetStore";
import { subscribe as subscribePolicy, getPolicy, setPolicy, RETURN_HOUR } from "./policyStore";
import { subscribe as subscribeBusiness, getBusiness } from "./businessStore";
import { updatePolicy } from "../lib/api";
import { CHECK_PRICE, FREE_MONTHS, fmtKES } from "../pages/pricingData";
import { toast } from "./toastStore";
import usePageTitle from "../hooks/usePageTitle";
import "./fleet.css";
import "./bookings.css";
import "./workspace.css";

export default function WorkspaceSettings() {
  usePageTitle("Settings");
  const vehicles = useSyncExternalStore(subscribeFleet, getVehicles);
  const policy = useSyncExternalStore(subscribePolicy, getPolicy);
  const business = useSyncExternalStore(subscribeBusiness, getBusiness);
  const [savingPolicy, setSavingPolicy] = useState(false);

  async function handlePolicySave(e) {
    e.preventDefault();
    if (savingPolicy) return;
    const f = new FormData(e.currentTarget);
    const deposit = Number(f.get("deposit"));
    const lateFeePerHour = Number(f.get("lateFee"));
    setSavingPolicy(true);
    try {
      await updatePolicy({ deposit, late_fee_per_hour: lateFeePerHour });
      setPolicy({ deposit, lateFeePerHour });
      toast("Rental policy saved.");
    } catch (err) {
      toast(err.message, "danger");
    } finally {
      setSavingPolicy(false);
    }
  }

  return (
    <>
      <Link to="/dashboard/settings" className="page-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Profile
      </Link>

      <h1 className="sr-only">Settings</h1>

      <div className="details-grid settings-grid">
        <div className="settings-main">
          <section className="panel-card">
            <header className="card-head">
              <h2>Rental policy</h2>
              <p>Applied to agreements, deposits and late returns</p>
            </header>
            {/* keyed so the inputs refresh once the policy hydrates from the API */}
            <form onSubmit={handlePolicySave} key={`${policy.deposit}-${policy.lateFeePerHour}`}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="pol-deposit">Security deposit (KES)</label>
                  <input
                    id="pol-deposit"
                    name="deposit"
                    type="number"
                    min="0"
                    step="500"
                    defaultValue={policy.deposit}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="pol-late">Late return penalty (KES per hour)</label>
                  <input
                    id="pol-late"
                    name="lateFee"
                    type="number"
                    min="0"
                    step="50"
                    defaultValue={policy.lateFeePerHour}
                    required
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={savingPolicy}>
                  {savingPolicy ? "Saving…" : "Save policy"}
                </button>
              </div>
            </form>
            <p className="side-hint">
              Vehicles are due back by {RETURN_HOUR}:00 AM on the return date.
              Every started hour after that is charged at the hourly penalty,
              and both figures are written into every rental agreement.
            </p>
          </section>
        </div>

        <div className="details-side">
          {/* No subscription figure here on purpose — there isn't one yet.
              See the launch-phase note in src/pages/pricingData.js. */}
          <section className="panel-card">
            <header className="card-head">
              <h2>Plan &amp; billing</h2>
              <p>Launch offer</p>
            </header>
            <p className="util-hero">
              Free
              <span className="util-per">for {FREE_MONTHS} months</span>
            </p>
            <p className="plan-price">
              {vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"} · every
              module included
            </p>
            <p className="side-hint">
              We&apos;ll announce pricing well before your free months end, and
              tell you first. Renter checks stay billed at KES{" "}
              {fmtKES(CHECK_PRICE)} each.
            </p>
            <Link to="/pricing" className="btn btn-ghost pay-btn">
              See what&apos;s included
            </Link>
          </section>

          <section className="panel-card">
            <header className="card-head">
              <h2>Workspace</h2>
              <p>Tenant details</p>
            </header>
            <div className="pay-row">
              <span>Tenant ID</span>
              <span className="mini-amount">{business.id ?? "—"}</span>
            </div>
            <div className="pay-row">
              <span>Region</span>
              <span className="mini-amount">{business.location || "Kenya"}</span>
            </div>
            <div className="pay-row">
              <span>Verified since</span>
              <span className="mini-amount">{business.verifiedSince || "—"}</span>
            </div>
            <p className="side-hint">
              Data export and workspace transfer arrive with the platform admin console.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
