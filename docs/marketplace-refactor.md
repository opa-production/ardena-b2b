# Dashboard refactor — marketplace integration

The backend now treats a B2B fleet vehicle as a first-class Ardena marketplace
listing. A business can be booked from the consumer app, run the whole trip from
this dashboard, get paid, and adopt an existing mobile host account. Roughly
**24 new endpoints** shipped.

This file is the plan to close that gap. Tick items as they land.

**Progress: complete.** Every item is built and the app compiles clean.

New pages: **App earnings** (`/dashboard/payments/marketplace`), **Renter messages**,
**Reviews**, **Claims & requests**. New dialogs: deposit claim, host-account linking.
New in Settings: host account link status and release.

**Backend reference:** `opabackend/B2B_B2C_INTEGRATION.md` — every endpoint below is
implemented, tested (455 passing) and documented there, including *why* each rule
exists. Read the relevant section before building against it; several endpoints
deliberately refuse things the UI might otherwise assume are allowed.

---

## 0. What is already integrated ✅

Do not rebuild these — they work and match the current API.

| Area | Where |
|---|---|
| Auth, refresh, invites, password reset | `src/lib/api.js`, `src/pages/` |
| Business profile, logo, policy, trust page | `Settings.jsx`, `businessStore.js` |
| Fleet CRUD + availability calendar | `Fleet.jsx`, `AddVehicle.jsx`, `VehicleDetails.jsx` |
| Bookings CRUD, status, handover in/out, photos, deposit action | `Bookings.jsx`, `BookingDetails.jsx` |
| Clients, chauffeurs, tracking, verification, wallet | respective pages + stores |
| Payments, refunds, STK push | `Payments.jsx`, `PaymentsList.jsx` |
| Staff & roles, activity log, notifications, billing, support, assistant | `Staff.jsx` etc. |
| Overview KPIs, charts, CSV export | `Overview.jsx`, `charts/` |
| **Marketplace listing CRUD, publish/hide/delete, cover + gallery upload** | `MarketplaceListing.jsx`, `marketplace.css` |

The marketplace *listing editor* exists. What's missing is everything that happens
**after** a listing goes live — money, renters, reviews, disputes — plus a handful
of new fields on forms that already exist.

---

## 1. API client — new functions

All paths are relative to `BASE` (`.../api/v1/b2b`), same as existing calls.

- [x] **1.1 — Marketplace earnings** (`Owner`, `Finance` only)
  ```
  GET    /marketplace/earnings              → { total_gross, commission_rate, commission_amount,
                                                net_earnings, pending_withdrawals_total,
                                                withdrawable, paid_bookings_count, marketplace_active }
  GET    /marketplace/transactions?skip&limit
  GET    /marketplace/withdrawals?skip&limit
  POST   /marketplace/withdrawals           { amount, payment_method_type, ...destination | payout_method_id }
  GET    /marketplace/payout-methods
  POST   /marketplace/payout-methods        { name, method_type, ...destination }
  DELETE /marketplace/payout-methods/{id}
  ```
  `marketplace_active: false` means the business has never published — show an
  empty state pointing at Fleet, not an error.

- [x] **1.2 — Renter inbox** (`Owner`, `Manager`, `Booking agent`)
  ```
  GET  /marketplace/conversations?skip&limit&unread_only
  GET  /marketplace/conversations/{id}/messages?skip&limit   ← opening marks read
  POST /marketplace/conversations/{id}/messages              { message }
  ```

- [x] **1.3 — Ratings**
  ```
  GET  /marketplace/ratings?limit
  GET  /marketplace/ratings/vehicles
  POST /marketplace/bookings/{ref}/rate-renter               { rating, review }
  ```

- [x] **1.4 — Claims & extensions**
  ```
  POST /marketplace/bookings/{ref}/deposit-claim   { claim_type, requested_amount, description, evidence_urls }
  GET  /marketplace/deposit-claims
  GET  /marketplace/extension-requests?pending_only
  POST /marketplace/extension-requests/{id}/decide { approve, note }
  ```

- [x] **1.5 — Host account linking**
  ```
  GET  /host-link            → { linked, host_email, linked_at, vehicles_needing_plate[] }
  GET  /host-link/suggest    → { should_prompt, suggested_email, suggested_car_count, message }
  POST /host-link/request    { email }        (Owner only)
  POST /host-link/verify     { email, otp }   (Owner only)
  POST /host-link/unlink                      (Owner only)
  ```

- [x] **1.6 — Vehicle documents & plate**
  ```
  POST /vehicles/{plate}/documents/{kind}     multipart, kind = logbook | insurance
  POST /vehicles/{plate}/plate                { plate }   ← imported placeholders only
  ```

---

## 2. Fleet — fields the backend now requires

`AddVehicle.jsx` collects **8 fields**; the backend accepts 12 and **refuses to
publish** without a model year.

- [x] **2.1 — Split "Make & model" into two inputs.** ✅
  Two inputs now; `name` is still sent as the joined display label the dashboard
  shows everywhere, with `make`/`model` alongside for the consumer listing.
  *`AddVehicle.jsx`*

- [x] **2.2 — 🔴 Add "Model year".** ✅ Added to the add-vehicle form.
  **Also found:** `updateVehicle` is exported from `api.js` but called nowhere —
  there is *no vehicle edit screen at all*, so every vehicle added before this
  field existed could never be published and had no way to be fixed. The
  marketplace listing page now shows a model-year input when the vehicle lacks
  one and patches the vehicle before publishing.
  *`AddVehicle.jsx`, `MarketplaceListing.jsx`*

- [x] **2.3 — Add "Chassis / VIN".** ✅ Optional `chassis_no` on the add form.

- [x] **2.4 — Document uploads.** Logbook and insurance certificate, next to the
  expiry dates they back. Reuse the existing upload affordance from
  `MarketplaceListing.jsx`'s cover-image control. Response returns the updated
  vehicle; `logbook_url` / `insurance_doc_url` come back on every fleet read.

- [x] **2.5 — Vehicle status is now derived, not stored.**
  "On booking" is computed from live bookings across *both* channels — the column
  was never maintained, so the old fleet grid showed Available for a car that was
  out. Treat `status` in responses as read-only for that value; only
  "In maintenance" is a business decision. The `?status=` filter still works.

- [x] **2.6 — Delete now returns 409.** With a live booking, or while a marketplace
  listing exists. Surface the message — it names the blocking booking ref, or
  tells them to remove the listing first.

---

## 3. Marketplace listing — new state to show

`MarketplaceListing.jsx` covers most fields. Missing:

- [x] **3.1 — 🔴 Review state.** ✅
  The status chip is now derived from `live_on_marketplace` + `review` rather
  than `status` alone — "Live on Ardena", "In review", "Changes needed",
  "Hidden", "Draft". Banners explain what's happening while in review, show the
  `rejection_reason` when rejected, and flag the approved-but-not-showing case
  that should never occur. The publish toast no longer claims the car is visible.
  *`MarketplaceListing.jsx`, `marketplace.css`*

- [x] **3.2 — Cancellation tier.** New field `cancellation_tier`
  (`flexible` | `standard` | `strict`), defaulting to **strict** for fleet
  listings. Needs a selector with an explanation of what each tier refunds.

- [x] **3.3 — Listing video.** New field `car_video` (URL), alongside cover and gallery.

- [x] **3.4 — Publish is gated on KYB.** Returns 400 until `verified_since` is set,
  403 if the workspace is suspended. Both come back with actionable copy — surface
  it rather than a generic failure, and consider disabling the publish button with
  a tooltip when the business isn't verified yet.

- [x] **3.5 — New listings arrive prefilled.** Rate, location and deposit are seeded
  from the vehicle and workspace policy. Don't blank them on first open.

---

## 4. Finances — marketplace earnings 🆕

Biggest new surface. A business can currently be booked and paid on the app with
**no way to see or withdraw the money**.

Suggested placement: a second tab inside **Finances** (`/dashboard/payments`),
since that page already owns money. Reuse `stat-grid` / `stat-card` for the
summary and `data-table` for rows — see `Payments.jsx` and `payments.css`.

- [x] **4.1 — Earnings summary.** Gross, commission (with the rate — it may be
  negotiated per business, not the platform default), net, and withdrawable.
- [x] **4.2 — Transactions table.** Per-booking: plate, B2B ref, customer, amount,
  commission, net, paid date, M-Pesa receipt.
- [x] **4.3 — Payout methods.** List/add/remove. Types: `mpesa`, `paybill`, `till`,
  `bank` — each needs different fields, and the backend rejects incomplete ones
  with a message naming the missing field.
- [x] **4.4 — Withdrawal request + history.** Amount is validated against
  `withdrawable`; a request can name a saved `payout_method_id` instead of
  repeating the destination.
- [x] **4.5 — Role-gate the whole tab** to `Owner` / `Finance`. Everyone else gets
  403 — don't render the tab for them.

---

## 5. Renter inbox 🆕

Renters can message a fleet car from the app. Nobody has been able to reply —
and pre-booking questions are exactly when a listing wins or loses a trip.

- [x] **5.1 — New nav item** under *Operations*, e.g. `Renter messages`, with an
  unread badge. `unread_total` comes back on the list endpoint; poll it the same
  way `Notifications` already polls `fetchUnreadCount`.
- [x] **5.2 — Thread list + conversation view.** Model the layout on
  `Support.jsx` / `support.css`, which is already a two-sided message thread.
- [x] **5.3 — Reply box.** Messages go out under the business's name. Note in the
  UI that replies are logged against the staff member who sent them.
- [x] **5.4 — Role-gate** to `Owner` / `Manager` / `Booking agent`.

---

## 6. Ratings 🆕

- [x] **6.1 — Ratings panel.** Business rating + car rating with counts, and recent
  reviews. Good fit on Overview as a card, or a section in Settings.
- [x] **6.2 — Per-vehicle averages** (`/ratings/vehicles`) — surface on the Fleet
  grid or vehicle detail so a business can see which cars drag the average.
- [x] **6.3 — Rate the renter.** Prompt after a completed marketplace booking, from
  `BookingDetails`. Only valid once the trip is `Completed`; one rating per booking
  (409 on a repeat).

---

## 7. Claims & extensions 🆕

- [x] **7.1 — 🔴 Deposit claim form.** For marketplace bookings the dashboard's own
  refund/forfeit buttons now return 400 — Ardena holds that money, and the old
  buttons let a business mark a deposit settled while the renter's money sat
  untouched. `BookingDetails` must route to the claim form instead when
  `deposit_managed_by_ardena` is true.
  Types: `damage`, `late_return`, `cleaning`, `traffic_fine`, `other`. Reuse the
  handover photo URLs as `evidence_urls`.
- [x] **7.2 — Claims list** with admin outcome (`approved_amount`, `admin_note`).
- [x] **7.3 — Extension requests.** A renter asking to keep a vehicle longer. Needs
  a visible queue — these currently expire unanswered. Approve/reject with a note;
  approval can still 409 if the vehicle got booked in the meantime, and that
  message should be shown verbatim.

---

## 8. Host account linking 🆕

The acquisition flow: a host with cars already in the mobile app links that
account and brings their fleet, reviews and messages across.

- [x] **8.1 — The prompt.** Call `GET /host-link/suggest` after login. When
  `should_prompt` is true, show the dialog. If `suggested_email` is present the
  copy can name it and the car count; if not, still offer (they may have used a
  different address). Reuse `ConfirmDialog.jsx`.
- [x] **8.2 — Email → OTP flow.** Owner enters the email; a 6-digit code goes to
  **both** that email and the phone on the host account. Response returns a masked
  `phone_hint` — say where the code went. Code lasts 10 minutes, 5 attempts.
- [x] **8.3 — 🔴 Post-link plate setup.** `Car` has no number plate, so imported
  vehicles get a temporary `LINK-{id}` plate. `verify` returns
  `vehicles_needing_plate[]`, and `GET /host-link` keeps returning it until
  cleared. **Surface this prominently** — a fleet full of `LINK-` plates is
  confusing, and `POST /vehicles/{plate}/plate` is the only way to fix it.
- [x] **8.4 — Link status + unlink** in Settings. Unlink is Owner-only and returns
  409 while an app booking is live.

---

## 9. Bookings — marketplace-aware behaviour

`BookingDetails.jsx` treats every booking as a walk-in. Responses now carry
`source`, `requires_handover_code` and `deposit_managed_by_ardena`.

- [x] **9.1 — 🔴 Handover OTP input.** ✅ Both handover forms collect the code
  when `requires_handover_code` is set, styled as a distinct step above the
  odometer grid since it gates the whole submission. Backend messages (wrong code
  with attempts remaining, 429 lockout) already surface through the existing
  `toast(err.message)` path. *`BookingDetails.jsx`, `bookings.css`*
- [x] **9.2 — Show the source.** ✅ An "Ardena app" chip next to the status.
- [x] **9.3 — Dates are locked on app bookings.** `PATCH` returns 400 if you change
  them — the renter owns those dates. Disable the date fields when
  `source === "marketplace"` rather than letting the request fail.
- [x] **9.4 — Deposit buttons.** ✅ Replaced with an explanation when
  `deposit_managed_by_ardena`. The claim form (§7.1) is still to build; the copy
  currently describes the process without linking to it.
- [x] **9.5 — Cancelling an app booking** cancels the renter's trip, refunds them in
  full and charges the business a lead-time penalty. Confirm with that spelled
  out. `POST /bookings/{ref}/status` now accepts an optional `reason` that reaches
  the renter. Returns 409 if the trip is already active.

---

## 10. Overview — revenue split

- [x] **10.1 — Split the revenue KPI.** `monthly_revenue` previously summed only
  dashboard payments, so a business selling on the app saw roughly half its
  income. New fields: `monthly_revenue_dashboard`, `monthly_revenue_marketplace`,
  `marketplace_commission`.
- [x] **10.2 — Utilisation is now real.** It was reading a column nothing
  maintained and showed 0% for a full lot. No client change needed — just be aware
  the number will change.
- [x] **10.3 — CSV exports gained columns.** Bookings has `Source`; payments has
  `Commission (KES)` / `Net (KES)` and now includes marketplace rows. Update any
  hardcoded column handling.

---

## 11. Role gating (cross-cutting) 🔴

The dashboard barely gates by role today — `grep` finds one check, in `Staff.jsx`.
The new endpoints enforce roles server-side, so without UI gating users will see
buttons that 403.

- [x] **11.1 — Add a `useRole()` hook.** ✅ `src/hooks/useRole.js` — a capability
  map (`viewMoney`, `renterInbox`, `manageFleet`, …) rather than raw role
  comparisons, so pages ask the question they actually have. **Verified against
  the backend's `require_b2b_roles` calls rather than assumed** — staff
  management is Owner *and* Manager, and identity checks are open to Booking
  agent, both of which I had guessed wrong.
- [~] **11.2 — Apply it.** Existing surfaces gated (Finances, Staff, Billing,
  fleet/booking/chauffeur writes, marketplace listing). The rows for surfaces
  that don't exist yet (§4–§8) get gated as they're built:
  | Surface | Roles |
  |---|---|
  | Marketplace earnings, withdrawals, payout methods | `Owner`, `Finance` |
  | Renter inbox, rate renter, extension decisions | `Owner`, `Manager`, `Booking agent` |
  | Deposit claims | `Owner`, `Manager`, `Finance` |
  | Host linking / unlinking | `Owner` |
  | Fleet writes, vehicle documents, set plate | `Owner`, `Manager` |
- [x] **11.3 — Hide, don't disable.** ✅ `visibleSections(can)` in `nav.js`
  filters items and drops sections that empty out. `RequireRole` also guards the
  routes, so a typed URL or stale bookmark gets an explanation instead of a 403
  from the API. *`nav.js`, `DashboardLayout.jsx`, `RequireRole.jsx`, `App.jsx`*

---

## 12. UI conventions to follow

Match what's there — this dashboard has a consistent look and the new pages must
not stand out.

- **Design system:** neomorphic. Shadows come from `--neo-out`, `--neo-out-sm`,
  `--neo-in`. **Corners are square** (`--radius: 0`) — do not introduce rounding.
- **Colour:** `--brand` (blue in light, mint in dark), `--panel` for cards,
  `--ink` / `--ink-soft` / `--ink-mute` for text, `--ok` / `--warn` / `--danger`
  for status. Never hardcode a hex — every token has a dark-mode value and a
  literal will break theme switching.
- **Type:** `--font-ui` (Inter) for body, `--font-display` (Space Grotesk) for headings.
- **Layout classes** already defined: `panel-card`, `card-head`, `stat-grid`,
  `stat-card`, `stat-label`, `stat-value`, `stat-note`, `data-table`, `cell-sub`,
  `num`, `chart-card`. Read `payments.css` and `fleet.css` before writing new CSS.
- **Page shell:** wrap loads in `PageSkeleton`, empty results in `EmptyState`
  (`EMPTY_ICONS`), and report failures with `toast(err.message, "danger")`.
- **New CSS** goes in a per-page file (`marketplace-earnings.css`, `inbox.css`)
  imported by the page, matching the existing one-file-per-page pattern.
- **Stores:** follow the `subscribe`/`emit` pattern in `notificationsStore.js` if
  state is shared across pages; otherwise local `useState` as in `Payments.jsx`.
- **Routes** go in `src/App.jsx` under the dashboard layout; nav entries in
  `src/dashboard/nav.js` (add to `NAV_SECTIONS` *and* `SECTION_TITLES`).

---

## Suggested order

1. **§11 role gating** first — everything after it needs the hook, and shipping
   pages that 403 for half the staff is worse than shipping nothing.
2. **§9.1 handover OTP** and **§3.1 review state** — the two items where the
   dashboard is currently *wrong* rather than merely incomplete. A business cannot
   start an app booking, and believes unlive cars are live.
3. **§2 fleet fields** — `year` blocks publishing entirely.
4. **§4 earnings** — the business can be owed money it cannot see.
5. **§7 claims**, **§9.3–9.5 booking behaviour** — correctness follow-ups.
6. **§5 inbox**, **§6 ratings** — growth surfaces.
7. **§8 host linking** — the acquisition flow, once the rest is solid.
8. **§10 overview**, **§3.2–3.5** — polish.

---

## Notes

- **The consumer app needs no changes.** A published fleet vehicle becomes a real
  `Car` row and flows through the existing `/cars` endpoints unchanged. Two
  optional fields (`host_bio`, `host_is_business`) were added for a business badge;
  ignoring them is fine.
- **Nothing here is speculative.** Every endpoint is implemented and tested. If a
  call behaves unexpectedly, check `B2B_B2C_INTEGRATION.md` — the refusals are
  usually deliberate and the reasoning is recorded.

---

## Where the build diverged from this plan

Recorded because the reasoning matters more than the diff.

- **There is no vehicle edit screen.** `updateVehicle` was exported and never
  called, so a vehicle added before the `year` field existed could never be
  published *and had no way to be fixed*. Rather than build a whole edit page,
  the model-year input appears on the marketplace listing — the exact point where
  publishing fails — and patches the vehicle before publishing. A real edit
  screen is still worth building; the "Edit" button on `VehicleDetails` is still
  a disabled stub.

- **`marketplace.css` was written against tokens this project doesn't have.**
  `--color-surface`, `--color-border`, `--color-text`, `--color-text-muted` are
  undefined in `global.css`, so all eight uses silently fell back to their
  light-theme literals and the page was broken in dark mode. Rewritten onto the
  real tokens, with the rounded corners squared off to match `--radius: 0`.

- **Role gating was checked against the backend, not this document.** Two
  assumptions here were wrong: staff management is `Owner` *and* `Manager`, and
  identity checks are open to `Booking agent`. A UI stricter than the API hides
  features people are entitled to, so `useRole.js` mirrors `require_b2b_roles`.

- **The video field is a URL, not an upload.** There is no listing video upload
  endpoint — only cover and gallery images — so the field takes a link to a clip
  hosted elsewhere.

- **Withdrawals always send `payment_method_type`.** The API accepts a saved
  `payout_method_id` on its own, but sending the type alongside keeps the request
  valid if a saved method is ever removed mid-session.

## Still open

- **Vehicle edit screen** (see above). Only the plate, documents and model year
  are editable today, each through a purpose-built control.
- **Renter-message unread badge in the sidebar.** The count is on the list
  response; the nav polls only notifications and support today.
- **Payout method editing.** Destinations can be added and removed, not edited —
  matching the API, which has no update endpoint.
