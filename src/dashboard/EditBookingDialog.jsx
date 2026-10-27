import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { fetchBookedRanges, updateBooking } from "../lib/api";
import { subscribe as subscribeFleet, getVehicles } from "./fleetStore";
import { subscribe as subscribeAvail, getBlocked } from "./availabilityStore";
import {
  bookingCharges,
  bookingTotal,
  fmtWeekday,
  hourlyEnd,
  isAgreedPrice,
  isHourly,
  rentalAmount,
  rentalDays,
  todayISO,
} from "./bookingsStore";
import { takenDays } from "./bookedDays";
import DatePicker from "./DatePicker";
import { UnitToggle, HoursStepper } from "./BillingControls";
import PriceBuilder, { priceFromBooking, priceOf } from "./PriceBuilder";
import Dropdown from "../components/Dropdown";

const fmtAmount = (n) => Number(n || 0).toLocaleString("en-KE");


const addDay = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/* Changing a booking after it was made: PATCH /bookings/{ref} with only what
   changed. What can change depends on where the booking is:

   - Pending / Confirmed: everything.
   - Active (the car is out): only the end, to extend or shorten the rental.
   - App bookings: only notes, location, ID number and destination; the
     renter owns the rest.
   - Completed / Cancelled never get here (the button is hidden).

   A change of length, unit, car or rate re-prices the rental on the server,
   unless an agreed rental price goes with it; charges and the discount stay
   until they're changed. The preview below works the same rule out from the
   form; the saved total comes back from the server and is what the page then
   shows. */
export default function EditBookingDialog({ booking: b, onClose, onSaved }) {
  const vehicles = useSyncExternalStore(subscribeFleet, getVehicles);
  const blockedMap = useSyncExternalStore(subscribeAvail, getBlocked);
  const fromApp = b.source === "marketplace";
  const active = b.status === "Active";
  const depositEditable = b.deposit_status === "Pending";

  const [customer, setCustomer] = useState(b.customer || "");
  const [phone, setPhone] = useState(b.phone || "");
  const [plate, setPlate] = useState(b.plate);
  const [unit, setUnit] = useState(isHourly(b) ? "hour" : "day");
  const [pickup, setPickup] = useState(b.pickup || "");
  const [dropoff, setDropoff] = useState(isHourly(b) ? "" : b.dropoff || "");
  const [pickupTime, setPickupTime] = useState(b.pickup_time || "08:00");
  const [hours, setHours] = useState(String(b.hours || 8));
  const agreedAtStart = isAgreedPrice(b);
  const [price, setPrice] = useState(() => priceFromBooking(b, agreedAtStart));
  const [deposit, setDeposit] = useState(b.deposit_amount != null ? String(b.deposit_amount) : "");
  const [location, setLocation] = useState(b.location || "");
  const [notes, setNotes] = useState(b.notes || "");
  const [idNumber, setIdNumber] = useState(b.id_number || "");
  const [destination, setDestination] = useState(b.destination || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // The car's other bookings, so a clash shows in the pickers; the server's
  // 409 still decides. This booking's own dates don't count against it.
  const [booked, setBooked] = useState({ plate: "", ranges: [] });
  useEffect(() => {
    if (fromApp || !plate) return undefined;
    let alive = true;
    fetchBookedRanges(plate)
      .then((ranges) => alive && setBooked({ plate, ranges }))
      .catch(() => alive && setBooked({ plate, ranges: [] }));
    return () => {
      alive = false;
    };
  }, [plate, fromApp]);
  const taken = useMemo(
    () => takenDays(booked.plate === plate ? booked.ranges : [], blockedMap[plate] || [], b.ref),
    [booked, plate, blockedMap, b.ref]
  );
  const dayTaken = (iso) => taken.full.has(iso) || taken.part.has(iso);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && !busy) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const bookable = vehicles.filter((v) => v.status !== "In maintenance" || v.plate === b.plate);
  const vehicle = vehicles.find((v) => v.plate === plate);
  const samePlate = plate === b.plate;
  const dayRate = vehicle?.rate ?? (samePlate ? b.rate : null);
  const hourRate = vehicle ? vehicle.hourly_rate : samePlate ? b.hourly_rate : null;

  const byHour = unit === "hour";
  const hrs = Number(hours);
  const hoursValid = Number.isInteger(hrs) && hrs >= 1 && hrs <= 72;
  const termValid = byHour
    ? Boolean(pickup && /^\d{2}:\d{2}$/.test(pickupTime) && hoursValid)
    : Boolean(pickup && dropoff && dropoff > pickup);
  const end = byHour && termValid ? hourlyEnd(pickup, pickupTime, hrs) : null;

  const unitChanged = byHour !== isHourly(b);
  const pickupChanged = pickup !== b.pickup;
  const dropoffChanged = !byHour && dropoff !== b.dropoff;
  const timeChanged = byHour && pickupTime !== b.pickup_time;
  const hoursChanged = byHour && hrs !== Number(b.hours);
  // the server re-prices on any of these
  const reprices = !samePlate || unitChanged || pickupChanged || dropoffChanged || timeChanged || hoursChanged;

  const units = termValid ? (byHour ? hrs : rentalDays(pickup, dropoff)) : 0;
  const pr = priceOf(price, { byHour, units });
  const newTotal = pr.total;
  const paid = b.payment === "Paid" ? Number(b.payment_amount) || 0 : 0;

  function switchUnit(next) {
    if (next === unit) return;
    setUnit(next);
    setError("");
    if (next === "day" && !dropoff) setDropoff(addDay(pickup || todayISO()));
  }

  function buildPatch() {
    const patch = {};
    const put = (key, value, original) => {
      if ((value ?? "") !== (original ?? "")) patch[key] = value;
    };
    put("location", location.trim(), b.location);
    put("notes", notes.trim(), b.notes);
    put("id_number", idNumber.trim(), b.id_number);
    put("destination", destination.trim(), b.destination);
    if (fromApp) return patch;

    if (active) {
      // the car is out: only its end can move
      if (byHour && hoursChanged) patch.hours = hrs;
      if (!byHour && dropoffChanged) patch.dropoff = dropoff;
    } else {
      put("customer", customer.trim(), b.customer);
      put("phone", phone.trim(), b.phone);
      if (!samePlate) patch.plate = plate;
      if (unitChanged) patch.billing_unit = unit;
      if (pickupChanged) patch.pickup = pickup;
      if (byHour) {
        if (timeChanged || unitChanged) patch.pickup_time = pickupTime;
        if (hoursChanged || unitChanged) patch.hours = hrs;
      } else if (dropoffChanged || unitChanged) {
        patch.dropoff = dropoff;
      }
    }
    // The price. A new car brings its own rates on the server, so a rate is
    // sent when it differs from that car's (or from this booking's, same car).
    const baseRate = samePlate ? b.rate : vehicle?.rate;
    const baseHourly = samePlate ? b.hourly_rate : vehicle?.hourly_rate;
    if (pr.rate != null && pr.rate !== (baseRate ?? null)) patch.rate = pr.rate;
    if (pr.hourlyRate !== (baseHourly ?? null) && (pr.hourlyRate == null || pr.hourlyRate > 0)) {
      patch.hourly_rate = pr.hourlyRate;
    }
    if (price.agreedOn) {
      // re-sent whenever the server would otherwise re-price it away
      if (pr.agreed !== rentalAmount(b) || !agreedAtStart || reprices || "rate" in patch || "hourly_rate" in patch) {
        patch.amount = pr.agreed;
      }
    } else if (agreedAtStart) {
      patch.amount = null;
    }
    const sameCharges =
      JSON.stringify(pr.charges) ===
      JSON.stringify(bookingCharges(b).map((c) => ({ label: c.label, amount: Number(c.amount) })));
    if (!sameCharges) patch.charges = pr.charges;
    if (pr.discount !== (Number(b.discount) || 0)) patch.discount = pr.discount;
    if (pr.discount && pr.reason !== (b.discount_reason || "")) patch.discount_reason = pr.reason || null;
    if (depositEditable && deposit !== (b.deposit_amount != null ? String(b.deposit_amount) : "")) {
      patch.deposit_amount = deposit === "" ? null : Number(deposit);
    }
    return patch;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (busy) return;
    if (!fromApp && !termValid) {
      setError(
        byHour && !hoursValid
          ? "Hours must be a whole number from 1 to 72. Longer than that, book by the day."
          : "Pick the dates for this booking."
      );
      return;
    }
    if (!fromApp && pr.error) {
      setError(pr.error);
      return;
    }
    const patch = buildPatch();
    if (!Object.keys(patch).length) {
      onClose();
      return;
    }
    setBusy(true);
    setError("");
    try {
      const updated = await updateBooking(b.ref, patch);
      onSaved(updated);
    } catch (err) {
      setError(err.message || "Couldn't save the booking. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay edit-overlay" onClick={() => !busy && onClose()}>
      <div className="modal-card edit-booking-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="eb-title">
        <header className="modal-head">
          <h3 id="eb-title">Edit booking {b.ref}</h3>
          <button type="button" className="icon-btn" disabled={busy} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>
        <form className="modal-body" onSubmit={handleSubmit}>
          {fromApp && (
            <p className="field-note">
              Booked on the Ardena app: the renter owns the dates, car and price. Notes, location, ID number and
              destination can still change.
            </p>
          )}
          {active && !fromApp && (
            <p className="field-note">The car is out, so only the end of the rental can change.</p>
          )}

          <div className="form-grid">
            {!fromApp && (
              <>
                <div className="field">
                  <label htmlFor="eb-customer">Customer name</label>
                  <input id="eb-customer" value={customer} onChange={(e) => setCustomer(e.target.value)} disabled={active} required />
                </div>
                <div className="field">
                  <label htmlFor="eb-phone">Mobile number (M-Pesa)</label>
                  <input id="eb-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={active} required />
                </div>
                <div className="field form-full">
                  <label htmlFor="eb-vehicle">Vehicle</label>
                  <Dropdown
                    id="eb-vehicle"
                    value={plate}
                    onChange={(p) => {
                      setPlate(p);
                      setError("");
                      // the server prices a new car at its own rates
                      const car = vehicles.find((v) => v.plate === p);
                      if (car) {
                        setPrice((cur) => ({
                          ...cur,
                          rate: String(car.rate ?? ""),
                          hourlyRate: car.hourly_rate != null ? String(car.hourly_rate) : "",
                        }));
                      }
                    }}
                    disabled={active}
                    options={
                      bookable.length
                        ? bookable.map((v) => ({
                            value: v.plate,
                            label: `${v.name} · ${v.plate}, KES ${fmtAmount(v.rate)}/day${
                              v.hourly_rate ? ` · KES ${fmtAmount(v.hourly_rate)}/h` : ""
                            }`,
                          }))
                        : [{ value: b.plate, label: `${b.vehicle} · ${b.plate}` }]
                    }
                  />
                </div>
                <div className="field form-full">
                  <label id="eb-unit-label">Charged</label>
                  <UnitToggle value={byHour ? "hour" : "day"} onChange={switchUnit} disabled={active} labelledBy="eb-unit-label" />
                </div>

                {byHour ? (
                  <>
                    <div className="field">
                      <label htmlFor="eb-date">Pickup date</label>
                      <DatePicker
                        id="eb-date"
                        value={pickup}
                        onChange={setPickup}
                        minDate={pickupChanged ? todayISO() : undefined}
                        isDisabled={(iso) => taken.full.has(iso)}
                        disabled={active}
                      />
                      {taken.part.get(pickup) && (
                        <p className="field-note">Booked {taken.part.get(pickup).join(", ")} that day.</p>
                      )}
                    </div>
                    <div className="field">
                      <label htmlFor="eb-time">Pickup time</label>
                      <input id="eb-time" type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} disabled={active} required />
                    </div>
                    <div className="field form-full">
                      <label htmlFor="eb-hours">Hours</label>
                      <HoursStepper id="eb-hours" value={hours} onChange={setHours} />
                      <p className="field-note">
                        {end ? `Returns ${end.time}, ${fmtWeekday(end.date)}` : "1 to 72 hours. Longer than that, book by the day."}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="field">
                      <label htmlFor="eb-pickup">Pickup date</label>
                      <DatePicker
                        id="eb-pickup"
                        value={pickup}
                        onChange={(iso) => {
                          setPickup(iso);
                          if (dropoff && dropoff <= iso) setDropoff(addDay(iso));
                        }}
                        minDate={pickupChanged ? todayISO() : undefined}
                        isDisabled={dayTaken}
                        disabled={active}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="eb-dropoff">Return date</label>
                      <DatePicker
                        id="eb-dropoff"
                        value={dropoff}
                        onChange={setDropoff}
                        minDate={pickup ? addDay(pickup) : todayISO()}
                        isDisabled={dayTaken}
                      />
                    </div>
                  </>
                )}

                <div className="field form-full">
                  <PriceBuilder
                    idPrefix="eb-price"
                    value={price}
                    onChange={(next) => {
                      setPrice(next);
                      setError("");
                    }}
                    byHour={byHour}
                    units={units}
                    carRate={dayRate}
                    carHourlyRate={hourRate ?? null}
                  />
                </div>
                <div className="field">
                  <label htmlFor="eb-deposit">Security deposit (KES)</label>
                  <input
                    id="eb-deposit"
                    type="number"
                    min="0"
                    step="500"
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
                    disabled={!depositEditable}
                  />
                  {!depositEditable && <p className="field-note">The deposit is {String(b.deposit_status).toLowerCase()}, so it can&apos;t change.</p>}
                </div>
              </>
            )}

            <div className="field">
              <label htmlFor="eb-location">Pickup location</label>
              <input id="eb-location" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="eb-destination">Where the car is going</label>
              <input id="eb-destination" value={destination} onChange={(e) => setDestination(e.target.value)} maxLength={255} />
            </div>
            <div className="field">
              <label htmlFor="eb-id">ID or passport number</label>
              <input id="eb-id" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} maxLength={40} />
            </div>
            <div className="field form-full">
              <label htmlFor="eb-notes">Notes</label>
              <textarea id="eb-notes" rows="2" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          {!fromApp && (
            <div className="edit-preview" aria-live="polite">
              <p>
                {newTotal === null ? (
                  "Enter the price to see the new total"
                ) : (
                  <>
                    {newTotal !== bookingTotal(b) ? "New total" : "Total"}{" "}
                    <strong>KES {fmtAmount(newTotal)}</strong>
                    {newTotal !== bookingTotal(b) && <> · was KES {fmtAmount(bookingTotal(b))}</>}
                  </>
                )}
              </p>
              {newTotal !== null && paid > 0 && newTotal > paid && (
                <p>
                  Paid <strong>KES {fmtAmount(paid)}</strong> · Balance <strong>KES {fmtAmount(newTotal - paid)}</strong>
                </p>
              )}
              {newTotal !== null && paid > 0 && newTotal < paid && (
                <p>
                  Customer paid <strong>KES {fmtAmount(paid - newTotal)}</strong> more than the new total. Refund it
                  from Payments; nothing is refunded automatically.
                </p>
              )}
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
