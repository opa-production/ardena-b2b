// In-memory support chat (mock backend), same pattern as the other stores.
// Replies are canned until the real support desk is wired in — the thread
// survives navigation within a session.

const timeNow = () =>
  new Date().toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });

let state = {
  messages: [
    {
      id: 1,
      from: "support",
      text: "Hi! You're chatting with Ardena support. How can we help today?",
      at: timeNow(),
    },
  ],
  replying: false,
};

let nextId = 2;

const REPLIES = [
  "Thanks — we've got your message. An agent typically replies in under 5 minutes.",
  "Noted. We're looking into it and will get back to you right here.",
  "Got it. If it's urgent, you can also call us on 0700 000 111 while we check.",
];

let replyIndex = 0;

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
  state = {
    ...state,
    replying: true,
    messages: [
      ...state.messages,
      { id: nextId++, from: "user", text, at: timeNow() },
    ],
  };
  emit();

  setTimeout(() => {
    state = {
      replying: false,
      messages: [
        ...state.messages,
        {
          id: nextId++,
          from: "support",
          text: REPLIES[replyIndex++ % REPLIES.length],
          at: timeNow(),
        },
      ],
    };
    emit();
  }, 1400);
}
