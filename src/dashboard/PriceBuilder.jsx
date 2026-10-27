/* The price block on New booking and Edit booking:
   total = rental + charges − discount (BOOKING_PRICE_BREAKDOWN_UI.md).

   - The rate starts as the car's and can be changed for this booking.
   - "Agreed price instead" swaps length × rate for one rental amount.
   - Charges are lines staff name themselves. The quick picks only fill in the
     name, which stays editable: there is no fixed list on the server.
   - The discount is KES, with an optional reason.

   The form keeps everything as strings; priceOf() turns it into numbers and
   the request fields. The server's `total` is what the booking shows after. */

const QUICK_CHARGES = ["Chauffeur", "Fuel", "Delivery", "Other"];
const MAX_CHARGES = 20;

const fmtAmount = (n) => Number(n || 0).toLocaleString("en-KE");
const toInt = (v) => (v === "" || v == null ? null : Math.round(Number(v)));
let nextId = 1;
const newLine = (label = "") => ({ id: `c${nextId++}`, label, amount: "" });

// The form's starting state, from a car (New booking) or a booking (Edit).
export function emptyPrice() {
  return { rate: "", hourlyRate: "", agreedOn: false, agreed: "", charges: [], discount: "", reason: "" };
}

export function priceFromBooking(b, agreed) {
  return {
    rate: b.rate != null ? String(b.rate) : "",
    hourlyRate: b.hourly_rate != null ? String(b.hourly_rate) : "",
    agreedOn: agreed,
    agreed: agreed && b.rental_amount != null ? String(b.rental_amount) : "",
    charges: (Array.isArray(b.charges) ? b.charges : []).map((c) => ({ ...newLine(c.label), amount: String(c.amount) })),
    discount: Number(b.discount) > 0 ? String(b.discount) : "",
    reason: b.discount_reason || "",
  };
}

/* Numbers from the form. `units` is days or hours (0 while the dates aren't
   valid). rental is null when it can't be worked out yet. */
export function priceOf(p, { byHour, units }) {
  const rate = toInt(p.rate);
  const hourlyRate = toInt(p.hourlyRate);
  const agreed = p.agreedOn ? toInt(p.agreed) : null;
  let rental = null;
  if (p.agreedOn) rental = agreed != null && agreed >= 0 ? agreed : null;
  else if (units > 0) {
    if (byHour) rental = hourlyRate > 0 ? hourlyRate * units : null;
    else rental = rate != null && rate >= 0 ? rate * units : null;
  }
  const charges = p.charges
    .map((c) => ({ label: c.label.trim().replace(/\s+/g, " "), amount: toInt(c.amount) }))
    .filter((c) => c.label || c.amount);
  const chargesSum = charges.reduce((s, c) => s + (c.amount > 0 ? c.amount : 0), 0);
  const discount = toInt(p.discount) > 0 ? toInt(p.discount) : 0;
  const total = rental == null ? null : rental + chargesSum - discount;

  let error = "";
  if (charges.some((c) => !c.label)) error = "Give every charge a name, e.g. Chauffeur or Fuel.";
  else if (charges.some((c) => !(c.amount > 0))) error = "Every charge needs an amount.";
  else if (total != null && total < 0) error = "The discount is more than the booking costs.";
  else if (p.agreedOn && rental == null) error = "Enter the agreed rental price.";
  else if (!p.agreedOn && byHour && !(hourlyRate > 0)) error = "Enter an hourly rate for this booking, or an agreed price.";

  return { rate, hourlyRate, agreed, rental, charges, chargesSum, discount, reason: p.reason.trim(), total, error };
}

export default function PriceBuilder({ idPrefix, value: p, onChange, byHour, units, carRate, carHourlyRate, disabled }) {
  const set = (patch) => onChange({ ...p, ...patch });
  const setLine = (id, patch) => set({ charges: p.charges.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  const addLine = (label) => {
    if (p.charges.length >= MAX_CHARGES) return;
    set({ charges: [...p.charges, newLine(label === "Other" ? "" : label)] });
  };

  const rateKey = byHour ? "hourlyRate" : "rate";
  const carValue = byHour ? carHourlyRate : carRate;
  const rateDiffers = carValue != null && p[rateKey] !== "" && Number(p[rateKey]) !== Number(carValue);
  const id = (s) => `${idPrefix}-${s}`;
  const lengthLine = units > 0 ? (byHour ? `${units} h` : `${units} day${units > 1 ? "s" : ""}`) : null;

  return (
    <div className="price-builder">
      {p.agreedOn ? (
        <div className="field">
          <label htmlFor={id("agreed")}>Agreed rental price (KES)</label>
          <input
            id={id("agreed")}
            type="number"
            min="0"
            step="1"
            value={p.agreed}
            onChange={(e) => set({ agreed: e.target.value })}
            placeholder="e.g. 9500"
            disabled={disabled}
            required
          />
          <button type="button" className="spec-link price-switch" onClick={() => set({ agreedOn: false, agreed: "" })} disabled={disabled}>
            Use the {byHour ? "hourly" : "day"} rate instead
          </button>
        </div>
      ) : (
        <div className="field">
          <label htmlFor={id("rate")}>{byHour ? "Hour rate (KES)" : "Day rate (KES)"}</label>
          <div className="price-rate-row">
            <input
              id={id("rate")}
              type="number"
              min={byHour ? "1" : "0"}
              step="1"
              value={p[rateKey]}
              onChange={(e) => set({ [rateKey]: e.target.value })}
              placeholder={byHour ? "e.g. 900" : "e.g. 4500"}
              disabled={disabled}
              required={byHour}
            />
            {lengthLine && <span className="price-times">× {lengthLine}</span>}
          </div>
          {rateDiffers && (
            <p className="field-note">
              Car&apos;s rate: KES {fmtAmount(carValue)}/{byHour ? "h" : "day"}
            </p>
          )}
          {byHour && carHourlyRate == null && (
            <p className="field-note">This car has no hourly rate. Enter one for this booking, or add it under Fleet.</p>
          )}
          <button type="button" className="spec-link price-switch" onClick={() => set({ agreedOn: true })} disabled={disabled}>
            Agreed price instead
          </button>
        </div>
      )}

      {p.charges.length > 0 && (
        <div className="price-charges">
          {p.charges.map((c, i) => (
            <div className="price-charge" key={c.id}>
              <input
                aria-label={`Charge ${i + 1} name`}
                value={c.label}
                maxLength={60}
                onChange={(e) => setLine(c.id, { label: e.target.value })}
                placeholder="What it's for"
                disabled={disabled}
              />
              <input
                aria-label={`Charge ${i + 1} amount (KES)`}
                type="number"
                min="1"
                step="1"
                value={c.amount}
                onChange={(e) => setLine(c.id, { amount: e.target.value })}
                placeholder="KES"
                disabled={disabled}
              />
              <button
                type="button"
                className="icon-btn"
                onClick={() => set({ charges: p.charges.filter((x) => x.id !== c.id) })}
                aria-label={`Remove ${c.label || "charge"}`}
                disabled={disabled}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      {p.charges.length < MAX_CHARGES && (
        <div className="price-add" role="group" aria-label="Add a charge">
          <span>+ Add a charge</span>
          {QUICK_CHARGES.map((label) => (
            <button type="button" key={label} onClick={() => addLine(label)} disabled={disabled}>
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="price-discount">
        <div className="field">
          <label htmlFor={id("discount")}>Discount (KES) · optional</label>
          <input
            id={id("discount")}
            type="number"
            min="0"
            step="1"
            value={p.discount}
            onChange={(e) => set({ discount: e.target.value })}
            placeholder="0"
            disabled={disabled}
          />
        </div>
        <div className="field">
          <label htmlFor={id("reason")}>Reason</label>
          <input
            id={id("reason")}
            value={p.reason}
            maxLength={120}
            onChange={(e) => set({ reason: e.target.value })}
            placeholder="Repeat client"
            disabled={disabled || !(Number(p.discount) > 0)}
          />
        </div>
      </div>
    </div>
  );
}
