import { useMemo, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { subscribe, getClients, removeClient } from "./clientsStore";
import {
  subscribe as subscribeBookings,
  getBookings,
  rentalDays,
} from "./bookingsStore";
import { toast } from "./toastStore";
import EmptyState, { EMPTY_ICONS } from "./EmptyState";
import "./fleet.css";
import "./bookings.css";

// full verification chips (Verified / Pending / Failed) live on the details page
export const VERIF_CHIP = {
  Verified: "active",
  Pending: "pending",
  Failed: "cancelled",
};

const fmtAmount = (n) => n.toLocaleString("en-KE");

export default function Clients() {
  const clients = useSyncExternalStore(subscribe, getClients);
  const bookings = useSyncExternalStore(subscribeBookings, getBookings);
  const [query, setQuery] = useState("");

  // per-client booking count, spend (non-cancelled) and most recent pickup
  const byClient = useMemo(() => {
    const m = new Map();
    bookings.forEach((b) => {
      const cur = m.get(b.customer) || { count: 0, spend: 0, last: null };
      cur.count += 1;
      if (b.status !== "Cancelled") {
        cur.spend += rentalDays(b.pickup, b.dropoff) * b.rate;
      }
      if (!cur.last || b.pickup > cur.last) cur.last = b.pickup;
      m.set(b.customer, cur);
    });
    return m;
  }, [bookings]);

  // stable display number per client (1, 2, 3…) by list order
  const clientNo = useMemo(() => {
    const m = new Map();
    clients.forEach((c, i) => m.set(c.id, i + 1));
    return m;
  }, [clients]);

  function handleDelete(c) {
    if (!window.confirm(`Remove ${c.name} from your clients?`)) return;
    removeClient(c.id);
    toast(`${c.name} removed.`);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")) ||
        c.email.toLowerCase().includes(q)
      );
    });
  }, [clients, query]);

  const stats = useMemo(() => {
    const verified = clients.filter((c) => c.verification === "Verified").length;
    const pending = clients.filter((c) => c.verification !== "Verified").length;
    let value = 0;
    byClient.forEach((v) => {
      value += v.spend;
    });
    return { verified, pending, value };
  }, [clients, byClient]);

  return (
    <>
      <div className="stat-grid fleet-stats">
        <article className="stat-card">
          <p className="stat-label">Total clients</p>
          <p className="stat-value">{clients.length}</p>
          <p className="stat-note">renters &amp; corporate accounts</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Verified</p>
          <p className="stat-value">{stats.verified}</p>
          <p className="stat-note">cleared to rent</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Needs verification</p>
          <p className="stat-value">{stats.pending}</p>
          <p className="stat-note">pending or failed checks</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Lifetime value</p>
          <p className="stat-value">KES {fmtAmount(stats.value)}</p>
          <p className="stat-note">all non-cancelled bookings</p>
        </article>
      </div>

      {clients.length === 0 ? (
        <section className="panel-card">
          <EmptyState
            icon={EMPTY_ICONS.clients}
            title="No clients yet"
            message="Every customer you book a car for gets a profile here, with their bookings, payments and verification history."
            action={
              <Link to="/dashboard/bookings/new" className="btn btn-primary">
                Create a booking
              </Link>
            }
          />
        </section>
      ) : (
      <section className="panel-card">
        <div className="fleet-toolbar">
          <div className="search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              type="search"
              placeholder="Search name, phone or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search clients"
            />
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Contact</th>
              <th>Verification</th>
              <th className="num">Bookings</th>
              <th className="actions-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const agg = byClient.get(c.name);
              const verified = c.verification === "Verified";
              return (
                <tr key={c.id}>
                  <td>
                    <div className="client-name">
                      <span className="client-no">{clientNo.get(c.id)}</span>
                      <span className="strong">{c.name}</span>
                    </div>
                  </td>
                  <td>
                    <p>{c.phone}</p>
                    <p className="cell-sub">{c.email}</p>
                  </td>
                  <td>
                    <span className={`chip ${verified ? "active" : "completed"}`}>
                      {verified ? "Verified" : "Unverified"}
                    </span>
                  </td>
                  <td className="num">{agg ? agg.count : 0}</td>
                  <td className="actions-cell">
                    <Link
                      className="icon-btn"
                      to={`/dashboard/clients/${encodeURIComponent(c.id)}`}
                    >
                      View
                    </Link>
                    <button
                      type="button"
                      className="icon-btn danger icon-only"
                      onClick={() => handleDelete(c)}
                      aria-label={`Remove ${c.name}`}
                      title="Remove client"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="empty-block fleet-empty">
            <p>No clients match your search.</p>
          </div>
        )}
      </section>
      )}
    </>
  );
}
