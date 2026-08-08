import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  fetchSupportThread,
  sendSupportMessage,
  markSupportRead,
  fetchRenterConversations,
} from "../lib/api";
import useRole from "../hooks/useRole";
import { toast } from "./toastStore";
import "./fleet.css";
import "./bookings.css";
import "./support.css";
import "./inbox.css";

function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
}

/* Every conversation with a person, in one place: the Ardena support thread,
   and the renter conversations that used to have their own sidebar entry.
   Product questions go to the Assistant, which has its own page. */
export default function Support() {
  const { can } = useRole();
  const showRenters = can("renterInbox");
  const [conversations, setConversations] = useState([]);
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

  // Renter conversations feed the side rail; roles without inbox access
  // simply don't get the card.
  useEffect(() => {
    if (!showRenters) return;
    fetchRenterConversations({ limit: 8 })
      .then((d) => setConversations(d?.conversations || []))
      .catch(() => {});
  }, [showRenters]);

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
              <div className="sk-chat" style={{ padding: "16px 0" }}>
                {[{ w: "52%" }, { w: "40%", r: true }, { w: "58%" }, { w: "34%", r: true }].map((b, i) => (
                  <span key={i} className={`sk sk-bubble${b.r ? " right" : ""}`} style={{ width: b.w }} />
                ))}
              </div>
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
        {showRenters && (
          <section className="panel-card">
            <header className="card-head mini-payments-head">
              <div>
                <h2>Renter messages</h2>
                <p>Questions from renters on the Ardena app</p>
              </div>
              {conversations.length > 0 && (
                <Link className="head-link" to="/dashboard/renter-messages">
                  Open inbox
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              )}
            </header>

            {conversations.length === 0 ? (
              <p className="side-hint">
                When a renter asks about one of your listed vehicles, the
                conversation shows up here.
              </p>
            ) : (
              conversations.map((c) => (
                <Link
                  className="inbox-item"
                  key={c.id}
                  to="/dashboard/renter-messages"
                >
                  <div className="inbox-item-head">
                    <strong>{c.client_name || "Renter"}</strong>
                    <span className="inbox-time">{fmtTime(c.last_message_at)}</span>
                  </div>
                  <p className="inbox-preview">{c.last_message || "No messages yet"}</p>
                  {c.unread_count > 0 && (
                    <span className="inbox-badge">{c.unread_count}</span>
                  )}
                </Link>
              ))
            )}
          </section>
        )}
      </div>
    </div>
  );
}
