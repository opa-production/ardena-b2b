// Plan store: the workspace's plan, limits and current Fleet quote
// (GET /billing/plan). DashboardLayout loads it with the rest of the session
// so the screens that gate on it, the Add vehicle button first of all, have
// an answer by the time anyone clicks, and it is kept for a few minutes
// rather than asked for again on every page.
import { fetchPlan } from "../lib/api";

/* How long a loaded plan is shown without asking again. The plan itself
   changes a handful of times a year; what moves inside it is the wallet
   balance and the quote, and the places that spend against those refresh it
   themselves (see `force`). */
const PLAN_TTL = 5 * 60_000;

let plan = null;
let loadedAt = 0;

const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getPlan() {
  return plan;
}

// A plan the server just handed back (an upgrade, a renewal toggle).
export function setPlan(next) {
  plan = next;
  loadedAt = Date.now();
  emit();
}

// One fetch at a time; every caller waits on the same request.
let hydrating = null;

// Resolves with the plan. A fresh one is returned as is; `force` asks again
// regardless, for the moments the figures have to be current.
export function hydratePlan({ force = false } = {}) {
  if (!force && plan && Date.now() - loadedAt < PLAN_TTL) return Promise.resolve(plan);
  if (!hydrating) {
    hydrating = fetchPlan()
      .then((data) => {
        setPlan(data);
        return data;
      })
      .finally(() => {
        hydrating = null;
      });
  }
  return hydrating;
}

// The quote counts cars, so a car added or removed makes the next read ask
// again. What is on screen stays until then.
export function invalidatePlan() {
  loadedAt = 0;
}

// Wipe it when the session changes hands (login/logout).
export function resetPlan() {
  plan = null;
  loadedAt = 0;
  emit();
}

// Out of cars: Starter at its free limit, or a paid plan with every car it
// paid for (`paid_cars`) already in the fleet. A car past that can't take
// bookings, so adding one starts with paying for it.
export function atCarLimit(p, carCount) {
  if (!p || !(p.car_limit > 0) || carCount < p.car_limit) return false;
  return p.plan === "starter" || p.paid_cars != null;
}
