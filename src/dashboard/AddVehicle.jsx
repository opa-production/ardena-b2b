import { useEffect, useState, useSyncExternalStore } from "react";
import { Link, useNavigate } from "react-router-dom";
import { addVehicle, getVehicle, getVehicles, isFleetLoaded, subscribe } from "./fleetStore";
import { subscribe as subscribePlan, getPlan, hydratePlan, atCarLimit } from "./planStore";
import Dropdown from "../components/Dropdown";
import DatePicker from "./DatePicker";
import UpgradeDialog from "./UpgradeDialog";
import { todayISO } from "./bookingsStore";
import { toast } from "./toastStore";
import "./fleet.css";

const CATEGORIES = ["SUV", "Saloon", "Hatchback", "Van", "Pickup"];

export default function AddVehicle() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [cat, setCat] = useState("SUV");
  const [vStatus, setVStatus] = useState("Available");
  const [ins, setIns] = useState("");
  const [inspection, setInspection] = useState("");
  const vehicles = useSyncExternalStore(subscribe, getVehicles);
  const loaded = useSyncExternalStore(subscribe, isFleetLoaded);
  const atCap = loaded && vehicles.length >= 100;

  // The shell loads the plan, so it is normally here already; this covers a
  // page opened before that landed. If it can't be read the form is left open
  // rather than locking someone out over a failed fetch.
  const plan = useSyncExternalStore(subscribePlan, getPlan);
  const [planChecked, setPlanChecked] = useState(Boolean(plan));
  useEffect(() => {
    hydratePlan()
      .catch(() => {})
      .finally(() => setPlanChecked(true));
  }, []);

  // A plan stops at the cars it covers: one past that can't take bookings, so
  // the upgrade dialog comes up over the form instead of it accepting a car
  // that would sit idle. The Fleet page stops the click before it gets here; this
  // is for the other ways in (a link, "Save & add another" on the last car).
  const carCount = loaded ? vehicles.length : plan?.cars || 0;
  const atPlanLimit = !atCap && atCarLimit(plan, carCount);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!planChecked || atPlanLimit) return;
    const form = e.currentTarget;
    const f = new FormData(form);
    const plate = f.get("plate").trim().toUpperCase();
    const stay = e.nativeEvent.submitter?.name === "again";

    if (getVehicle(plate)) {
      setError(`A vehicle with plate ${plate} is already in your fleet.`);
      return;
    }
    if (!ins) {
      setError("Pick the insurance expiry date.");
      return;
    }

    setSaving(true);
    try {
      // dates go to the API as ISO (the pickers hold ISO values)
      const make = f.get("make").trim();
      const model = f.get("model").trim();
      await addVehicle({
        // `name` stays the display label the dashboard shows everywhere; make
        // and model travel alongside for the consumer listing.
        name: [make, model].filter(Boolean).join(" "),
        make,
        model,
        plate,
        cat: f.get("cat"),
        rate: Number(f.get("rate")),
        year: Number(f.get("year")) || null,
        chassis_no: f.get("chassis_no")?.trim() || null,
        status: f.get("status"),
        ins: f.get("ins"),
        inspection: f.get("inspection") || null,
        notes: f.get("notes").trim(),
      });
    } catch (err) {
      setError(err.message);
      // The server's own count says the plan is full: refresh ours, and the
      // dialog above takes over.
      if (err.data?.code === "car_limit_reached") hydratePlan({ force: true }).catch(() => {});
      return;
    } finally {
      setSaving(false);
    }

    toast(`${plate} added to your fleet.`);
    if (stay) {
      setError("");
      form.reset();
      setCat("SUV");
      setVStatus("Available");
      setIns("");
      setInspection("");
      return;
    }
    navigate("/dashboard/fleet");
  }

  return (
    <>
      <Link to="/dashboard/fleet" className="page-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Fleet
      </Link>

      <h1 className="sr-only">Add vehicle</h1>

      {atCap && (
        <div className="panel-card fleet-cap-notice">
          <div className="fleet-cap-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h3>Fleet capacity reached</h3>
          <p>Your fleet is at the 100-vehicle limit. Contact Ardena sales to discuss an enterprise plan that fits your fleet.</p>
          <Link to="/dashboard/support" className="btn btn-primary" style={{ marginTop: "16px" }}>
            Contact support
          </Link>
        </div>
      )}

      {atPlanLimit && (
        <UpgradeDialog
          atLimit
          onClose={() => {
            // Still out of cars means it was dismissed, and there is nothing
            // to do on this page; after paying the form is what's wanted.
            if (atCarLimit(getPlan(), carCount)) navigate("/dashboard/fleet");
          }}
        />
      )}

      {!atCap && <div className="details-grid">
        <form id="add-vehicle-form" className="panel-card" onSubmit={handleSubmit}>
          <div className="form-grid">
            {/* Make and model are separate because the Ardena app renders them
                as "{make} {model}". Sending one combined string made every fleet
                car show up as "Toyota Prado Toyota Prado". */}
            <div className="field">
              <label htmlFor="v-make">Make</label>
              <input id="v-make" name="make" type="text" placeholder="Toyota" required />
            </div>
            <div className="field">
              <label htmlFor="v-model">Model</label>
              <input id="v-model" name="model" type="text" placeholder="Prado" required />
            </div>
            <div className="field">
              <label htmlFor="v-plate">Number plate</label>
              <input id="v-plate" name="plate" type="text" placeholder="KDL 482A" required />
            </div>
            {/* Required before the vehicle can be listed on the Ardena app, collected here so nobody hits that wall at publish time. */}
            <div className="field">
              <label htmlFor="v-year">Model year</label>
              <input
                id="v-year"
                name="year"
                type="number"
                min="1900"
                max={new Date().getFullYear() + 1}
                placeholder="2022"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="v-cat">Category</label>
              <Dropdown
                id="v-cat"
                name="cat"
                value={cat}
                onChange={setCat}
                options={CATEGORIES}
              />
            </div>
            <div className="field">
              <label htmlFor="v-rate">Day rate (KES)</label>
              <input id="v-rate" name="rate" type="number" min="0" step="100" placeholder="9,500" required />
            </div>
            <div className="field">
              <label htmlFor="v-chassis">Chassis / VIN</label>
              <input
                id="v-chassis"
                name="chassis_no"
                type="text"
                maxLength={50}
                placeholder="Optional"
              />
            </div>
            <div className="field">
              <label htmlFor="v-ins">Insurance expiry</label>
              <DatePicker
                id="v-ins"
                name="ins"
                value={ins}
                onChange={setIns}
                minDate={todayISO()}
                placeholder="Pick the expiry date"
              />
            </div>
            <div className="field">
              <label htmlFor="v-inspection">Inspection due</label>
              <DatePicker
                id="v-inspection"
                name="inspection"
                value={inspection}
                onChange={setInspection}
                minDate={todayISO()}
                placeholder="Optional"
              />
            </div>
            <div className="field">
              <label htmlFor="v-status">Status</label>
              <Dropdown
                id="v-status"
                name="status"
                value={vStatus}
                onChange={setVStatus}
                options={["Available", "In maintenance"]}
              />
            </div>
            <div className="field form-full">
              <label htmlFor="v-notes">Notes</label>
              <textarea id="v-notes" name="notes" rows="3" placeholder="Anything your team should know about this vehicle" />
            </div>
          </div>

          {/* No photos here: they belong to the Ardena app listing, which has
              its own uploader (Marketplace on the vehicle page). */}
          {error && <p className="form-error">{error}</p>}
        </form>

        <aside className="details-side">
          <section className="panel-card">
            <header className="card-head">
              <h2>Actions</h2>
              <p>Save this vehicle or discard it</p>
            </header>
            <div className="action-stack">
              <button type="submit" form="add-vehicle-form" className="btn btn-primary" disabled={saving || !planChecked}>
                {saving ? "Adding…" : "Add to fleet"}
              </button>
              <button type="submit" form="add-vehicle-form" name="again" className="btn btn-ghost" disabled={saving || !planChecked}>
                Save &amp; add another
              </button>
              <Link to="/dashboard/fleet" className="btn btn-ghost">
                Cancel
              </Link>
            </div>
            <p className="action-hint">
              New vehicles are bookable straight away unless you set them to
              maintenance.
            </p>
          </section>
        </aside>
      </div>}
    </>
  );
}
