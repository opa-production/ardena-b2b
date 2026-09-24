import { Link } from "react-router-dom";
import { fmtDate } from "./bookingsStore";

/* Who booked, for an app booking: the renter's profile and track record on
   Ardena, from `booking.renter` (the single-booking read fills it in). A
   walk-in booking has no such profile, so this renders nothing for those. */
export default function RenterProfileCard({ renter }) {
  if (!renter) return null;

  const initials = (renter.full_name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const checks = [
    { ok: renter.identity_verified, label: renter.identity_verified ? "ID verified" : "ID not verified" },
    {
      ok: renter.licence_verified,
      label: renter.licence_verified
        ? `Licence verified${renter.licence_expiry ? ` · to ${fmtDate(renter.licence_expiry)}` : ""}`
        : "Licence not verified",
    },
  ];

  return (
    <section className="panel-card renter-card">
      <header className="card-head">
        <h2>Renter</h2>
        <p>Booked on the Ardena app{renter.app_booking_ref ? ` · ${renter.app_booking_ref}` : ""}</p>
      </header>

      <div className="renter-top">
        {renter.avatar_url ? (
          <img className="renter-avatar" src={renter.avatar_url} alt="" />
        ) : (
          <span className="renter-avatar renter-initials" aria-hidden="true">{initials}</span>
        )}
        <div className="renter-id">
          <strong>{renter.full_name || "Renter"}</strong>
          <span>
            {renter.member_since ? `On Ardena since ${fmtDate(renter.member_since)}` : "Ardena renter"}
          </span>
        </div>
        <Link
          className="btn btn-market renter-msg"
          to="/dashboard/renter-messages"
          state={{ clientId: renter.client_id }}
        >
          Message
        </Link>
      </div>

      <div className="renter-stats">
        <div>
          <span className="renter-stat-value">{renter.trips_completed}</span>
          <span className="renter-stat-label">trip{renter.trips_completed === 1 ? "" : "s"} completed</span>
        </div>
        <div>
          <span className="renter-stat-value">
            {renter.rating_avg != null ? `${renter.rating_avg}★` : "–"}
          </span>
          <span className="renter-stat-label">
            {renter.rating_count
              ? `from ${renter.rating_count} host${renter.rating_count === 1 ? "" : "s"}`
              : "no ratings yet"}
          </span>
        </div>
      </div>

      <ul className="renter-checks">
        {checks.map((c) => (
          <li key={c.label} className={c.ok ? "is-ok" : "is-no"}>
            <span aria-hidden="true">{c.ok ? "✓" : "!"}</span>
            {c.label}
          </li>
        ))}
      </ul>

      {renter.bio && <p className="renter-bio">&ldquo;{renter.bio}&rdquo;</p>}
    </section>
  );
}
