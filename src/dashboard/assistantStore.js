/* Assistant chat state, backed by the live agent (ai.md).
 *
 * Same store shape as the other modules: a module-level state object, a
 * listener set, and useSyncExternalStore on the page.
 *
 * The reply streams. A placeholder agent message goes in as soon as the turn
 * starts and its text grows token by token, so the page renders progress
 * without knowing anything about SSE. `conversationId` is whatever the server
 * handed back in the `meta` frame — it is held for the session and deliberately
 * not persisted: the transcript belongs to the backend, and the UI is one
 * conversation with one assistant, not a thread list.
 *
 * The local knowledge base it used to answer from is gone. Everything it knows
 * now comes from the server, which can see the workspace; a client-side guess
 * that disagreed would be worse than no answer.
 */
import { streamAssistant } from "../lib/api";

let nextId = 1;

/* Starts genuinely empty. The thread used to be seeded with a greeting the
   panel then hid and sliced past — a sentinel that existed only so "is this a
   fresh thread" could be asked as `length === 1`. An empty array asks it
   honestly, and the panel's empty state says the same thing the greeting did
   in fewer words. */
let state = {
  messages: [],
  thinking: false, // a turn is in flight
  checking: null, // the tool the server is running, for the "checking…" line
  escalated: false, // this thread is with a person now; stop taking questions
  offline: false, // no model key configured server-side (503)
};

// Server-assigned, per ai.md §1. Session-lived: closing the drawer keeps it,
// reloading starts a new chat.
let conversationId = null;
let abort = null;

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

export function sendMessage(text) {
  const clean = text.trim();
  if (!clean || state.thinking || state.escalated) return;

  // The agent bubble goes in empty and fills as tokens arrive, so there is
  // never a moment where a reply exists but has nowhere to render.
  const replyId = nextId + 1;
  state = {
    ...state,
    thinking: true,
    checking: null,
    messages: [
      ...state.messages,
      { id: nextId++, from: "user", text: clean, at: new Date().toISOString(), to: null },
      { id: nextId++, from: "agent", text: "", at: new Date().toISOString(), to: null },
    ],
  };
  emit();

  const patchReply = (fn) => {
    state = {
      ...state,
      messages: state.messages.map((m) => (m.id === replyId ? fn(m) : m)),
    };
  };

  const finish = (extra = {}) => {
    abort = null;
    state = { ...state, thinking: false, checking: null, ...extra };
    // An error before the first token leaves an empty bubble; drop it rather
    // than render a blank message from the assistant.
    state = {
      ...state,
      messages: state.messages.filter((m) => m.id !== replyId || m.text),
    };
    emit();
  };

  abort = streamAssistant({
    message: clean,
    conversationId,
    on: {
      meta: (d) => {
        if (d?.conversation_id) conversationId = d.conversation_id;
      },
      // ai.md §1: the pause before the first token is real, so say what is
      // being looked at rather than leaving it silent.
      tool: (d) => {
        state = { ...state, checking: d?.name || null };
        emit();
      },
      token: (d) => {
        if (!d?.text) return;
        patchReply((m) => ({ ...m, text: m.text + d.text }));
        // The first token is the answer starting; the "checking" line has done
        // its job and would otherwise sit under a reply already being written.
        state = { ...state, checking: null };
        emit();
      },
      done: (d) => {
        if (d?.escalated) {
          finish({ escalated: true });
        } else {
          finish();
        }
      },
      error: (d) => {
        const offline = d?.status === 503;
        patchReply((m) => ({
          ...m,
          text: m.text || d?.detail || "Something went wrong.",
        }));
        finish({ offline });
      },
    },
  });
}

/** Abandon the turn in flight — the drawer closing, or the page unmounting. */
export function cancelTurn() {
  abort?.();
  abort = null;
  if (state.thinking) {
    state = { ...state, thinking: false, checking: null };
    emit();
  }
}
