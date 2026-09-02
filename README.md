# Ardena for Business

Fleet and rental management for car hire businesses in Kenya, by [Ardena](https://ardena.co.ke). Businesses run their whole rental operation from one dashboard: fleet, bookings, renter verification, M-Pesa payments, staff and billing. Multi-tenant, with every business in its own isolated workspace.

Built with **Vite + React** in plain **JavaScript** and plain **CSS**. No TypeScript, no Tailwind, no UI framework.

## Getting started

```bash
npm install
npm run dev       # dev server on http://localhost:5173
npm run build     # production build to dist/
npm run preview   # serve the production build locally
```

### Configuration

| Variable | Purpose | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Backend base URL | `https://api.ardena.xyz/api/v1/b2b` |

No `.env` file is required for local work; the client points at the live API by default.

## How it fits together

The marketing site and the dashboard live in one SPA, routed with React Router (`src/App.jsx`). The dashboard sits behind `RequireAuth` and access is request-only: there is no self-serve signup, `/signup` submits an access request and the Ardena team verifies the business before sending credentials.

```
src/
  pages/        Public site: landing, about, pricing, contact, auth,
                and /v/:slug (the public "Ardena Verified" trust page)
  dashboard/    The product: one .jsx per screen plus its *Store.js
  lib/          api.js (API client) and authStore.js (session)
  components/   Shared bits: dropdowns, dialogs, logo, badges
  hooks/        usePageTitle, useReveal, useDictation
scripts/
  strip-dashes.mjs   Copy rule: no em dashes in UI text
ai.md            The workspace assistant's contract
changesreply.md  What the backend shipped, section by section
```

### Data layer

Every dashboard screen reads from a small store (`src/dashboard/*Store.js`) that pages subscribe to via `useSyncExternalStore`. Stores whose endpoints are live are hydrated from the API by `DashboardLayout` on mount; the rest hold local mock data until their endpoints ship. The API contract lives on the backend side; [`changesreply.md`](changesreply.md) records what shipped for this launch and [`ai.md`](ai.md) covers the assistant.

| Module | Backend status |
|---|---|
| Auth, onboarding, business profile, policy, trust page | Live |
| Fleet | Wired in the client, awaiting backend deploy |
| Bookings, clients, verification, payments, staff, notifications, billing, support | Local stores, endpoints pending |

The API client (`src/lib/api.js`) handles bearer tokens, single-flight refresh on 401, and FastAPI-style `{ detail }` error messages surfaced as toasts.

### Product notes

- **Pricing:** KES 400 per vehicle per month (KES 200 launch price for the first 3 months), KES 2,000 monthly minimum, unlimited bookings and staff. Renter identity checks are pay-as-you-go at KES 100 per check from a prepaid wallet.
- **Verification:** renter KYC runs through Dojah, proxied by the backend so keys never reach the browser.
- **Payments:** renters pay via M-Pesa STK push; businesses pay Ardena through Paystack.
- **PDFs:** rental agreements and monthly vehicle statements are generated client-side with jsPDF, lazily imported to keep the main bundle lean.

## Conventions

- Plain CSS, one stylesheet per feature area, kept next to the components.
- Blue `#007FFA` is used only as a small accent; sections alternate white and black; corners are sharp. Check ardena.co.ke for the reference look.
- No em dashes in UI copy. `node scripts/strip-dashes.mjs` reports them; add `--write` to apply, `--all` to include the marketing pages.
- Money is integer KES, dates are ISO 8601 at the API boundary and display strings ("12 Aug 2026") in the UI.

## First launch scope

The first public release is the B2B dashboard on its own: fleet, bookings,
clients, chauffeurs, verification, payments, staff. Two flags in
`src/lib/features.js` hold the rest back, and both are harder gates than the
server's own `app_linked` so a stale backend flag cannot leak an unfinished
screen into a build.

| Flag | Holds back |
|---|---|
| `B2C_MARKETPLACE` | Listings, renter messages, reviews, deposit claims, app earnings and withdrawals |
| `VEHICLE_TRACKING` | The live map and tracker pages — no GPS connector exists yet |
| `HOST_ACCOUNT_LINKING` | Connecting an existing Ardena host account |

Two things are shown but deliberately inert, so a business learns the capability
is coming rather than never hearing of it: Fleet's per-vehicle **Marketplace**
action is disabled with a *Soon* tag, and **Tracking** keeps its sidebar
entry and renders a coming-soon page. Each is one flag from working — grep the
flag before flipping it, the doc comment beside it lists what it gates.

What the backend shipped for this launch: [`changesreply.md`](changesreply.md).

## Known gaps, roughly by cost of leaving them

1. **An empty workspace has nothing to do.** A new account lands on an Overview
   of zeroes. `OnboardingChecklist` exists; making it the whole first-run screen
   until a vehicle and a booking exist is the highest-value change left.
2. **Bulk vehicle import.** A 25-car fleet will not type 25 forms to evaluate
   us, and the landing FAQ already promises it.
3. **Booking conflicts must be impossible, not warned about.** Confirm the
   availability check is enforced server-side, not only in the form.
4. **Password reset needs an end-to-end test** on a real device, email included.
5. **Receipts.** After paying, the customer gets nothing they can keep. The
   agreement PDF machinery in `pdf.js` already does most of this.
6. **Document expiry has to reach people.** The fields and the Overview
   "Needs attention" card exist, but nobody checks a dashboard daily.
7. **Mobile.** Counter staff work on phones; handover especially needs testing
   on a real handset, since it uses the camera.
8. **An audit trail.** The Activity log was removed from Staff & roles. A
   multi-user workspace handling money will want it back; `fetchActivityLog` is
   still in `api.js`.

Deliberately not on this list: anything B2C, tracking, annual prepay,
multi-currency. They widen the surface without making the core journey work.

## Deployment

Deployed on Vercel as a static SPA; `vercel.json` rewrites all routes to `index.html` so deep links work.
