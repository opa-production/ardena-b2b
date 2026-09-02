import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { subscribe, getState, sendMessage } from "./assistantStore";
import { SUGGESTIONS } from "./assistantKnowledge";
import { AttachIcon, BotIcon, MicIcon, SendIcon } from "./supportArt";
import useDictation from "../hooks/useDictation";
import { toast } from "./toastStore";

function fmtTime(iso) {
  const d = new Date(iso);
  return isNaN(d)
    ? ""
    : d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });
}

/* The assistant conversation, without page chrome of its own, so it can sit
   inside whatever hosts it. Anything it can't answer hands off to Support,
   where the humans are. `onNavigate` fires when the user follows a link out,
   letting the host (the slide-over) close itself. */
export default function AssistantPanel({ onNavigate }) {
  const { messages, thinking } = useSyncExternalStore(subscribe, getState);
  const [draft, setDraft] = useState("");
  const threadRef = useRef(null);
  const inputRef = useRef(null);

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

  const isFresh = messages.length === 0;

  return (
    <>
      {/* No "New chat". Nothing here is stored between sessions, so a reset
          control offers to clear something that already clears itself — and
          this is one conversation with one assistant, not a list of threads to
          manage. */}
      <header className="card-head assist-head">
        <h2>
          Ardena assistant
          <span className="assist-tag">Preview</span>
        </h2>
      </header>

      <div className="chat-thread" ref={threadRef} aria-live="polite">
        {/* No greeting bubble. One that says the same thing every time is
            furniture; the mark and one line carry it, and the suggestions
            below say more about what this can do than a paragraph would. */}
        {isFresh && (
          <div className="chat-empty assist-empty">
            <BotIcon size={44} />
            <p className="chat-empty-title">Ask me anything</p>
            <p className="chat-empty-note">Fleet, bookings, payments, billing.</p>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.from === "user" ? "user" : "support"}`}>
            <p>{m.text}</p>
            {m.to && (
              <Link className="assist-jump" to={m.to.path} onClick={onNavigate}>
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
          ref={inputRef}
          type="text"
          placeholder={listening ? "Listening…" : "Ask about fleet, bookings or payments"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="Message the assistant"
        />

        {canDictate && (
          <button
            type="button"
            className={"composer-btn" + (listening ? " is-live" : "")}
            onClick={toggleDictation}
            aria-label={listening ? "Stop dictating" : "Dictate your question"}
            aria-pressed={listening}
            title={listening ? "Stop dictating" : "Speak instead of typing"}
          >
            <MicIcon />
          </button>
        )}

        <button
          type="submit"
          className="composer-btn composer-send"
          disabled={!draft.trim() || thinking}
          aria-label="Send"
          title="Send"
        >
          <SendIcon />
        </button>
      </form>

      <p className="assist-note">
        Double-check anything money-related.{" "}
        <Link className="assist-escalate" to="/dashboard/support" onClick={onNavigate}>
          Talk to a person
        </Link>
      </p>
    </>
  );
}
