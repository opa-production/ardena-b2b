import { useMemo, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import {
  subscribe,
  getNotifications,
  markRead,
  markAllRead,
} from "./notificationsStore";
import "./fleet.css";
import "./bookings.css";
import "./workspace.css";

const FILTERS = ["All", "Unread", "Bookings", "Payments"];

const KIND_CLASS = {
  booking: "blue",
  payment: "green",
  verification: "amber",
  fleet: "amber",
  staff: "gray",
};

const KIND_ICON = {
  booking: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  payment: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  ),
  verification: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  fleet: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  ),
  staff: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
};

export default function Notifications() {
  const notifications = useSyncExternalStore(subscribe, getNotifications);
  const [filter, setFilter] = useState("All");

  const unread = notifications.filter((n) => !n.read).length;

  const filtered = useMemo(() => {
    switch (filter) {
      case "Unread":
        return notifications.filter((n) => !n.read);
      case "Bookings":
        return notifications.filter((n) => n.kind === "booking");
      case "Payments":
        return notifications.filter((n) => n.kind === "payment");
      default:
        return notifications;
    }
  }, [notifications, filter]);

  return (
    <>
      <section className="panel-card">
        <div className="fleet-toolbar">
          <div className="seg" role="group" aria-label="Filter notifications">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={f === filter ? "active" : ""}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-ghost toolbar-btn"
            onClick={markAllRead}
            disabled={unread === 0}
          >
            Mark all read
          </button>
        </div>

        <ul className="notif-list">
          {filtered.map((n) => (
            <li key={n.id}>
              <Link
                className={`notif-item${n.read ? "" : " unread"}`}
                to={n.to}
                onClick={() => markRead(n.id)}
              >
                <span className={`notif-icon ${KIND_CLASS[n.kind]}`}>
                  {KIND_ICON[n.kind]}
                </span>
                <span className="notif-body">
                  <span className="notif-title">{n.title}</span>
                  <span className="notif-meta">{n.meta}</span>
                </span>
                <span className="notif-time">
                  {n.time}
                  {!n.read && <i className="notif-dot" />}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {filtered.length === 0 && (
          <div className="empty-block fleet-empty">
            <p>Nothing here, you're all caught up.</p>
          </div>
        )}
      </section>
    </>
  );
}
