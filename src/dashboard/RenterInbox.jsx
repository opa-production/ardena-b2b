import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import PageSkeleton from "./PageSkeleton";
import EmptyState from "./EmptyState";
import { toast } from "./toastStore";
import usePageTitle from "../hooks/usePageTitle";
import useDictation from "../hooks/useDictation";
import { MicIcon, SendIcon } from "./supportArt";
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
  const { pathname, state: navState } = useLocation();
  // Arriving from a booking's "Message" button: open that renter once loaded.
  const openClientRef = useRef(navState?.clientId ?? null);

  const [conversations, setConversations] = useState([]);
  const [renters, setRenters] = useState([]);
  const [activeId, setActiveId] = useState(null);
  // A renter with no thread yet: the composer starts one.
  const [newTo, setNewTo] = useState(null);
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const threadRef = useRef(null);
  // A thread we just created locally: its first load would only replace the
  // optimistic bubble with the same message, so it's skipped (no flicker).
  const skipLoadRef = useRef(null);

  const { supported: canDictate, listening, toggle: toggleDictation } = useDictation({
    value: draft,
    onChange: setDraft,
    onError: (kind) =>
      toast(
        kind === "blocked"
          ? "Microphone blocked. Allow it in your browser to dictate."
          : "Couldn't hear that. Try again or type it.",
        "warn"
      ),
  });

  const loadList = useCallback(async () => {
    try {
      const [data, contactable] = await Promise.all([
        fetchRenterConversations({ limit: 50 }),
        // A backend without the endpoint yet just shows no trip list.
        fetchContactableRenters().catch(() => null),
      ]);
      const list = data?.conversations || [];
      setConversations(list);
      const trip = contactable?.renters || [];
      setRenters(trip);
      const wanted = openClientRef.current;
      if (wanted != null) {
        openClientRef.current = null;
        const r = trip.find((x) => x.client_id === wanted);
        const c = list.find((x) => x.client_id === wanted);
        if (r && !r.conversation_id) {
          setNewTo(r);
          return;
        }
        if (c || r) {
          setActiveId(c?.id ?? r.conversation_id);
          return;
        }
      }
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
    if (activeId && skipLoadRef.current === activeId) {
      skipLoadRef.current = null;
      return;
    }
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

  /* Optimistic: the bubble appears the moment Send is pressed, marked
     "Sending…", and the request runs behind it. On success the bubble is
     swapped for the saved message in place — same position, no reload — and a
     toast confirms delivery. On failure it's removed and the text handed back. */
  async function handleSend(e) {
    e.preventDefault();
    const text = draft.trim();
    const to = newTo;
    const convId = activeId;
    if (!text || (!convId && !to)) return;

    const tempId = `opt-${Date.now()}`;
    const optimistic = {
      id: tempId,
      sender_type: "host",
      message: text,
      created_at: new Date().toISOString(),
      pending: true,
    };
    setDraft("");
    setThread((t) =>
      to
        ? { client_name: to.client_name, messages: [...(t?.messages || []), optimistic] }
        : t ? { ...t, messages: [...(t.messages || []), optimistic] } : t
    );
    const swap = (saved) =>
      setThread((t) =>
        t ? { ...t, messages: t.messages.map((m) => (m.id === tempId ? saved : m)) } : t
      );
    const name = (to?.client_name || thread?.client_name || "the renter").split(" ")[0];

    try {
      if (to) {
        const res = await messageRenterFirst(to.client_id, text);
        skipLoadRef.current = res.conversation_id;
        swap(res.message);
        setNewTo(null);
        setActiveId(res.conversation_id);
        // The new conversation and the renter's link to it come from the server.
        loadList();
      } else {
        const saved = await sendRenterMessage(convId, text);
        swap(saved);
        // Move this conversation to the top with its new preview, locally.
        setConversations((cs) => {
          const hit = cs.find((c) => c.id === convId);
          if (!hit) return cs;
          const updated = { ...hit, last_message: text, last_message_at: saved.created_at };
          return [updated, ...cs.filter((c) => c.id !== convId)];
        });
      }
      toast(`Delivered to ${name}.`);
    } catch (err) {
      setThread((t) =>
        t ? { ...t, messages: t.messages.filter((m) => m.id !== tempId) } : t
      );
      setDraft((d) => d || text);
      toast(err.message || "Message not sent", "danger");
    }
  }

  if (loading) return <PageSkeleton path={pathname} />;

  const unreadTotal = conversations.reduce((n, c) => n + (c.unread_count || 0), 0);
  const title = newTo ? newTo.client_name || "Renter" : thread?.client_name || "Conversation";

  if (conversations.length === 0 && renters.length === 0) {
    return (
      <>
        <h1 className="sr-only">Direct messages</h1>
        <div className="page-refresh">
          <RefreshButton onRefresh={loadList} />
        </div>
        <EmptyState
          minimal
          title="No messages yet"
          message="Renters with a confirmed or active trip appear here, so you can message them first."
        />
      </>
    );
  }

  /* Same frame as Message support: edge to edge and full height. The list is
     a panel down the left, not a card; the conversation takes the rest. */
  return (
    <div className="dm-page">
      <h1 className="sr-only">Direct messages</h1>

      <aside className="dm-list" aria-label="Renters and conversations">
        <div className="dm-list-head">
          <div>
            <h2>Direct messages</h2>
            <p>{unreadTotal > 0 ? `${unreadTotal} unread` : "Renters on the Ardena app"}</p>
          </div>
          <RefreshButton onRefresh={loadList} label={false} />
        </div>

        <div className="dm-list-scroll">
          {renters.length > 0 && (
            <>
              <p className="dm-section">Renters on a trip</p>
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

          <p className="dm-section">Conversations</p>
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
              {c.unread_count > 0 && <span className="inbox-badge">{c.unread_count}</span>}
            </button>
          ))}
        </div>
      </aside>

      <section className="support-page dm-chat">
        <header className="support-head">
          <div>
            <h2>{title}</h2>
            <p>
              {newTo
                ? `${newTo.car_name || "Vehicle"} · ${newTo.booking_ref} · your first message opens the conversation`
                : "Replies go out under your business name"}
            </p>
          </div>
        </header>

        <div className="chat-thread" ref={threadRef}>
          {(thread?.messages || []).map((m) => (
              // The API's "host" side is us; "client" is the renter.
              <div
                key={m.id}
                className={`msg ${m.sender_type === "host" ? "user" : "support"}${m.pending ? " is-pending" : ""}`}
              >
                <p>{m.message}</p>
                <span className="msg-time">{m.pending ? "Sending…" : fmtTime(m.created_at)}</span>
              </div>
            ))}
          {newTo && !(thread?.messages || []).length && (
            <p className="typing">
              {newTo.stage === "dropoff"
                ? "They're on the trip now. A note about the return time or place is a good start."
                : "Say hello and confirm where and when they'll collect the car."}
            </p>
          )}
          {!newTo && thread && (thread.messages || []).length === 0 && (
            <p className="typing">No messages in this conversation yet.</p>
          )}
          {!newTo && !activeId && <p className="typing">Pick a renter or a conversation.</p>}
        </div>

        <form className="chat-composer" onSubmit={handleSend}>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              listening
                ? "Listening…"
                : newTo
                  ? `Message ${newTo.client_name || "the renter"}…`
                  : "Write a reply…"
            }
            maxLength={2000}
            disabled={!activeId && !newTo}
            aria-label="Message the renter"
          />

          {canDictate && (
            <button
              type="button"
              className={"composer-btn" + (listening ? " is-live" : "")}
              onClick={toggleDictation}
              disabled={!activeId && !newTo}
              aria-label={listening ? "Stop dictating" : "Dictate your message"}
              aria-pressed={listening}
              title={listening ? "Stop dictating" : "Speak instead of typing"}
            >
              <MicIcon />
            </button>
          )}

          <button
            type="submit"
            className="composer-btn composer-send"
            disabled={!draft.trim() || (!activeId && !newTo)}
            aria-label="Send message"
            title="Send"
          >
            <SendIcon />
          </button>
        </form>
      </section>
    </div>
  );
}
