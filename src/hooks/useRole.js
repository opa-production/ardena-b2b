// Who is allowed to do what.
//
// The backend enforces these server-side on every B2B endpoint, so this file is
// not the security boundary — it exists so a staff member never sees a button
// that answers 403. Keep it in step with `require_b2b_roles(...)` in the backend;
// if the two disagree, the backend wins and the user gets a confusing failure.
//
// Roles (b2b.md §8): Owner, Manager, Booking agent, Finance, Viewer.
import { useCallback, useSyncExternalStore } from "react";
import { subscribe, getSession } from "../lib/authStore";

// Capability → roles allowed. Named for what the user is trying to do rather
// than for the endpoint, so a page can ask the question it actually has.
export const PERMISSIONS = {
  // Money. Marketplace earnings, withdrawals and payout destinations.
  viewMoney: ["Owner", "Finance"],
  manageWithdrawals: ["Owner", "Finance"],

  // Renter-facing: the people who deal with customers, not the books.
  renterInbox: ["Owner", "Manager", "Booking agent"],
  rateRenter: ["Owner", "Manager", "Booking agent"],
  decideExtensions: ["Owner", "Manager", "Booking agent"],

  // Deposit claims sit between operations and finance.
  fileDepositClaim: ["Owner", "Manager", "Finance"],

  // Fleet and listing writes.
  manageFleet: ["Owner", "Manager"],
  manageListing: ["Owner", "Manager"],

  // Bookings. Creating and editing is open to agents; only the roles above
  // settle a deposit on a walk-in booking.
  manageBookings: ["Owner", "Manager", "Booking agent"],
  settleDeposit: ["Owner", "Manager", "Finance"],

  // Identity checks: everyone operational, since any of them may be standing
  // in front of a customer. Topping up the wallet that pays for them is not.
  runVerification: ["Owner", "Manager", "Booking agent", "Finance"],
  manageWallet: ["Owner", "Manager", "Finance"],

  // Workspace-level. Linking pulls another account's vehicles and revenue in,
  // so it is the owner's decision alone.
  linkHostAccount: ["Owner"],
  manageStaff: ["Owner", "Manager"],
  manageSettings: ["Owner", "Manager"],
  manageBilling: ["Owner", "Manager", "Finance"],
};

function currentRole() {
  return getSession().user?.role || null;
}

export function roleCan(role, capability) {
  const allowed = PERMISSIONS[capability];
  if (!allowed) {
    // An unknown capability is a bug in the caller. Fail closed rather than
    // silently granting access to something nobody reviewed.
    if (import.meta.env.DEV) {
      console.warn(`[useRole] unknown capability "${capability}"`);
    }
    return false;
  }
  return Boolean(role) && allowed.includes(role);
}

/**
 * Current role plus a `can(capability)` check, re-rendering if the session changes.
 *
 *   const { role, can } = useRole();
 *   {can("viewMoney") && <EarningsTab />}
 */
export default function useRole() {
  const session = useSyncExternalStore(subscribe, getSession, getSession);
  const role = session.user?.role || null;
  // Stable across renders so callers can safely put `can` in a dependency array.
  const can = useCallback((capability) => roleCan(role, capability), [role]);
  return { role, isOwner: role === "Owner", can };
}

// For non-React callers (route guards, nav filtering) that just need the answer.
export function can(capability) {
  return roleCan(currentRole(), capability);
}
