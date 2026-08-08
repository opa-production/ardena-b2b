# Backend tasks — new modules (chauffeurs, tracking, handover photos, config)

Spec for the endpoints the frontend already calls (or is ready to call) for the
features added on 2026-07-13. Extends the main API doc — **same conventions**:

- Base path `/api/v1/b2b`, FastAPI. Auth: `Authorization: Bearer <access_token>`
  unless a row is marked 🌐 (public).
- Errors come back as `{ detail: string }` or `{ detail: [{ loc, msg }] }`.
- Field names are **snake_case**; dates are ISO (`YYYY-MM-DD`) or full ISO
  timestamps. Money is integer KES.
- **Idempotency-Key** header on any money-moving endpoint.
- Multi-tenant: every row is scoped to the caller's business; never leak across
  tenants.

The frontend is built UI-first with device-local stores standing in for these
endpoints (`chauffeursStore.js`, `trackingStore.js`, `handoverPhotosStore.js`,
`configStore.js`). When an endpoint below ships, we swap the store internals for
the API call — so **matching these response shapes exactly means zero frontend
rework**.

---

## A. Client config — `GET /config`

Serves runtime config to the browser so secrets/keys live in the **backend
environment**, not the frontend build. Right now it only needs the Mapbox token.

| Method | Path | Purpose |
|---|---|---|
| GET | `/config` | Returns public client config. |

Response:

```json
{ "mapbox_token": "pk.eyJ1Ijoi..." }
```

- Read the value from the backend env var **`MAPBOX_TOKEN`** (a Mapbox
  *publishable* `pk.*` token — it is safe to expose to the browser; centralising
  it here is about ops/rotation, not secrecy).
- Frontend reads `data.mapbox_token`; falls back to `VITE_MAPBOX_TOKEN` only for
  local dev. If the token is empty/unset, the tracking map degrades to a
  schematic view — so returning `{ "mapbox_token": "" }` is valid.
- May be authed (the dashboard is behind auth); keep it a simple GET.

---

## B. Handover photos (extends §4 Bookings)

Timestamped condition photos captured at check-out and check-in — the evidence
layer for damage disputes. The frontend currently stores compressed images in
`localStorage`; move them to object storage.

| Method | Path | Purpose |
|---|---|---|
| POST | `/bookings/{ref}/handover/{phase}/photos` | **multipart** upload, one or more `files`. `phase` ∈ `out` \| `in`. Returns the phase's updated photo list. |
| DELETE | `/bookings/{ref}/handover/{phase}/photos/{photo_id}` | Remove one photo. |

Photo object (returned in the list and embedded in the booking, below):

```json
{ "id": "ph_01H...", "url": "https://cdn.ardena.xyz/handover/BK-1005/out/abc.jpg", "at": "2026-07-13T09:41:00Z" }
```

Fold the photos into the existing booking `handover` payload so `GET
/bookings/{ref}` returns them with everything else:

```json
"handover": {
  "out": { "odometer": 48210, "fuel": "Full", "notes": null, "at": "...", "photos": [ { "id": "...", "url": "...", "at": "..." } ] },
  "inn": { "odometer": 48380, "fuel": "3/4", "late_hours": 0, "penalty": 0, "photos": [ ... ] }
}
```

Notes:
- Accept `image/*`; **max 8 photos per phase**, ~10 MB each pre-processing.
- Downscale + generate a thumbnail server-side; the `url` can be the full image
  (the UI lazy-renders thumbnails and has its own lightbox).
- Store under object storage keyed by business + booking + phase; return
  CDN/signed URLs.
- Phase naming: the API uses `out` / `in`; the frontend's internal key for
  check-in is `inn` (historical) — we map it on our side, no action needed.
- Only allow uploads while the booking is in a state that has that handover
  (out: `Active`+ ; in: after check-out). Reject otherwise with 409.

---

## C. Chauffeurs (drivers)

Full roster CRUD plus duty status, current assignment and trip history. Routes
under `/chauffeurs`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/chauffeurs` | List. Query: `status`, `search`, `page`, `per_page`. → `{ data, total, page, per_page }`. |
| POST | `/chauffeurs` | Create. Body below (minus server-set fields). |
| GET | `/chauffeurs/{id}` | One chauffeur, incl. `assignment` + `history`. |
| PATCH | `/chauffeurs/{id}` | Partial update (contact, licence, `daily_rate`, `notes`, …). |
| DELETE | `/chauffeurs/{id}` | Remove from roster. |
| POST | `/chauffeurs/{id}/status` | `{ status }` — one of `Available` \| `On trip` \| `Off duty`. |
| POST | `/chauffeurs/{id}/assign` | `{ booking_ref }` → sets `assignment` from that booking, status ⇒ `On trip`. 409 if already on a trip. |
| POST | `/chauffeurs/{id}/unassign` | Ends the current assignment: `assignment` ⇒ null, status ⇒ `Available`, append the trip to `history`. |

Chauffeur object:

```json
{
  "id": "CHF-1001",
  "name": "James Mwangi",
  "phone": "0712 345 678",
  "email": "james@example.com",
  "id_no": "28451190",
  "licence_no": "DLB0492187",
  "licence_expiry": "2027-04-18",
  "daily_rate": 2500,
  "status": "On trip",
  "rating": 4.8,
  "trips": 63,
  "joined": "2025-02-11",
  "notes": "Fluent English & Swahili.",
  "assignment": {
    "booking_ref": "BK-1005",
    "customer": "Deon Orina",
    "vehicle": "Nissan Note",
    "plate": "KCK 673M",
    "from": "2026-07-13",
    "to": "2026-07-14"
  },
  "history": [
    { "id": "T-3011", "date": "2026-06-28", "customer": "Grace Achieng", "vehicle": "Toyota Prado", "route": "JKIA → Karen", "amount": 6000, "rating": 5 }
  ]
}
```

Notes:
- `id` format `CHF-####`. `assignment` is `null` when free.
- `rating` is the average of `history[].rating` (0 when none); `trips` is the
  completed-trip count. Server-compute both; the UI just displays them.
- `licence_expiry` drives an "expires soon / expired" warning in the UI
  (≤30 days / past) — no API field needed, but surface the raw date.
- On `assign`, derive `customer`/`vehicle`/`plate`/`from`/`to` from the booking
  so the two stay consistent. Consider also stamping the chauffeur onto the
  booking (`booking.chauffeur_id`) for the reverse lookup.

---

## D. GPS / vehicle tracking

Live telematics. A tracker attaches to a vehicle by **number plate**; the fleet
list comes from §3, this overlays live location on top. The frontend simulates
movement locally today — replace with real provider pings via the webhook.

| Method | Path | Purpose |
|---|---|---|
| GET | `/tracking` | All connected trackers for the tenant → `{ data: [tracker] }`. UI keys them by `plate`. |
| GET | `/vehicles/{plate}/tracker` | One tracker incl. recent `trail`. |
| POST | `/vehicles/{plate}/tracker` | Connect a device: `{ provider, device_id? }`. `device_id` optional (auto-generate/pair). 409 if already connected. |
| DELETE | `/vehicles/{plate}/tracker` | Disconnect. |
| 🌐 POST | `/webhooks/tracker/{provider}` | Provider pushes a ping (verify signature/IP). Updates location + appends to trail. |

Tracker object:

```json
{
  "plate": "KCK 673M",
  "provider": "Ardena GPS",
  "device_id": "IMEI-863920100...",
  "connected_at": "2026-07-13T08:00:00Z",
  "status": "moving",              // moving | parked | offline
  "lat": -1.2841,
  "lng": 36.8221,
  "speed": 42,                      // km/h
  "ignition": true,
  "last_ping": "2026-07-13T09:41:05Z",
  "address": "Westlands",          // reverse-geocoded label
  "trail": [ { "lat": -1.284, "lng": 36.822, "at": "...", "speed": 40 } ]
}
```

Webhook ping payload (normalise per provider): `{ device_id, lat, lng, speed, ignition, ts }`.

Notes:
- Derive `status`: `ignition && speed>0` ⇒ `moving`; stationary ⇒ `parked`; no
  ping for N minutes ⇒ `offline`.
- `address`: reverse-geocode server-side (Mapbox/Google) and cache; the UI just
  shows the string.
- Keep the last ~12 pings in `trail` (the UI draws it as the recent path/line);
  full history can live elsewhere.
- Providers the UI offers: `Ardena GPS`, `Fahari Track`, `Track24 Kenya`,
  `Cartrack`, `Generic OBD-II`. A `GET /tracking/providers` is optional; the
  list can stay client-side.
- The map itself is Mapbox (token from §A). No map data comes from this API —
  only coordinates.

---

## E. Wallet transactions shape (clarifies §6)

The Billing "Wallet top-ups" card reads `GET /verification/wallet/transactions`.
The frontend already normalises defensively, but please return this shape so the
top-up total and list are exact:

```json
{ "data": [
  { "id": "wtx_...", "type": "topup", "amount": 1000, "method": "mpesa", "reference": "QGH7X...", "status": "success", "date": "2026-07-13T09:00:00Z" },
  { "id": "wtx_...", "type": "check", "amount": 100, "method": "wallet", "reference": "CHK-2960", "status": "success", "date": "2026-07-12T14:20:00Z" }
] }
```

- `type`: **`topup`** (money in) or **`check`**/`debit` (money out). The card sums
  `topup` rows; anything not clearly a check/debit but with `amount > 0` is
  treated as a top-up, so an explicit `type` avoids ambiguity.
- Top-up init/verify endpoints (`POST /verification/wallet/topup`,
  `POST /verification/wallet/topup/verify`) already exist — no change; just make
  a confirmed top-up appear here as a `topup` row.

---

## F. Auto-confirm a booking on payment (behavior)

The UI currently patches this client-side: when a booking is `payment: Paid` but
still `status: Pending`, it transitions it to `Confirmed`. That's a workaround.

**Preferred:** when the M-Pesa/Paystack webhook marks a booking **Paid**, the
server should transition `Pending → Confirmed` as a side effect (and emit the
usual "booking confirmed" notification). Once that lands we remove the frontend
`confirmIfPaid` shim. Don't advance a booking that's already `Cancelled`/further
along.

---

## Environment variables (backend)

| Var | Purpose |
|---|---|
| `MAPBOX_TOKEN` | Mapbox publishable token, served via `GET /config` (§A) and reused for server-side reverse geocoding (§D). |
| object-storage creds | For handover photos (§B) — bucket + access keys, or a Cloudinary URL. |

The frontend's `VITE_MAPBOX_TOKEN` is now only a local-dev fallback; production
reads the token from `/config`.

---

## Frontend touch-points (for reference)

| Feature | Frontend store / call today | Endpoint(s) above |
|---|---|---|
| Config / Mapbox token | `configStore.js` → `fetchConfig()` | A |
| Handover photos | `handoverPhotosStore.js` (localStorage) | B |
| Chauffeurs | `chauffeursStore.js` (localStorage, seeded) | C |
| Tracking | `trackingStore.js` (localStorage + simulator) | D |
| Wallet top-ups card | `fetchWalletTransactions()` | E |
| Paid → Confirmed | `confirmIfPaid()` in `BookingDetails.jsx` | F |
| Assistant chat | `assistantStore.js` + `assistantKnowledge.js` (local agent) | G |

---

## G. Assistant (AI agent for the B2B dashboard)

A conversational agent inside the host dashboard that answers questions about
how Ardena works **and** about the caller's own workspace. The frontend page
(`Assistant.jsx`) is built and shipping against a local stand-in agent; these
endpoints replace that stand-in with no UI rework.

| Method | Path | Purpose |
|---|---|---|
| GET | `/assistant/messages` | Current conversation for the caller. |
| POST | `/assistant/messages` | Send a user turn, get the agent's reply. |
| DELETE | `/assistant/messages` | Start a fresh conversation ("New chat"). |

Message object:

```json
{
  "id": 12,
  "role": "agent",
  "text": "Renter verification is pay as you go — KES 100 per check…",
  "action": { "label": "Open verification", "path": "/dashboard/verification" },
  "at": "2026-08-07T09:31:04Z"
}
```

- `role` ∈ `user` | `agent`.
- `action` is optional (`null` when there's nowhere useful to send them). When
  present, the frontend renders it as a jump link under the reply — `path` must
  be an **in-app route**, never an external URL.
- `GET` returns `{ "messages": [...] }`. `POST` takes `{ "text": "…" }` and
  returns the single new agent message; the frontend already appended the
  user's turn optimistically.

### Grounding — making it B2B-knowledgeable

Two sources, both required:

1. **Product knowledge.** `src/dashboard/assistantKnowledge.js` holds the
   canonical corpus the stand-in uses today: pricing, verification, payments,
   fleet, bookings, clients, chauffeurs, tracking, staff/roles, marketplace,
   notifications, reports, data isolation. Lift it into the system prompt or a
   retrieval index so answers don't drift when the agent takes over. Pricing
   numbers must stay in step with `src/pages/pricingData.js`.
2. **Workspace data.** Questions like "what's in my fleet" or "how many
   bookings do I have" must be answered from the caller's real rows. Give the
   agent read-only tools scoped to the authenticated business —
   `list_vehicles`, `list_bookings`, `list_clients`, `wallet_balance` — rather
   than pasting data into the prompt.

### Hard constraints

- **Tenant isolation.** Every tool call is scoped to the caller's `business_id`.
  The agent must never be able to read another business's rows, and prompt text
  must never be able to widen that scope.
- **Read-only.** No booking creation, status change, payment prompt, refund or
  wallet spend from the agent. It answers and links; the user acts. Anything
  money-moving stays behind the normal UI with its `Idempotency-Key`.
- **Prompt injection.** Vehicle names, client notes and booking references are
  user-supplied and reach the agent through tool results — treat them as data,
  never as instructions.
- **Rate limiting.** Per-business cap on turns; return `429` with
  `{ "detail": "…" }` and the frontend surfaces it as a normal error.

A shared agent is planned for the client-facing app too. Keep the tool layer
generic but the **grounding corpus and tool scopes separate** — a renter must
never reach host-side fleet or revenue data.
