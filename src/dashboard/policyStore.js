// Rental policy: security deposit and late-return penalty. Hydrated from
// GET /business/policy; used by agreements, check-in penalty math and the
// Settings page.

let policy = {
  deposit: 10000, // KES held per booking
  lateFeePerHour: 500, // KES charged for every hour past the return time
};

const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getPolicy() {
  return policy;
}

export function setPolicy(next) {
  policy = { ...policy, ...next };
  emit();
}

// Merge the GET /business/policy response (snake_case) into the store.
export function hydratePolicy(server) {
  if (!server || typeof server !== "object") return;
  const next = { ...policy };
  if (typeof server.deposit === "number") next.deposit = server.deposit;
  if (typeof server.late_fee_per_hour === "number") next.lateFeePerHour = server.late_fee_per_hour;
  policy = next;
  emit();
}

// Vehicles are due back by 10:00 on the return date.
export const RETURN_HOUR = 10;
