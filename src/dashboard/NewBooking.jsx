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
import { createBooking, fetchBookedRanges, updateBooking, uploadHandoverPhotos } from "../lib/api";
import { compressImage, stagedToFiles } from "./handoverPhotosStore";
import DateRangePicker from "./DateRangePicker";
import Dropdown from "../components/Dropdown";
import { toast } from "./toastStore";
import "./fleet.css";
import "./bookings.css";

const fmtAmount = (n) => n.toLocaleString("en-KE");

const FUEL_LEVELS = ["Full", "3/4", "1/2", "1/4", "Reserve"];

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
  // The car's condition at pickup. Out of the way until asked for: most of
  // the form is about the customer, and a booking for next week has no
  // odometer reading to give yet.
  const [conditionOpen, setConditionOpen] = useState(false);
  const [fuel, setFuel] = useState("Full");
  const [photos, setPhotos] = useState([]);
  const [photoBusy, setPhotoBusy] = useState(false);

  async function handlePhotoPick(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // let the same file be re-picked after removal
    if (!files.length) return;
    setPhotoBusy(true);
    try {
      const urls = await Promise.all(files.map((file) => compressImage(file)));
      setPhotos((prev) =>
        [...prev, ...urls.map((url) => ({ id: `${Date.now()}-${Math.random()}`, url }))].slice(0, 8)
      );
    } catch (err) {
      toast(err.message || "Couldn't add that photo", "danger");
    } finally {
      setPhotoBusy(false);
    }
  }

  const bookable = useMemo(
    () => vehicles.filter((v) => v.status !== "In maintenance"),
    [vehicles]
  );
  const vehicle = bookable.find((v) => v.plate === plate);
  const blockedMap = useSyncExternalStore(subscribeAvail, getBlocked);

  // The chosen vehicle's existing bookings, so their dates can't be picked at
  // all rather than being refused when the form is submitted. `taken.plate`
  // says which vehicle the ranges belong to: until it matches the selection
  // the calendar stays shut, so nobody picks from the previous car's dates.
  const [taken, setTaken] = useState({ plate: "", ranges: [] });
  const [recheck, setRecheck] = useState(0);
  useEffect(() => {
    if (!plate) return undefined;
    let alive = true;
    fetchBookedRanges(plate)
      .then((ranges) => alive && setTaken({ plate, ranges }))
      // Couldn't ask: leave the dates open, the server still refuses a clash.
      .catch(() => alive && setTaken({ plate, ranges: [] }));
    return () => {
      alive = false;
    };
  }, [plate, recheck]);
  const checking = Boolean(plate) && taken.plate !== plate;

  // every day the chosen vehicle can't be booked: days inside an existing
  // booking, plus days blocked on the availability calendar
  const bookedDays = useMemo(() => {
    const days = new Set(blockedMap[plate] || []);
    if (taken.plate === plate) {
      for (const r of taken.ranges) {
        const cur = new Date(`${r.start}T00:00:00`);
        const stop = new Date(`${r.end}T00:00:00`);
        while (cur <= stop) {
          days.add(isoOf(cur));
          cur.setDate(cur.getDate() + 1);
        }
      }
    }
    return days;
  }, [plate, blockedMap, taken]);

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
    const idNumber = f.get("id_number").trim();
    const destination = f.get("destination").trim();
    const notes = f.get("notes").trim();
    const odometer = conditionOpen ? f.get("odometer") : "";
    const conditionNotes = conditionOpen ? String(f.get("condition_notes") || "").trim() : "";
    const checkout = odometer
      ? { odometer: Number(odometer), fuel, notes: conditionNotes || null }
      : null;
    let booking;
    try {
      booking = await createBooking({
        customer: f.get("customer").trim(),
        phone: f.get("phone").trim(),
        id_number: idNumber,
        plate: vehicle.plate,
        pickup,
        dropoff,
        location: f.get("location").trim(),
        destination,
        notes: notes || null,
        ...(deposit ? { deposit_amount: Number(deposit) } : {}),
        ...(checkout ? { checkout } : {}),
      });
    } catch (err) {
      setError(err.message || "Failed to create booking. Try again.");
      // Someone else took the dates meanwhile: redraw the calendar with them.
      if (err.status === 409) setRecheck((v) => v + 1);
      setSubmitting(false);
      return;
    }

    // The booking exists from here on, so nothing below may fail the form:
    // each follow-up reports its own problem and the page moves on.
    //
    // A backend that doesn't store the ID and destination yet hands the
    // booking back without them; keep them in the notes rather than lose what
    // the customer was just asked for (see walkin-booking-flow.md in the
    // backend repo).
    if (booking.id_number === undefined || booking.destination === undefined) {
      const kept = [`ID ${idNumber}`, `Going to ${destination}`, notes].filter(Boolean).join(". ");
      await updateBooking(booking.ref, { notes: kept }).catch(() => {});
    }
    if (conditionOpen && photos.length) {
      try {
        await uploadHandoverPhotos(booking.ref, "out", await stagedToFiles(photos));
      } catch (err) {
        toast(
          `Booking created, but the photos couldn't be uploaded: ${err.message || "add them from the booking"}`,
          "warn"
        );
      }
    }
    if (checkout && booking.handover?.out?.odometer == null) {
      toast("Booking created. The odometer and fuel weren't saved, record them from the booking.", "warn");
    } else {
      toast(`Booking ${booking.ref} created. Take payment to confirm it.`);
    }
    navigate(`/dashboard/bookings/${encodeURIComponent(booking.ref)}`);
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
            <label htmlFor="b-phone">Mobile number (M-Pesa)</label>
            <input id="b-phone" name="phone" type="tel" placeholder="0722 000 000" required />
          </div>
          <div className="field">
            <label htmlFor="b-id">ID or passport number</label>
            <input id="b-id" name="id_number" type="text" placeholder="12345678" maxLength={40} required />
          </div>
          <div className="field">
            <label htmlFor="b-destination">Where the car is going</label>
            <input id="b-destination" name="destination" type="text" placeholder="Naivasha, then back to Nairobi" maxLength={255} required />
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
              disabled={checking}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="17" rx="2" />
                <path d="M8 2v4M16 2v4M3 9h18" />
              </svg>
              {checking ? (
                <span className="placeholder">Checking this vehicle&apos;s dates…</span>
              ) : (
                <>
                  {pickup ? fmtDate(pickup) : <span className="placeholder">Pickup date</span>}
                  <span className="drp-arrow">→</span>
                  {dropoff ? fmtDate(dropoff) : <span className="placeholder">Return date</span>}
                </>
              )}
            </button>
            {datesOpen && !checking && (
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
            <label htmlFor="b-notes">Notes · optional</label>
            <textarea id="b-notes" name="notes" rows="2" placeholder="Flight details, special requests" />
          </div>
        </div>

        {/* The car's condition is an extra: asked for only when someone opens
            it, and never required to create the booking. */}
        {conditionOpen ? (
          <div className="ho-form condition-extra">
            <p className="ho-step condition-head">
              <span>Vehicle condition at pickup · optional</span>
              <button type="button" className="spec-link" onClick={() => setConditionOpen(false)}>
                Remove
              </button>
            </p>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="b-odo">Odometer (km)</label>
                <input id="b-odo" name="odometer" type="number" min="0" placeholder="48210" />
              </div>
              <div className="field">
                <label htmlFor="b-fuel">Fuel level</label>
                <Dropdown id="b-fuel" value={fuel} onChange={setFuel} options={FUEL_LEVELS} />
              </div>
              <div className="field form-full">
                <label htmlFor="b-cond">Condition notes</label>
                <textarea id="b-cond" name="condition_notes" rows="2" placeholder="Scratches, dents, anything the renter should not be charged for" />
              </div>
              <div className="field form-full">
                <label>
                  Photos of the car <span className="ho-photos-hint">· timestamped evidence for damage disputes</span>
                </label>
                <div className="photo-grid">
                  {photos.map((p) => (
                    <div className="photo-thumb" key={p.id}>
                      <img src={p.url} alt="" />
                      <button
                        type="button"
                        className="photo-del"
                        onClick={() => setPhotos((prev) => prev.filter((x) => x.id !== p.id))}
                        aria-label="Remove photo"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {photos.length < 8 && (
                    <label className={"photo-add" + (photoBusy ? " busy" : "")}>
                      <input type="file" accept="image/*" capture="environment" multiple onChange={handlePhotoPick} />
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.5 4h-5L8 6H4a1 1 0 00-1 1v11a1 1 0 001 1h16a1 1 0 001-1V7a1 1 0 00-1-1h-4l-1.5-2z" />
                        <circle cx="12" cy="12.5" r="3.2" />
                      </svg>
                      <span>{photoBusy ? "Adding…" : "Add photo"}</span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-ghost condition-open" onClick={() => setConditionOpen(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add odometer, photos and condition notes
          </button>
        )}

        <div className="booking-total" aria-live="polite">
          <p>
            {vehicle && datesValid
              ? `${days} day${days > 1 ? "s" : ""} × KES ${fmtAmount(vehicle.rate)}/day`
              : "Pick a vehicle and dates to see the total"}
          </p>
          <strong>{total !== null ? `KES ${fmtAmount(total)}` : "-"}</strong>
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
