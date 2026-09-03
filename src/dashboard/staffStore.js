// In-memory staff store, same pattern as the other stores. Seats are
// unlimited on the Fleet plan. The signed-in user is the Owner row; invites
// stay local until the staff API ships (docs/backend-api.md §8).
import { markStep } from "./onboardingStore";
import { subscribe as subscribeAuth, getSession } from "../lib/authStore";

export const ROLES = ["Manager", "Booking agent", "Finance", "Viewer"];

export const ROLE_NOTES = [
  { role: "Owner", note: "Full access, including billing and staff." },
  { role: "Manager", note: "Everything except billing and workspace deletion." },
  { role: "Booking agent", note: "Creates and manages bookings and clients." },
  { role: "Finance", note: "Payments, refunds and payout reports." },
  { role: "Viewer", note: "Read-only across all modules." },
];

let staff = [];

let nextId = 1;

const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// the signed-in user heads the list as Owner
let ownerRow = null;

function ownerFromSession() {
  const { user } = getSession();
  if (!user) return null;
  const name = user.name || user.full_name || user.contact_name || user.email || "Owner";
  if (!ownerRow || ownerRow.name !== name || ownerRow.email !== (user.email || "")) {
    ownerRow = {
      id: "ST-OWNER",
      name,
      email: user.email || "",
      role: "Owner",
      status: "Active",
      lastActive: "Now",
    };
  }
  return ownerRow;
}

let snapshot = staff;

function rebuild() {
  const owner = ownerFromSession();
  snapshot = owner ? [owner, ...staff] : staff;
}

rebuild();
subscribeAuth(() => {
  rebuild();
  emit();
});

export function getStaff() {
  return snapshot;
}

export function findByEmail(email) {
  const e = email.trim().toLowerCase();
  return snapshot.find((s) => s.email.toLowerCase() === e);
}

export function inviteStaff({ name, email, role }) {
  staff = [
    ...staff,
    {
      id: `ST-${String(nextId++).padStart(2, "0")}`,
      name,
      email,
      role,
      status: "Invited",
      lastActive: "-",
    },
  ];
  rebuild();
  markStep("team");
  emit();
}

export function removeStaff(id) {
  staff = staff.filter((s) => s.id !== id);
  rebuild();
  emit();
}
