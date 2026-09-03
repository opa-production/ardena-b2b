import { useMemo, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import {
  subscribe as subscribeFleet,
  getVehicles,
  isFleetLoaded,
} from "./fleetStore";
import {
  subscribe as subscribeTrackers,
  getTrackers,
  connectTracker,
  PROVIDERS,
  TRACK_CHIP,
  relativeTime,
} from "./trackingStore";
import Dropdown from "../components/Dropdown";
import EmptyState, { EMPTY_ICONS } from "./EmptyState";
import ComingSoon from "./ComingSoon";
import { toast } from "./toastStore";
import usePageTitle from "../hooks/usePageTitle";
import { VEHICLE_TRACKING } from "../lib/features";
import "./fleet.css";
import "./bookings.css";
import "./tracking.css";

const STATUS_LABEL = { moving: "Moving", parked: "Parked", offline: "Offline" };

export default function Tracking() {
  usePageTitle("Tracking");
  const vehicles = useSyncExternalStore(subscribeFleet, getVehicles);
  const loaded = useSyncExternalStore(subscribeFleet, isFleetLoaded);
  const trackers = useSyncExternalStore(subscribeTrackers, getTrackers);

  const [query, setQuery] = useState("");
  const [connectFor, setConnectFor] = useState(null); // vehicle awaiting a tracker
  const [provider, setProvider] = useState(PROVIDERS[0]);
  const [deviceId, setDeviceId] = useState("");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vehicles
      .map((v) => ({ v, t: trackers[v.plate] || null }))
      .filter(({ v }) =>
        !q ||
        v.plate.toLowerCase().includes(q) ||
        (v.name || "").toLowerCase().includes(q)
      );
  }, [vehicles, trackers, query]);

  const stats = useMemo(() => {
    const list = Object.values(trackers);
    return {
      tracked: list.length,
      moving: list.filter((t) => t.status === "moving").length,
      parked: list.filter((t) => t.status === "parked").length,
      untracked: Math.max(0, vehicles.length - list.length),
    };
  }, [trackers, vehicles]);

  function openConnect(v) {
    setConnectFor(v);
    setProvider(PROVIDERS[0]);
    setDeviceId("");
  }

  const [connecting, setConnecting] = useState(false);

  async function submitConnect(e) {
    e.preventDefault();
    if (!connectFor || connecting) return;
    setConnecting(true);
    try {
      await connectTracker(connectFor.plate, { provider, deviceId: deviceId.trim() });
      toast(`Tracker connected to ${connectFor.plate}.`);
      setConnectFor(null);
    } catch (err) {
      toast(err.message || "Couldn't connect the tracker.", "danger");
    } finally {
      setConnecting(false);
    }
  }

  /* No GPS connector exists yet and Ardena fits the units in person, so the
     live screens would show a map that never moves. Say so instead — the
     whole page below is ready for the day there is hardware behind it. */
  if (!VEHICLE_TRACKING) {
    return (
      <>
        <h1 className="sr-only">Tracking</h1>
        <ComingSoon
          title="Tracking"
          message="Ardena fits the tracker in your vehicle in person. Talk to us to join the first installations."
          action={
            <Link to="/dashboard/support" className="btn btn-primary">
              Register interest
            </Link>
          }
        />
      </>
    );
  }

  if (!loaded) {
    return <div className="empty-block fleet-empty"><p>Loading vehicles…</p></div>;
  }

  return (
    <>
      <div className="stat-grid fleet-stats">
        <article className="stat-card">
          <p className="stat-label">Tracked vehicles</p>
          <p className="stat-value">{stats.tracked}</p>
          <p className="stat-note">of {vehicles.length} in your fleet</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Moving now</p>
          <p className="stat-value">{stats.moving}</p>
          <p className="stat-note">ignition on, in motion</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Parked</p>
          <p className="stat-value">{stats.parked}</p>
          <p className="stat-note">stationary, engine off</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Not tracked</p>
          <p className="stat-value">{stats.untracked}</p>
          <p className="stat-note">no device connected</p>
        </article>
      </div>

      {/* The one thing this page can't do for you. Connecting a tracker in the
          UI only registers a device that is already wired into the vehicle —
          fitting it is an on-site job, and a business that doesn't know that
          will sit waiting for a location that never arrives. */}
      <p className="page-note">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <span>
          Trackers are fitted in the vehicle by the Ardena team in person, the
          hardware has to be wired in before it can report.{" "}
          <Link className="spec-link" to="/dashboard/support">
            Contact support
          </Link>{" "}
          to book an installation.
        </span>
      </p>

      {vehicles.length === 0 ? (
        <section className="panel-card">
          <EmptyState
            icon={EMPTY_ICONS.fleet}
            title="Nothing to track yet"
            message="Ardena fits the tracker in person."
            action={<Link to="/dashboard/fleet/new" className="btn btn-primary">Add a vehicle</Link>}
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
                placeholder="Search vehicle or plate"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search vehicles"
              />
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle</th>
                <th>Status</th>
                <th>Last known location</th>
                <th className="num">Speed</th>
                <th>Last ping</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ v, t }) => (
                <tr key={v.plate}>
                  <td>
                    <p className="strong">{v.name}</p>
                    <p className="cell-sub">{v.plate}</p>
                  </td>
                  <td>
                    {t ? (
                      <span className={`chip ${TRACK_CHIP[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                    ) : (
                      <span className="chip completed">No device</span>
                    )}
                  </td>
                  <td>
                    {t ? (
                      <>
                        <p>{t.address || "Waiting for first ping"}</p>
                        <p className="cell-sub mono">
                          {t.lat != null && t.lng != null
                            ? `${t.lat.toFixed(4)}, ${t.lng.toFixed(4)}`
                            : "-"}
                        </p>
                      </>
                    ) : (
                      <span className="cell-sub">, </span>
                    )}
                  </td>
                  <td className="num">{t && t.lat != null ? `${t.speed} km/h` : "-"}</td>
                  <td>{t ? relativeTime(t.lastPing) : "-"}</td>
                  <td className="actions-cell">
                    {t ? (
                      <Link className="icon-btn" to={`/dashboard/tracking/${encodeURIComponent(v.plate)}`}>
                        Track
                      </Link>
                    ) : (
                      <button type="button" className="icon-btn" onClick={() => openConnect(v)}>
                        Connect
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {rows.length === 0 && (
            <div className="empty-block fleet-empty">
              <p>No vehicles match your search.</p>
            </div>
          )}
        </section>
      )}

      {connectFor && (
        <div className="modal-overlay" onClick={() => setConnectFor(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">
              <h3>Connect tracker · {connectFor.plate}</h3>
              <button type="button" className="icon-btn" onClick={() => setConnectFor(null)}>✕</button>
            </header>
            <form onSubmit={submitConnect} className="modal-body">
              <label className="field-label">
                GPS provider
                <Dropdown value={provider} onChange={setProvider} options={PROVIDERS} />
              </label>
              <label className="field-label">
                Device ID / IMEI <span className="ho-photos-hint">· optional</span>
                <input
                  type="text"
                  className="field-input"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  placeholder="Leave blank to auto-generate"
                />
              </label>
              <p className="side-hint" style={{ marginTop: 0 }}>
                This registers a device the Ardena team has already fitted to{" "}
                {connectFor.name}. Once it is wired in and registered, the vehicle
                streams its live location, speed and ignition state here.
              </p>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setConnectFor(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={connecting}>
                  {connecting ? "Connecting…" : "Connect tracker"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
