import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { subscribe, getState, sendMessage } from "./supportStore";
import "./fleet.css";
import "./bookings.css";
import "./support.css";

const CHANNELS = [
  {
    label: "Email",
    value: "support@ardena.co.ke",
    href: "mailto:support@ardena.co.ke",
  },
  {
    label: "WhatsApp",
    value: "+254 700 000 111",
    href: "https://wa.me/254700000111",
  },
  {
    label: "Phone",
    value: "0700 000 111",
    href: "tel:+254700000111",
  },
];

const FAQS = [
  {
    q: "A customer paid but the booking still shows unpaid",
    a: "M-Pesa confirmations can lag a minute or two. If it's still unpaid after 5 minutes, resend the prompt from the Payments page. Duplicate payments are auto-reversed.",
  },
  {
    q: "How do I add more staff seats?",
    a: "Seats are tied to your plan. Upgrade from Usage & billing, or remove an inactive member under Staff & roles to free a seat.",
  },
  {
    q: "A verification failed but the ID looks valid",
    a: "Ask the customer to retry in good lighting. If it fails twice, message us the booking ref here and we'll review the Dojah check manually.",
  },
];

export default function Support() {
  const { messages, replying } = useSyncExternalStore(subscribe, getState);
  const [draft, setDraft] = useState("");
  const threadRef = useRef(null);

  // keep the newest message in view
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, replying]);

  function handleSend(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    sendMessage(text);
    setDraft("");
  }

  return (
    <div className="details-grid">
      <section className="panel-card chat-card">
        <header className="card-head">
          <h2>Message support</h2>
          <p>Real people, Mon – Sat, 8am – 8pm EAT · usually reply in minutes</p>
        </header>

        <div className="chat-thread" ref={threadRef} aria-live="polite">
          {messages.map((m) => (
            <div key={m.id} className={`msg ${m.from}`}>
              <p>{m.text}</p>
              <span className="msg-time">
                {m.from === "support" ? "Ardena support · " : ""}
                {m.at}
              </span>
            </div>
          ))}
          {replying && <p className="typing">Support is typing…</p>}
        </div>

        <form className="chat-composer" onSubmit={handleSend}>
          <input
            type="text"
            placeholder="Describe the issue, include a booking ref if you have one"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Message support"
          />
          <button type="submit" className="btn btn-primary toolbar-btn" disabled={!draft.trim()}>
            Send
          </button>
        </form>
      </section>

      <div className="details-side">
        <section className="panel-card">
          <header className="card-head">
            <h2>Other channels</h2>
            <p>Prefer not to chat? Reach us here</p>
          </header>
          {CHANNELS.map((c) => (
            <div className="pay-row" key={c.label}>
              <span>{c.label}</span>
              <a className="mini-amount spec-link" href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                {c.value}
              </a>
            </div>
          ))}
          <p className="side-hint">
            Outside business hours, leave a message here. It's first in the
            queue the next morning.
          </p>
        </section>

        <section className="panel-card">
          <header className="card-head">
            <h2>Quick answers</h2>
            <p>The three things people ask most</p>
          </header>
          {FAQS.map((f) => (
            <details className="qa" key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </section>
      </div>
    </div>
  );
}
