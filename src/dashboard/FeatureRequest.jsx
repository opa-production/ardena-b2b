/* Feature requests — one form, one send.
 *
 * Deliberately not a board: a list of other businesses' requests with vote
 * counts is a product Ardena would have to run, and what the person on this
 * page wants is to say the thing and get on with their day. Title, detail,
 * send. The reply comes back in Support, which is said on the page rather
 * than left to be discovered.
 *
 * The submitted state replaces the form instead of toasting over it, so it is
 * unambiguous that the request left the building — and "Send another" puts a
 * clean form back rather than making them find the page again. */
import { useState } from "react";
import { Link } from "react-router-dom";
import { submitFeatureRequest } from "../lib/api";
import { toast } from "./toastStore";
import usePageTitle from "../hooks/usePageTitle";
import "./fleet.css";
import "./bookings.css"; // .field-label / .field-input
import "./workspace.css";

const MAX_DETAIL = 2000;

/* The same head badge the Marketing composers wear, so a page reached from the
   profile menu still looks like it belongs to the dashboard it opened from. */
const IdeaIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18h6" />
    <path d="M10 21h4" />
    <path d="M12 3a6 6 0 00-3.5 10.9c.3.3.5.7.5 1.1h6c0-.4.2-.8.5-1.1A6 6 0 0012 3z" />
  </svg>
);

export default function FeatureRequest() {
  usePageTitle("Feature request");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    const t = title.trim();
    const d = detail.trim();
    if (!t || !d) return;

    setBusy(true);
    try {
      await submitFeatureRequest({ title: t, detail: d });
      setSent(true);
      setTitle("");
      setDetail("");
    } catch (err) {
      toast(err.message || "Couldn't send that. Try again.", "danger");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="sr-only">Feature request</h1>

      <section className="panel-card request-card">
        <header className="card-head mk-head">
          <span className="mk-icon">
            <IdeaIcon />
          </span>
          <div>
            <h2>Request a feature</h2>
            <p>Tell us what would make Ardena work better for your business.</p>
          </div>
        </header>

        {sent ? (
          <div className="request-sent">
            <p className="request-sent-title">Sent to the Ardena team.</p>
            <p className="side-hint" style={{ marginTop: 0 }}>
              We read every one. If we need more detail, or when it ships, the
              reply comes back in <Link to="/dashboard/support">Support</Link>.
            </p>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginTop: 16 }}
              onClick={() => setSent(false)}
            >
              Send another
            </button>
          </div>
        ) : (
          <form className="request-form" onSubmit={handleSubmit}>
            <label className="field-label">
              What do you need?
              <input
                type="text"
                className="field-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Bulk-import vehicles from a spreadsheet"
                maxLength={120}
                required
                autoFocus
              />
            </label>

            <label className="field-label">
              How would you use it?
              <textarea
                className="field-input request-detail"
                value={detail}
                onChange={(e) => setDetail(e.target.value.slice(0, MAX_DETAIL))}
                placeholder="What you're doing today, where it slows you down, and what you'd rather do instead."
                rows={6}
                required
              />
            </label>

            <div className="request-foot">
              <span className="request-count">
                {detail.length}/{MAX_DETAIL}
              </span>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={busy || !title.trim() || !detail.trim()}
              >
                {busy ? "Sending…" : "Send request"}
              </button>
            </div>
          </form>
        )}
      </section>
    </>
  );
}
