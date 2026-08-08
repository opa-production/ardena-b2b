import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { subscribe, getState, sendMessage, clearThread } from "./assistantStore";
import { SUGGESTIONS } from "./assistantKnowledge";

function fmtTime(iso) {
  const d = new Date(iso);
  return isNaN(d)
    ? ""
    : d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
}

/* The assistant conversation, without page chrome of its own, so it can sit
   inside whatever card hosts it. Anything it can't answer hands off to
   Support, where the humans are. */
export default function AssistantPanel() {
  const { messages, thinking } = useSyncExternalStore(subscribe, getState);
  const [draft, setDraft] = useState("");
  const threadRef = useRef(null);
  const inputRef = useRef(null);

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

  const isFresh = messages.length === 1;

  return (
    <>
      <header className="card-head assist-head">
        <div>
          <h2>Ardena assistant</h2>
          <p>
            Instant answers about the platform and your workspace
            <span className="assist-tag">Preview</span>
          </p>
        </div>
        {!isFresh && (
          <button type="button" className="assist-clear" onClick={clearThread}>
            New chat
          </button>
        )}
      </header>

      <div className="chat-thread" ref={threadRef} aria-live="polite">
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
        workspace data — double-check anything money-related.{" "}
        <Link className="assist-escalate" to="/dashboard/support">
          Talk to a person instead
        </Link>
      </p>
    </>
  );
}
