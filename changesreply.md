# Ardena for Business — what shipped

A reply to `b2b.md`, section by section. Everything on the launch path (§1–§7)
is built; nothing in §0 was. Where an answer differs from what was asked, the
difference and the reason are stated rather than left to be discovered.

Base path `/api/v1/b2b`. Auth, error shapes, snake_case, integer KES and
`Idempotency-Key` are all unchanged.

---

## The short version

| § | Asked for | Status |
|---|---|---|
| 1 | Settlement accounts, degated | **Both paths ship.** New `/settlement-accounts`; the old one degated and reading the same rows |
| 2 | `POST /bookings/{ref}/cash-payment` | Shipped |
| 3 | `cash_collected` / `cash_count` | Shipped |
| 4 | Free launch period | Shipped. Old pricing is dormant, not deleted — see §4 |
| 5 | Handover photos | **Already shipped** before this doc |
| 6 | Chauffeurs | **Already shipped** before this doc |
| 7 | Wallet shape, auto-confirm | Confirmed live. Cash does the same |

Three answers the frontend needs:

1. **Point the client at `/b2b/settlement-accounts`** when convenient. The old
   path keeps working indefinitely and reads the same table, so the switch is a
   one-line change with no coordination.
2. **The 2-hour settlement SLA is not something the backend can promise yet** —
   see §1.3. Please change the copy.
3. **`GET /billing/subscription` no longer returns `rate` or `monthly_total`.**
   Anything reading them gets `undefined`; that is intended, and §4 explains why
   returning a number would be worse.

---

## 1. Settlement accounts

### Which path shipped

**Both.** `/settlement-accounts` is the real one:

| Method | Path |
|---|---|
| GET | `/b2b/settlement-accounts` |
| POST | `/b2b/settlement-accounts` |
| DELETE | `/b2b/settlement-accounts/{id}` |

`/b2b/marketplace/payout-methods` still works, is **degated**, and now reads and
writes the same table. Switch in one commit whenever you like; nothing is
stranded on the old path in the meantime and no data migration is involved.

### What was actually wrong

The old handlers resolved a marketplace host record first — `GET` returned `[]`
without one and `POST` raised *"This workspace has no marketplace listings yet"*.
So a business that never published to the consumer app could not name an account
to be paid into. You were right that it breaks the launch.

The rows moved to `b2b_settlement_accounts`, keyed on `business_id`. There is no
host lookup left in the path. Anything that can now fail is a malformed account.

### The account object

Exactly the shape in §1.2, with every field returned and `null` where unused.
Validation is per `method_type` — a `bank` with no `account_number` is a 422,
because the alternative is a stored destination nobody can be paid into and a
failure that surfaces weeks later at settlement time.

`name` defaults to the type's label (`"M-Pesa"`, `"Till"`, `"Paybill"`,
`"Bank"`) when omitted. Nothing keys off it.

**`bank_name` is free text**, as asked. No enum, no CHECK constraint, no length
below 120 characters. `"Mwalimu National Sacco"` is accepted and there is a test
that says so.

### Roles

Not in the original spec, and worth flagging because the UI should reflect it:

- **Read: any signed-in member.** A booking agent seeing the till their own
  business banks into is not a leak, and hiding it makes the Settlements screen
  fail confusingly for most of the staff.
- **Write: Owner and Finance only.** Changing a settlement destination redirects
  every future payout — the highest-value single edit in the product.

The old marketplace path had *both* restricted to Owner and Finance; read opened
up to match the new path.

### 1.3 Settlement timing — please change the copy

**"Settled within 2 hours of request" is not a promise the backend can keep
today.** Nothing measures or enforces it, and there is no automated settlement
run — a payout is a queued withdrawal an admin processes.

Suggested wording: **"Settled within one business day."** If two hours is a
commercial commitment someone has made, say so and it becomes a scheduling
problem to solve rather than a number to quietly miss.

---

## 2. Cash payments

```
POST /b2b/bookings/{ref}/cash-payment
Idempotency-Key: <optional>

{ "amount": 18000, "note": "receipt 0042" }
```

Returns `201` and a payment object. Behaviour is as specified:

- Marks the booking **Paid**, and transitions `Pending → Confirmed` (§7).
- Recorded as `method: "cash"`, a separate channel from Paystack collections.
- **No Paystack charge, no checkout URL, no money moved.** A bookkeeping entry.
- Stamps the recording user and the timestamp.
- `409` on a `Cancelled` or already-`Paid` booking.

Three things worth knowing:

**The response carries `note` and `recorded_by`.** They are `null` on every
non-cash row. A Paystack row is backed by a provider record; a cash row's only
provenance is a person saying they took the money, so the transaction list has to
be able to show who.

**`Idempotency-Key` returns the original row rather than a 409.** A counter till
on a flaky connection retries, and answering a successful retry with "already
paid" reads as an error for something that worked.

**The receipt number stays in `note`, not `payment_receipt`.** That column holds
provider receipt codes — an M-Pesa code, a Paystack reference — and anything
reading it treats the value as verifiable with the provider. A handwritten
receipt number is not.

Any role that can manage bookings can record cash, including Booking agent. That
is the person at the counter holding the notes.

---

## 3. Payments summary

`GET /b2b/payments/summary` now returns both new fields:

```json
{
  "collected": 420000, "outstanding": 65000, "refunded": 12000,
  "net": 408000, "paid_count": 37,
  "cash_collected": 88000, "cash_count": 9
}
```

`collected` is money through Ardena only and **excludes cash**, as specified.
`net` follows `collected` — it is the Ardena side of the ledger, the side that
settles. Add the cash column yourself wherever a grand total is wanted; the
backend deliberately never produces one, so there is no field that can be
misread as "money we are owed".

---

## 4. Billing — the free launch period

### What ships

Two months free from **activation** — the moment logins are issued after
verification, not signup. A business that waited three days on our KYB queue
keeps those three days.

```json
GET /b2b/billing/subscription
{
  "plan": "Fleet",
  "status": "free_period",
  "free_period_ends_at": "2026-11-02",
  "next_billing_date": null,
  "amount_due": 0,
  "vehicle_count": 7,
  "fleet_cap": 100,
  "activated_at": "2026-09-03"
}
```

`status` is one of `free_period`, `awaiting_pricing`, `active`, `past_due` — the
four you handle.

`GET /billing/gate` returns `gated`, `status`, `due_amount`, `vehicle_count`,
`fleet_cap` and now `free_period_ends_at`.

### Every "must" and "must not"

| Requirement | How |
|---|---|
| No subscription invoice inside the free period | The nightly job returns 0 before looking at a single workspace while pricing is unannounced, and skips any workspace inside its period regardless |
| No payment wall for an unbilled workspace | `gated` can only become true on a path that requires announced pricing *and* an overdue invoice. Today neither exists |
| Expose the free-period end date | `free_period_ends_at` on both `/subscription` and `/gate` |
| Never auto-convert to a paid plan | There is no code path that flips a status to `active` on the clock elapsing |
| Never suspend when the period elapses | Elapsed + unannounced ⇒ `awaiting_pricing`, `gated: false`. Keep serving |
| Never return a subscription amount the UI would render | `amount_due: 0`. `rate`, `monthly_total`, `subscription_total` and `commission_credit` are **gone from the response** |

### The 30-day trial

Gone, not stacked. A workspace gets 60 days, not 30 *and* 60. `TRIAL_DAYS`
survives in the source only as the anchor for the dormant cycle arithmetic
below, and a test asserts the two are not summed.

### The old pricing model — dormant, not deleted

You flagged that KES 400/vehicle, the 3-vehicle minimum and the 9% commission
credit are stale and would be the only place they still exist. That is right, and
here is what was done with them rather than what you might assume.

**Nothing reads them.** They sit behind
`settings.B2B_SUBSCRIPTION_PRICING_ANNOUNCED`, which ships `false`. With it
false: no invoice is raised for anyone, no workspace is ever gated for
subscription non-payment, and no price appears in any response.

**They were not deleted**, because the arithmetic is correct and re-deriving it
when pricing is announced would be waste. It is marked in-source as a placeholder
for whatever is actually announced, and its tests now have to switch the flag on
first — which is honest documentation of their status: a test that has to enable
something is testing a thing that is off.

**Turning the flag on does not start charging anyone.** The per-workspace free
period still has to have elapsed, and the constants must be replaced with real
announced pricing before anyone flips it.

### Extending

`free_period_ends_at` is a stored column, not a derived date. Extending one
workspace is a single `UPDATE`, and the stored value always beats the computed
one — so a hand-extended workspace survives a change to the default. That is the
mechanism behind "extend instead"; a test covers it.

### Verification is unchanged

KES 100 a check, from the prepaid wallet, from day one, during the free months.
Nothing in this work touched it.

---

## 5. Handover photos — already shipped

Both endpoints exist and predate this document:

```
POST   /b2b/bookings/{ref}/handover/{phase}/photos      multipart, `files`
DELETE /b2b/bookings/{ref}/handover/{phase}/photos/{id}
```

`image/*`, max 8 per phase, stored in Supabase Storage keyed by business +
booking + phase, and folded into `GET /bookings/{ref}` under `handover.out` /
`handover.inn`. Phase-state 409s are enforced. Photo objects are
`{ id, url, at }` with `id` as `ph_<hex>`.

**Nothing to do.** If `localStorage` is still the source of truth on the
frontend, these have been ready to switch to.

---

## 6. Chauffeurs — already shipped

All eight endpoints, at the paths and shapes in §6. `ref` is `CHF-####`,
`assignment` is `null` when free, and `rating` and `trips` are server-computed
from history — the mean of `history[].rating` and the completed count, never
stored. `licence_expiry` is returned raw for the UI to derive its own warning.
Assign copies customer, vehicle, plate and dates off the booking and 409s a
chauffeur already on a trip.

**One gap closed in this change:** assign now stamps `booking.chauffeur_id` and
unassign clears it. §6 suggested it and it had not been done, so a booking could
not say who was driving it — only the chauffeur knew which booking they were on,
making every "who has BK-1005" question a scan of the roster. The column already
existed; nothing else changed.

**Otherwise nothing to do.**

---

## 7. The two behaviours to confirm

**Wallet transactions.** `GET /b2b/verification/wallet/transactions` returns the
documented shape, and a confirmed top-up does appear as a `topup` row.

Two differences from §7, both small but worth naming since the daily series is
folded from these rows:

- `type` is `topup` or `debit`, never `check`. Your normaliser already handles
  `debit`.
- A debit's `reference` is the wallet ledger reference (`B2B-DB-9`), not the
  `CHK-####` check reference — the example in §7 shows the latter. The rows are
  linked in the database, and `description` reads `"ID check (national id)"`. If
  the Usage screen needs to name the check, say so and the check reference can be
  added to the row; it is not there today.

`GET /billing/usage` has no `daily` array yet — keep folding the series from
transactions. It is the right shape to add and it is not in this change.

**Auto-confirm on payment — confirmed live.** `_auto_confirm_on_paid` runs on
every path that marks a booking Paid: the Paystack webhook, the verify endpoint,
and now cash. It advances `Pending → Confirmed` only, leaves `Cancelled` and
anything further along untouched, and emits the notification. The frontend is
right to have stopped patching it client-side.

---

## 8. Environment

| Var | Purpose | Status |
|---|---|---|
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Handover photo storage | Already set |
| `B2B_FREE_PERIOD_MONTHS` | Length of the free period. Default `2` | New, optional |
| `B2B_SUBSCRIPTION_PRICING_ANNOUNCED` | Master switch for subscription billing. Default `false` | New, **leave false** |

`MAPBOX_TOKEN` is not needed and tracking was not built.

---

## 9. Also in this change

**A workspace assistant** — an AI chat inside the dashboard that answers
questions about the workspace's own operation, scoped to one business and gated
by role. Contract in [`B2B_AI.md`](./B2B_AI.md). It is additive: nothing existing
changes, and with no model key configured it is simply offline while the rest of
the API is unaffected.

---

## 10. Migration

One migration, `a5b6c7d8e9f0_b2b_launch`:

- `b2b_settlement_accounts` (new table)
- `b2b_payments`: `note`, `recorded_by_user_id`, `recorded_by_name`, plus an
  index on `(business_id, method)` for the KPI group-by
- `b2b_businesses`: `activated_at`, `free_period_ends_at`, backfilled from
  `created_at` for existing workspaces
- `b2b_assistant_conversations`, `b2b_assistant_messages` (new tables)

The backfill gives existing workspaces `activated_at = created_at` and two months
from there. For live workspaces those differ by at most the KYB wait; the
alternative — leaving them NULL — reads downstream as "never activated", which
is worse than a date that is a day or two generous.

Additive throughout. No column is dropped, no type is narrowed, and old code runs
against the new schema unchanged, so it is safe to migrate before deploying.

`payment_methods` rows belonging to marketplace hosts are left alone. They were
only ever reachable by workspaces that had published to the consumer app, and no
such workspace loses anything — but a business that had saved a payout method
under the old path before this change will not see it under the new one, and
should re-add it. That is a handful of rows at most; tell us if it is more and
they can be copied across.

---

## 11. Testing

618 tests pass. New coverage for this work asserts the things that would
otherwise be found in production:

- A workspace **with no marketplace host** can create a settlement account — the
  exact case that was broken. Using a workspace *with* a host would have passed
  against the old code.
- Both settlement paths return the same rows, so a client mid-migration does not
  watch its own account disappear.
- Cash never lands in `collected`, and the summary reports the two apart.
- A replayed cash payment produces one row, not two.
- The payment wall does not fire for a workspace whose free period has elapsed.
- A hand-extended workspace keeps its extension even once pricing goes live.
- The assistant cannot read another workspace's booking, and a Viewer is refused
  the money tools both by omission from the tool list and by the tool itself.
