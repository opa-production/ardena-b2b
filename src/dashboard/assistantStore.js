/* Assistant chat state + the stand-in agent.
 *
 * Same store shape as the other modules: a module-level state object, a
 * listener set, and useSyncExternalStore on the page. The thread lives for the
 * session only — it is not persisted, because once the backend agent ships the
 * transcript belongs to it (see docs/backend-new-modules.md §G).
 *
 * `reply()` is the single seam between this mock and the real thing. When the
 * endpoint exists, swap its body for `await sendAssistantMessage(text)` and
 * nothing else on the page has to change.
 */
import { getVehicles } from "./fleetStore";
import { getBookings } from "./bookingsStore";
import { getClients } from "./clientsStore";
import { getBusiness } from "./businessStore";
import { TOPICS, GREETING, FALLBACK } from "./assistantKnowledge";

let nextId = 2;

let state = {
  messages: [
    { id: 1, from: "agent", text: GREETING, at: new Date().toISOString(), to: null },
  ],
  thinking: false,
};

const listeners = new Set();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getState() {
  return state;
}

/* ---- Live workspace answers ----
   Questions about the user's own data are answered from the stores rather than
   the static corpus, so "what's in my fleet" is true rather than generic. */

function workspaceAnswer(q) {
  const vehicles = getVehicles();
  const bookings = getBookings();

  const asksFleet = /\b(my|our)\b.*\b(fleet|vehicle|car)/.test(q) ||
    /how many (vehicles|cars)/.test(q) ||
    /what'?s in my fleet/.test(q);
  if (asksFleet) {
    if (!vehicles.length) {
      return {
        text: "Your fleet is empty right now. Add your first vehicle and it becomes bookable as soon as it has a rate and is marked available.",
        to: { label: "Add a vehicle", path: "/dashboard/fleet/new" },
      };
    }
    const available = vehicles.filter((v) => v.status === "Available").length;
    return {
      text: `You have ${vehicles.length} vehicle${vehicles.length === 1 ? "" : "s"} registered, ${available} of them marked available.`,
      to: { label: "Open fleet", path: "/dashboard/fleet" },
    };
  }

  const asksBookings = /\b(my|our)\b.*booking/.test(q) || /how many bookings/.test(q);
  if (asksBookings) {
    if (!bookings.length) {
      return {
        text: "You have no bookings yet. Create one from Bookings → New booking and Ardena will check availability for you.",
        to: { label: "Create a booking", path: "/dashboard/bookings/new" },
      };
    }
    const live = bookings.filter((b) => b.status === "Confirmed" || b.status === "Active").length;
    return {
      text: `You have ${bookings.length} booking${bookings.length === 1 ? "" : "s"} on record, ${live} currently confirmed or active.`,
      to: { label: "Open bookings", path: "/dashboard/bookings" },
    };
  }

  if (/how many (clients|customers)/.test(q) || /\b(my|our)\b.*(client|customer)/.test(q)) {
    const clients = getClients();
    return {
      text: `You have ${clients.length} client${clients.length === 1 ? "" : "s"} on file.`,
      to: { label: "Open clients", path: "/dashboard/clients" },
    };
  }

  return null;
}

/* ---- Topic matching ----
   Score each topic by how many of its keywords appear, longest keyword wins
   ties so "payment prompt" beats a bare "pay". Good enough to feel responsive;
   the real agent replaces it wholesale. */

function topicAnswer(q) {
  let best = null;
  let bestScore = 0;

  for (const topic of TOPICS) {
    let score = 0;
    for (const kw of topic.keywords) {
      if (q.includes(kw)) score += kw.length;
    }
    if (score > bestScore) {
      bestScore = score;
      best = topic;
    }
  }

  if (!best) return null;
  return { text: best.answer, to: best.to };
}

function reply(text) {
  const q = text.toLowerCase();

  if (/^(hi|hey|hello|howdy)\b/.test(q.trim())) {
    const name = getBusiness().name;
    return {
      text: `Hi${name ? `, ${name}` : ""} — what would you like to know? I can explain how any part of Ardena works, or look at what's in your workspace.`,
      to: null,
    };
  }

  return workspaceAnswer(q) || topicAnswer(q) || { text: FALLBACK, to: null };
}

export function sendMessage(text) {
  const clean = text.trim();
  if (!clean || state.thinking) return;

  state = {
    ...state,
    thinking: true,
    messages: [
      ...state.messages,
      { id: nextId++, from: "user", text: clean, at: new Date().toISOString(), to: null },
    ],
  };
  emit();

  // A beat of "thinking" so the exchange reads like a conversation rather
  // than an instant lookup — and so the swap to a real (slower) agent is
  // not a visible regression.
  setTimeout(() => {
    const { text: answer, to } = reply(clean);
    state = {
      ...state,
      thinking: false,
      messages: [
        ...state.messages,
        { id: nextId++, from: "agent", text: answer, at: new Date().toISOString(), to },
      ],
    };
    emit();
  }, 650);
}

export function clearThread() {
  nextId = 2;
  state = {
    messages: [
      { id: 1, from: "agent", text: GREETING, at: new Date().toISOString(), to: null },
    ],
    thinking: false,
  };
  emit();
}
