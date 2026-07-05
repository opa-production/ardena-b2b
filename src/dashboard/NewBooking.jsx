import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  subscribe as subscribeFleet,
  getVehicles,
} from "./fleetStore";
import {
  addBooking,
  getBookings,
  rentalDays,
  fmtDate,
  todayISO,
} from "./bookingsStore";
import { getPolicy } from "./policyStore";
import DateRangePicker from "./DateRangePicker";
import "./fleet.css";
import "./bookings.css";

const fmtAmount = (n) => n.toLocaleString("en-KE");

// local-date ISO; toISOString() would shift a day in UTC+3
const isoOf = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function NewBooking() {
  const navigate = useNavigate();
  const vehicles = useSyncExternalStore(subscribeFleet, getVehicles);
  const [plate, setPlate] = useState("");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [error, setError] = useState("");
  const [datesOpen, setDatesOpen] = useState(false);
  const datesRef = useRef(null);

  const bookable = useMemo(
    () => vehicles.filter((v) => v.status !== "In maintenance"),
    [vehicles]
  );
  const vehicle = bookable.find((v) => v.plate === plate);

  // days already taken by live bookings for the chosen vehicle
  const bookedDays = useMemo(() => {
    const days = new Set();
    if (!plate) return days;
    getBookings()
      .filter(
        (b) =>
          b.plate === plate &&
          ["Pending", "Confirmed", "Active"].includes(b.status)
      )
      .forEach((b) => {
        const cur = new Date(`${b.pickup}T00:00:00`);
        const stop = new Date(`${b.dropoff}T00:00:00`);
        while (cur <= stop) {
          days.add(isoOf(cur));
          cur.setDate(cur.getDate() + 1);
        }
      });
    return days;
  }, [plate, vehicles]);

  // switching vehicles can invalidate an already-picked range
  useEffect(() => {
    if (!pickup || !dropoff) return;
    const cur = new Date(`${pickup}T00:00:00`);
    const stop = new Date(`${dropoff}T00:00:00`);
    while (cur <= stop) {
      if (bookedDays.has(isoOf(cur))) {
        setPickup("");
        setDropoff("");
        return;
      }
      cur.setDate(cur.getDate() + 1);
    }
  }, [bookedDays]); // eslint-disable-line react-hooks/exhaustive-deps

  // close the calendar on outside click
  useEffect(() => {
    if (!datesOpen) return;
    function onDown(e) {
      if (!datesRef.current?.contains(e.target)) setDatesOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [datesOpen]);

  const datesValid =
    pickup && dropoff && Date.parse(dropoff) > Date.parse(pickup);
  const days = datesValid ? rentalDays(pickup, dropoff) : 0;
  const total = vehicle && datesValid ? days * vehicle.rate : null;

  function handleSubmit(e) {
    e.preventDefault();
    if (!datesValid) {
      setError("Pick the pickup and return dates.");
      return;
    }
    const f = new FormData(e.currentTarget);
    const deposit = f.get("deposit");
    const ref = addBooking({
      customer: f.get("customer").trim(),
      phone: f.get("phone").trim(),
      vehicle: vehicle.name,
      plate: vehicle.plate,
      pickup,
      dropoff,
      location: f.get("location").trim(),
      rate: vehicle.rate,
      created: todayISO(),
      notes: f.get("notes").trim(),
      // per-booking deposit is optional; blank falls back to the policy default
      ...(deposit ? { depositAmount: Number(deposit) } : {}),
    });
    navigate(`/dashboard/bookings/${encodeURIComponent(ref)}`);
  }

  return (
    <>
      <header className="head-card">
        <div className="head-left">
          <Link to="/dashboard/bookings" className="back-link" aria-label="Back to bookings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="head-titles">
            <h1>New booking</h1>
            <p>Reserve a vehicle for a customer. It starts as pending until you confirm.</p>
          </div>
        </div>
      </header>

      <form className="panel-card form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="b-customer">Customer name</label>
            <input id="b-customer" name="customer" type="text" placeholder="Wanjiku Kamau" required />
          </div>
          <div className="field">
            <label htmlFor="b-phone">Phone (M-Pesa)</label>
            <input id="b-phone" name="phone" type="tel" placeholder="0722 000 000" required />
          </div>
          <div className="field form-full">
            <label htmlFor="b-vehicle">Vehicle</label>
            <select
              id="b-vehicle"
              name="vehicle"
              required
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
            >
              <option value="" disabled>
                Choose a vehicle
              </option>
              {bookable.map((v) => (
                <option key={v.plate} value={v.plate}>
                  {v.name} · {v.plate}, KES {fmtAmount(v.rate)}/day
                </option>
              ))}
            </select>
          </div>
          <div className="field form-full drp-field" ref={datesRef}>
            <label htmlFor="b-dates">Dates</label>
            <button
              id="b-dates"
              type="button"
              className={"drp-trigger" + (datesOpen ? " open" : "")}
              onClick={() => setDatesOpen((o) => !o)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="17" rx="2" />
                <path d="M8 2v4M16 2v4M3 9h18" />
              </svg>
              {pickup ? fmtDate(pickup) : <span className="placeholder">Pickup date</span>}
              <span className="drp-arrow">→</span>
              {dropoff ? fmtDate(dropoff) : <span className="placeholder">Return date</span>}
            </button>
            {datesOpen && (
              <div className="drp-pop">
                <DateRangePicker
                  start={pickup || null}
                  end={dropoff || null}
                  minDate={todayISO()}
                  isDisabled={(iso) => bookedDays.has(iso)}
                  onChange={({ start, end }) => {
                    setPickup(start || "");
                    setDropoff(end || "");
                    setError("");
                    if (start && end) setTimeout(() => setDatesOpen(false), 250);
                  }}
                />
              </div>
            )}
          </div>
          <div className="field">
            <label htmlFor="b-location">Pickup location</label>
            <input id="b-location" name="location" type="text" placeholder="Westlands office" required />
          </div>
          <div className="field">
            <label htmlFor="b-deposit">Security deposit (KES) · optional</label>
            <input
              id="b-deposit"
              name="deposit"
              type="number"
              min="0"
              step="500"
              placeholder={`${getPolicy().deposit.toLocaleString("en-KE")} (policy default)`}
            />
          </div>
          <div className="field form-full">
            <label htmlFor="b-notes">Notes</label>
            <textarea id="b-notes" name="notes" rows="3" placeholder="Flight details, upcountry use, special requests" />
          </div>
        </div>

        <div className="booking-total" aria-live="polite">
          <p>
            {vehicle && datesValid
              ? `${days} day${days > 1 ? "s" : ""} × KES ${fmtAmount(vehicle.rate)}/day`
              : "Pick a vehicle and dates to see the total"}
          </p>
          <strong>{total !== null ? `KES ${fmtAmount(total)}` : "—"}</strong>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            Create booking
          </button>
          <Link to="/dashboard/bookings" className="btn btn-ghost">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
