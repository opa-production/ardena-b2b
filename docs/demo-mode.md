# Demo mode

A self-contained demo of the whole dashboard, for recording promo video and
running sales demos. It answers every API call from a generated dataset, so it
needs **no account, no backend, and never writes to production**.

## Running it

```bash
npm run dev
# then open http://localhost:5173/dashboard?demo=1
```

Or as a standalone build you can host or run offline:

```bash
VITE_DEMO=1 npm run build
npx vite preview --port 4180
# http://localhost:4180/dashboard?demo=1
```

`?demo=1` turns it on and is remembered (localStorage), so you only need it
once — every later navigation and reload stays in demo mode, and the query
string is stripped from the address bar so it stays clean on camera.
`?demo=0` turns it off.

You land straight in the dashboard. To record the **sign-in screen**, log out
from the profile menu and sign back in — any email and password are accepted.

## What's in it

`Nuru Car Hire`, a Westlands, Nairobi rental business: 10 vehicles, 8 clients,
18 bookings across the full lifecycle and both channels, payments, app
earnings with withdrawals and payout destinations, verification history,
4 staff, renter conversations, reviews, notifications and invoices.

The data is **coherent and self-consistent** — bookings point at real vehicles
and clients, payments point at real bookings, and the overview KPIs are
computed from the same rows the tables show. It is also generated relative to
*today*, so a recording made in six months still shows current dates.

Demo mutations stick for the session: confirm a booking, request a withdrawal,
run an ID check, mark notifications read, export a CSV — all work and persist
until reload.

## Safety

Demo mode is only reachable when the build allows it: `import.meta.env.DEV`, or
a build made with `VITE_DEMO=1`. In a normal `npm run build` the flag folds to
`false` at compile time and Vite drops the dynamic import — **the demo chunk
and its dataset are not emitted into `dist` at all**, so a customer bundle
can't be flipped into fake data by a query string.

## Files

| File | Role |
|---|---|
| `src/lib/demoMode.js` | The flag only. Tiny, data-free — this is what `api.js` imports. |
| `src/lib/demoApi.js` | Route table mapping every endpoint to demo data; lazily imported. |
| `src/lib/demoData.js` | The dataset. Edit here to change the business, fleet or numbers. |

`api.js` has a single seam: `request()` short-circuits to the demo handler when
the flag is on, so every endpoint is covered without each function knowing.
