import { useMemo, useState, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { subscribe as subscribeFleet, getVehicles } from "./fleetStore";
import { subscribe as subscribeBookings, getBookings } from "./bookingsStore";
import {
  subscribe as subscribeAvail,
  getBlocked,
  toggleBlocked,
} from "./availabilityStore";
import Dropdown from "../components/Dropdown";
import "./availability.css";

/* Smart availability calendar: booked days come from live bookings, and
   free days can be blocked/reopened with a click. Blocked days are also
   disabled in the New booking date picker. */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const pad = (n) => String(n).padStart(2, "0");
const toISO = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

export default function AvailabilityCalendar() {
  const navigate = useNavigate();
  const vehicles = useSyncExternalStore(subscribeFleet, getVehicles);
  const bookings = useSyncExternalStore(subscribeBookings, getBookings);
  const blockedMap = useSyncExternalStore(subscribeAvail, getBlocked);

  const today = new Date();
  const todayISO = toISO(today.getFullYear(), today.getMonth(), today.getDate());
  const [plate, setPlate] = useState(vehicles[0]?.plate || "");
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });

  const vehicle = vehicles.find((v) => v.plate === plate);
  const blockedSet = useMemo(
    () => new Set(blockedMap[plate] || []),
    [blockedMap, plate]
  );

  // iso → booking info for the selected vehicle's live reservations
  const bookedDays = useMemo(() => {
    const map = new Map();
    bookings
      .filter(
        (b) =>
          b.plate === plate &&
          ["Pending", "Confirmed", "Active"].includes(b.status)
      )
      .forEach((b) => {
        const cur = new Date(`${b.pickup}T00:00:00`);
        const stop = new Date(`${b.dropoff}T00:00:00`);
        while (cur <= stop) {
          const iso = toISO(cur.getFullYear(), cur.getMonth(), cur.getDate());
          map.set(iso, { ref: b.ref, customer: b.customer, isStart: iso === b.pickup });
          cur.setDate(cur.getDate() + 1);
        }
      });
    return map;
  }, [bookings, plate]);

  function shift(delta) {
    setView(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  function onDayClick(iso) {
    const booked = bookedDays.get(iso);
    if (booked) {
      navigate(`/dashboard/bookings/${encodeURIComponent(booked.ref)}`);
      return;
    }
    if (iso < todayISO) return;
    toggleBlocked(plate, iso);
  }

  const lead = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();

  return (
    <section className="panel-card">
      <div className="fleet-toolbar">
        <div className="field cal-vehicle">
          <Dropdown
            id="cal-vehicle"
            value={plate}
            onChange={setPlate}
            placeholder="Choose a vehicle"
            options={vehicles.map((v) => ({
              value: v.plate,
              label: `${v.name} · ${v.plate}`,
            }))}
          />
        </div>

        <div className="cal-nav">
          <button type="button" onClick={() => shift(-1)} aria-label="Previous month">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <strong>
            {MONTHS[view.m]} {view.y}
          </strong>
          <button type="button" onClick={() => shift(1)} aria-label="Next month">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>

        <div className="cal-legend">
          <span><i className="booked" /> Booked</span>
          <span><i className="blocked" /> Blocked</span>
          <span><i className="free" /> Available</span>
        </div>
      </div>

      <div className="cal-grid cal-head">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div className="cal-grid">
        {Array.from({ length: lead }, (_, i) => (
          <span className="cal-day empty" key={`e-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = i + 1;
          const iso = toISO(view.y, view.m, d);
          const booked = bookedDays.get(iso);
          const isBlocked = blockedSet.has(iso);
          const past = iso < todayISO;
          const cls = [
            "cal-day",
            booked && "booked",
            isBlocked && "blocked",
            past && "past",
            iso === todayISO && "today",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              type="button"
              key={iso}
              className={cls}
              onClick={() => onDayClick(iso)}
              disabled={past && !booked}
              title={
                booked
                  ? `${booked.customer} · ${booked.ref}`
                  : isBlocked
                    ? "Blocked · click to reopen"
                    : past
                      ? undefined
                      : "Click to block this day"
              }
            >
              <span className="cal-num">{d}</span>
              {booked && (
                <span className="cal-chip">
                  {booked.isStart ? booked.customer.split(" ")[0] : ""}
                </span>
              )}
              {!booked && isBlocked && (
                <span className="cal-blocked-label">Blocked</span>
              )}
            </button>
          );
        })}
      </div>

      <p className="cal-hint">
        {vehicle ? `${vehicle.name} · ${vehicle.plate}` : ""} · click a free day
        to block it, click a blocked day to reopen it. Booked days open the
        booking, and blocked days can't be picked in new bookings.
      </p>
    </section>
  );
}
