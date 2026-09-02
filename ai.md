# The workspace assistant

The AI assistant inside Ardena for Business. It answers a staff member's
questions about their own workspace — where a booking stands, what is unpaid,
which chauffeur is free, whether the verification wallet covers today's checks —
and hands the thread to a person when it shouldn't answer.

For the frontend team: **§1 and §2 are the whole contract.** The rest explains
what it can see and why, which matters when a reply looks wrong.

---

## 0. What it is, and what it is not

It **reads**. It cannot create a booking, take a payment, record cash, assign a
chauffeur, add a settlement account or top up the wallet. Asked to, it says
where in the dashboard to do it. There is no write path in the tool set at all,
so a request to change something cannot succeed by accident.

It sees **one workspace** — the caller's. Not other businesses, not the consumer
app's side of a marketplace booking. That is enforced by construction: the
business id is a closure argument the model never sees and there is no tool
parameter through which another one could be named.

It respects **roles**. A Viewer or a Booking agent gets no money tools at all,
and the tools refuse a second time internally. An assistant that quietly widens
someone's access is a permission system with a chat box bolted to the side.

Distinct from **Support** (`/b2b/support/messages`), which is the thread a human
at Ardena reads. The assistant posts into that thread once, when it hands off.

---

## 1. Ask it something

```
POST /api/v1/b2b/assistant/stream
Authorization: Bearer <access_token>

{ "message": "what's collecting today?", "conversation_id": 42 }
```

`conversation_id` is optional — omit it to start a new chat. The response is
`text/event-stream`. Read it with `EventSource` or a fetch reader; do not wait
for the body to finish.

### Frames

| Event | Payload | What to do |
|---|---|---|
| `meta` | `{ conversation_id }` | Always first. Store it for the next turn. |
| `tool` | `{ name }` | A lookup started. Show a subtle "checking…" — the pause before the first token is real. |
| `token` | `{ text }` | Append to the reply as it renders. |
| `error` | `{ detail, status }` | Show `detail`. The stream ends here. |
| `done` | see below | Turn finished. |

```json
// done
{
  "conversation_id": 42,
  "requires_human": false,
  "tools_found_nothing": [],
  "escalated": false,
  "escalation_reason": null
}
```

When `escalated` is true the thread is with Ardena support — say so, and point
at Support rather than inviting another question.

Comment frames (`: ping`) arrive every ~10s while the model thinks. Every SSE
parser drops them; they exist so proxies and mobile radios do not decide an idle
connection is dead.

**Errors arrive as frames, not status codes.** The response is already `200` by
the time anything can go wrong, so a `503` (assistant offline) or `504` (turn
too slow) comes through as an `error` frame. Handle it there, not in a `.catch`.

Rate limited to **20 requests a minute** per client address.

### Other endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/b2b/assistant/conversations` | Chats in this workspace, most recent first. `{ data, total }` |
| GET | `/b2b/assistant/conversation/{id}` | One chat with its messages |
| POST | `/b2b/assistant/conversation/{id}/close` | Close a chat |

Conversation objects carry `id`, `status` (`active` \| `escalated` \| `closed`),
`escalated_at`, `escalation_reason`, `started_by`, `last_message_at`, and
`messages[]` of `{ id, role, content, created_at }` where `role` is `user` or
`assistant`. Tool rows are stored for audit and never returned.

**Chats are workspace-wide, not per user.** The manager coming on shift can read
what the morning shift asked. `started_by` names whoever opened it.

---

## 2. What to build around it

- A message list, an input, and a "checking…" state driven by `tool` frames.
- Show `started_by` on threads someone else opened — it will not always be the
  reader.
- On `escalated`, switch the composer for a line pointing at Support.
- On an `error` frame with status `503`, the assistant is offline; the rest of
  the dashboard is fine. Say so, and offer Support.

Nothing else. There is no unread badge, no push, no typing indicator to build.

---

## 3. What it can look up

Every one of these is scoped to the caller's business.

| Tool | Answers | Roles |
|---|---|---|
| `look_up_help` | How the dashboard works, the launch terms | all |
| `get_booking` | One booking, including what is blocking handover | all |
| `find_bookings` | Search by status, payment status, customer, plate | all |
| `get_today` | Pickups, returns, and overdue returns | all |
| `get_fleet` | Vehicles, and which are out right now | all |
| `get_chauffeurs` | The roster, plus licences expiring within 30 days | all |
| `find_client` | A renter by name or phone | all |
| `get_finances` | Collected, cash, refunds, outstanding | Owner, Finance, Manager |
| `get_billing` | Free-period status and end date | Owner, Finance, Manager |
| `get_wallet` | Balance and checks remaining | Owner, Finance, Manager |
| `get_settlement_accounts` | Which accounts, **masked** | Owner, Finance |
| `hand_off_to_human` | Escalate the thread | all |

Three of these are worth knowing about in detail.

**`get_fleet` computes occupancy from live bookings**, not from
`B2BVehicle.status`. A vehicle can be taken through either channel and the
marketplace mirror is written by the consumer app, which knows nothing about
fleet columns — trusting the column reports free cars that are on the road.

**`get_finances` never returns a combined total.** Money collected through
Ardena and cash taken at the counter come back as separate fields, because only
the first settles to the business's settlement account. There is no field that
adds them, so there is nothing to misread.

**`get_settlement_accounts` masks account numbers** to the last four digits. A
chat transcript is stored and read over shoulders, and confirming *which*
account is set does not need the full number.

---

## 4. When it hands off

Two paths, and the second exists because the first is not reliable.

The model can call `hand_off_to_human` itself. Separately, the server escalates
regardless of what the model did when:

- the message asks for a person, in any wording (matched server-side)
- the topic is one no assistant should close: damage, an accident, a theft, a
  disputed charge, a suspended workspace, or a question about what the dashboard
  will cost once pricing is announced

A model that ignores its instructions would otherwise never hand off the request
most likely to be urgent.

The handoff posts **one summary** into `b2b_support_messages` — the same thread
the Support screen shows and the admin console reads. Not a transcript: a person
picking it up needs what was asked and what was already checked, and forty turns
of chat is not that.

A permission refusal is deliberately **not** an escalation. A Viewer asking about
revenue needs their own Owner to change their role; routing that to Ardena
support would fill the queue with other people's settings.

---

## 5. Configuration

Shares the consumer agent's provider setup — same keys, same routing controls,
same privacy posture. Nothing new to set.

| Var | Purpose |
|---|---|
| `LLM_PROVIDER` | `deepseek` or `openrouter`. Defaults to DeepSeek when its key is set |
| `DEEPSEEK_API_KEY` / `DEEPSEEK_MODEL` | The paid, non-queuing path |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODEL` | The fallback |
| `OPENROUTER_ALLOW_DATA_COLLECTION` | Leave `false` — the published privacy policy lists Ardena's sub-processors |

**With no key configured the assistant is offline and the rest of the API is
unaffected.** It is one feature, not a startup dependency. Callers get a `503`
in an `error` frame pointing them at Support.

---

## 6. Where it lives

```
app/agent/b2b/
  knowledge.py   how the dashboard works + the launch terms — no DB, no network
  tools.py       read-only lookups, every one scoped to one business
  escalation.py  handing a thread to a person
  prompts.py     the system prompt
  graph.py       model + tools, and the tenant/role closure
app/b2b/assistant.py   the SSE router and the conversation endpoints
```

Layered so each piece is testable without the one above it. `knowledge.py` needs
no database; `tools.py` needs no model.

**If a figure in `knowledge.py` disagrees with `app/b2b/billing.py`,
billing.py is right and knowledge.py is a bug.** The knowledge base holds the
launch terms because staff ask about them constantly and a lookup would be a
round trip to fetch a constant — but anything that varies per workspace is a
tool, deliberately. A model handed a plausible constant quotes it instead of
calling the tool.
