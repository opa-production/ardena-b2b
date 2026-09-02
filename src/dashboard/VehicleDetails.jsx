import { useRef, useState, useSyncExternalStore } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  subscribe,
  getVehicles,
  getVehicle,
  removeVehicle,
  expiringSoon,
  isFleetLoaded,
  hydrateFleet,
} from "./fleetStore";
import { getBookings } from "./bookingsStore";
import {
  subscribe as subscribeBusiness,
  getBusiness,
} from "./businessStore";
import { setVehiclePlate, uploadVehicleDocument } from "../lib/api";
import { downloadVehicleStatement } from "./pdf";
import Dropdown from "../components/Dropdown";
import { toast } from "./toastStore";
import { B2C_MARKETPLACE } from "../lib/features";
import "./fleet.css";
import "./hostlink.css";

const MONTHS = [
  { label: "July 2026", prefix: "2026-07" },
  { label: "June 2026", prefix: "2026-06" },
  { label: "May 2026", prefix: "2026-05" },
];

const CHIP_CLASS = {
  Available: "available",
  "On booking": "booked",
  "In maintenance": "maintenance",
};

// The compliance documents behind the self-declared expiry dates.
const DOC_KINDS = [
  { kind: "logbook", label: "Logbook", urlKey: "logbook_url" },
  { kind: "insurance", label: "Insurance certificate", urlKey: "insurance_doc_url" },
];

const UPCOMING = [
  { customer: "Wanjiku Kamau", dates: "Jul 2 to Jul 6", amount: "48,000" },
  { customer: "James Otieno", dates: "Jul 12 to Jul 15", amount: "36,000" },
];

export default function VehicleDetails() {
  useSyncExternalStore(subscribe, getVehicles); // re-render on store changes
  const loaded = useSyncExternalStore(subscribe, isFleetLoaded);
  const { plate } = useParams();
  const navigate = useNavigate();
  const business = useSyncExternalStore(subscribeBusiness, getBusiness);
  const [confirming, setConfirming] = useState(false);
  const [month, setMonth] = useState(MONTHS[1].prefix); // June has the history
  const [newPlate, setNewPlate] = useState("");
  const [plateBusy, setPlateBusy] = useState(false);
  const [docBusy, setDocBusy] = useState(null);
  const docInputs = useRef({});

  const v = getVehicle(decodeURIComponent(plate));

  if (!v) {
    return (
      <>
        <Link to="/dashboard/fleet" className="back-link" aria-label="Back to fleet">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="empty-block fleet-empty">
          <p>{loaded ? "This vehicle is no longer in your fleet." : "Loading vehicle…"}</p>
        </div>
      </>
    );
  }

  const insSoon = expiringSoon(v.ins);
  const inspSoon = expiringSoon(v.inspection);
  // Imported vehicles carry a temporary LINK-* id until a real plate is set.
  const isPlaceholderPlate = String(v.plate || "").toUpperCase().startsWith("LINK-");

  async function handleDocUpload(kind, e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be picked again after a failure
    if (!file || docBusy) return;
    setDocBusy(kind);
    try {
      await uploadVehicleDocument(v.plate, kind, file);
      await hydrateFleet();
      toast(`${kind === "logbook" ? "Logbook" : "Insurance certificate"} uploaded.`);
    } catch (err) {
      toast(err.message || "Couldn't upload that document", "danger");
    } finally {
      setDocBusy(null);
    }
  }

  async function handleSetPlate(e) {
    e.preventDefault();
    const value = newPlate.trim();
    if (!value || plateBusy) return;
    setPlateBusy(true);
    try {
      await setVehiclePlate(v.plate, value);
      toast(`Plate set to ${value}.`);
      // The plate is this vehicle's identity in the URL, so navigate rather
      // than leaving the page pointing at an id that no longer exists.
      await hydrateFleet();
      navigate(`/dashboard/fleet/${encodeURIComponent(value)}`, { replace: true });
    } catch (err) {
      toast(err.message || "Couldn't set that plate", "danger");
    } finally {
      setPlateBusy(false);
    }
  }

  return (
    <>
      <header className="head-card">
        <div className="head-left">
          <Link to="/dashboard/fleet" className="back-link" aria-label="Back to fleet">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="head-titles">
            <h1>{v.name}</h1>
            <p>
              {v.plate} · {v.cat} ·{" "}
              <span className={`chip ${CHIP_CLASS[v.status]}`}>{v.status}</span>
            </p>
          </div>
        </div>
        <div className="details-actions">
          {B2C_MARKETPLACE && business.appLinked && (
            <Link
              to={`/dashboard/fleet/${encodeURIComponent(v.plate)}/marketplace`}
              className="btn btn-ghost"
            >
              Marketplace
            </Link>
          )}
          <button type="button" className="btn btn-ghost" disabled title="Editing is coming soon">
            Edit
          </button>
          {confirming ? (
            <span className="confirm-inline">
              Delete this vehicle?
              <button
                type="button"
                className="icon-btn danger"
                onClick={async () => {
                  setConfirming(false);
                  try {
                    await removeVehicle(v.plate);
                    toast(`${v.name} (${v.plate}) removed from the fleet.`, "danger");
                    navigate("/dashboard/fleet");
                  } catch (err) {
                    toast(err.message, "danger");
                  }
                }}
              >
                Yes
              </button>
              <button type="button" className="icon-btn" onClick={() => setConfirming(false)}>
                No
              </button>
            </span>
          ) : (
            <button type="button" className="btn btn-ghost danger-btn" onClick={() => setConfirming(true)}>
              Delete
            </button>
          )}
        </div>
      </header>

      {/* Vehicles imported from a linked host account arrive without a number
          plate — the Ardena app never stored one — so they carry a temporary ID
          until someone sets the real thing. This is the only place to do it. */}
      {isPlaceholderPlate && (
        <form className="plate-fix" onSubmit={handleSetPlate}>
          <div>
            <strong>This vehicle needs its real number plate.</strong>
            <p>
              It came across from your Ardena host account, which doesn&apos;t store
              plates. Bookings and trackers move with it automatically.
            </p>
          </div>
          <input
            value={newPlate}
            onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
            placeholder="KDL 482A"
            maxLength={20}
            aria-label="Real number plate"
          />
          <button type="submit" className="btn btn-primary" disabled={plateBusy}>
            {plateBusy ? "Saving…" : "Set plate"}
          </button>
        </form>
      )}

      <div className="details-grid">
        <section className="panel-card">
          <header className="card-head">
            <h2>Vehicle information</h2>
            <p>Registry record</p>
          </header>
          <dl className="spec-grid">
            <div className="spec">
              <dt>Number plate</dt>
              <dd>{v.plate}</dd>
            </div>
            <div className="spec">
              <dt>Category</dt>
              <dd>{v.cat}</dd>
            </div>
            <div className="spec">
              <dt>Day rate</dt>
              <dd>KES {v.rate.toLocaleString("en-KE")}</dd>
            </div>
            <div className="spec">
              <dt>Added to fleet</dt>
              <dd>{v.added || "—"}</dd>
            </div>
            <div className="spec">
              <dt>Insurance expiry</dt>
              <dd>
                {v.ins || "—"}
                {insSoon !== null && <span className="ins-soon"> · in {insSoon} days</span>}
              </dd>
            </div>
            <div className="spec">
              <dt>Inspection due</dt>
              <dd>
                {v.inspection || "—"}
                {inspSoon !== null && <span className="ins-soon"> · in {inspSoon} days</span>}
              </dd>
            </div>
            {v.year && (
              <div className="spec">
                <dt>Model year</dt>
                <dd>{v.year}</dd>
              </div>
            )}
            {v.chassis_no && (
              <div className="spec">
                <dt>Chassis / VIN</dt>
                <dd>{v.chassis_no}</dd>
              </div>
            )}
            {/* The expiry dates above are self-declared; these are the documents
                behind them, and what marketplace review checks. */}
            <div className="spec spec-full">
              <dt>Documents</dt>
              <dd className="doc-row">
                {DOC_KINDS.map(({ kind, label, urlKey }) => (
                  <span className="doc-item" key={kind}>
                    {v[urlKey] ? (
                      <a href={v[urlKey]} target="_blank" rel="noreferrer">
                        {label}
                      </a>
                    ) : (
                      <span className="cell-sub">{label} not uploaded</span>
                    )}
                    <button
                      type="button"
                      className="icon-btn"
                      disabled={docBusy === kind}
                      onClick={() => docInputs.current[kind]?.click()}
                    >
                      {docBusy === kind ? "Uploading…" : v[urlKey] ? "Replace" : "Upload"}
                    </button>
                    <input
                      ref={(el) => (docInputs.current[kind] = el)}
                      type="file"
                      accept="image/*,application/pdf"
                      style={{ display: "none" }}
                      onChange={(e) => handleDocUpload(kind, e)}
                    />
                  </span>
                ))}
              </dd>
            </div>
            {v.notes && (
              <div className="spec spec-full">
                <dt>Notes</dt>
                <dd>{v.notes}</dd>
              </div>
            )}
          </dl>
        </section>

        <div className="details-side">
          <section className="panel-card">
            <header className="card-head">
              <h2>Utilisation</h2>
              <p>Share of days booked, last 90 days</p>
            </header>
            <p className="util-hero">{v.util}%</p>
            <span className="util-bar util-bar-lg">
              <i style={{ width: `${v.util}%` }} />
            </span>
          </section>

          <section className="panel-card">
            <header className="card-head">
              <h2>Upcoming bookings</h2>
              <p>Next reservations for this vehicle</p>
            </header>
            {v.status === "On booking" ? (
              <ul className="mini-list">
                {UPCOMING.map((b) => (
                  <li key={b.dates}>
                    <div>
                      <p className="attention-title">{b.customer}</p>
                      <p className="attention-meta">{b.dates}</p>
                    </div>
                    <span className="mini-amount">KES {b.amount}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mini-empty">No upcoming bookings.</p>
            )}
          </section>

          <section className="panel-card">
            <header className="card-head">
              <h2>Statements</h2>
              <p>Monthly earnings for this vehicle, as PDF</p>
            </header>
            <div className="field">
              <label htmlFor="stmt-month">Period</label>
              <Dropdown
                id="stmt-month"
                value={month}
                onChange={setMonth}
                options={MONTHS.map((m) => ({ value: m.prefix, label: m.label }))}
              />
            </div>
            <button
              type="button"
              className="btn btn-ghost pay-btn stmt-btn"
              onClick={() =>
                downloadVehicleStatement(
                  v,
                  getBookings(),
                  MONTHS.find((m) => m.prefix === month).label,
                  month
                )
              }
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
                <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
              </svg>
              Download statement
            </button>
            <p className="side-hint">
              Bookings, days rented, utilisation and gross earnings for the
              period. Share it with the vehicle's owner.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
