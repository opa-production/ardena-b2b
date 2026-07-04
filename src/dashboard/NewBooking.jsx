import { useMemo, useState, useSyncExternalStore } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  subscribe as subscribeFleet,
  getVehicles,
} from "./fleetStore";
import { addBooking, rentalDays, todayISO } from "./bookingsStore";
import "./fleet.css";
import "./bookings.css";

const fmtAmount = (n) => n.toLocaleString("en-KE");

export default function NewBooking() {
  const navigate = useNavigate();
  const vehicles = useSyncExternalStore(subscribeFleet, getVehicles);
  const [plate, setPlate] = useState("");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [error, setError] = useState("");

  const bookable = useMemo(
    () => vehicles.filter((v) => v.status !== "In maintenance"),
    [vehicles]
  );
  const vehicle = bookable.find((v) => v.plate === plate);

  const datesValid =
    pickup && dropoff && Date.parse(dropoff) > Date.parse(pickup);
  const days = datesValid ? rentalDays(pickup, dropoff) : 0;
  const total = vehicle && datesValid ? days * vehicle.rate : null;

  function handleSubmit(e) {
    e.preventDefault();
    if (!datesValid) {
      setError("The return date must be after the pickup date.");
      return;
    }
    const f = new FormData(e.currentTarget);
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
    });
    navigate(`/dashboard/bookings/${encodeURIComponent(ref)}`);
  }

  return (
    <>
      <Link to="/dashboard/bookings" className="back-link" aria-label="Back to bookings">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </Link>

      <div className="page-head">
        <h1>New booking</h1>
        <p>Reserve a vehicle for a customer. It starts as pending until you confirm.</p>
      </div>

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
          <div className="field">
            <label htmlFor="b-pickup">Pickup date</label>
            <input
              id="b-pickup"
              name="pickup"
              type="date"
              required
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="b-dropoff">Return date</label>
            <input
              id="b-dropoff"
              name="dropoff"
              type="date"
              required
              value={dropoff}
              onChange={(e) => setDropoff(e.target.value)}
            />
          </div>
          <div className="field form-full">
            <label htmlFor="b-location">Pickup location</label>
            <input id="b-location" name="location" type="text" placeholder="Westlands office" required />
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
