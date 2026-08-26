import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  subscribe as subscribeFleet,
  getVehicles,
} from "./fleetStore";
import {
  rentalDays,
  fmtDate,
  todayISO,
} from "./bookingsStore";
import { getPolicy } from "./policyStore";
import {
  subscribe as subscribeAvail,
  getBlocked,
} from "./availabilityStore";
import { createBooking, fetchVehicleAvailability } from "../lib/api";
import DateRangePicker from "./DateRangePicker";
import Dropdown from "../components/Dropdown";
import { toast } from "./toastStore";
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
  const [submitting, setSubmitting] = useState(false);
  const [datesOpen, setDatesOpen] = useState(false);
  const datesRef = useRef(null);

  const bookable = useMemo(
    () => vehicles.filter((v) => v.status !== "In maintenance"),
    [vehicles]
  );
  const vehicle = bookable.find((v) => v.plate === plate);
  const blockedMap = useSyncExternalStore(subscribeAvail, getBlocked);

  // days blocked on the availability calendar for the chosen vehicle
  const bookedDays = useMemo(() => {
    return new Set(blockedMap[plate] || []);
  }, [plate, blockedMap]);

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

  async function handleSubmit(e) {
    e.preventDefault();
    if (!datesValid) {
      setError("Pick the pickup and return dates.");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    const f = new FormData(e.currentTarget);
    const deposit = f.get("deposit");
    try {
      const booking = await createBooking({
        customer: f.get("customer").trim(),
        phone: f.get("phone").trim(),
        plate: vehicle.plate,
        pickup,
        dropoff,
        location: f.get("location").trim(),
        notes: f.get("notes").trim() || null,
        ...(deposit ? { deposit_amount: Number(deposit) } : {}),
      });
      toast(`Booking ${booking.ref} created, pending confirmation.`);
      navigate(`/dashboard/bookings/${encodeURIComponent(booking.ref)}`);
    } catch (err) {
      setError(err.message || "Failed to create booking. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <>
      <Link to="/dashboard/bookings" className="page-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Bookings
      </Link>

      <h1 className="sr-only">New booking</h1>

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
            <Dropdown
              id="b-vehicle"
              value={plate}
              onChange={setPlate}
              placeholder="Choose a vehicle"
              options={bookable.map((v) => ({
                value: v.plate,
                label: `${v.name} · ${v.plate}, KES ${fmtAmount(v.rate)}/day`,
              }))}
            />
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
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Creating…" : "Create booking"}
          </button>
          <Link to="/dashboard/bookings" className="btn btn-ghost">
            Cancel
          </Link>
        </div>
      </form>
    </>
  );
}
