import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { subscribe, getState, sendMessage, clearThread } from "./assistantStore";
import { SUGGESTIONS } from "./assistantKnowledge";
import "./overview.css";
import "./support.css";
import "./assistant.css";

function fmtTime(iso) {
  const d = new Date(iso);
  return isNaN(d)
    ? ""
    : d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
}

export default function Assistant() {
  const { messages, thinking } = useSyncExternalStore(subscribe, getState);
  const [draft, setDraft] = useState("");
  const threadRef = useRef(null);
  const inputRef = useRef(null);

  // keep the newest message in view as the thread grows
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking]);

  function send(text) {
    if (!text.trim() || thinking) return;
    sendMessage(text);
    setDraft("");
    inputRef.current?.focus();
  }

  // only the opening greeting is on screen — still worth suggesting a start
  const isFresh = messages.length === 1;

  return (
    <section className="panel-card assist-card">
      <header className="card-head assist-head">
        <div>
          <h2>Assistant</h2>
          <p>
            Ask how Ardena works, or about what&apos;s in your workspace
            <span className="assist-tag">Preview</span>
          </p>
        </div>
        {messages.length > 1 && (
          <button type="button" className="assist-clear" onClick={clearThread}>
            New chat
          </button>
        )}
      </header>

      <div className="chat-thread assist-thread" ref={threadRef} aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.from === "user" ? "user" : "support"}`}>
            <p>{m.text}</p>
            {m.to && (
              <Link className="assist-jump" to={m.to.path}>
                {m.to.label}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            )}
            <span className="msg-time">
              {m.from === "agent" ? "Ardena assistant · " : ""}
              {fmtTime(m.at)}
            </span>
          </div>
        ))}

        {thinking && (
          <span className="typing assist-typing" aria-label="Assistant is typing">
            <i />
            <i />
            <i />
          </span>
        )}
      </div>

      {isFresh && (
        <div className="assist-suggestions">
          {SUGGESTIONS.map((s) => (
            <button type="button" key={s} onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="chat-composer"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <input
          ref={inputRef}
          type="text"
          placeholder="Ask about fleet, bookings, payments, verification or billing"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Message the assistant"
        />
        <button
          type="submit"
          className="btn btn-primary toolbar-btn"
          disabled={!draft.trim() || thinking}
        >
          Send
        </button>
      </form>

      <p className="assist-note">
        Answers come from Ardena&apos;s product documentation and your own
        workspace data. Double-check anything money-related before acting on it.
      </p>
    </section>
  );
}
