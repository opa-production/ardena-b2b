import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  subscribe as subscribeFleet,
  getVehicles,
} from "./fleetStore";
import {
  rentalDays,
  fmtDate,
  fmtWeekday,
  hourlyEnd,
  todayISO,
} from "./bookingsStore";
import { takenDays, rangeIsFree } from "./bookedDays";
import { getPolicy } from "./policyStore";
import {
  subscribe as subscribeAvail,
  getBlocked,
} from "./availabilityStore";
import { createBooking, fetchBookedRanges, updateBooking, uploadHandoverPhotos } from "../lib/api";
import { compressImage, stagedToFiles } from "./handoverPhotosStore";
import DateRangePicker from "./DateRangePicker";
import DatePicker from "./DatePicker";
import { UnitToggle, HoursStepper } from "./BillingControls";
import ClientNameField from "./ClientNameField";
import Dropdown from "../components/Dropdown";
import { toast } from "./toastStore";
import "./fleet.css";
import "./bookings.css";

const fmtAmount = (n) => n.toLocaleString("en-KE");

const FUEL_LEVELS = ["Full", "3/4", "1/2", "1/4", "Reserve"];

// the usual chauffeured hires

export default function NewBooking() {
  const navigate = useNavigate();
  const vehicles = useSyncExternalStore(subscribeFleet, getVehicles);
  const [plate, setPlate] = useState("");
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  // By the day (pickup → return date) or by the hour (a date, a start time
  // and a number of hours, for chauffeured and short hires).
  const [unit, setUnit] = useState("day");
  const [pickupTime, setPickupTime] = useState("08:00");
  const [hours, setHours] = useState("8");
  const [agreed, setAgreed] = useState(""); // agreed price, overrides the rate
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
  // The existing client picked from the name suggestions, if any. Their phone
  // and ID number are filled in from the record; both stay editable.
  const [client, setClient] = useState(null);
  const phoneRef = useRef(null);
  const idRef = useRef(null);

  function handleClientPick(picked) {
    setClient(picked);
    if (!picked) return;
    if (phoneRef.current) phoneRef.current.value = picked.phone || "";
    if (idRef.current && picked.id_number) idRef.current.value = picked.id_number;
  }

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
  const [booked, setBooked] = useState({ plate: "", ranges: [] });
  const [recheck, setRecheck] = useState(0);
  useEffect(() => {
    if (!plate) return undefined;
    let alive = true;
    fetchBookedRanges(plate)
      .then((ranges) => alive && setBooked({ plate, ranges }))
      // Couldn't ask: leave the dates open, the server still refuses a clash.
      .catch(() => alive && setBooked({ plate, ranges: [] }));
    return () => {
      alive = false;
    };
  }, [plate, recheck]);
  const checking = Boolean(plate) && booked.plate !== plate;

  // The days the chosen vehicle can't be booked (see bookedDays.js). A daily
  // booking needs a day with nothing on it; an hourly one only needs it not
  // to be held whole, and goes around the hours already booked.
  const taken = useMemo(
    () => takenDays(booked.plate === plate ? booked.ranges : [], blockedMap[plate] || []),
    [plate, blockedMap, booked]
  );
  const dayTaken = (iso) => taken.full.has(iso) || taken.part.has(iso);

  // switching vehicles can invalidate an already-picked date
  useEffect(() => {
    if (unit === "hour") {
      if (pickup && taken.full.has(pickup)) setPickup("");
      return;
    }
    if (pickup && dropoff && !rangeIsFree(taken, pickup, dropoff)) {
      setPickup("");
      setDropoff("");
    }
  }, [taken]); // eslint-disable-line react-hooks/exhaustive-deps

  function switchUnit(next) {
    if (next === unit) return;
    setUnit(next);
    setError("");
    // The pickup day carries over when it still works for the new unit.
    if (next === "day") {
      setDropoff("");
      if (pickup && dayTaken(pickup)) setPickup("");
    } else if (pickup && taken.full.has(pickup)) {
      setPickup("");
    }
  }

  // close the calendar on outside click
  useEffect(() => {
    if (!datesOpen) return;
    function onDown(e) {
      if (!datesRef.current?.contains(e.target)) setDatesOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [datesOpen]);

  const byHour = unit === "hour";
  const hrs = Number(hours);
  const hoursValid = Number.isInteger(hrs) && hrs >= 1 && hrs <= 72;
  const datesValid = byHour
    ? Boolean(pickup && /^\d{2}:\d{2}$/.test(pickupTime) && hoursValid)
    : Boolean(pickup && dropoff && Date.parse(dropoff) > Date.parse(pickup));
  const days = datesValid && !byHour ? rentalDays(pickup, dropoff) : 0;
  const end = datesValid && byHour ? hourlyEnd(pickup, pickupTime, hrs) : null;
  // Booked hours on the picked day, so they can be worked around.
  const partHours = byHour && pickup ? taken.part.get(pickup) : null;

  // The car has no hourly rate: the price has to be typed in.
  const needsPrice = Boolean(byHour && vehicle && !vehicle.hourly_rate);
  const agreedAmount = Number(agreed) > 0 ? Math.round(Number(agreed)) : null;
  let rateTotal = null;
  if (vehicle && datesValid) {
    if (!byHour) rateTotal = days * vehicle.rate;
    else if (vehicle.hourly_rate) rateTotal = vehicle.hourly_rate * hrs;
  }
  const total = agreedAmount ?? rateTotal;
  let totalLine;
  if (!vehicle || !datesValid) {
    totalLine = byHour
      ? "Pick a vehicle, a date and the hours to see the total"
      : "Pick a vehicle and dates to see the total";
  } else if (agreedAmount) {
    totalLine = "Agreed price";
  } else if (!byHour) {
    totalLine = `${days} day${days > 1 ? "s" : ""} × KES ${fmtAmount(vehicle.rate)}/day`;
  } else {
    totalLine = needsPrice
      ? "Enter the price for this booking"
      : `${hrs} h × KES ${fmtAmount(vehicle.hourly_rate)}/h`;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!datesValid) {
      if (!byHour) setError("Pick the pickup and return dates.");
      else if (!hoursValid) setError("Hours must be a whole number from 1 to 72. Longer than that, book by the day.");
      else setError("Pick the pickup date and time.");
      return;
    }
    if (needsPrice && !agreedAmount) {
      setError("This car has no hourly rate. Enter the price, or add an hourly rate under Fleet.");
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
        // Booking the client picked from the suggestions. Without it the
        // server matches on name and phone, and adds a new client if nobody
        // matches, so the clients list grows from bookings too.
        ...(client ? { client_id: client.id } : {}),
        id_number: idNumber,
        plate: vehicle.plate,
        ...(byHour
          ? { billing_unit: "hour", pickup, pickup_time: pickupTime, hours: hrs }
          : { pickup, dropoff }),
        ...(agreedAmount ? { amount: agreedAmount } : {}),
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
      <Link to="/dashboard/bookings" className="page-back" title="Bookings" aria-label="Back to bookings">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </Link>

      <h1 className="sr-only">New booking</h1>

      {/* Two columns so the whole booking fits a screen: the customer and trip
          on the left, the total, the buttons and the optional condition on
          the right, always in view. One <form> around both. */}
      <form className="details-grid" onSubmit={handleSubmit}>
        <div className="panel-card">
        <div className="form-grid">
          <div className="field">
            <label htmlFor="b-customer">Customer name</label>
            <ClientNameField id="b-customer" placeholder="Wanjiku Kamau" onPick={handleClientPick} />
          </div>
          <div className="field">
            <label htmlFor="b-phone">Mobile number (M-Pesa)</label>
            <input id="b-phone" name="phone" type="tel" placeholder="0722 000 000" required ref={phoneRef} />
          </div>
          <div className="field">
            <label htmlFor="b-id">ID or passport number</label>
            <input id="b-id" name="id_number" type="text" placeholder="12345678" maxLength={40} required ref={idRef} />
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
                label: `${v.name} · ${v.plate}, KES ${fmtAmount(v.rate)}/day${
                  v.hourly_rate ? ` · KES ${fmtAmount(v.hourly_rate)}/h` : ""
                }`,
              }))}
            />
          </div>
          <div className="field form-full">
            <label id="b-unit-label">Charged</label>
            <UnitToggle value={byHour ? "hour" : "day"} onChange={switchUnit} labelledBy="b-unit-label" />
          </div>
          {byHour ? (
            <>
              <div className="field">
                <label htmlFor="b-date">Pickup date</label>
                <DatePicker
                  id="b-date"
                  value={pickup}
                  onChange={(iso) => {
                    setPickup(iso);
                    setError("");
                  }}
                  minDate={todayISO()}
                  isDisabled={(iso) => taken.full.has(iso)}
                  disabled={checking}
                  placeholder={checking ? "Checking this vehicle's dates…" : "Pickup date"}
                />
                {partHours && <p className="field-note">Booked {partHours.join(", ")} that day.</p>}
              </div>
              <div className="field">
                <label htmlFor="b-time">Pickup time</label>
                <input
                  id="b-time"
                  type="time"
                  value={pickupTime}
                  onChange={(e) => {
                    setPickupTime(e.target.value);
                    setError("");
                  }}
                  required
                />
              </div>
              <div className="field form-full">
                <label htmlFor="b-hours">Hours</label>
                <HoursStepper
                  id="b-hours"
                  value={hours}
                  onChange={(v) => {
                    setHours(v);
                    setError("");
                  }}
                />
                <p className="field-note">
                  {end
                    ? `Returns ${end.time}, ${fmtWeekday(end.date)}`
                    : "1 to 72 hours. Longer than that, book by the day."}
                </p>
              </div>
            </>
          ) : (
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
                  isDisabled={dayTaken}
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
          )}
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
        </div>

        <aside className="details-side">
          <section className="panel-card summary-card">
            <div className="booking-total" aria-live="polite">
              <p>{totalLine}</p>
              <strong>{total !== null ? `KES ${fmtAmount(total)}` : "-"}</strong>
            </div>

            {/* A package deal or a discount, or the whole price when the car
                has no hourly rate. Sent as `amount`, which wins over the rate. */}
            <div className="field agreed-field">
              <label htmlFor="b-amount">{needsPrice ? "Price (KES)" : "Agreed price (KES) · optional"}</label>
              <input
                id="b-amount"
                type="number"
                min="1"
                step="1"
                value={agreed}
                onChange={(e) => {
                  setAgreed(e.target.value);
                  setError("");
                }}
                required={needsPrice}
                placeholder={rateTotal !== null ? `${fmtAmount(rateTotal)} at the car's rate` : "e.g. 9500"}
              />
              {needsPrice && (
                <p className="field-note">
                  This car has no hourly rate. Enter the price, or add an hourly rate under Fleet.
                </p>
              )}
            </div>

            {error && <p className="form-error">{error}</p>}

            <div className="action-stack">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Creating…" : "Create booking"}
              </button>
              <Link to="/dashboard/bookings" className="btn btn-ghost">
                Cancel
              </Link>
            </div>
          </section>

          {/* The car's condition is an extra: asked for only when someone
              opens it, and never required to create the booking. */}
          <section className="panel-card">
            {conditionOpen ? (
              <div className="ho-form">
                <p className="ho-step condition-head">
                  <span>Vehicle condition · optional</span>
                  <button type="button" className="spec-link" onClick={() => setConditionOpen(false)}>
                    Remove
                  </button>
                </p>
                <div className="form-grid condition-fields">
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
                Add vehicle condition
              </button>
            )}
            {!conditionOpen && (
              <p className="action-hint">Odometer, fuel, photos and condition notes. Optional.</p>
            )}
          </section>
        </aside>
      </form>
    </>
  );
}
