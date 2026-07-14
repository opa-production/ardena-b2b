import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchMarketplaceListing,
  saveMarketplaceListing,
  publishMarketplaceListing,
  hideMarketplaceListing,
} from "../lib/api";
import { toast } from "./toastStore";
import "./fleet.css";
import "./marketplace.css";

// Module-level cache: plate → listing data. Avoids re-fetching on back-navigation.
const _cache = new Map();

const FUEL_TYPES = ["Petrol", "Diesel", "Hybrid", "Electric"];
const TRANSMISSIONS = ["Automatic", "Manual"];
const DRIVE_SETTINGS = [
  { value: "self_only", label: "Self-drive only" },
  { value: "chauffeur_only", label: "Chauffeur-driven only" },
  { value: "both", label: "Self-drive & chauffeur" },
];

function CommissionModal({ onAccept, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box commission-modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>Ardena Marketplace Commission</h2>
        </header>
        <div className="modal-body">
          <p>
            When you list a vehicle on the Ardena Marketplace, Ardena earns a
            commission on every booking made through the platform.
          </p>
          <ul className="commission-list">
            <li>Commission applies <strong>only</strong> to marketplace-originated bookings.</li>
            <li>Bookings you create directly in this dashboard are <strong>not</strong> subject to commission.</li>
            <li>You can hide or remove your listing at any time.</li>
          </ul>
          <p className="commission-note">
            By publishing, you agree to Ardena's marketplace commission terms.
          </p>
        </div>
        <footer className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={onAccept}>
            I understand, publish listing
          </button>
        </footer>
      </div>
    </div>
  );
}

export default function MarketplaceListing() {
  const { plate } = useParams();
  const decodedPlate = decodeURIComponent(plate);

  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCommission, setShowCommission] = useState(false);

  // form state
  const [description, setDescription] = useState("");
  const [seats, setSeats] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [transmission, setTransmission] = useState("");
  const [color, setColor] = useState("");
  const [mileage, setMileage] = useState("");
  const [features, setFeatures] = useState(""); // comma-separated
  const [dailyRate, setDailyRate] = useState("");
  const [weeklyRate, setWeeklyRate] = useState("");
  const [monthlyRate, setMonthlyRate] = useState("");
  const [minDays, setMinDays] = useState("");
  const [maxDays, setMaxDays] = useState("");
  const [minAge, setMinAge] = useState("");
  const [rules, setRules] = useState("");
  const [locationName, setLocationName] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [driveSetting, setDriveSetting] = useState("self_only");
  const [depositRequired, setDepositRequired] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [commissionAcknowledged, setCommissionAcknowledged] = useState(false);

  function _applyData(data) {
    setListing(data);
    setDescription(data.description || "");
    setSeats(data.seats ?? "");
    setFuelType(data.fuel_type || "");
    setTransmission(data.transmission || "");
    setColor(data.color || "");
    setMileage(data.mileage ?? "");
    setFeatures((data.features || []).join(", "));
    setDailyRate(data.daily_rate ?? "");
    setWeeklyRate(data.weekly_rate ?? "");
    setMonthlyRate(data.monthly_rate ?? "");
    setMinDays(data.min_rental_days ?? "");
    setMaxDays(data.max_rental_days ?? "");
    setMinAge(data.min_age_requirement ?? "");
    setRules(data.rules || "");
    setLocationName(data.location_name || "");
    setCoverImage(data.cover_image || "");
    setDriveSetting(data.drive_setting || "self_only");
    setDepositRequired(data.deposit_required || false);
    setDepositAmount(data.deposit_amount ?? "");
    setCommissionAcknowledged(data.commission_acknowledged || false);
  }

  useEffect(() => {
    const cached = _cache.get(decodedPlate);
    if (cached !== undefined) {
      // Serve from cache immediately — no spinner
      if (cached !== null) _applyData(cached);
      setLoading(false);
      return;
    }
    fetchMarketplaceListing(decodedPlate)
      .then((data) => {
        _cache.set(decodedPlate, data);
        _applyData(data);
      })
      .catch((err) => {
        if (err.message?.includes("404") || err.status === 404) {
          _cache.set(decodedPlate, null); // no listing — cache the absence too
          setListing(null);
        } else {
          setError(err.message);
        }
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodedPlate]);

  function buildPayload() {
    return {
      description: description || null,
      seats: seats !== "" ? Number(seats) : null,
      fuel_type: fuelType || null,
      transmission: transmission || null,
      color: color || null,
      mileage: mileage !== "" ? Number(mileage) : null,
      features: features
        ? features.split(",").map((f) => f.trim()).filter(Boolean)
        : null,
      daily_rate: dailyRate !== "" ? Number(dailyRate) : null,
      weekly_rate: weeklyRate !== "" ? Number(weeklyRate) : null,
      monthly_rate: monthlyRate !== "" ? Number(monthlyRate) : null,
      min_rental_days: minDays !== "" ? Number(minDays) : null,
      max_rental_days: maxDays !== "" ? Number(maxDays) : null,
      min_age_requirement: minAge !== "" ? Number(minAge) : null,
      rules: rules || null,
      location_name: locationName || null,
      cover_image: coverImage || null,
      drive_setting: driveSetting,
      deposit_required: depositRequired,
      deposit_amount: depositAmount !== "" ? Number(depositAmount) : null,
      commission_acknowledged: commissionAcknowledged,
    };
  }

  function _updateCache(data) {
    _cache.set(decodedPlate, data);
    setListing(data);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const updated = await saveMarketplaceListing(decodedPlate, buildPayload());
      _updateCache(updated);
      toast("Marketplace listing saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePublish() {
    if (!commissionAcknowledged) {
      setShowCommission(true);
      return;
    }
    await doPublish();
  }

  async function handleCommissionAccepted() {
    setCommissionAcknowledged(true);
    setShowCommission(false);
    // doPublish saves all fields (including commission_acknowledged=true, which
    // we just set in state above) then calls /publish in one go.
    await doPublish();
  }

  async function doPublish() {
    setSaving(true);
    setError("");
    try {
      // Save current field values then publish in one sequence.
      // handleCommissionAccepted already saved before calling here, but we
      // save again to pick up any unsaved edits when publishing directly.
      const saved = await saveMarketplaceListing(decodedPlate, buildPayload());
      _updateCache(saved);
      const updated = await publishMarketplaceListing(decodedPlate);
      _updateCache(updated);
      toast(`${decodedPlate} is now visible on the Ardena Marketplace.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleHide() {
    setSaving(true);
    setError("");
    try {
      const updated = await hideMarketplaceListing(decodedPlate);
      _updateCache(updated);
      toast(`${decodedPlate} hidden from the Ardena Marketplace.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const status = listing?.status || "draft";

  if (loading) {
    return (
      <div className="empty-block fleet-empty">
        <p>Loading marketplace listing…</p>
      </div>
    );
  }

  return (
    <>
      {showCommission && (
        <CommissionModal
          onAccept={handleCommissionAccepted}
          onClose={() => setShowCommission(false)}
        />
      )}

      <header className="head-card">
        <div className="head-left">
          <Link
            to={`/dashboard/fleet/${encodeURIComponent(decodedPlate)}`}
            className="back-link"
            aria-label="Back to vehicle"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="head-titles">
            <h1>Marketplace listing · {decodedPlate}</h1>
            <p>
              Control how this vehicle appears on the Ardena consumer marketplace ·{" "}
              <span className={`chip mkt-${status}`}>
                {status === "draft" ? "Draft" : status === "visible" ? "Visible" : "Hidden"}
              </span>
            </p>
          </div>
        </div>
        <div className="details-actions">
          {status === "visible" ? (
            <button
              type="button"
              className="btn btn-ghost danger-btn"
              onClick={handleHide}
              disabled={saving}
            >
              Hide from marketplace
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePublish}
              disabled={saving}
            >
              {status === "draft" ? "Publish to marketplace" : "Re-publish"}
            </button>
          )}
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}

      <form onSubmit={handleSave} noValidate>
        <div className="details-grid mkt-grid">

          {/* ── Left column ─── */}
          <div className="mkt-left">

            <section className="panel-card">
              <header className="card-head">
                <h2>Listing content</h2>
                <p>Shown to customers browsing the marketplace</p>
              </header>

              <div className="form-row">
                <div className="field field-full">
                  <label htmlFor="mkt-desc">Description</label>
                  <textarea
                    id="mkt-desc"
                    rows={4}
                    placeholder="Describe the vehicle — comfort, condition, what makes it great for a trip…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row form-row-2">
                <div className="field">
                  <label htmlFor="mkt-fuel">Fuel type</label>
                  <select id="mkt-fuel" value={fuelType} onChange={(e) => setFuelType(e.target.value)}>
                    <option value="">— select —</option>
                    {FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="mkt-trans">Transmission</label>
                  <select id="mkt-trans" value={transmission} onChange={(e) => setTransmission(e.target.value)}>
                    <option value="">— select —</option>
                    {TRANSMISSIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-row form-row-3">
                <div className="field">
                  <label htmlFor="mkt-seats">Seats</label>
                  <input
                    id="mkt-seats"
                    type="number"
                    min={1}
                    max={50}
                    placeholder="5"
                    value={seats}
                    onChange={(e) => setSeats(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="mkt-color">Colour</label>
                  <input
                    id="mkt-color"
                    type="text"
                    placeholder="White"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="mkt-mileage">Mileage (km)</label>
                  <input
                    id="mkt-mileage"
                    type="number"
                    min={0}
                    placeholder="45000"
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="field field-full">
                  <label htmlFor="mkt-features">Features <span className="hint-text">(comma-separated)</span></label>
                  <input
                    id="mkt-features"
                    type="text"
                    placeholder="Air conditioning, Bluetooth, Roof rack, GPS"
                    value={features}
                    onChange={(e) => setFeatures(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="field field-full">
                  <label htmlFor="mkt-rules">Rental rules</label>
                  <textarea
                    id="mkt-rules"
                    rows={3}
                    placeholder="No smoking inside the vehicle. Security deposit required at pickup…"
                    value={rules}
                    onChange={(e) => setRules(e.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="panel-card">
              <header className="card-head">
                <h2>Media</h2>
                <p>Cover image URL shown as the primary photo</p>
              </header>
              <div className="field">
                <label htmlFor="mkt-cover">Cover image URL</label>
                <input
                  id="mkt-cover"
                  type="url"
                  placeholder="https://…"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                />
              </div>
              {coverImage && (
                <img
                  src={coverImage}
                  alt="Cover preview"
                  className="mkt-cover-preview"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              )}
            </section>

          </div>

          {/* ── Right column ─── */}
          <div className="details-side">

            <section className="panel-card">
              <header className="card-head">
                <h2>Pricing</h2>
                <p>Marketplace rates (KES)</p>
              </header>
              <div className="form-row form-row-2">
                <div className="field">
                  <label htmlFor="mkt-daily">Daily rate</label>
                  <input
                    id="mkt-daily"
                    type="number"
                    min={0}
                    placeholder="8000"
                    value={dailyRate}
                    onChange={(e) => setDailyRate(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="mkt-weekly">Weekly rate</label>
                  <input
                    id="mkt-weekly"
                    type="number"
                    min={0}
                    placeholder="50000"
                    value={weeklyRate}
                    onChange={(e) => setWeeklyRate(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row form-row-2">
                <div className="field">
                  <label htmlFor="mkt-monthly">Monthly rate</label>
                  <input
                    id="mkt-monthly"
                    type="number"
                    min={0}
                    placeholder="180000"
                    value={monthlyRate}
                    onChange={(e) => setMonthlyRate(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="mkt-minage">Min age (yrs)</label>
                  <input
                    id="mkt-minage"
                    type="number"
                    min={18}
                    max={99}
                    placeholder="23"
                    value={minAge}
                    onChange={(e) => setMinAge(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row form-row-2">
                <div className="field">
                  <label htmlFor="mkt-mindays">Min rental days</label>
                  <input
                    id="mkt-mindays"
                    type="number"
                    min={1}
                    placeholder="1"
                    value={minDays}
                    onChange={(e) => setMinDays(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="mkt-maxdays">Max rental days</label>
                  <input
                    id="mkt-maxdays"
                    type="number"
                    min={1}
                    placeholder="30"
                    value={maxDays}
                    onChange={(e) => setMaxDays(e.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="panel-card">
              <header className="card-head">
                <h2>Rental options</h2>
              </header>
              <div className="field">
                <label htmlFor="mkt-drive">Drive setting</label>
                <select id="mkt-drive" value={driveSetting} onChange={(e) => setDriveSetting(e.target.value)}>
                  {DRIVE_SETTINGS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={depositRequired}
                  onChange={(e) => setDepositRequired(e.target.checked)}
                />
                Require security deposit
              </label>
              {depositRequired && (
                <div className="field">
                  <label htmlFor="mkt-deposit">Deposit amount (KES)</label>
                  <input
                    id="mkt-deposit"
                    type="number"
                    min={0}
                    placeholder="10000"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                </div>
              )}
            </section>

            <section className="panel-card">
              <header className="card-head">
                <h2>Pickup location</h2>
                <p>Where customers collect the vehicle</p>
              </header>
              <div className="field">
                <label htmlFor="mkt-loc">Location name</label>
                <input
                  id="mkt-loc"
                  type="text"
                  placeholder="Westlands, Nairobi"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                />
              </div>
            </section>

            <div className="mkt-actions">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save listing"}
              </button>
              <Link
                to={`/dashboard/fleet/${encodeURIComponent(decodedPlate)}`}
                className="btn btn-ghost"
              >
                Cancel
              </Link>
            </div>

          </div>
        </div>
      </form>
    </>
  );
}
