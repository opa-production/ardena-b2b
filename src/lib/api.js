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
import { resetChauffeurs } from "../dashboard/chauffeursStore";
import { resetTracking } from "../dashboard/trackingStore";

// locally cached per-account state, wiped whenever the session changes hands
function resetLocalCaches() {
  resetBusiness();
  resetOnboarding();
  resetFleet();
  resetVerification();
  resetChauffeurs();
  resetTracking();
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

/* ---- Runtime client config ---- */

// Public client config (e.g. Mapbox token sourced from the server environment).
export function fetchConfig() {
  return request("/config");
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

// Poll a top-up's status after returning from checkout / an STK prompt.
// Works for both M-Pesa (Paystack charge) and card (Paystack checkout).
export function checkTopupStatus(reference) {
  return request(`/verification/wallet/topup/check/${encodeURIComponent(reference)}`);
}

// Legacy card-only verify (Paystack redirect flow). Keep for direct use.
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


/* Record money taken outside Ardena — cash at the counter, or a bank transfer
   straight to the business. Nothing moves through us, so this is a bookkeeping
   entry, not a charge: it marks the booking paid and files the amount under
   cash so Finances can separate what we collected from what they did.
   { amount, note? } — the backend stamps who recorded it and when. */
export function markBookingPaidCash(ref, payload) {
  return request(`/bookings/${encodeURIComponent(ref)}/cash-payment`, {
    method: "POST",
    body: payload,
  });
}

export function fetchBookingAgreement(ref) {
  return request(`/bookings/${encodeURIComponent(ref)}/agreement`);
}

/* ---- Handover condition photos (§B) ---- */

// phase: "out" (check-out) | "in" (check-in). `files` is a list of File/Blob.
// Returns the phase's updated photo list ([{ id, url, at }]).
export function uploadHandoverPhotos(ref, phase, files) {
  const form = new FormData();
  for (const f of files) form.append("files", f);
  return request(`/bookings/${encodeURIComponent(ref)}/handover/${phase}/photos`, {
    method: "POST",
    body: form,
  });
}

export function deleteHandoverPhoto(ref, phase, photoId) {
  return request(
    `/bookings/${encodeURIComponent(ref)}/handover/${phase}/photos/${encodeURIComponent(photoId)}`,
    { method: "DELETE" }
  );
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
export function sendStkPush(ref, phone, provider) {
  return request(`/bookings/${encodeURIComponent(ref)}/payment-prompt`, {
    method: "POST",
    body: { phone, provider },
  });
}

// Poll Paystack directly for a pending charge status.
// Returns { charge_status: "pending"|"success"|"failed"|"timeout", booking_payment_status, message }
export function checkChargeStatus(paystackRef) {
  return request(`/payments/check/${encodeURIComponent(paystackRef)}`);
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

// { gated, status, vehicle_count, due_amount, fleet_cap }
export function fetchBillingGate() {
  return request("/billing/gate");
}

// { data: [{ ref, title, detail, amount, status, due_date, paid_at, checkout_url }], has_due }
export function fetchInvoices() {
  return request("/billing/invoices");
}

// → { success, paystack_reference, message }
export function payInvoiceMpesa(ref, { phone, provider = "mpesa" }) {
  return request(`/billing/invoices/${encodeURIComponent(ref)}/pay/mpesa`, {
    method: "POST",
    body: JSON.stringify({ phone, provider }),
  });
}

// → { charge_status, invoice_status, message }
export function checkInvoiceCharge(paystackRef) {
  return request(`/billing/invoices/check/${encodeURIComponent(paystackRef)}`);
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

/* ---- Workspace assistant (ai.md) ----
   Read-only, scoped to the caller's business, role-gated server-side. It can
   answer about the workspace and hand a thread to a person; it cannot change
   anything. */

/**
 * Ask the assistant something, streaming the reply.
 *
 * Server-sent events, but deliberately not `EventSource`: that API cannot set
 * an Authorization header, and this endpoint is bearer-authed. So it is a POST
 * read through a stream reader instead.
 *
 * Frames (ai.md §1): `meta` once at the start with the conversation id, `tool`
 * when a lookup begins, `token` per chunk of reply, `done` at the end. Errors
 * arrive as an `error` *frame*, not a status code — the response is already 200
 * by the time the model can fail, so a 503 (assistant offline) would otherwise
 * be invisible to a .catch().
 *
 * Returns a function that aborts the turn.
 */
export function streamAssistant({ message, conversationId, signal, on }) {
  const controller = new AbortController();
  if (signal) signal.addEventListener("abort", () => controller.abort());

  (async () => {
    const { token } = getSession();
    let res;
    try {
      res = await fetch(`${BASE}/assistant/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message,
          ...(conversationId ? { conversation_id: conversationId } : {}),
        }),
        signal: controller.signal,
      });
    } catch (err) {
      if (err.name !== "AbortError") {
        on.error?.({ detail: "Can't reach the assistant. Check your connection.", status: 0 });
      }
      return;
    }

    // A non-200 here is the request being rejected before the stream opens —
    // auth, or the 20/min rate limit — so it is still JSON.
    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => null);
      on.error?.({
        detail:
          res.status === 429
            ? "Too many questions at once. Give it a moment."
            : messageFrom(data, res.status),
        status: res.status,
      });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Frames are separated by a blank line. Anything after the last one is
        // a partial frame — leave it in the buffer for the next chunk.
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          let event = "message";
          const dataLines = [];
          for (const line of frame.split("\n")) {
            // `: ping` keep-alives, sent so proxies don't drop an idle turn.
            if (!line || line.startsWith(":")) continue;
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
          }
          if (!dataLines.length) continue;

          let payload;
          try {
            payload = JSON.parse(dataLines.join("\n"));
          } catch {
            continue; // a frame we can't read is not worth killing the turn for
          }
          on[event]?.(payload);
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        on.error?.({ detail: "The assistant stopped responding.", status: 0 });
      }
    }
  })();

  return () => controller.abort();
}

// { data, total } — chats are workspace-wide, so `started_by` may be a colleague
export function fetchAssistantConversations() {
  return request("/assistant/conversations");
}

export function fetchAssistantConversation(id) {
  return request(`/assistant/conversation/${id}`);
}

export function closeAssistantConversation(id) {
  return request(`/assistant/conversation/${id}/close`, { method: "POST" });
}

/* ---- Overview & reports (§11) ---- */

// period: "30d" (default) | "90d"
export function fetchOverview(period = "30d") {
  return request(`/dashboard/overview?period=${period}`);
}

// Fetches CSV as a Blob and triggers browser download.
// type: "bookings" | "payments" | "clients"
export async function exportReport({ type, from, to } = {}) {
  // Bypasses request() because it streams a file rather than JSON.
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

/* ---- Chauffeurs (§C) ---- */

// params: { status, search, page, per_page } → { data, total, page, per_page }
export function fetchChauffeurs(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== "")
  ).toString();
  return request(`/chauffeurs${qs ? `?${qs}` : ""}`);
}

// { name, phone, email?, id_no?, licence_no?, licence_expiry?, daily_rate?, status?, notes? }
export function createChauffeur(payload) {
  return request("/chauffeurs", { method: "POST", body: payload });
}

export function fetchChauffeur(id) {
  return request(`/chauffeurs/${encodeURIComponent(id)}`);
}

// contact / licence / daily_rate / notes — status changes via setChauffeurStatus
export function updateChauffeur(id, patch) {
  return request(`/chauffeurs/${encodeURIComponent(id)}`, { method: "PATCH", body: patch });
}

export function deleteChauffeur(id) {
  return request(`/chauffeurs/${encodeURIComponent(id)}`, { method: "DELETE" });
}

// { status: "Available" | "On trip" | "Off duty" }
export function setChauffeurStatus(id, chauffeurStatus) {
  return request(`/chauffeurs/${encodeURIComponent(id)}/status`, {
    method: "POST",
    body: { status: chauffeurStatus },
  });
}

// { booking_ref } → sets assignment, status ⇒ On trip. 409 if already on a trip.
export function assignChauffeur(id, bookingRef) {
  return request(`/chauffeurs/${encodeURIComponent(id)}/assign`, {
    method: "POST",
    body: { booking_ref: bookingRef },
  });
}

export function unassignChauffeur(id) {
  return request(`/chauffeurs/${encodeURIComponent(id)}/unassign`, { method: "POST" });
}

/* ---- GPS / vehicle tracking (§D) ---- */

// All connected trackers for the tenant → { data: [tracker] }
export function fetchTrackers() {
  return request("/tracking");
}

export function fetchTracker(plate) {
  return request(`/vehicles/${encodeURIComponent(plate)}/tracker`);
}

// { provider, device_id? } → the tracker. 409 if already connected.
export function connectTracker(plate, payload) {
  return request(`/vehicles/${encodeURIComponent(plate)}/tracker`, {
    method: "POST",
    body: payload,
  });
}

export function disconnectTracker(plate) {
  return request(`/vehicles/${encodeURIComponent(plate)}/tracker`, { method: "DELETE" });
}

/* ---- Marketplace Visibility (§E) ---- */

// Returns the listing for a vehicle, or 404 if none exists yet.
export function fetchMarketplaceListing(plate) {
  return request(`/fleet/${encodeURIComponent(plate)}/marketplace`);
}

// Create or update listing fields (does NOT publish). Returns the updated listing.
export function saveMarketplaceListing(plate, payload) {
  return request(`/fleet/${encodeURIComponent(plate)}/marketplace`, {
    method: "PUT",
    body: payload,
  });
}

// Publish the vehicle to the Ardena marketplace.
// Requires commission_acknowledged=true, description, and cover_image to be set.
export function publishMarketplaceListing(plate) {
  return request(`/fleet/${encodeURIComponent(plate)}/marketplace/publish`, {
    method: "POST",
  });
}

// Hide the vehicle from the marketplace (Car record is kept for re-publish).
export function hideMarketplaceListing(plate) {
  return request(`/fleet/${encodeURIComponent(plate)}/marketplace/hide`, {
    method: "POST",
  });
}

// Delete the listing entirely (Car is hidden but preserved for audit).
export function deleteMarketplaceListing(plate) {
  return request(`/fleet/${encodeURIComponent(plate)}/marketplace`, {
    method: "DELETE",
  });
}

// Upload a single cover image for a marketplace listing. Returns { url }.
export function uploadMarketplaceCover(plate, file) {
  const form = new FormData();
  form.append("file", file);
  return request(`/fleet/${encodeURIComponent(plate)}/marketplace/upload-cover`, {
    method: "POST",
    body: form,
  });
}

// Upload one or more gallery images. Returns { urls } — the full merged list.
export function uploadMarketplaceImages(plate, files) {
  const form = new FormData();
  for (const f of files) form.append("files", f);
  return request(`/fleet/${encodeURIComponent(plate)}/marketplace/upload-images`, {
    method: "POST",
    body: form,
  });
}

/* ---------------- Marketplace earnings (Owner / Finance) ----------------
   A business's marketplace cars are owned by a synthetic host account nobody
   can log into, so these reach the same tables through B2B auth. Withdrawals
   land in the same queue admins already process for individual hosts. */

// { total_gross, commission_rate, commission_amount, net_earnings,
//   pending_withdrawals_total, withdrawable, paid_bookings_count,
//   marketplace_active }
// marketplace_active=false means nothing has been published yet — show an
// empty state pointing at Fleet rather than treating it as an error.
export function fetchMarketplaceEarnings() {
  return request("/marketplace/earnings");
}

export function fetchMarketplaceTransactions(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== "")
  ).toString();
  return request(`/marketplace/transactions${qs ? `?${qs}` : ""}`);
}

export function fetchMarketplaceWithdrawals(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== "")
  ).toString();
  return request(`/marketplace/withdrawals${qs ? `?${qs}` : ""}`);
}

// Amount is validated against the withdrawable balance; either name a saved
// payout_method_id or spell the destination out.
export function createMarketplaceWithdrawal(payload) {
  return request("/marketplace/withdrawals", { method: "POST", body: payload });
}

/* ---- Settlement accounts ----
   Moved off /marketplace/payout-methods, which resolved a marketplace host
   record first and so returned [] for any business that had never published to
   the consumer app. The old path still works and reads the same table, but
   nothing should point at it. Read is open to any member; write is Owner and
   Finance, enforced server-side as well as by the UI. */

export function fetchPayoutMethods() {
  return request("/settlement-accounts");
}

export function createPayoutMethod(payload) {
  return request("/settlement-accounts", { method: "POST", body: payload });
}

export function deletePayoutMethod(id) {
  return request(`/settlement-accounts/${id}`, { method: "DELETE" });
}

/* ---------------- Renter inbox (Owner / Manager / Booking agent) ---------- */

export function fetchRenterConversations(params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== "")
  ).toString();
  return request(`/marketplace/conversations${qs ? `?${qs}` : ""}`);
}

// Opening a thread marks the renter's messages as read server-side.
export function fetchRenterThread(conversationId, params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== "")
  ).toString();
  return request(
    `/marketplace/conversations/${conversationId}/messages${qs ? `?${qs}` : ""}`
  );
}

// Replies go out under the business name; the backend logs which staff member
// sent them to the activity log.
export function sendRenterMessage(conversationId, message) {
  return request(`/marketplace/conversations/${conversationId}/messages`, {
    method: "POST",
    body: { message },
  });
}

/* ---------------- Ratings ---------------- */

export function fetchMarketplaceRatings(limit = 20) {
  return request(`/marketplace/ratings?limit=${limit}`);
}

export function fetchVehicleRatings() {
  return request("/marketplace/ratings/vehicles");
}

// Only valid once the trip is Completed; 409 if already rated.
export function rateRenter(ref, payload) {
  return request(`/marketplace/bookings/${encodeURIComponent(ref)}/rate-renter`, {
    method: "POST",
    body: payload,
  });
}

/* ---------------- Deposit claims & extensions ----------------
   Ardena holds the deposit on an app booking, so the dashboard's own
   refund/forfeit buttons are refused for those — this is the path instead. */

export function fileDepositClaim(ref, payload) {
  return request(`/marketplace/bookings/${encodeURIComponent(ref)}/deposit-claim`, {
    method: "POST",
    body: payload,
  });
}

export function fetchDepositClaims() {
  return request("/marketplace/deposit-claims");
}

export function fetchExtensionRequests(pendingOnly = true) {
  return request(`/marketplace/extension-requests?pending_only=${pendingOnly}`);
}

// Approving re-checks availability — can still 409 if the vehicle was booked
// for those dates in the meantime.
export function decideExtension(id, payload) {
  return request(`/marketplace/extension-requests/${id}/decide`, {
    method: "POST",
    body: payload,
  });
}

/* ---------------- Host account linking (Owner) ----------------
   Adopts an existing Ardena mobile host account: its cars land in the fleet,
   and its conversations, ratings and earnings follow automatically. */

export function fetchHostLink() {
  return request("/host-link");
}

// Drives the "do you already list on the Ardena app?" prompt. Only checks the
// signed-in user's own email, so it can't be used to probe other addresses.
export function fetchHostLinkSuggestion() {
  return request("/host-link/suggest");
}

// Sends one code to the host account's email AND its registered phone.
export function requestHostLinkCode(email) {
  return request("/host-link/request", { method: "POST", body: { email } });
}

export function verifyHostLink(email, otp) {
  return request("/host-link/verify", { method: "POST", body: { email, otp } });
}

// 409 while a live app booking is running on the linked account.
export function unlinkHostAccount() {
  return request("/host-link/unlink", { method: "POST" });
}

/* ---------------- Vehicle documents & plate ---------------- */

// kind: "logbook" | "insurance"
export function uploadVehicleDocument(plate, kind, file) {
  const form = new FormData();
  form.append("file", file);
  return request(`/vehicles/${encodeURIComponent(plate)}/documents/${kind}`, {
    method: "POST",
    body: form,
  });
}

// Replaces the temporary LINK-* plate on a vehicle imported from a linked host
// account. Refused on any plate that isn't a placeholder — a real plate is the
// vehicle's identity and booking rows reference it by value.
export function setVehiclePlate(plate, newPlate) {
  return request(`/vehicles/${encodeURIComponent(plate)}/plate`, {
    method: "POST",
    body: { plate: newPlate },
  });
}
