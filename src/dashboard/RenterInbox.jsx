import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import PageSkeleton from "./PageSkeleton";
import EmptyState from "./EmptyState";
import { toast } from "./toastStore";
import usePageTitle from "../hooks/usePageTitle";
import RefreshButton from "../components/RefreshButton";
import {
  fetchRenterConversations,
  fetchRenterThread,
  sendRenterMessage,
  fetchContactableRenters,
  messageRenterFirst,
} from "../lib/api";
import "./fleet.css";
import "./support.css";
import "./inbox.css";
import "./workspace.css";

function fmtTime(value) {
  if (!value) return "";
  const d = new Date(value);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

const fmtDay = (v) =>
  v ? new Date(v).toLocaleDateString("en-KE", { day: "numeric", month: "short" }) : "";

/* Direct messages with renters.

   Renters can write first from the app; the business can too, but only to
   renters with a live trip on its cars — confirmed (waiting to collect) or
   active (waiting to return). Those are listed above the conversations so the
   morning-of-pickup "we're at the gate" message is one click away. */
export default function RenterInbox() {
  usePageTitle("Direct messages");
  const { pathname } = useLocation();

  const [conversations, setConversations] = useState([]);
  const [renters, setRenters] = useState([]);
  const [activeId, setActiveId] = useState(null);
  // A renter with no thread yet: the composer starts one.
  const [newTo, setNewTo] = useState(null);
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const threadRef = useRef(null);

  const loadList = useCallback(async () => {
    try {
      const [data, contactable] = await Promise.all([
        fetchRenterConversations({ limit: 50 }),
        // A backend without the endpoint yet just shows no trip list.
        fetchContactableRenters().catch(() => null),
      ]);
      const list = data?.conversations || [];
      setConversations(list);
      setRenters(contactable?.renters || []);
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

  function openConversation(id) {
    setNewTo(null);
    setActiveId(id);
  }

  function openRenter(r) {
    if (r.conversation_id) {
      openConversation(r.conversation_id);
      return;
    }
    setActiveId(null);
    setThread(null);
    setNewTo(r);
  }

  async function handleSend(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending || (!activeId && !newTo)) return;
    setSending(true);
    try {
      if (newTo) {
        const res = await messageRenterFirst(newTo.client_id, text);
        setDraft("");
        setNewTo(null);
        setActiveId(res.conversation_id);
        toast(`Message sent to ${newTo.client_name || "the renter"}.`);
      } else {
        const msg = await sendRenterMessage(activeId, text);
        setDraft("");
        setThread((t) =>
          t ? { ...t, messages: [...(t.messages || []), msg] } : t
        );
      }
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
  const title = newTo ? newTo.client_name || "Renter" : thread?.client_name || "Conversation";

  return (
    <>
      <h1 className="sr-only">Direct messages</h1>

      <div className="page-refresh">
        <RefreshButton onRefresh={loadList} />
      </div>

      {conversations.length === 0 && renters.length === 0 ? (
        <EmptyState
          minimal
          title="No messages yet"
          message="Renters with a confirmed or active trip appear here, so you can message them first."
        />
      ) : (
        <div className="inbox-grid">
          <section className="panel-card inbox-list">
            {renters.length > 0 && (
              <>
                <header className="card-head">
                  <h2>Renters on a trip</h2>
                  <p>Message them first about pickup or return</p>
                </header>
                {renters.map((r) => (
                  <button
                    type="button"
                    key={r.client_id}
                    className={
                      "inbox-item" +
                      (newTo?.client_id === r.client_id ||
                      (r.conversation_id && r.conversation_id === activeId && !newTo)
                        ? " active"
                        : "")
                    }
                    onClick={() => openRenter(r)}
                  >
                    <div className="inbox-item-head">
                      <strong>{r.client_name || "Renter"}</strong>
                      <span className={`stage-chip stage-${r.stage}`}>
                        {r.stage === "dropoff"
                          ? `Returns ${fmtDay(r.end_date)}`
                          : `Pickup ${fmtDay(r.start_date)}`}
                      </span>
                    </div>
                    <p className="inbox-preview">
                      {r.car_name || "Vehicle"} · {r.booking_ref}
                      {!r.conversation_id && " · no messages yet"}
                    </p>
                  </button>
                ))}
              </>
            )}

            <header className={"card-head" + (renters.length > 0 ? " card-head-second" : "")}>
              <h2>Conversations</h2>
              {unreadTotal > 0 && <p>{unreadTotal} unread</p>}
            </header>
            {conversations.length === 0 && (
              <p className="inbox-preview inbox-none">None yet. Pick a renter above to start one.</p>
            )}
            {conversations.map((c) => (
              <button
                type="button"
                key={c.id}
                className={"inbox-item" + (c.id === activeId && !newTo ? " active" : "")}
                onClick={() => openConversation(c.id)}
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
              <h2>{title}</h2>
              <p>
                {newTo
                  ? `${newTo.car_name || "Vehicle"} · ${newTo.booking_ref} · your first message opens the conversation`
                  : "Replies go out under your business name"}
              </p>
            </header>

            <div className="chat-thread" ref={threadRef}>
              {!newTo &&
                (thread?.messages || []).map((m) => (
                  // The API's "host" side is us; "client" is the renter.
                  <div key={m.id} className={`msg ${m.sender_type === "host" ? "user" : "support"}`}>
                    <p>{m.message}</p>
                    <span className="msg-time">{fmtTime(m.created_at)}</span>
                  </div>
                ))}
              {newTo && (
                <p className="typing">
                  {newTo.stage === "dropoff"
                    ? "They're on the trip now. A note about the return time or place is a good start."
                    : "Say hello and confirm where and when they'll collect the car."}
                </p>
              )}
              {!newTo && thread && (thread.messages || []).length === 0 && (
                <p className="typing">No messages in this conversation yet.</p>
              )}
              {!newTo && !activeId && (
                <p className="typing">Pick a renter or a conversation.</p>
              )}
            </div>

            <form className="chat-composer" onSubmit={handleSend}>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={newTo ? `Message ${newTo.client_name || "the renter"}…` : "Write a reply…"}
                maxLength={2000}
                disabled={!activeId && !newTo}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={sending || !draft.trim() || (!activeId && !newTo)}
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
