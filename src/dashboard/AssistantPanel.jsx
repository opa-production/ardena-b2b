import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { subscribe, getState, sendMessage, cancelTurn } from "./assistantStore";
import { SUGGESTIONS } from "./assistantKnowledge";
import { cleanReply } from "./assistantFormat";
import { AttachIcon, BotIcon, MicIcon, SendIcon } from "./supportArt";
import useDictation from "../hooks/useDictation";
import { toast } from "./toastStore";

/* The tool names the server sends in a `tool` frame, said in English. An
   unlisted one falls back to a plain "Checking…" — the list is allowed to go
   stale without the UI showing a raw identifier. */
const TOOL_LABELS = {
  look_up_help: "Checking the handbook",
  get_booking: "Looking up that booking",
  find_bookings: "Searching bookings",
  get_today: "Checking today",
  get_fleet: "Checking your fleet",
  get_chauffeurs: "Checking the roster",
  find_client: "Looking up that client",
  get_finances: "Checking your finances",
  get_billing: "Checking your billing",
  get_wallet: "Checking your wallet",
  get_settlement_accounts: "Checking settlement accounts",
  hand_off_to_human: "Passing this to a person",
};

/* What the wait is called while no tool has been named. One word each, in the
   assistant's own voice — it cycles so a long pause reads as work in progress
   rather than a frozen label. */
const THINKING_WORDS = [
  "Thinking",
  "Marinating",
  "Pondering",
  "Mulling",
  "Working",
  "Percolating",
];

/* Walks THINKING_WORDS while a turn is in flight, starting over on each turn
   so every question opens on "Thinking". */
function useThinkingWord(active) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!active) return setI(0);
    const id = setInterval(() => setI((n) => (n + 1) % THINKING_WORDS.length), 2400);
    return () => clearInterval(id);
  }, [active]);
  return THINKING_WORDS[i];
}

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
  const { messages, thinking, checking, escalated, offline } = useSyncExternalStore(
    subscribe,
    getState
  );
  const [draft, setDraft] = useState("");
  const thinkingWord = useThinkingWord(thinking && !checking);
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
  }, [messages, thinking, checking]);

  // Closing the drawer mid-answer should stop the turn, not leave a stream
  // writing into a store nobody is watching.
  useEffect(() => cancelTurn, []);

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
            {/* The reply is plain text in a plain bubble, so markdown the
                model emits out of habit is stripped rather than shown as
                literal asterisks and dashes — see assistantFormat. */}
            {m.from === "agent"
              ? cleanReply(m.text).map((line, i) => <p key={i}>{line || " "}</p>)
              : <p>{m.text}</p>}
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

        {/* ai.md §2: a `tool` frame means a lookup is running and the pause
            before the first token is real, so name it rather than leave three
            dots to stand for an unexplained wait. */}
        {thinking && checking && (
          <span className="assist-checking">{TOOL_LABELS[checking] || "Checking"}…</span>
        )}
        {thinking && !checking && (
          <span className="assist-checking" aria-label="Assistant is thinking">
            {thinkingWord}…
          </span>
        )}
      </div>

      {isFresh && !escalated && (
        <div className="assist-suggestions">
          {SUGGESTIONS.map((s) => (
            <button type="button" key={s} onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* ai.md §2: once a thread is escalated it belongs to a person, so the
          composer is replaced rather than left inviting another question into
          a conversation the assistant has stepped out of. */}
      {escalated ? (
        <p className="assist-handoff">
          This is with Ardena support now.{" "}
          <Link className="assist-escalate" to="/dashboard/support" onClick={onNavigate}>
            Open Support
          </Link>
        </p>
      ) : offline ? (
        <p className="assist-handoff">
          The assistant is offline. The rest of the dashboard is fine.{" "}
          <Link className="assist-escalate" to="/dashboard/support" onClick={onNavigate}>
            Talk to a person
          </Link>
        </p>
      ) : (
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
      )}

      <p className="assist-note">
        Double-check anything money-related.{" "}
        <Link className="assist-escalate" to="/dashboard/support" onClick={onNavigate}>
          Talk to a person
        </Link>
      </p>
    </>
  );
}
