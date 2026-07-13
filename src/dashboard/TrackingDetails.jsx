import { useState, useSyncExternalStore } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  subscribe as subscribeFleet,
  getVehicle,
  isFleetLoaded,
} from "./fleetStore";
import {
  subscribe as subscribeTrackers,
  getTracker,
  disconnectTracker,
  TRACK_CHIP,
  relativeTime,
  mapsUrl,
  fmtCoord,
} from "./trackingStore";
import ConfirmDialog from "../components/ConfirmDialog";
import { toast } from "./toastStore";
import usePageTitle from "../hooks/usePageTitle";
import "./fleet.css";
import "./bookings.css";
import "./tracking.css";

const STATUS_LABEL = { moving: "Moving", parked: "Parked", offline: "Offline" };

// Schematic map: project the recent ping trail into a padded viewBox and draw a
// path with a pulsing marker at the latest fix. No tiles (CSP blocks them) — the
// coordinates + "Open in Google Maps" link cover the real-map need.
function MiniMap({ trail }) {
  const pts = trail && trail.length ? trail : [];
  if (!pts.length) return <div className="map-face map-empty">Waiting for first ping…</div>;

  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  let minLat = Math.min(...lats), maxLat = Math.max(...lats);
  let minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  // guarantee a non-zero span so a single/near-static point still centres
  const padLat = (maxLat - minLat) || 0.01;
  const padLng = (maxLng - minLng) || 0.01;
  minLat -= padLat * 0.4; maxLat += padLat * 0.4;
  minLng -= padLng * 0.4; maxLng += padLng * 0.4;

  const W = 100, H = 62, M = 12;
  const px = (lng) => M + ((lng - minLng) / (maxLng - minLng)) * (W - 2 * M);
  const py = (lat) => M + ((maxLat - lat) / (maxLat - minLat)) * (H - 2 * M);

  const line = pts.map((p) => `${px(p.lng).toFixed(1)},${py(p.lat).toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  const cx = px(last.lng), cy = py(last.lat);

  return (
    <div className="map-face">
      <svg viewBox={`0 0 ${W} ${H}`} className="map-svg" preserveAspectRatio="xMidYMid slice">
        {/* faint grid */}
        {[...Array(9)].map((_, i) => (
          <line key={`v${i}`} x1={(i + 1) * 10} y1="0" x2={(i + 1) * 10} y2={H} className="map-grid" />
        ))}
        {[...Array(5)].map((_, i) => (
          <line key={`h${i}`} x1="0" y1={(i + 1) * 10} x2={W} y2={(i + 1) * 10} className="map-grid" />
        ))}
        {pts.length > 1 && <polyline points={line} className="map-trail" />}
        <circle cx={cx} cy={cy} r="4.5" className="map-ping" />
        <circle cx={cx} cy={cy} r="2.4" className="map-dot" />
      </svg>
    </div>
  );
}

export default function TrackingDetails() {
  const { plate } = useParams();
  const navigate = useNavigate();
  const decodedPlate = decodeURIComponent(plate);
  usePageTitle(`Tracking · ${decodedPlate}`);

  const loaded = useSyncExternalStore(subscribeFleet, isFleetLoaded);
  const vehicle = useSyncExternalStore(subscribeFleet, () => getVehicle(decodedPlate));
  const tracker = useSyncExternalStore(subscribeTrackers, () => getTracker(decodedPlate));
  const [confirmOff, setConfirmOff] = useState(false);

  function handleDisconnect() {
    setConfirmOff(false);
    disconnectTracker(decodedPlate);
    toast(`Tracker disconnected from ${decodedPlate}.`);
    navigate("/dashboard/tracking");
  }

  const back = (
    <Link to="/dashboard/tracking" className="back-link" aria-label="Back to tracking">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
    </Link>
  );

  if (!loaded) {
    return <>{back}<div className="empty-block fleet-empty"><p>Loading…</p></div></>;
  }

  if (!tracker) {
    return (
      <>
        {back}
        <div className="empty-block fleet-empty">
          <p>No tracker is connected to {decodedPlate}. Connect one from the tracking list.</p>
        </div>
      </>
    );
  }

  const trail = tracker.trail || [];
  const recent = [...trail].reverse();

  return (
    <>
      <header className="head-card">
        <div className="head-left">
          {back}
          <div className="head-titles">
            <h1>{vehicle?.name || decodedPlate}</h1>
            <p>
              {decodedPlate} ·{" "}
              <span className={`chip ${TRACK_CHIP[tracker.status]}`}>{STATUS_LABEL[tracker.status]}</span>
            </p>
          </div>
        </div>
        <div className="details-actions">
          <a className="btn btn-ghost" href={mapsUrl(tracker.lat, tracker.lng)} target="_blank" rel="noopener noreferrer">
            Open in Google Maps
          </a>
          <button type="button" className="btn btn-ghost danger-btn" onClick={() => setConfirmOff(true)}>
            Disconnect
          </button>
        </div>
      </header>

      <div className="details-grid">
        <div className="settings-main">
          <section className="panel-card">
            <header className="card-head">
              <h2>Live location</h2>
              <p>{tracker.address} · updated {relativeTime(tracker.lastPing)}</p>
            </header>
            <MiniMap trail={trail} />
            <div className="map-readout">
              <span className="mono">{fmtCoord(tracker.lat, tracker.lng)}</span>
              <a className="spec-link" href={mapsUrl(tracker.lat, tracker.lng)} target="_blank" rel="noopener noreferrer">
                View on map ↗
              </a>
            </div>
          </section>

          <section className="panel-card">
            <header className="card-head">
              <h2>Recent movement</h2>
              <p>Last {recent.length} ping{recent.length === 1 ? "" : "s"} from the device</p>
            </header>
            <div className="ping-list">
              {recent.map((p, i) => (
                <div className="ping-row" key={`${p.at}-${i}`}>
                  <span className="ping-dot" />
                  <div className="ping-main">
                    <p className="ping-coord mono">{fmtCoord(p.lat, p.lng)}</p>
                    <p className="ping-meta">{relativeTime(p.at)} · {p.speed} km/h</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="details-side">
          <section className="panel-card">
            <header className="card-head">
              <h2>Status</h2>
              <p>Live from the tracker</p>
            </header>
            <div className="pay-row">
              <span>Motion</span>
              <span className={`chip ${TRACK_CHIP[tracker.status]}`}>{STATUS_LABEL[tracker.status]}</span>
            </div>
            <div className="pay-row">
              <span>Speed</span>
              <span className="mini-amount">{tracker.speed} km/h</span>
            </div>
            <div className="pay-row">
              <span>Ignition</span>
              <span className="mini-amount">{tracker.ignition ? "On" : "Off"}</span>
            </div>
            <div className="pay-row">
              <span>Last ping</span>
              <span className="mini-amount">{relativeTime(tracker.lastPing)}</span>
            </div>
          </section>

          <section className="panel-card">
            <header className="card-head">
              <h2>Device</h2>
              <p>Tracker details</p>
            </header>
            <dl className="spec-grid">
              <div className="spec">
                <dt>Provider</dt>
                <dd>{tracker.provider}</dd>
              </div>
              <div className="spec">
                <dt>Device ID</dt>
                <dd className="mono">{tracker.deviceId}</dd>
              </div>
              <div className="spec">
                <dt>Connected</dt>
                <dd>{new Date(tracker.connectedAt).toLocaleDateString("en-KE", { dateStyle: "medium" })}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOff}
        title="Disconnect tracker?"
        message={`${decodedPlate} will stop reporting its location. You can reconnect a tracker any time.`}
        confirmLabel="Disconnect"
        onConfirm={handleDisconnect}
        onCancel={() => setConfirmOff(false)}
      />
    </>
  );
}
