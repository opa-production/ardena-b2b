import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Logo from "../components/Logo";
import PageLoader from "../components/PageLoader";
import usePageTitle from "../hooks/usePageTitle";
import { fetchReviewRequest, submitReview } from "../lib/reviewRequestsMock";
import "./auth.css";
import "./trust.css";
import "./review.css";

const LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

function fmtRange(start, end) {
  const opts = { day: "numeric", month: "short", year: "numeric" };
  const a = new Date(start).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
  const b = new Date(end).toLocaleDateString("en-KE", opts);
  return `${a} – ${b}`;
}

/* Public page a renter opens from the review-request SMS (/r/:token). One
   screen: the car and dates, five stars, an optional comment. Mocked for now,
   see lib/reviewRequestsMock.js. */
export default function LeaveReview() {
  usePageTitle("Rate your trip");
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState(null);
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchReviewRequest(token)
      .then((t) => alive && setTrip(t))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    if (!stars) {
      setError("Tap a star to rate your trip.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await submitReview(token, { rating: stars, review: note.trim() || null });
      setDone(true);
    } catch (err) {
      setError(err.message || "Couldn't send your review. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const shown = hover || stars;

  return (
    <div className="trust">
      <header className="trust-nav">
        <Logo />
      </header>

      <main className="trust-card rv-card">
        {loading ? (
          <PageLoader message="Loading your trip…" />
        ) : !trip ? (
          <>
            <h1>This link has expired.</h1>
            <p className="trust-sub">
              It may have been used already. Thanks for renting with us.
            </p>
          </>
        ) : done ? (
          <>
            <span className="rv-done" aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
            <h1>Thanks for your review.</h1>
            <p className="trust-sub">It helps other renters pick the right car.</p>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="rv-form">
            <p className="rv-eyebrow">How was your trip?</p>
            <h1 className="rv-car">{trip.vehicle}</h1>
            <p className="trust-sub rv-dates">{fmtRange(trip.start, trip.end)}</p>

            <div
              className="rv-stars"
              role="radiogroup"
              aria-label="Rating"
              onMouseLeave={() => setHover(0)}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  role="radio"
                  aria-checked={stars === n}
                  aria-label={`${n} star${n > 1 ? "s" : ""}, ${LABELS[n]}`}
                  className={"rv-star" + (n <= shown ? " on" : "")}
                  onClick={() => setStars(n)}
                  onMouseEnter={() => setHover(n)}
                >
                  ★
                </button>
              ))}
            </div>
            <p className="rv-label" aria-live="polite">
              {shown ? LABELS[shown] : "Tap to rate"}
            </p>

            <label className="rv-field">
              <span>Tell us more (optional)</span>
              <textarea
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="The car, pickup, anything worth knowing"
                maxLength={2000}
              />
            </label>

            {error && <p className="form-error">{error}</p>}

            <button type="submit" className="btn btn-primary rv-submit" disabled={busy}>
              {busy ? "Sending…" : "Submit review"}
            </button>
          </form>
        )}
      </main>

      <p className="trust-foot">
        © {new Date().getFullYear()} Ardena Platforms Africa Ltd
      </p>
    </div>
  );
}
