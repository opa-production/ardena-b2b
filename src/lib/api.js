// Ardena B2B API client. Auth, onboarding, business and fleet endpoints are
// live; the other modules keep local stores until their endpoints ship
// (docs/backend-api.md).
//
// The backend is FastAPI: errors come back as { detail: string } or
// { detail: [{ loc, msg }, ...] } for validation failures.
import { getSession, setSession, clearSession } from "./authStore";
import { resetBusiness } from "../dashboard/businessStore";
import { resetOnboarding } from "../dashboard/onboardingStore";
import { resetFleet } from "../dashboard/fleetStore";
import { resetVerification } from "../dashboard/verificationsStore";

// locally cached per-account state, wiped whenever the session changes hands
function resetLocalCaches() {
  resetBusiness();
  resetOnboarding();
  resetFleet();
  resetVerification();
}

const BASE =
  import.meta.env.VITE_API_BASE_URL || "https://api.ardena.xyz/api/v1/b2b";

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function messageFrom(data, status) {
  const detail = data?.detail;
  if (typeof detail === "string" && detail !== "Internal server error") {
    return detail;
  }
  if (Array.isArray(detail) && detail.length) {
    const d = detail[0];
    const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : null;
    return field ? `${field}: ${d.msg}` : d.msg;
  }
  if (status === 401) return "Your session has expired. Please sign in again.";
  return "Something went wrong. Please try again.";
}

// One refresh at a time; concurrent 401s all wait on the same attempt.
let refreshing = null;

function refreshSession() {
  if (!refreshing) {
    refreshing = (async () => {
      const { refreshToken } = getSession();
      if (!refreshToken) return false;
      try {
        const res = await fetch(`${BASE}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        setSession({
          token: data.access_token || data.token,
          refreshToken: data.refresh_token || refreshToken,
        });
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

async function request(path, { method = "GET", body, auth = true, headers: extra } = {}, retried = false) {
  const headers = { ...extra };
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  const { token } = getSession();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0, null);
  }

  if (res.status === 401 && auth) {
    if (!retried && (await refreshSession())) {
      return request(path, { method, body, auth, headers: extra }, true);
    }
    clearSession(); // bounces the app back to /login via RequireAuth
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(messageFrom(data, res.status), res.status, data);
  return data;
}

/* ---- Auth ---- */

export async function login(email, password) {
  const data = await request("/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
  resetLocalCaches(); // a fresh sign-in starts from this account's data only
  setSession({
    token: data.access_token || data.token,
    refreshToken: data.refresh_token || null,
    user: data.user || null,
    business: data.business || null,
  });
  return data;
}

// { business_name, contact_name, email, phone, fleet_size, town?, website? }
// fleet_size is one of: "3–10" | "11–30" | "31–100" | "100+"
export function requestAccess(payload) {
  return request("/auth/access-requests", { method: "POST", body: payload, auth: false });
}

// Emails a one-time code to the account's address
export function forgotPassword(email) {
  return request("/auth/forgot-password", { method: "POST", body: { email }, auth: false });
}

// Sets a new password using the emailed code. Also serves signed-in
// password changes until a dedicated change-password endpoint ships.
export function resetPassword({ email, otp, newPassword }) {
  return request("/auth/reset-password", {
    method: "POST",
    body: { email, otp, new_password: newPassword },
    auth: false,
  });
}

export async function logout() {
  const { refreshToken } = getSession();
  try {
    await request("/auth/logout", {
      method: "POST",
      body: refreshToken ? { refresh_token: refreshToken } : {},
    });
  } catch {
    /* the local session is cleared regardless */
  }
  clearSession();
  resetLocalCaches();
}

/* ---- Business profile & settings ---- */

export function fetchBusiness() {
  return request("/business");
}

export function updateBusiness(patch) {
  return request("/business", { method: "PATCH", body: patch });
}

// multipart upload; returns { logo_url }
export function uploadBusinessLogo(file) {
  const form = new FormData();
  form.append("file", file);
  return request("/business/logo", { method: "POST", body: form });
}

export function fetchPolicy() {
  return request("/business/policy");
}

export function updatePolicy(patch) {
  return request("/business/policy", { method: "PATCH", body: patch });
}

// public trust page ("Ardena Verified"); 404s for unknown slugs
export function fetchTrust(slug) {
  return request(`/trust/${encodeURIComponent(slug)}`, { auth: false });
}

/* ---- Fleet ---- */

// List vehicles; params: { status, cat, search, page, per_page }
export function fetchVehicles(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== "")
  ).toString();
  return request(`/vehicles${qs ? `?${qs}` : ""}`);
}

export function createVehicle(payload) {
  return request("/vehicles", { method: "POST", body: payload });
}

export function fetchVehicle(plate) {
  return request(`/vehicles/${encodeURIComponent(plate)}`);
}

export function updateVehicle(plate, patch) {
  return request(`/vehicles/${encodeURIComponent(plate)}`, {
    method: "PATCH",
    body: patch,
  });
}

// 409s if the vehicle has an active booking — surface the message to the user
export function deleteVehicle(plate) {
  return request(`/vehicles/${encodeURIComponent(plate)}`, { method: "DELETE" });
}

// Booked date ranges for the availability calendar
export function fetchVehicleAvailability(plate, from, to) {
  const qs = new URLSearchParams({ from, to }).toString();
  return request(`/vehicles/${encodeURIComponent(plate)}/availability?${qs}`);
}

/* ---- Me & onboarding ---- */

export async function fetchMe() {
  const data = await request("/me");
  const user = data?.user || data;
  const business = data?.business || user?.business || null;
  setSession({ user, business });
  return { user, business };
}

export function fetchOnboarding() {
  return request("/onboarding");
}

/* ---- Identity verification (KYC) ---- */

// { type: "national_id" | "drivers_licence" | "kra_pin", number, client_id?,
// booking_ref? } -> { id, status, entity, charged, wallet_balance, date }.
// Debits the wallet, so it takes an idempotency key.
export function verificationLookup(payload, idempotencyKey) {
  return request("/verification/lookup", {
    method: "POST",
    body: payload,
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
  });
}

// History, numbers masked server-side. params: { page, per_page }
export function fetchLookups(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== "")
  ).toString();
  return request(`/verification/lookups${qs ? `?${qs}` : ""}`);
}

export function fetchWallet() {
  return request("/verification/wallet");
}

// { amount, method: "mpesa" | "card", phone? } -> payment init
// (STK push or Paystack checkout URL). Money-moving: idempotency key.
export function topupWallet(payload, idempotencyKey) {
  return request("/verification/wallet/topup", {
    method: "POST",
    body: payload,
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
  });
}

// Poll a top-up's status after returning from checkout / an STK prompt
export function verifyTopup(reference) {
  return request("/verification/wallet/topup/verify", {
    method: "POST",
    body: { reference },
  });
}

// Top-ups and per-check debits. params: { page, per_page }
export function fetchWalletTransactions(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== "")
  ).toString();
  return request(`/verification/wallet/transactions${qs ? `?${qs}` : ""}`);
}

/* ---- Bookings (§4) ---- */

// params: { status, payment, from, to, plate, client_id, page, per_page }
export function fetchBookings(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== "")
  ).toString();
  return request(`/bookings${qs ? `?${qs}` : ""}`);
}

// { customer, phone, plate, pickup, dropoff, location, notes?, deposit_amount?, client_id? }
export function createBooking(payload) {
  return request("/bookings", { method: "POST", body: payload });
}

export function fetchBooking(ref) {
  return request(`/bookings/${encodeURIComponent(ref)}`);
}

// { pickup?, dropoff?, location?, notes? }
export function updateBooking(ref, patch) {
  return request(`/bookings/${encodeURIComponent(ref)}`, { method: "PATCH", body: patch });
}

// { status }
export function setBookingStatus(ref, bookingStatus) {
  return request(`/bookings/${encodeURIComponent(ref)}/status`, {
    method: "POST",
    body: { status: bookingStatus },
  });
}

// { odometer, fuel, notes? }
export function recordHandoverOut(ref, payload) {
  return request(`/bookings/${encodeURIComponent(ref)}/handover/out`, {
    method: "POST",
    body: payload,
  });
}

// { odometer, fuel, notes?, return_date?, return_time? }
export function recordHandoverIn(ref, payload) {
  return request(`/bookings/${encodeURIComponent(ref)}/handover/in`, {
    method: "POST",
    body: payload,
  });
}

// { action: "refund" | "forfeit" }
export function bookingDepositAction(ref, action) {
  return request(`/bookings/${encodeURIComponent(ref)}/deposit`, {
    method: "POST",
    body: { action },
  });
}

export function sendPaymentPrompt(ref) {
  return request(`/bookings/${encodeURIComponent(ref)}/payment-prompt`, { method: "POST" });
}

export function fetchBookingAgreement(ref) {
  return request(`/bookings/${encodeURIComponent(ref)}/agreement`);
}

/* ---- Clients (§5) ---- */

// params: { search, verification, page, per_page }
export function fetchClients(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== "")
  ).toString();
  return request(`/clients${qs ? `?${qs}` : ""}`);
}

// { name, phone, email?, id_type?, notes? }
export function createClient(payload) {
  return request("/clients", { method: "POST", body: payload });
}

export function fetchClient(id) {
  return request(`/clients/${id}`);
}

// { name?, phone?, email?, id_type?, notes? }
export function updateClient(id, patch) {
  return request(`/clients/${id}`, { method: "PATCH", body: patch });
}

export function deleteClient(id) {
  return request(`/clients/${id}`, { method: "DELETE" });
}

/* ---- Payments (§7) ---- */

// params: { type, page, per_page }
export function fetchPayments(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== "")
  ).toString();
  return request(`/payments${qs ? `?${qs}` : ""}`);
}

export function fetchPaymentsSummary() {
  return request("/payments/summary");
}

// { reason? }
export function refundPayment(paymentId, payload = {}) {
  return request(`/payments/${paymentId}/refund`, { method: "POST", body: payload });
}

// overrides bookings version — now returns { checkout_url, paystack_reference, payment_status }
export function sendPaymentLink(ref, idempotencyKey) {
  return request(`/bookings/${encodeURIComponent(ref)}/payment-prompt`, {
    method: "POST",
    headers: idempotencyKey ? { "Idempotency-Key": idempotencyKey } : undefined,
  });
}

/* ---- Staff & roles (§8) ---- */

// Returns { members, invites, active_count, pending_count }
export function fetchStaff() {
  return request("/staff");
}

// { name, email, role } → { message, email, role }
export function inviteStaff(payload) {
  return request("/staff/invites", { method: "POST", body: payload });
}

export function resendInvite(inviteId) {
  return request(`/staff/invites/${inviteId}/resend`, { method: "POST" });
}

export function deleteInvite(inviteId) {
  return request(`/staff/invites/${inviteId}`, { method: "DELETE" });
}

// 🌐 Public — { token, password } → { message, email }
export function acceptInvite(payload) {
  return request("/staff/invites/accept", { method: "POST", body: payload, auth: false });
}

// { role }
export function changeStaffRole(memberId, role) {
  return request(`/staff/${memberId}`, { method: "PATCH", body: { role } });
}

export function removeStaffMember(memberId) {
  return request(`/staff/${memberId}`, { method: "DELETE" });
}

// params: { page, per_page }
export function fetchActivityLog(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== "")
  ).toString();
  return request(`/activity-log${qs ? `?${qs}` : ""}`);
}

/* ---- Notifications (§9) ---- */

// params: { unread, page, per_page } → { data, total, page, per_page, unread_count }
export function fetchNotifications(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== "")
  ).toString();
  return request(`/notifications${qs ? `?${qs}` : ""}`);
}

// Lightweight badge poll → { unread_count }
export function fetchUnreadCount() {
  return request("/notifications/unread-count");
}

export function markNotificationRead(id) {
  return request(`/notifications/${id}/read`, { method: "POST" });
}

export function markAllNotificationsRead() {
  return request("/notifications/read-all", { method: "POST" });
}

/* ---- Billing (§10) ---- */

// { plan, vehicle_count, rate, launch_rate_until, monthly_total, trial_ends, status }
export function fetchSubscription() {
  return request("/billing/subscription");
}

// { data: [{ ref, title, detail, amount, status, due_date, paid_at, checkout_url }], has_due }
export function fetchInvoices() {
  return request("/billing/invoices");
}

// → { checkout_url, reference }
export function payInvoice(ref) {
  return request(`/billing/invoices/${encodeURIComponent(ref)}/pay`, { method: "POST" });
}

// { items, total, checks_used, wallet_balance, check_price }
export function fetchBillingUsage() {
  return request("/billing/usage");
}

/* ---- Support (§12) ---- */

// { messages: [{ id, from, text, read, sender_name, at }], unread_count }
export function fetchSupportThread() {
  return request("/support/messages");
}

// { text } → the new message item
export function sendSupportMessage(text) {
  return request("/support/messages", { method: "POST", body: { text } });
}

// Mark all support replies as read
export function markSupportRead() {
  return request("/support/messages/read", { method: "POST" });
}

// Lightweight badge poll → { unread_count }
export function fetchSupportUnread() {
  return request("/support/messages/unread-count");
}

/* ---- Overview & reports (§11) ---- */

// period: "30d" (default) | "90d"
export function fetchOverview(period = "30d") {
  return request(`/dashboard/overview?period=${period}`);
}

// Fetches CSV as a Blob and triggers browser download.
// type: "bookings" | "payments" | "clients"
export async function exportReport({ type, from, to } = {}) {
  const params = new URLSearchParams({ type });
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  const { token } = getSession();
  const res = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || "https://api.ardena.xyz/api/v1/b2b"}/reports/export?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.detail || "Export failed");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1]
    || `${type}-export.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
