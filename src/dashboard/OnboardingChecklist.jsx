import { useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import {
  subscribe,
  getOnboarding,
  dismissOnboarding,
} from "./onboardingStore";
import { subscribe as subscribeFleet, getVehicles } from "./fleetStore";
import { subscribe as subscribeBookings, getBookings } from "./bookingsStore";
import { subscribe as subscribeBusiness, getBusiness } from "./businessStore";
import "./onboarding.css";

const STEPS = [
  {
    key: "vehicle",
    title: "Add your fleet",
    desc: "Register a vehicle to make it bookable.",
    to: "/dashboard/fleet/new",
  },
  {
    key: "booking",
    title: "Create a booking",
    desc: "Reserve a car for a customer.",
    to: "/dashboard/bookings/new",
  },
  {
    key: "prompt",
    title: "Collect a payment",
    desc: "Send an M-Pesa prompt from any booking.",
    to: "/dashboard/payments",
  },
  {
    key: "verify",
    title: "Verify a renter",
    desc: "Share the QR and run an ID check.",
    to: "/dashboard/verification",
  },
  {
    key: "team",
    title: "Invite your team",
    desc: "Give staff their own logins and roles.",
    to: "/dashboard/staff",
  },
];

export default function OnboardingChecklist() {
  const state = useSyncExternalStore(subscribe, getOnboarding);
  const vehicles = useSyncExternalStore(subscribeFleet, getVehicles);
  const bookings = useSyncExternalStore(subscribeBookings, getBookings);
  const business = useSyncExternalStore(subscribeBusiness, getBusiness);
  if (state.dismissed) return null;

  // fleet/booking steps track real data so the checklist is truthful in
  // both the demo and empty preview; the rest are flag-based
  const isStepDone = (key) => {
    if (key === "vehicle") return vehicles.length > 0;
    if (key === "booking") return bookings.length > 0;
    return state[key];
  };

  const done = STEPS.filter((s) => isStepDone(s.key)).length;
  if (done === STEPS.length) return null; // fully set up, nothing to nag about

  return (
    <section className="panel-card onboard-card">
      <div className="onboard-head">
        <div>
          <h2>Get set up</h2>
          <p>
            {done} of {STEPS.length} done · finish these and{" "}
            {business.name || "your business"} runs end to end on Ardena
          </p>
        </div>
        <div className="onboard-right">
          <span className="onboard-bar">
            <i style={{ width: `${(done / STEPS.length) * 100}%` }} />
          </span>
          <button
            type="button"
            className="onboard-dismiss"
            onClick={dismissOnboarding}
            aria-label="Hide setup guide"
            title="Hide setup guide"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <ol className="onboard-steps">
        {STEPS.map((s) => {
          const isDone = isStepDone(s.key);
          return (
            <li className={isDone ? "done" : ""} key={s.key}>
              <span className="onboard-check" aria-hidden="true">
                {isDone && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </span>
              <p className="onboard-title">{s.title}</p>
              <p className="onboard-desc">{s.desc}</p>
              {!isDone && (
                <Link className="onboard-go" to={s.to}>
                  Start
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
