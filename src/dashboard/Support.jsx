import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchSupportThread,
  sendSupportMessage,
  markSupportRead,
} from "../lib/api";
import { toast } from "./toastStore";
import "./fleet.css";
import "./bookings.css";
import "./support.css";

const CHANNELS = [
  { label: "Email", value: "support@ardena.co.ke", href: "mailto:support@ardena.co.ke" },
  { label: "WhatsApp", value: "+254 700 000 111", href: "https://wa.me/254700000111" },
  { label: "Phone", value: "0700 000 111", href: "tel:+254700000111" },
];

const FAQS = [
  {
    q: "A customer paid but the booking still shows unpaid",
    a: "Paystack confirmations can take a minute or two via webhook. If it's still unpaid after 5 minutes, resend the payment link from the Payments page.",
  },
  {
    q: "How do I add more staff seats?",
    a: "Seats are unlimited on the Fleet plan. Invite teammates from the Staff & roles page — no limit applies.",
  },
  {
    q: "A verification failed but the ID looks valid",
    a: "Ask the customer to retry. If it fails twice, message us the booking ref here and we'll review the Dojah check manually.",
  },
];

function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
}

export default function Support() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const threadRef = useRef(null);

  const load = useCallback(async (markRead = false) => {
    try {
      const data = await fetchSupportThread();
      setMessages(data.messages || []);
      if (markRead && (data.unread_count ?? 0) > 0) {
        await markSupportRead();
      }
    } catch {
      // silent on background polls
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + mark read; then poll for new replies every 15 s
  useEffect(() => {
    load(true);
    const id = setInterval(() => load(true), 15_000);
    return () => clearInterval(id);
  }, [load]);

  // Keep newest message in view
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    // Optimistic: add the message immediately so the UI feels instant
    const optimistic = {
      id: `opt-${Date.now()}`,
      from: "user",
      text,
      read: true,
      at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");

    try {
      const saved = await sendSupportMessage(text);
      // Replace the optimistic entry with the real one
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? saved : m))
      );
    } catch (err) {
      // Rollback the optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(text);
      toast(err.message || "Failed to send message", "danger");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="details-grid">
      <section className="panel-card chat-card">
        <header className="card-head">
          <h2>Message support</h2>
          <p>Real people, Mon – Sat, 8am – 8pm EAT · usually reply in minutes</p>
        </header>

        <div className="chat-thread" ref={threadRef} aria-live="polite">
          {loading && messages.length === 0 && (
            <p className="typing">Loading messages…</p>
          )}
          {messages.map((m) => (
            <div key={m.id} className={`msg ${m.from}`}>
              <p>{m.text}</p>
              <span className="msg-time">
                {m.from === "support" ? "Ardena support · " : ""}
                {fmtTime(m.at)}
              </span>
            </div>
          ))}
        </div>

        <form className="chat-composer" onSubmit={handleSend}>
          <input
            type="text"
            placeholder="Describe the issue, include a booking ref if you have one"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="Message support"
            disabled={sending}
          />
          <button
            type="submit"
            className="btn btn-primary toolbar-btn"
            disabled={!draft.trim() || sending}
          >
            {sending ? "Sending…" : "Send"}
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
              <a
                className="mini-amount spec-link"
                href={c.href}
                target={c.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
              >
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
