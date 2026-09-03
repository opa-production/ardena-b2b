/* Marketing — reaching your own clients, from the workspace that already has
 * their details.
 *
 * Two columns, one per channel: email on the left, SMS on the right. They are
 * side by side rather than behind a toggle because they are not the same
 * message — an email has a subject and room to explain, an SMS is one line
 * that costs per segment — and a business writing both should be able to see
 * both. Each column carries its own audience, because who you email is rarely
 * exactly who you text.
 *
 * Asking for ratings is not here. It belongs on the booking it is about, so it
 * is an action on a completed booking in the Bookings list, sent to the person
 * who actually rented that vehicle.
 *
 * Every send reaches a real inbox or handset, so nothing fires on a single
 * click: the audience is counted back to the sender first, and the send goes
 * through a confirmation naming the channel and the count. No drafts, no
 * scheduling — this sends now or not at all. */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMarketingAudience, sendMarketingCampaign } from "../lib/api";
import ConfirmDialog from "../components/ConfirmDialog";
import Dropdown from "../components/Dropdown";
import ComingSoon from "./ComingSoon";
import { MARKETING } from "../lib/features";
import { toast } from "./toastStore";
import usePageTitle from "../hooks/usePageTitle";
import "./fleet.css";
import "./bookings.css"; // .field-label / .field-input / modal chrome
import "./workspace.css";

/* Who gets it. The values are what the API is asked for; the labels are what a
   person would call the same group. */
const AUDIENCES = [
  { value: "all", label: "All clients" },
  { value: "recent", label: "Rented in the last 90 days" },
  { value: "active", label: "On an active or upcoming booking" },
];

// One GSM segment. Past this a message is billed as two, which is the sender's
// money — so the count is shown rather than the limit enforced.
const SMS_SEGMENT = 160;

const MailIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3.5 7l8.5 6 8.5-6" />
  </svg>
);

const SmsIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12a8 8 0 01-8 8H8l-4 3v-5.5A8 8 0 1121 12z" />
    <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" />
  </svg>
);

/* One channel's composer. Both columns are the same shape — head, audience,
   reach, body, send — so they line up row for row down the page; only the
   subject field and the segment counter differ. */
function ChannelCard({ channel, title, note, icon, placeholder }) {
  const isEmail = channel === "email";
  const [audience, setAudience] = useState("all");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [count, setCount] = useState(null); // null = not known yet
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  /* How many people this would actually reach. A failure here is quiet on
     purpose: not knowing the number is a worse page, not a broken one, and the
     send itself will say if something is wrong. */
  const loadCount = useCallback(async () => {
    setCount(null);
    try {
      const data = await fetchMarketingAudience({ channel, audience });
      setCount(Number(data?.count ?? 0));
    } catch {
      setCount(null);
    }
  }, [channel, audience]);

  useEffect(() => {
    loadCount();
  }, [loadCount]);

  async function handleSend() {
    setConfirming(false);
    setBusy(true);
    try {
      const res = await sendMarketingCampaign({
        channel,
        audience,
        subject: isEmail ? subject.trim() : undefined,
        message: message.trim(),
      });
      const sent = res?.sent ?? count ?? 0;
      toast(`Sent to ${sent} client${sent === 1 ? "" : "s"}.`);
      setSubject("");
      setMessage("");
      loadCount();
    } catch (err) {
      toast(err.message || "Couldn't send that. Nothing went out.", "danger");
    } finally {
      setBusy(false);
    }
  }

  const audienceLabel = AUDIENCES.find((a) => a.value === audience)?.label || "";
  const ready = message.trim().length > 0 && (!isEmail || subject.trim().length > 0);
  const segments = Math.max(1, Math.ceil(message.length / SMS_SEGMENT));

  return (
    <section className="panel-card mk-card">
      <header className="card-head mk-head">
        <span className="mk-icon">{icon}</span>
        <div>
          <h2>{title}</h2>
          <p>{note}</p>
        </div>
      </header>

      <div className="mk-form">
        {/* A <label> cannot name a button, so the caption is a plain span and
            the trigger carries its own accessible name. */}
        <div className="field-label">
          <span>Who it goes to</span>
          <Dropdown
            id={`mk-audience-${channel}`}
            ariaLabel={`Who this ${isEmail ? "email" : "SMS"} goes to`}
            value={audience}
            onChange={setAudience}
            options={AUDIENCES}
          />
        </div>

        {/* The count is the whole safety story on this page: it is the
            difference between telling twelve people and twelve hundred. */}
        <p className="mk-reach">
          {count === null
            ? "Counting who this reaches…"
            : count === 0
            ? `No client here has ${isEmail ? "an email address" : "a phone number"} on file.`
            : `${count} client${count === 1 ? "" : "s"} will receive this.`}{" "}
          <Link to="/dashboard/clients">Client list</Link>
        </p>

        {/* Both columns keep a subject row so the fields below stay level;
            SMS has no subject, so it says why rather than leaving a hole. */}
        {isEmail ? (
          <label className="field-label">
            Subject
            <input
              type="text"
              className="field-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="New on our fleet: Toyota Prado 2022"
              maxLength={120}
            />
          </label>
        ) : (
          <p className="mk-nosubject">No subject line — an SMS opens straight into the text.</p>
        )}

        <label className="field-label mk-body">
          Message
          <textarea
            className="field-input mk-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={7}
            placeholder={placeholder}
          />
        </label>

        <div className="mk-foot">
          <span className="mk-count">
            {isEmail
              ? `${message.length} characters`
              : `${message.length} characters · ${segments} SMS`}
          </span>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !ready || count === 0}
            onClick={() => setConfirming(true)}
          >
            {busy ? "Sending…" : isEmail ? "Send email" : "Send SMS"}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        danger={false}
        title={isEmail ? "Send this email?" : "Send this SMS?"}
        message={
          count === null
            ? `This goes out now to everyone matching "${audienceLabel}". It can't be recalled.`
            : `This goes out now to ${count} client${count === 1 ? "" : "s"} (${audienceLabel}). It can't be recalled.`
        }
        confirmLabel="Send now"
        onConfirm={handleSend}
        onCancel={() => setConfirming(false)}
      />
    </section>
  );
}

export default function Marketing() {
  usePageTitle("Marketing");

  /* Nothing sends until there is a gateway behind /marketing/* — see
     lib/features.js. The composers below are left intact so turning it on is
     one flag, not a rebuild. */
  if (!MARKETING) {
    return (
      <>
        <h1 className="sr-only">Marketing</h1>
        <ComingSoon
          title="Marketing"
          message="Email and text your own clients about a new listing or an offer, from your business name. We're connecting the sender now."
          action={
            <Link to="/dashboard/support" className="btn btn-primary">
              Register interest
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <h1 className="sr-only">Marketing</h1>

      <div className="marketing-grid">
        <ChannelCard
          channel="email"
          title="Email your clients"
          note="Sent from your business name, to the clients in your workspace."
          icon={<MailIcon />}
          placeholder="What's new, what it costs, and how to book it."
        />
        <ChannelCard
          channel="sms"
          title="Text your clients"
          note="Short, and it gets read. Best for a new listing or an offer."
          icon={<SmsIcon />}
          placeholder="New listing: Prado 2022, KES 12,000/day. Reply to book."
        />
      </div>
    </>
  );
}
