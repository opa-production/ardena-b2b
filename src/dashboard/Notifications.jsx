import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import PageSkeleton from "./PageSkeleton";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../lib/api";
import EmptyState, { EMPTY_ICONS } from "./EmptyState";
import { toast } from "./toastStore";
import "./fleet.css";
import "./bookings.css";
import "./workspace.css";

const FILTERS = ["All", "Unread", "Bookings", "Payments"];

const KIND_LABEL = {
  booking: "Booking",
  payment: "Payment",
  verification: "Verification",
  fleet: "Fleet",
  staff: "Staff",
};

const KIND_CLASS = {
  booking: "blue",
  payment: "green",
  verification: "amber",
  fleet: "amber",
  staff: "gray",
};

function relatedLabel(to) {
  if (!to) return "—";
  const seg = decodeURIComponent(to.split("/").filter(Boolean).pop());
  const pages = {
    verification: "Verification",
    staff: "Staff & roles",
    payments: "Payments",
    bookings: "Bookings",
    fleet: "Fleet",
  };
  return pages[seg] || seg;
}

function fmtTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return "—";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-KE", { dateStyle: "medium" });
}

export default function Notifications() {
  const { pathname } = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [busyId, setBusyId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchNotifications({ per_page: 100 });
      setNotifications(data.data || []);
      setUnreadCount(data.unread_count ?? 0);
    } catch (err) {
      toast(err.message || "Failed to load notifications", "danger");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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

  async function handleMarkRead(n) {
    if (n.read || busyId === n.id) return;
    setBusyId(n.id);
    try {
      await markNotificationRead(n.id);
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // silent — user can retry
    } finally {
      setBusyId(null);
    }
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      toast(err.message || "Failed to mark all read", "danger");
    } finally {
      setMarkingAll(false);
    }
  }

  if (loading) return <PageSkeleton path={pathname} />;

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
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0 || markingAll}
          >
            {markingAll ? "Marking…" : "Mark all read"}
          </button>
        </div>

        {filtered.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Notification</th>
                <th>Category</th>
                <th>Related to</th>
                <th>Received</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((n) => (
                <tr key={n.id} className={n.read ? "" : "unread-row"}>
                  <td>
                    <p className={n.read ? "" : "strong"}>
                      {!n.read && <i className="notif-dot" aria-label="Unread" />}
                      {n.title}
                    </p>
                    <p className="cell-sub">{n.meta}</p>
                  </td>
                  <td>
                    <span className={`notif-kind ${KIND_CLASS[n.kind] || "gray"}`}>
                      {KIND_LABEL[n.kind] || n.kind}
                    </span>
                  </td>
                  <td>
                    {n.to ? (
                      <Link
                        className="spec-link"
                        to={n.to}
                        onClick={() => handleMarkRead(n)}
                      >
                        {relatedLabel(n.to)}
                      </Link>
                    ) : (
                      <span className="cell-sub">—</span>
                    )}
                  </td>
                  <td className="notif-when">{fmtTime(n.time)}</td>
                  <td className="actions-cell">
                    {!n.read && (
                      <button
                        type="button"
                        className="icon-btn"
                        disabled={busyId === n.id}
                        onClick={() => handleMarkRead(n)}
                      >
                        {busyId === n.id ? "…" : "Mark read"}
                      </button>
                    )}
                    {n.to && (
                      <Link
                        className="icon-btn"
                        to={n.to}
                        onClick={() => handleMarkRead(n)}
                      >
                        Open
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            compact
            icon={EMPTY_ICONS.notifications}
            title="You're all caught up"
            message="New activity across bookings, payments, verifications and your team will show up here."
          />
        )}
      </section>
    </>
  );
}
