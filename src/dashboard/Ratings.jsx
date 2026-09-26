import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import PageSkeleton from "./PageSkeleton";
import { toast } from "./toastStore";
import usePageTitle from "../hooks/usePageTitle";
import { fetchMarketplaceRatings, fetchVehicleRatings } from "../lib/api";
import "./fleet.css";
import "./bookings.css";
import "./ratings.css";
import RefreshButton from "../components/RefreshButton";
import RequestReviewDialog from "./RequestReviewDialog";
import reviewsArt from "../assets/reviews.svg";
import "./coming.css";

function Stars({ value }) {
  const filled = Math.round(value || 0);
  return (
    <span className="stars" aria-label={`${value || 0} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= filled ? "star on" : "star"}>
          ★
        </span>
      ))}
    </span>
  );
}

function fmtDay(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Ratings() {
  usePageTitle("Reviews");
  const { pathname } = useLocation();

  const [summary, setSummary] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, v] = await Promise.all([
        fetchMarketplaceRatings(30),
        fetchVehicleRatings(),
      ]);
      setSummary(s);
      setVehicles(v || []);
    } catch (err) {
      toast(err.message || "Failed to load reviews", "danger");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <PageSkeleton path={pathname} />;

  const s = summary || {};
  const hasAny = (s.business_rating_count || 0) + (s.car_rating_count || 0) > 0;

  return (
    <>
      <h1 className="sr-only">Reviews</h1>
      <div className="page-refresh ratings-bar">
        <button
          type="button"
          className="btn btn-ghost refresh-btn"
          onClick={() => setRequesting(true)}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            <path d="M12 7l1.2 2.4 2.6.4-1.9 1.8.5 2.6L12 13l-2.4 1.2.5-2.6-1.9-1.8 2.6-.4z" />
          </svg>
          <span>Request review</span>
        </button>
        <RefreshButton onRefresh={load} />
      </div>
      {requesting && <RequestReviewDialog onClose={() => setRequesting(false)} />}

      {!hasAny ? (
        <div className="coming">
          <img className="coming-art" src={reviewsArt} alt="" />
          <h2 className="coming-title">No reviews yet</h2>
          <p className="coming-note">
            When renters rate a trip on the Ardena app, their stars and comments
            show up here, for your business and for each car.
          </p>
        </div>
      ) : (
        <>
          <div className="stat-grid finance-stats">
            <article className="stat-card">
              <p className="stat-label">Business rating</p>
              <p className="stat-value">
                {s.business_rating != null ? s.business_rating.toFixed(1) : "-"}
              </p>
              <p className="stat-note">
                {s.business_rating_count} review
                {s.business_rating_count === 1 ? "" : "s"}
              </p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Vehicle rating</p>
              <p className="stat-value">
                {s.car_rating != null ? s.car_rating.toFixed(1) : "-"}
              </p>
              <p className="stat-note">
                {s.car_rating_count} review{s.car_rating_count === 1 ? "" : "s"}
              </p>
            </article>
          </div>

          <div className="ratings-grid">
            <section className="panel-card">
              <header className="card-head">
                <h2>Recent reviews</h2>
                <p>Newest first</p>
              </header>
              {(s.recent || []).length === 0 ? (
                <p className="field-note">No written reviews yet.</p>
              ) : (
                (s.recent || []).map((r, i) => (
                  <div className="review-row" key={`${r.kind}-${i}`}>
                    <div className="review-head">
                      <Stars value={r.rating} />
                      <span className="cell-sub">
                        {r.kind === "car" ? r.vehicle || r.plate || "Vehicle" : "Your business"}
                        {r.created_at ? ` · ${fmtDay(r.created_at)}` : ""}
                      </span>
                    </div>
                    {r.review && <p className="review-text">{r.review}</p>}
                  </div>
                ))
              )}
            </section>

            <section className="panel-card">
              <header className="card-head">
                <h2>By vehicle</h2>
                <p>Which cars are pulling their weight</p>
              </header>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Rating</th>
                    <th className="num">Reviews</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v) => (
                    <tr key={v.plate}>
                      <td>
                        {v.vehicle}
                        <span className="cell-sub">{v.plate}</span>
                      </td>
                      <td>
                        {v.rating != null ? (
                          <>
                            <Stars value={v.rating} />{" "}
                            <span className="strong">{v.rating.toFixed(1)}</span>
                          </>
                        ) : (
                          <span className="cell-sub">Not rated yet</span>
                        )}
                      </td>
                      <td className="num">{v.rating_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </>
      )}
    </>
  );
}
