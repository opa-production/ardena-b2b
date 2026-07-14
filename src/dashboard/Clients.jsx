import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import PageSkeleton from "./PageSkeleton";
import { fetchClients, deleteClient } from "../lib/api";
import { toast } from "./toastStore";
import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState, { EMPTY_ICONS } from "./EmptyState";
import "./fleet.css";
import "./bookings.css";

export const VERIF_CHIP = {
  Verified: "active",
  Pending: "pending",
  "Not found": "cancelled",
  Mismatch: "cancelled",
  Failed: "cancelled",
};

const fmtAmount = (n) => n.toLocaleString("en-KE");

export default function Clients() {
  const { pathname } = useLocation();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchClients({ per_page: 100 });
      setClients(data.data || []);
    } catch (err) {
      toast(err.message || "Failed to load clients", "danger");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        String(c.id).includes(q) ||
        c.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")) ||
        (c.email || "").toLowerCase().includes(q)
    );
  }, [clients, query]);

  const clientNo = useMemo(() => {
    const m = new Map();
    clients.forEach((c, i) => m.set(c.id, i + 1));
    return m;
  }, [clients]);

  const stats = useMemo(() => {
    const verified = clients.filter((c) => c.verification === "Verified").length;
    const pending = clients.filter((c) => c.verification !== "Verified").length;
    const value = clients.reduce((sum, c) => sum + (c.total_spend || 0), 0);
    return { verified, pending, value };
  }, [clients]);

  async function confirmDelete() {
    const c = pendingDelete;
    setPendingDelete(null);
    try {
      await deleteClient(c.id);
      setClients((prev) => prev.filter((x) => x.id !== c.id));
      toast(`${c.name} removed.`);
    } catch (err) {
      toast(err.message || "Failed to remove client", "danger");
    }
  }

  if (loading) return <PageSkeleton path={pathname} />;

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
                      <p className="cell-sub">{c.email || "—"}</p>
                    </td>
                    <td>
                      <span className={`chip ${verified ? "active" : "completed"}`}>
                        {verified ? "Verified" : "Unverified"}
                      </span>
                    </td>
                    <td className="num">{c.bookings_count || 0}</td>
                    <td className="actions-cell">
                      <Link
                        className="icon-btn"
                        to={`/dashboard/clients/${c.id}`}
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        className="icon-btn danger icon-only"
                        onClick={() => setPendingDelete(c)}
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

      <ConfirmDialog
        open={!!pendingDelete}
        title="Remove client?"
        message={
          pendingDelete
            ? `${pendingDelete.name} will be removed from your clients. Their past bookings stay on record.`
            : ""
        }
        confirmLabel="Remove"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
