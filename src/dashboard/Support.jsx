import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchSupportThread,
  sendSupportMessage,
  markSupportRead,
} from "../lib/api";
import { toast } from "./toastStore";
import useDictation from "../hooks/useDictation";
import {
  AttachIcon,
  MicIcon,
  SendIcon,
  SupportIllustration,
} from "./supportArt";
import "./fleet.css";
import "./bookings.css";
import "./support.css";
import "./inbox.css";

/* What a thread looks like, cheaply. Two polls that return the same
   conversation produce the same string, which is how an unchanged thread gets
   left alone instead of being re-rendered every 15 seconds. The text is part
   of it because a support reply can be edited in place without its id
   changing. */
function signature(messages) {
  return messages.map((m) => `${m.id}:${m.text}`).join("|");
}

function fmtTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
}

/* Talking to a human at Ardena. Product questions go to the assistant, which
   rides along in a slide-over on every page.

   The renter-message rail that used to sit beside this thread is gone: those
   conversations are a consumer-app surface, deferred with the rest of B2C, and
   a column reserved for something switched off is just a hole in the page. */
export default function Support() {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const threadRef = useRef(null);
  // Read inside the poll tick, so the interval doesn't depend on render state.
  const sendingRef = useRef(false);
  // The last message the scroll effect has already reacted to.
  const lastSeenRef = useRef(null);

  const {
    supported: canDictate,
    listening,
    toggle: toggleDictation,
  } = useDictation({
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

  /* Poll the thread without redrawing it.
   *
   * The reply arrives by polling, so this runs every 15 seconds whether or not
   * anything changed — and it used to replace the message array every time.
   * Same content, new object identities: React rebuilt every bubble, the
   * scroll effect below fired, and the thread jumped. That was the flicker.
   *
   * Two guards fix it. The signature says whether the server's thread differs
   * from what is already on screen, and state is left untouched when it
   * doesn't; and a message sent but not yet acknowledged is merged back in, so
   * a poll landing mid-send can never make a bubble the user just watched
   * appear disappear again. */
  const load = useCallback(async (markRead = false) => {
    try {
      const data = await fetchSupportThread();
      const incoming = data.messages || [];
      setMessages((prev) => {
        // still-unacknowledged optimistic sends, in the order they were made
        const pending = prev.filter((m) => m.pending);
        const next = pending.length ? [...incoming, ...pending] : incoming;
        return signature(next) === signature(prev) ? prev : next;
      });
      if (markRead && (data.unread_count ?? 0) > 0) {
        await markSupportRead();
      }
    } catch {
      // silent on background polls
    } finally {
      setLoading(false);
    }
  }, []);

  /* Initial load and mark-read, then a poll every 15 s.
   *
   * Skipped while the tab is hidden — a background tab that keeps polling
   * builds up nothing anyone is reading — and while a send is in flight, so a
   * poll and the message it might clobber never race. The `sending` ref is
   * read inside the tick rather than closed over, so the interval is set up
   * once instead of being rebuilt whenever that state changes. */
  useEffect(() => {
    load(true);
    const id = setInterval(() => {
      if (document.hidden || sendingRef.current) return;
      load(true);
    }, 15_000);
    // A tab coming back to the front is the one moment a stale thread is
    // actually noticed, so catch up immediately rather than waiting out the
    // rest of the interval.
    function onVisible() {
      if (!document.hidden && !sendingRef.current) load(true);
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  /* Keep the newest message in view — but only when there is a new message,
     and only if the reader is already at the foot of the thread. Yanking
     someone back down while they are reading their way up through a
     conversation was the other half of what felt broken here. */
  useEffect(() => {
    const el = threadRef.current;
    if (!el) return;
    const last = messages[messages.length - 1];
    const lastId = last ? String(last.id) : null;
    if (lastId === lastSeenRef.current) return;

    const follow =
      lastSeenRef.current === null ||
      el.scrollHeight - el.scrollTop - el.clientHeight < 120 ||
      last?.from === "user"; // your own message always pulls the view down

    lastSeenRef.current = lastId;
    if (follow) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    sendingRef.current = true;
    /* Optimistic, and marked `pending` so a poll landing before the server
       answers carries it across instead of dropping it (see `load`). */
    const optimistic = {
      id: `opt-${Date.now()}`,
      from: "user",
      text,
      read: true,
      at: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");

    try {
      const saved = await sendSupportMessage(text);
      // Swap the optimistic entry for the real one, keeping its position.
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? saved : m)));
    } catch (err) {
      // Rollback, and hand the text back rather than making them retype it.
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(text);
      toast(err.message || "Failed to send message", "danger");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  /* No card. The conversation is the page: it runs from the sidebar to the
     right edge and from the top of the content area to the bottom, with the
     composer floating over the foot of it. A chat boxed inside a panel with a
     gutter around it reads as a widget; this reads as the thing you came for.
     Renter messages, when the B2C launch brings them back, get their own route
     rather than a column stealing a third of this one. */
  /* Only a reply from a person is worth interrupting a screen reader for —
     your own message was just typed, and you know it went. */
  const newest = messages[messages.length - 1];
  const announcement =
    newest && newest.from === "support" ? `Ardena support: ${newest.text}` : "";

  return (
    <div className="support-page">
      <header className="support-head">
        <div>
          <h2>Message support</h2>
          <p>Real people, Mon to Sat, 8am to 8pm EAT · usually reply in minutes</p>
        </div>
      </header>

      {/* No aria-live on the thread itself: it re-announced the whole
          conversation on every poll. The newest message is announced on its
          own from the live region at the foot of the thread. */}
      <div className="chat-thread" ref={threadRef}>
      {loading && messages.length === 0 && (
        <div className="sk-chat" style={{ padding: "16px 0" }}>
          {[{ w: "52%" }, { w: "40%", r: true }, { w: "58%" }, { w: "34%", r: true }].map((b, i) => (
            <span key={i} className={`sk sk-bubble${b.r ? " right" : ""}`} style={{ width: b.w }} />
          ))}
        </div>
      )}
      {!loading && messages.length === 0 && (
        <div className="chat-empty">
          <SupportIllustration />
          <p className="chat-empty-title">No messages yet</p>
          <p className="chat-empty-note">
            Tell us what is going on and a person will reply.
          </p>
        </div>
      )}
      {messages.map((m) => (
        <div key={m.id} className={`msg ${m.from}` + (m.pending ? " is-sending" : "")}>
          <p>{m.text}</p>
          <span className="msg-time">
            {m.from === "support" ? "Ardena support · " : ""}
            {fmtTime(m.at)}
          </span>
        </div>
      ))}

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
          </div>

          <form className="chat-composer" onSubmit={handleSend}>
      <button
        type="button"
        className="composer-btn"
        aria-label="Attach a file"
        title="Attach a file (coming soon)"
        disabled
      >
        <AttachIcon />
      </button>

      <input
        type="text"
        placeholder={
          listening ? "Listening…" : "Describe the issue, include a booking ref if you have one"
        }
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        aria-label="Message support"
      />

      {canDictate && (
        <button
          type="button"
          className={"composer-btn" + (listening ? " is-live" : "")}
          onClick={toggleDictation}
          disabled={sending}
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
        disabled={!draft.trim() || sending}
        aria-label={sending ? "Sending" : "Send message"}
        title="Send"
      >
        <SendIcon />
      </button>
      </form>
    </div>
  );
}
