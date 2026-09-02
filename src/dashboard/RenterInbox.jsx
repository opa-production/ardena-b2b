import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import PageSkeleton from "./PageSkeleton";
import EmptyState from "./EmptyState";
import { toast } from "./toastStore";
import usePageTitle from "../hooks/usePageTitle";
import {
  fetchRenterConversations,
  fetchRenterThread,
  sendRenterMessage,
} from "../lib/api";
import "./fleet.css";
import "./support.css";
import "./inbox.css";

function fmtTime(value) {
  if (!value) return "";
  const d = new Date(value);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

export default function RenterInbox() {
  usePageTitle("Renter messages");
  const { pathname } = useLocation();

  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const threadRef = useRef(null);

  const loadList = useCallback(async () => {
    try {
      const data = await fetchRenterConversations({ limit: 50 });
      const list = data?.conversations || [];
      setConversations(list);
      // Open the newest thread by default so the page isn't a dead end.
      setActiveId((current) => current ?? list[0]?.id ?? null);
    } catch (err) {
      toast(err.message || "Failed to load messages", "danger");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const loadThread = useCallback(async (id) => {
    if (!id) return;
    try {
      const data = await fetchRenterThread(id, { limit: 200 });
      setThread(data);
      // Opening marks the renter's messages read server-side, so refresh the
      // list to clear the badge rather than leaving it stale.
      setConversations((cs) =>
        cs.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c))
      );
    } catch (err) {
      toast(err.message || "Couldn't open that conversation", "danger");
    }
  }, []);

  useEffect(() => {
    loadThread(activeId);
  }, [activeId, loadThread]);

  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread]);

  async function handleSend(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending || !activeId) return;
    setSending(true);
    try {
      const msg = await sendRenterMessage(activeId, text);
      setDraft("");
      setThread((t) =>
        t ? { ...t, messages: [...(t.messages || []), msg] } : t
      );
      // Reordering by latest activity is the list's whole job.
      loadList();
    } catch (err) {
      toast(err.message || "Message not sent", "danger");
    } finally {
      setSending(false);
    }
  }

  if (loading) return <PageSkeleton path={pathname} />;

  const unreadTotal = conversations.reduce((n, c) => n + (c.unread_count || 0), 0);

  return (
    <>
      <h1 className="sr-only">Renter messages</h1>

      {conversations.length === 0 ? (
        <EmptyState minimal title="No messages yet" />
      ) : (
        <div className="inbox-grid">
          <section className="panel-card inbox-list">
            <header className="card-head">
              <h2>Conversations</h2>
              {unreadTotal > 0 && <p>{unreadTotal} unread</p>}
            </header>
            {conversations.map((c) => (
              <button
                type="button"
                key={c.id}
                className={"inbox-item" + (c.id === activeId ? " active" : "")}
                onClick={() => setActiveId(c.id)}
              >
                <div className="inbox-item-head">
                  <strong>{c.client_name || "Renter"}</strong>
                  <span className="inbox-time">{fmtTime(c.last_message_at)}</span>
                </div>
                <p className="inbox-preview">{c.last_message || "No messages yet"}</p>
                {c.unread_count > 0 && (
                  <span className="inbox-badge">{c.unread_count}</span>
                )}
              </button>
            ))}
          </section>

          <section className="panel-card chat-card">
            <header className="card-head">
              <h2>{thread?.client_name || "Conversation"}</h2>
              <p>Replies go out under your business name</p>
            </header>

            <div className="chat-thread" ref={threadRef}>
              {(thread?.messages || []).map((m) => (
                // The API's "host" side is us; "client" is the renter.
                <div key={m.id} className={`msg ${m.sender_type === "host" ? "user" : "support"}`}>
                  <p>{m.message}</p>
                  <span className="msg-time">{fmtTime(m.created_at)}</span>
                </div>
              ))}
              {thread && (thread.messages || []).length === 0 && (
                <p className="typing">No messages in this conversation yet.</p>
              )}
            </div>

            <form className="chat-composer" onSubmit={handleSend}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a reply…"
                maxLength={2000}
                disabled={!activeId}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={sending || !draft.trim()}
              >
                Send
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
