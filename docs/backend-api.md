# Ardena for Business — Backend API requirements

What the B2B dashboard needs from the backend. The existing API at
`https://api.ardena.xyz` (`/api/v1`) serves the consumer rental product; the
endpoints below are what this dashboard requires, namespaced to avoid clashing
with it (suggestion: `/api/v1/b2b/...` or a `business.` subdomain).

Every dashboard screen currently runs on in-memory mock stores
(`src/dashboard/*Store.js`). Each section below maps one store/page to the
endpoints that replace it, with field names taken from the mock data so the
swap is mechanical.

**Conventions assumed throughout**

- Base URL: `https://api.ardena.xyz/api/v1`
- Auth: `Authorization: Bearer <JWT>` on everything except the public
  endpoints marked 🌐.
- Multi-tenant: every business is an isolated workspace. The token carries the
  `business_id`; no cross-tenant reads, ever (this is a marketing promise on
  the landing page).
- Roles: `Owner`, `Manager`, `Booking agent`, `Finance`, `Viewer` (see Staff).
  The API must enforce them server-side, not just the UI.
- Money is integer KES, dates ISO 8601, lists paginated
  (`?page=&per_page=` → `{ data, total, page, per_page }`).

---

## 1. Auth & onboarding

Access is by request — there is no self-serve signup. An admin approves a
request, the backend verifies the business (KYB), then credentials go out.

| Method | Path | Purpose |
|---|---|---|
| 🌐 POST | `/auth/access-requests` | "Request access" form: `{ business_name, contact_name, email, phone, fleet_size }` (fleet_size is one of `3–10`, `11–30`, `31–100`, `100+`). Returns `{ reference }` e.g. `REQ-2026-118`. |
| 🌐 POST | `/auth/login` | `{ email, password }` → `{ token, refresh_token, user, business }`. |
| POST | `/auth/refresh` | Refresh the session. |
| POST | `/auth/logout` | Invalidate the session. |
| 🌐 POST | `/auth/forgot-password` / `/auth/reset-password` | OTP flow (live): forgot takes `{ email }` and emails a code; reset takes `{ email, otp, new_password }`. |
| POST | `/auth/change-password` | **Not built yet.** Authenticated change: `{ current_password, new_password }`. The dashboard currently reuses the OTP reset flow for signed-in changes. |
| GET | `/me` | Current user: `{ id, name, email, role, business_id }`. Drives role-gating in the UI. |
| GET | `/onboarding` | Checklist state: `{ vehicle: bool, booking: bool, staff: bool, ... }` (mirrors `onboardingStore.markStep`). Steps flip automatically server-side when the first vehicle/booking/invite is created. |

## 2. Business profile & settings

Mock: `businessStore.js` (name + logo in localStorage), `policyStore.js`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/business` | `{ id, name, phone, email, location, logo_url, verified_since, trust_slug }`. ⚠️ `phone`/`email` are missing from the live response — the Settings profile form sends them but they don't round-trip, so the dashboard holds them client-side until added. |
| PATCH | `/business` | Update name and profile fields (incl. `phone`, `email`). Owner/Manager only. |
| POST | `/business/logo` | Multipart upload, returns `logo_url`. |
| GET | `/business/policy` | Rental policy: `{ deposit, late_fee_per_hour, return_hour }` (KES 10,000 / KES 500/h / 10:00 in the mocks). |
| PATCH | `/business/policy` | Update policy. Used by Settings; feeds agreements and late-return penalty math. |

🌐 `GET /trust/{slug}` — public trust page (`/v/:slug` in the app): returns
`{ name, location, since, fleet_summary, checks: [string] }` for a verified
business, 404 otherwise. Powers the shareable "Ardena Verified" page.

## 3. Fleet

Mock: `fleetStore.js`. Vehicle shape:
`{ plate, name, cat, rate, util, ins, inspection, added, status, notes }` —
`cat` ∈ `SUV | Saloon | Hatchback | Van | Pickup`, `status` ∈
`Available | On booking | In maintenance`, `ins`/`inspection` are expiry dates.

| Method | Path | Purpose |
|---|---|---|
| GET | `/vehicles` | List, filterable by `status`, `cat`, search. Include per-vehicle `utilisation` (%) computed by the backend. |
| POST | `/vehicles` | Add vehicle (flips onboarding step, updates billing quantity). |
| GET | `/vehicles/{plate}` | Details incl. booking history for the vehicle. |
| PATCH | `/vehicles/{plate}` | Edit rate, status, notes, document dates. |
| DELETE | `/vehicles/{plate}` | Remove (reject if it has an active booking). |
| GET | `/vehicles/{plate}/availability?from=&to=` | Booked date ranges for the calendar (`availabilityStore` / `AvailabilityCalendar`). |

Document expiries (insurance, inspection) must generate notifications
(see §9) ahead of time — the mock shows "cover ends in 8 days".

## 4. Bookings

Mock: `bookingsStore.js`. Booking shape:
`{ ref, customer, client_id, phone, vehicle, plate, pickup, dropoff, location,
rate, status, payment, verification, created, notes, deposit_status, handover }`.

Lifecycle: `Pending → Confirmed → Active → Completed`, or `Cancelled` early.
Payment: `Unpaid → Prompt sent → Paid → Refunded`.
Deposit: `Pending → Held → Refunded | Forfeited`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/bookings` | List with filters (`status`, `payment`, date range, vehicle, client). |
| POST | `/bookings` | Create. Backend generates `ref` (`BK-xxxx`) and must reject availability conflicts (marketing promises "automatic conflict checks"). |
| GET | `/bookings/{ref}` | Full details incl. handover + deposit. |
| PATCH | `/bookings/{ref}` | Edit notes/dates (with re-check of conflicts). |
| POST | `/bookings/{ref}/status` | `{ status }` transition. Server enforces the lifecycle and side-effects (cancel + paid ⇒ refund flow, activate ⇒ deposit held). |
| POST | `/bookings/{ref}/handover/out` | Check-out at pickup: `{ odometer, fuel, notes }`, timestamped. |
| POST | `/bookings/{ref}/handover/in` | Check-in at return: `{ odometer, fuel, notes }`. Backend computes `late_hours` (vehicles due `return_hour`) and `penalty = late_hours × late_fee_per_hour`. |
| POST | `/bookings/{ref}/deposit` | `{ action: "refund" | "forfeit" }` (Finance/Manager/Owner). |
| GET | `/bookings/{ref}/agreement` | Rental agreement PDF (currently generated client-side in `pdf.js`; server-side keeps a signed copy on record). |

## 5. Clients

Mock: `clientsStore.js`. Shape:
`{ id, name, phone, email, id_type, verification, joined, notes }`;
booking counts and lifetime spend are **derived from bookings** — the API
should return them precomputed on the list/detail.

| Method | Path | Purpose |
|---|---|---|
| GET | `/clients` | List with search + `verification` filter, incl. `bookings_count`, `total_spend`. |
| POST | `/clients` | Create (also created implicitly with a first booking). |
| GET | `/clients/{id}` | Profile + booking history + verification history. |
| PATCH | `/clients/{id}` | Edit contact details, notes. |
| DELETE | `/clients/{id}` | Remove (reject if active bookings exist). |
| POST | `/clients/import` | Bulk import (CSV) — promised for onboarding and the Large fleets plan. Same for `/vehicles/import`. |

## 6. Identity verification (KYC)

Mock: `verificationsStore.js`. Walk-in flow: staff type a number, the backend
proxies **Dojah** (keys must live server-side, never in the browser):

- National ID → Dojah `GET /api/v1/ke/kyc/id?id=`
- Driver's Licence → `GET /api/v1/ke/kyc/dl?license_number=`
- KRA PIN → `GET /api/v1/ke/kyc/kra?pin=`

Pay-as-you-go: flat **KES 100 per lookup**, drawn from a prepaid wallet.

| Method | Path | Purpose |
|---|---|---|
| POST | `/verification/lookup` | `{ type: "national_id" \| "drivers_licence" \| "kra_pin", number, client_id?, booking_ref? }` → `{ status: "Verified" \| "Not found" \| "Mismatch", entity: { first_name, middle_name, last_name, gender, dob } }`. Atomically debits the wallet; **no charge if the provider call fails** (charge on "Not found" is a product decision to confirm). |
| GET | `/verification/lookups` | History: `{ id (CHK-xxxx), customer, id_type, id_number_masked, status, booking_ref, date }`. Return numbers **masked server-side** (first 2 + last 2 chars). |
| GET | `/verification/wallet` | `{ balance, check_price }`. |
| POST | `/verification/wallet/topup` | `{ amount, method: "mpesa" \| "card" }` → payment init (STK push or Paystack checkout URL). |
| GET | `/verification/wallet/transactions` | Top-ups and per-check debits. |

## 7. Payments (renter-facing, M-Pesa)

Mock: `Payments.jsx` derives everything from bookings; receipts are faked.
Real flow is **Daraja STK push**.

| Method | Path | Purpose |
|---|---|---|
| POST | `/bookings/{ref}/payment-prompt` | Sends STK push for the amount due (`rental_days × rate`) to the booking's phone. Sets payment → `Prompt sent`. Idempotent / resendable. |
| 🌐 POST | `/webhooks/mpesa` | Daraja callback: marks paid, stores the real receipt code, emits a notification. |
| GET | `/payments` | Transaction list: `{ booking_ref, customer, amount, method, receipt, type: "payment" \| "refund", date }`. |
| GET | `/payments/summary` | `{ collected, outstanding, refunded, net, paid_count }` for the stat cards and donut. |
| POST | `/payments/{id}/refund` | Refund flow (B2C or manual record). Finance/Manager/Owner. |

## 8. Staff & roles

Mock: `staffStore.js`. Shape:
`{ id, name, email, role, status: "Active" | "Invited", last_active }`.
Unlimited seats.

| Method | Path | Purpose |
|---|---|---|
| GET | `/staff` | List with `last_active`. |
| POST | `/staff/invites` | `{ name, email, role }` → invite email. Duplicate email rejected. |
| POST | `/staff/invites/{id}/resend` · DELETE `/staff/invites/{id}` | Manage pending invites. |
| 🌐 POST | `/staff/invites/accept` | Token from the email + password → account activated. |
| PATCH | `/staff/{id}` | Change role (can't demote the last Owner). |
| DELETE | `/staff/{id}` | Remove from workspace. |
| GET | `/activity-log` | "Every action logged, always auditable" — paginated `{ actor, action, target, at }`. |

## 9. Notifications

Mock: `notificationsStore.js`. Shape:
`{ id, kind: "payment" | "booking" | "verification" | "fleet" | "staff",
title, meta, time, read, to }` where `to` is a dashboard deep link.

| Method | Path | Purpose |
|---|---|---|
| GET | `/notifications` | Paginated, `?unread=true` filter; include `unread_count` for the sidebar badge. |
| POST | `/notifications/{id}/read` · `/notifications/read-all` | Mark read. |

Generated server-side by events: payment received/refunded, prompt sent,
booking created/confirmed/started/completed, verification passed/failed,
insurance/inspection expiring, invite accepted. Real-time push (WebSocket/SSE)
is a nice-to-have; polling `unread_count` is acceptable at v1.

## 10. Billing (the business paying Ardena)

Mock: `Billing.jsx`. Per-vehicle subscription: KES 200/vehicle/month for the
first 3 months, then KES 400, **KES 2,000 monthly minimum**, 14-day free
trial. Checkout currently a static Paystack link.

| Method | Path | Purpose |
|---|---|---|
| GET | `/billing/subscription` | `{ plan, vehicle_count, rate, launch_rate_until, monthly_total, trial_ends, status }`. |
| GET | `/billing/invoices` | `{ ref (INV-2026-xxx), title, detail, amount, status: "Due" \| "Paid", due_date, paid_at }` + PDF link per invoice. |
| POST | `/billing/invoices/{ref}/pay` | Initiate payment (Paystack: card or M-Pesa) → checkout URL. |
| 🌐 POST | `/webhooks/paystack` | Confirms invoice + wallet top-up payments. |
| GET | `/billing/usage` | This month's breakdown: subscription + verification checks used (feeds the two-bar chart). |

## 11. Dashboard overview & reports

Mock: `Overview.jsx` charts. One aggregates endpoint keeps the dashboard to a
single fetch; all series are backend-computed:

`GET /dashboard/overview?period=` →

```json
{
  "stats": { "fleet_size": 12, "active_bookings": 4, "monthly_revenue": 420000, "utilisation": 63 },
  "booking_heatmap": [{ "day": "Mon", "hour": 9, "count": 3 }],
  "top_vehicles": [{ "name": "Toyota Prado", "plate": "KDL 482A", "prev": 142000, "curr": 196000 }],
  "utilisation_trend": [{ "month": "2026-02", "value": 58 }],
  "collections": [{ "date": "2026-07-01", "amount": 36000 }]
}
```

Plus `GET /reports/export?type=&from=&to=` (CSV) — "always up to date and
exportable" is on the landing page.

## 12. Support

Mock: `supportStore.js` (canned replies).

| Method | Path | Purpose |
|---|---|---|
| GET | `/support/messages` | Thread for this business. |
| POST | `/support/messages` | Send a message. |

Real-time delivery of agent replies (WebSocket/SSE) — or v1 polling.
🌐 `POST /contact` — public contact-form submissions from the marketing site.

---

## Cross-cutting requirements

- **Demo/sample mode** — the dashboard has a demo toggle that swaps sample
  data in and out. Keep this client-side; new accounts simply have empty
  lists, so all list endpoints must return clean empty states.
- **Idempotency keys** on money-moving endpoints (payment prompt, wallet
  debit, refunds, invoice payment).
- **Webhooks in, events out**: Daraja and Paystack callbacks must be verified
  (signature/IP) and drive booking payment status, wallet balance and
  notifications atomically.
- **CORS** for the dashboard origin(s), including the Vercel deployment URL.
- **Errors** as `{ error: { code, message } }` with actionable messages — the
  UI surfaces them in toasts.
- **Rate limiting** on 🌐 public endpoints (access requests, contact form,
  login).
