import { useMemo, useState, useSyncExternalStore } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  subscribe,
  getChauffeurs,
  isChauffeursLoaded,
  removeChauffeur,
  CH_CHIP,
  fmtDay,
  licenceState,
} from "./chauffeursStore";
import PageSkeleton from "./PageSkeleton";
import ConfirmDialog from "../components/ConfirmDialog";
import EmptyState, { EMPTY_ICONS } from "./EmptyState";
import { toast } from "./toastStore";
import usePageTitle from "../hooks/usePageTitle";
import "./fleet.css";
import "./bookings.css";
import "./chauffeurs.css";

function initials(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join("");
}

function Stars({ value }) {
  if (!value) return <span className="cell-sub">No ratings</span>;
  return (
    <span className="rating">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
        <path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.7 5.9 20.4l1.4-6.8L2.2 9l6.9-.7L12 2z" />
      </svg>
      {value.toFixed(1)}
    </span>
  );
}

export default function Chauffeurs() {
  usePageTitle("Chauffeurs");
  const { pathname } = useLocation();
  const chauffeurs = useSyncExternalStore(subscribe, getChauffeurs);
  const loaded = useSyncExternalStore(subscribe, isChauffeursLoaded);
  const [query, setQuery] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chauffeurs;
    return chauffeurs.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.phone.replace(/\s/g, "").includes(q.replace(/\s/g, "")) ||
        (c.licence_no || "").toLowerCase().includes(q)
    );
  }, [chauffeurs, query]);

  const stats = useMemo(() => {
    const available = chauffeurs.filter((c) => c.status === "Available").length;
    const onTrip = chauffeurs.filter((c) => c.status === "On trip").length;
    const rated = chauffeurs.filter((c) => c.rating > 0);
    const avg = rated.length ? rated.reduce((s, c) => s + c.rating, 0) / rated.length : 0;
    return { available, onTrip, avg };
  }, [chauffeurs]);

  async function confirmDelete() {
    const c = pendingDelete;
    setPendingDelete(null);
    try {
      await removeChauffeur(c.id);
      toast(`${c.name} removed from your drivers.`);
    } catch (err) {
      toast(err.message || "Couldn't remove that chauffeur.", "danger");
    }
  }

  return (
    <>
      <div className="page-actions">
        <Link to="/dashboard/chauffeurs/new" className="btn btn-primary page-action-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add chauffeur
        </Link>
      </div>

      <div className="stat-grid fleet-stats">
        <article className="stat-card">
          <p className="stat-label">Total chauffeurs</p>
          <p className="stat-value">{chauffeurs.length}</p>
          <p className="stat-note">drivers on your roster</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Available</p>
          <p className="stat-value">{stats.available}</p>
          <p className="stat-note">ready to assign</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">On trip</p>
          <p className="stat-value">{stats.onTrip}</p>
          <p className="stat-note">out with a client now</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Average rating</p>
          <p className="stat-value">{stats.avg ? stats.avg.toFixed(1) : "—"}</p>
          <p className="stat-note">across rated trips</p>
        </article>
      </div>

      {!loaded && chauffeurs.length === 0 ? (
        <PageSkeleton path={pathname} />
      ) : chauffeurs.length === 0 ? (
        <section className="panel-card">
          <EmptyState
            icon={EMPTY_ICONS.clients}
            title="No chauffeurs yet"
            message="Add the drivers you rent out with a car. Track their licence, duty status, assignments and ratings here."
            action={<Link to="/dashboard/chauffeurs/new" className="btn btn-primary">Add a chauffeur</Link>}
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
                placeholder="Search name, phone or licence"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search chauffeurs"
              />
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Chauffeur</th>
                <th>Contact</th>
                <th>Licence</th>
                <th>Status</th>
                <th className="num">Trips</th>
                <th>Rating</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const lic = licenceState(c.licence_expiry);
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="chauffeur-cell">
                        <span className="chauffeur-avatar sm">{initials(c.name)}</span>
                        <div>
                          <p className="strong">{c.name}</p>
                          <p className="cell-sub">{c.id}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p>{c.phone}</p>
                      <p className="cell-sub">{c.email || "—"}</p>
                    </td>
                    <td>
                      <p className="mono">{c.licence_no}</p>
                      <p className="cell-sub">
                        {fmtDay(c.licence_expiry)}
                        {lic && <span className={`chip ${lic.tone === "danger" ? "cancelled" : "pending"} lic-chip`}>{lic.label}</span>}
                      </p>
                    </td>
                    <td>
                      <span className={`chip ${CH_CHIP[c.status]}`}>{c.status}</span>
                    </td>
                    <td className="num">{c.trips}</td>
                    <td><Stars value={c.rating} /></td>
                    <td className="actions-cell">
                      <Link className="icon-btn" to={`/dashboard/chauffeurs/${c.id}`}>View</Link>
                      <button
                        type="button"
                        className="icon-btn danger icon-only"
                        onClick={() => setPendingDelete(c)}
                        aria-label={`Remove ${c.name}`}
                        title="Remove chauffeur"
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
              <p>No chauffeurs match your search.</p>
            </div>
          )}
        </section>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Remove chauffeur?"
        message={pendingDelete ? `${pendingDelete.name} will be removed from your roster. Their trip history is discarded.` : ""}
        confirmLabel="Remove"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
