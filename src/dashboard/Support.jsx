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

  /* No card. The conversation is the page: it runs from the sidebar to the
     right edge and from the top of the content area to the bottom, with the
     composer floating over the foot of it. A chat boxed inside a panel with a
     gutter around it reads as a widget; this reads as the thing you came for.
     Renter messages, when the B2C launch brings them back, get their own route
     rather than a column stealing a third of this one. */
  return (
    <div className="support-page">
      <header className="support-head">
        <div>
          <h2>Message support</h2>
          <p>Real people, Mon to Sat, 8am to 8pm EAT · usually reply in minutes</p>
        </div>
      </header>

      <div className="chat-thread" ref={threadRef} aria-live="polite">
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
        disabled={sending}
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
