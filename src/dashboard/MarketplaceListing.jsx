import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchMarketplaceListing,
  saveMarketplaceListing,
  publishMarketplaceListing,
  hideMarketplaceListing,
  uploadMarketplaceCover,
  uploadMarketplaceImages,
  updateVehicle,
} from "../lib/api";
import { toast } from "./toastStore";
import { getVehicle } from "./fleetStore";
import {
  subscribe as subscribeBusiness,
  getBusiness,
} from "./businessStore";
import Dropdown from "../components/Dropdown";
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

const CANCELLATION_TIERS = [
  { value: "flexible", label: "Flexible" },
  { value: "standard", label: "Standard" },
  { value: "strict", label: "Strict" },
];

// Plain-language summary so the choice isn't three words with no consequence.
const TIER_NOTES = {
  flexible: "Most generous to the renter, full refund until close to pickup. Attracts more bookings.",
  standard: "A balance between filling the vehicle and covering a late drop-out.",
  strict: "Least refundable. Best for in-demand vehicles and peak season, the default for fleets.",
};

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
  const business = useSyncExternalStore(subscribeBusiness, getBusiness);
  const decodedPlate = decodeURIComponent(plate);

  const [loading, setLoading] = useState(true);
  const [listing, setListing] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCommission, setShowCommission] = useState(false);

  // file input refs
  const coverInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // form state
  const [description, setDescription] = useState("");
  // Lives on the vehicle, not the listing — surfaced here because publishing
  // needs it and there's nowhere else to enter it.
  const [yearInput, setYearInput] = useState("");
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
  const [carImages, setCarImages] = useState([]); // array of URLs
  const [driveSetting, setDriveSetting] = useState("self_only");
  // Fleet listings default to strict: a business holding a vehicle off-market
  // for a booking carries a real cost when it's cancelled late.
  const [cancellationTier, setCancellationTier] = useState("strict");
  const [carVideo, setCarVideo] = useState("");
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
    setCarImages(data.car_images || []);
    setDriveSetting(data.drive_setting || "self_only");
    setCancellationTier(data.cancellation_tier || "strict");
    setCarVideo(data.car_video || "");
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
      car_images: carImages.length > 0 ? carImages : null,
      drive_setting: driveSetting,
      cancellation_tier: cancellationTier,
      car_video: carVideo.trim() || null,
      deposit_required: depositRequired,
      deposit_amount: depositAmount !== "" ? Number(depositAmount) : null,
      commission_acknowledged: commissionAcknowledged,
    };
  }

  function _updateCache(data) {
    _cache.set(decodedPlate, data);
    setListing(data);
  }

  async function handleCoverUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const res = await uploadMarketplaceCover(decodedPlate, file);
      setCoverImage(res.url);
      _cache.set(decodedPlate, { ..._cache.get(decodedPlate), cover_image: res.url });
      toast("Cover image uploaded.");
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleGalleryUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      const res = await uploadMarketplaceImages(decodedPlate, files);
      setCarImages(res.urls);
      _cache.set(decodedPlate, { ..._cache.get(decodedPlate), car_images: res.urls });
      toast(`${files.length} image${files.length > 1 ? "s" : ""} uploaded.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removeGalleryImage(url) {
    const updated = carImages.filter((u) => u !== url);
    setCarImages(updated);
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
      // The Ardena listing needs a model year, which fleets added before that
      // field existed don't have. There's no vehicle edit screen, so without
      // patching it here those vehicles could never be published at all.
      if (needsYear) {
        const y = Number(yearInput);
        if (!y || y < 1900 || y > new Date().getFullYear() + 1) {
          setError("Enter the vehicle's model year before publishing.");
          setSaving(false);
          return;
        }
        await updateVehicle(decodedPlate, { year: y });
      }

      // Save current field values then publish in one sequence.
      // handleCommissionAccepted already saved before calling here, but we
      // save again to pick up any unsaved edits when publishing directly.
      const saved = await saveMarketplaceListing(decodedPlate, buildPayload());
      _updateCache(saved);
      const updated = await publishMarketplaceListing(decodedPlate);
      _updateCache(updated);
      // Deliberately not "now visible" — an admin still has to approve it.
      toast(
        updated?.live_on_marketplace
          ? `${decodedPlate} is live on the Ardena Marketplace.`
          : `${decodedPlate} submitted. Ardena reviews new listings before they reach renters.`
      );
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
  // Vehicles added before the fleet carried a model year can't be listed until
  // one is set, and there is no vehicle edit screen to set it on.
  const vehicle = getVehicle(decodedPlate);
  const needsYear = Boolean(vehicle) && !vehicle.year;
  // Publishing is the business's intent; Ardena's review is a separate gate.
  // A vehicle is only actually bookable when both are open, which is what
  // `live_on_marketplace` reports — showing "Visible" off `status` alone told
  // businesses their car was on the app when it was still in the queue.
  const review = listing?.review || "not_submitted";
  const live = Boolean(listing?.live_on_marketplace);
  const badge = live
    ? { cls: "mkt-live", label: "Live on Ardena" }
    : review === "pending_review"
      ? { cls: "mkt-review", label: "In review" }
      : review === "rejected"
        ? { cls: "mkt-rejected", label: "Changes needed" }
        : status === "visible"
          ? { cls: "mkt-review", label: "Awaiting review" }
          : status === "hidden"
            ? { cls: "mkt-hidden", label: "Hidden" }
            : { cls: "mkt-draft", label: "Draft" };

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
              <span className={`chip ${badge.cls}`}>{badge.label}</span>
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

      {/* Publishing submits the vehicle; an Ardena admin still has to approve it,
          exactly as an individual host's car is approved. Without saying so, a
          business publishes, sees "Visible", waits for bookings that can't come,
          and concludes the marketplace is broken. */}
      {/* Publishing is refused until Ardena has verified the business. Saying so
          here means a business finds out before filling in the whole listing,
          rather than from a 400 on the publish button. */}
      {!business.verifiedSince && (
        <div className="mkt-banner mkt-banner-review">
          <strong>Your business isn&apos;t verified yet.</strong> You can fill this
          in and save it now, but listings only go live on the Ardena app once
          Ardena has confirmed your registration and director ID. Direct bookings
          are unaffected. <Link to="/dashboard/support">Request verification</Link>.
        </div>
      )}

      {review === "pending_review" && (
        <div className="mkt-banner mkt-banner-review">
          <strong>Waiting on Ardena review.</strong> Every new listing is checked
          before it reaches renters, usually within a day. You&apos;ll see
          &ldquo;Live on Ardena&rdquo; here once it&apos;s approved. Edits you make
          in the meantime are saved and reviewed together.
        </div>
      )}

      {review === "rejected" && (
        <div className="mkt-banner mkt-banner-rejected">
          <strong>Changes needed before this can go live.</strong>
          {listing?.rejection_reason ? (
            <> {listing.rejection_reason}</>
          ) : (
            <> Contact Ardena support for the details.</>
          )}{" "}
          Update the listing and publish again to resubmit.
        </div>
      )}

      {review === "approved" && status === "visible" && !live && (
        <div className="mkt-banner mkt-banner-review">
          <strong>Approved but not showing.</strong> This listing is approved and set
          to visible, but isn&apos;t appearing on the app. Contact Ardena support.
        </div>
      )}

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
                    placeholder="Describe the vehicle, comfort, condition, what makes it great for a trip…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row form-row-2">
                <div className="field">
                  <label htmlFor="mkt-fuel">Fuel type</label>
                  <Dropdown
                    id="mkt-fuel"
                    value={fuelType}
                    onChange={setFuelType}
                    options={FUEL_TYPES}
                    placeholder="Select fuel type"
                  />
                </div>
                <div className="field">
                  <label htmlFor="mkt-trans">Transmission</label>
                  <Dropdown
                    id="mkt-trans"
                    value={transmission}
                    onChange={setTransmission}
                    options={TRANSMISSIONS}
                    placeholder="Select transmission"
                  />
                </div>
              </div>

              {needsYear && (
                <div className="field mkt-year-field">
                  <label htmlFor="mkt-year">Model year</label>
                  <input
                    id="mkt-year"
                    type="number"
                    min={1900}
                    max={new Date().getFullYear() + 1}
                    placeholder="2022"
                    value={yearInput}
                    onChange={(e) => setYearInput(e.target.value)}
                  />
                  <p className="field-note">
                    Renters filter by year, so a listing can&apos;t go live without
                    one. This is saved to the vehicle, not just this listing.
                  </p>
                </div>
              )}

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
                <p>Upload a cover photo and gallery images for the listing</p>
              </header>

              {/* Cover image */}
              <div className="field">
                <label>Cover image</label>
                {coverImage && (
                  <img
                    src={coverImage}
                    alt="Cover preview"
                    className="mkt-cover-preview"
                    onError={(e) => { e.target.style.display = "none"; }}
                  />
                )}
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleCoverUpload}
                />
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={uploading}
                  onClick={() => coverInputRef.current?.click()}
                >
                  {coverImage ? "Replace cover image" : "Upload cover image"}
                </button>
              </div>

              {/* Gallery images */}
              <div className="field" style={{ marginTop: "1rem" }}>
                <label>Gallery images</label>
                {carImages.length > 0 && (
                  <div className="mkt-gallery-grid">
                    {carImages.map((url) => (
                      <div key={url} className="mkt-gallery-item">
                        <img
                          src={url}
                          alt="Gallery"
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                        <button
                          type="button"
                          className="mkt-gallery-remove"
                          onClick={() => removeGalleryImage(url)}
                          aria-label="Remove image"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={handleGalleryUpload}
                />
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={uploading}
                  onClick={() => galleryInputRef.current?.click()}
                  style={{ marginTop: carImages.length > 0 ? "0.5rem" : 0 }}
                >
                  {uploading ? "Uploading…" : "Add images"}
                </button>
              </div>

              {/* A walkaround clip converts better than photos alone. Hosted
                  elsewhere and linked, rather than uploaded — video storage
                  isn't part of the listing upload endpoints. */}
              <div className="field">
                <label htmlFor="mkt-video">
                  Video link <span className="hint-text">optional</span>
                </label>
                <input
                  id="mkt-video"
                  type="url"
                  value={carVideo}
                  onChange={(e) => setCarVideo(e.target.value)}
                  placeholder="https://…"
                />
              </div>
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
                <Dropdown
                  id="mkt-drive"
                  value={driveSetting}
                  onChange={setDriveSetting}
                  options={DRIVE_SETTINGS}
                />
              </div>
              {/* What a renter gets back when they cancel. Fleet listings
                  default to strict because a vehicle held off-market for a
                  booking has a real cost when it's dropped late. */}
              <div className="field">
                <label htmlFor="mkt-tier">Cancellation policy</label>
                <Dropdown
                  id="mkt-tier"
                  name="cancellation_tier"
                  value={cancellationTier}
                  onChange={setCancellationTier}
                  options={CANCELLATION_TIERS}
                />
                <p className="field-note">{TIER_NOTES[cancellationTier]}</p>
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
