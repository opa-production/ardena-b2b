import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  fetchMarketplaceListing,
  saveMarketplaceListing,
  publishMarketplaceListing,
  hideMarketplaceListing,
  uploadMarketplaceCover,
  uploadMarketplaceImages,
  uploadMarketplaceVideo,
  updateVehicle,
} from "../lib/api";
import { toast } from "./toastStore";
import { getVehicle, setVehicleListing } from "./fleetStore";
import {
  subscribe as subscribeBusiness,
  getBusiness,
} from "./businessStore";
import Dropdown from "../components/Dropdown";
import DescriptionAssist from "./DescriptionAssist";
import {
  FeaturePicker,
  RulePicker,
  splitFeatures,
  splitRules,
  joinRules,
} from "./ListingPickers";
import { getMapboxToken, hydrateConfig } from "./configStore";
import "./fleet.css";
import "./marketplace.css";
import PageLoader from "../components/PageLoader";

// Module-level cache: plate → listing data. Avoids re-fetching on back-navigation.
const _cache = new Map();

const FUEL_TYPES = ["Petrol", "Diesel", "Hybrid", "Electric"];
const TRANSMISSIONS = ["Automatic", "Manual"];
// Values are the consumer app's DriveSettingEnum. This used to send "both",
// which the app doesn't know and silently treated as self-drive only.
const DRIVE_SETTINGS = [
  { value: "self_only", label: "Self-drive only" },
  { value: "chauffeur_only", label: "Chauffeur-driven only" },
  { value: "self_and_chauffeur", label: "Self-drive & chauffeur" },
];

// Same caps as the host app's car upload.
const MAX_PHOTOS = 12;
const MAX_FEATURES = 12;

// Labels for the server's `missing_fields` keys (PUBLISH_REQUIREMENTS in
// app/b2b/marketplace_listings.py) — what a host-app car must have too.
const REQUIREMENT_LABELS = {
  description: "Description",
  year: "Model year",
  photos: "At least one photo",
  seats: "Seats",
  fuel_type: "Fuel type",
  transmission: "Transmission",
  color: "Colour",
  mileage: "Mileage",
  weekly_rate: "Weekly rate",
  monthly_rate: "Monthly rate",
  min_rental_days: "Minimum rental days",
  min_age_requirement: "Minimum driver age",
  rules: "Rental rules",
  location: "Pickup location",
  deposit_amount: "Deposit amount",
};

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

function CommissionModal({ onAccept, onClose, acceptLabel = "I understand, submit for review" }) {
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
            By submitting, you agree to Ardena's marketplace commission terms.
            Every listing is reviewed by Ardena before renters can book it.
          </p>
        </div>
        <footer className="modal-foot">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={onAccept}>
            {acceptLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* How close the listing is to submittable, live from the form rather than
   the last save, so the ring moves as fields are filled. Mirrors the server's
   missing_for_publish() plus the two gates publish checks on top of it. */
function needsYearFor(plate) {
  const v = getVehicle(plate);
  return Boolean(v) && !v.year;
}

function ReadinessCard({ checks, saving, submitLabel, onSubmit, commission, onCommission, onReadTerms }) {
  const done = checks.filter((c) => c.ok).length;
  const pct = Math.round((done / checks.length) * 100);
  const ready = done === checks.length;
  const left = checks.filter((c) => !c.ok);
  const R = 30;
  const C = 2 * Math.PI * R;

  return (
    <section className={`panel-card ready-card${ready ? " is-ready" : ""}`}>
      <div className="ready-top">
        <svg className="ready-ring" width="76" height="76" viewBox="0 0 76 76" aria-hidden="true">
          <circle cx="38" cy="38" r={R} className="ready-track" />
          <circle
            cx="38"
            cy="38"
            r={R}
            className="ready-fill"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - done / checks.length)}
          />
          <text x="38" y="43" textAnchor="middle" className="ready-pct">{pct}%</text>
        </svg>
        <div>
          <h2>{ready ? "Ready to submit" : "Listing progress"}</h2>
          <p>
            {ready
              ? "Ardena reviews every listing before renters can book it, usually within a day."
              : `${done} of ${checks.length} done · ${left.length} to go`}
          </p>
        </div>
      </div>

      {!ready && (
        <ul className="ready-list">
          {left.map((c) => (
            <li key={c.key}>{c.label}</li>
          ))}
        </ul>
      )}

      <label className="checkbox-row commission-check">
        <input type="checkbox" checked={commission} onChange={(e) => onCommission(e.target.checked)} />
        <span>
          I accept Ardena&apos;s marketplace commission terms.{" "}
          <button type="button" className="link-btn" onClick={onReadTerms}>
            Read the terms
          </button>
        </span>
      </label>

      <button
        type="button"
        className="btn btn-primary ready-submit"
        disabled={saving || !ready}
        onClick={onSubmit}
      >
        {saving ? "Submitting…" : submitLabel}
      </button>
    </section>
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
  // "read" opens the terms from the checkbox; "submit" is the publish gate.
  const [commissionMode, setCommissionMode] = useState("submit");
  const navigate = useNavigate();

  // file input refs
  const coverInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const videoInputRef = useRef(null);

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
  const [pickedFeatures, setPickedFeatures] = useState([]); // preset labels
  const [otherFeatures, setOtherFeatures] = useState(""); // comma-separated extras
  const [otherOpen, setOtherOpen] = useState(false);
  const [dailyRate, setDailyRate] = useState("");
  const [weeklyRate, setWeeklyRate] = useState("");
  const [monthlyRate, setMonthlyRate] = useState("");
  // Weekly/monthly follow the daily rate (x7, x30) until the host types their
  // own. Clearing a field hands it back to the calculation.
  const [weeklyAuto, setWeeklyAuto] = useState(true);
  const [monthlyAuto, setMonthlyAuto] = useState(true);
  const [minDays, setMinDays] = useState("");
  const [maxDays, setMaxDays] = useState("");
  const [minAge, setMinAge] = useState("");
  const [pickedRules, setPickedRules] = useState([]);
  const [customRules, setCustomRules] = useState("");
  const [locationName, setLocationName] = useState("");
  // The pin behind the name. Cleared when the name is retyped, so the server
  // looks the new address up instead of keeping a pin for the old one.
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
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
    const f = splitFeatures(data.features);
    setPickedFeatures(f.picked);
    setOtherFeatures(f.other);
    setOtherOpen(Boolean(f.other));
    setDailyRate(data.daily_rate ?? "");
    setWeeklyRate(data.weekly_rate ?? "");
    setMonthlyRate(data.monthly_rate ?? "");
    // A saved rate is the host's own figure; don't recalculate over it.
    setWeeklyAuto(!data.weekly_rate);
    setMonthlyAuto(!data.monthly_rate);
    setMinDays(data.min_rental_days ?? "");
    setMaxDays(data.max_rental_days ?? "");
    setMinAge(data.min_age_requirement ?? "");
    const rl = splitRules(data.rules);
    setPickedRules(rl.picked);
    setCustomRules(rl.custom);
    setLocationName(data.location_name || "");
    setCoords(
      data.latitude != null && data.longitude != null
        ? { lat: data.latitude, lng: data.longitude }
        : null
    );
    setCoverImage(data.cover_image || "");
    setCarImages(data.car_images || []);
    setDriveSetting(data.drive_setting === "both" ? "self_and_chauffeur" : data.drive_setting || "self_only");
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
      features: featureList.length ? featureList : null,
      daily_rate: dailyRate !== "" ? Number(dailyRate) : null,
      weekly_rate: weeklyRate !== "" ? Number(weeklyRate) : null,
      monthly_rate: monthlyRate !== "" ? Number(monthlyRate) : null,
      min_rental_days: minDays !== "" ? Number(minDays) : null,
      max_rental_days: maxDays !== "" ? Number(maxDays) : null,
      min_age_requirement: minAge !== "" ? Number(minAge) : null,
      rules: rules || null,
      location_name: locationName || null,
      ...(coords ? { latitude: coords.lat, longitude: coords.lng } : {}),
      cover_image: coverImage || null,
      // [] clears the gallery; the server used to ignore it and keep the photos.
      car_images: carImages,
      drive_setting: driveSetting,
      cancellation_tier: cancellationTier,
      car_video: carVideo.trim() || null,
      deposit_required: depositRequired,
      deposit_amount: depositRequired && depositAmount !== "" ? Number(depositAmount) : null,
      commission_acknowledged: commissionAcknowledged,
    };
  }

  /* Browser position -> a readable area name (Mapbox, via the token GET /config
     serves) -> saved to the listing straight away. The save is the
     confirmation: the page only says "pinned" once the backend has the
     coordinates, not when the browser does. */
  async function pinCurrentLocation() {
    if (locating) return;
    if (!("geolocation" in navigator)) {
      toast("This browser can't share its location. Type the area instead.", "danger");
      return;
    }
    setLocating(true);
    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        })
      );
      const lat = Number(pos.coords.latitude.toFixed(6));
      const lng = Number(pos.coords.longitude.toFixed(6));

      let name = "";
      try {
        await hydrateConfig();
        const token = getMapboxToken();
        if (token) {
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
              `?types=neighborhood,locality,place&limit=1&access_token=${encodeURIComponent(token)}`
          );
          if (res.ok) name = (await res.json()).features?.[0]?.place_name || "";
        }
      } catch {
        /* no name is fine: the pin is what the app maps */
      }
      name = name.replace(/, Kenya$/, "") || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

      const saved = await saveMarketplaceListing(decodedPlate, {
        location_name: name,
        latitude: lat,
        longitude: lng,
      });
      _updateCache(saved);
      setLocationName(saved.location_name || name);
      setCoords({ lat: saved.latitude ?? lat, lng: saved.longitude ?? lng });
      toast(`Pickup location saved: ${saved.location_name || name}`);
    } catch (err) {
      const msg =
        err?.code === 1
          ? "Location access is blocked. Allow it for this site in your browser, or type the area instead."
          : err?.code === 2 || err?.code === 3
            ? "Couldn't get a location fix. Try again near a window, or type the area instead."
            : err?.message || "Couldn't save that location";
      toast(msg, "danger");
    } finally {
      setLocating(false);
    }
  }

  function _updateCache(data) {
    _cache.set(decodedPlate, data);
    setListing(data);
    setVehicleListing(decodedPlate, data); // keeps the Fleet toggle in step
  }

  // Uploads start a draft on the server if there wasn't one, and change what's
  // missing — refetch so the checklist and the Fleet toggle reflect it.
  async function _refreshAfterUpload() {
    try {
      _updateCache(await fetchMarketplaceListing(decodedPlate));
    } catch {
      /* the upload itself succeeded; the checklist catches up on next save */
    }
  }

  async function handleCoverUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const res = await uploadMarketplaceCover(decodedPlate, file);
      setCoverImage(res.url);
      await _refreshAfterUpload();
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
    const room = MAX_PHOTOS - carImages.length;
    if (files.length > room) {
      setError(`A listing can have up to ${MAX_PHOTOS} photos — you can add ${room} more.`);
      e.target.value = "";
      return;
    }
    setUploading(true);
    setError("");
    try {
      const res = await uploadMarketplaceImages(decodedPlate, files);
      setCarImages(res.urls);
      await _refreshAfterUpload();
      toast(`${files.length} image${files.length > 1 ? "s" : ""} uploaded.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleVideoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      setError("Video must be 100 MB or smaller.");
      e.target.value = "";
      return;
    }
    setUploading(true);
    setError("");
    try {
      const res = await uploadMarketplaceVideo(decodedPlate, file);
      setCarVideo(res.url);
      await _refreshAfterUpload();
      toast("Video uploaded.");
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
    if (featureList.length > MAX_FEATURES) {
      setError(`List at most ${MAX_FEATURES} features.`);
      return;
    }
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
      setCommissionMode("submit");
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
      if (featureList.length > MAX_FEATURES) {
        setError(`List at most ${MAX_FEATURES} features.`);
        setSaving(false);
        return;
      }
      const saved = await saveMarketplaceListing(decodedPlate, buildPayload());
      _updateCache(saved);
      // The checklist above the form already names what's missing; publishing
      // would only come back with the same list as a 400.
      if (saved?.missing_fields?.length) {
        setError("Complete the items listed above before publishing.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
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
      toast(
        live
          ? `${decodedPlate} taken off the Ardena app.`
          : `${decodedPlate} withdrawn from review. Submit again whenever you're ready.`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const featureList = [
    ...pickedFeatures,
    ...(otherOpen ? otherFeatures.split(",").map((f) => f.trim()).filter(Boolean) : []),
  ];
  const rules = joinRules(pickedRules, customRules);
  const missing = listing?.missing_fields || [];
  const status = listing?.status || "draft";
  const verified = Boolean(business.verifiedSince);
  const checks = [
    ["description", description.trim()],
    ["year", !needsYearFor(decodedPlate) || Number(yearInput) >= 1900],
    ["photos", coverImage || carImages.length],
    ["seats", seats !== ""],
    ["fuel_type", fuelType],
    ["transmission", transmission],
    ["color", color],
    ["mileage", mileage !== ""],
    ["weekly_rate", Number(weeklyRate) > 0],
    ["monthly_rate", Number(monthlyRate) > 0],
    ["min_rental_days", Number(minDays) >= 1],
    ["min_age_requirement", Number(minAge) >= 18],
    ["rules", rules.trim()],
    ["location", locationName.trim() || coords],
    ["deposit_amount", !depositRequired || Number(depositAmount) > 0],
  ]
    .map(([key, ok]) => ({ key, label: REQUIREMENT_LABELS[key], ok: Boolean(ok) }))
    .concat([
      { key: "commission", label: "Accept the commission terms", ok: commissionAcknowledged },
      { key: "kyb", label: "Business verified by Ardena", ok: verified },
    ]);
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
  // Every new car goes through Ardena's review (the backend creates it as
  // awaiting verification and hidden). Only a car Ardena already approved goes
  // straight back on the app when re-published, so only that one says so.
  const submitLabel =
    review === "approved"
      ? "Put back on the app"
      : review === "rejected"
        ? "Resubmit for review"
        : "Submit for review";
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
      <PageLoader message="Opening this car's Ardena app listing, photos and pricing included." />
    );
  }

  return (
    <>
      {showCommission && (
        <CommissionModal
          acceptLabel={commissionMode === "read" ? "I accept" : undefined}
          onAccept={
            commissionMode === "read"
              ? () => {
                  setCommissionAcknowledged(true);
                  setShowCommission(false);
                }
              : handleCommissionAccepted
          }
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
          {/* Three states, one action each: live can be taken off; submitted
              and waiting can be withdrawn (not a red "hide" — nothing is
              showing yet); anything else can be submitted. */}
          {live ? (
            <button
              type="button"
              className="btn btn-ghost danger-btn"
              onClick={handleHide}
              disabled={saving}
            >
              Take off the app
            </button>
          ) : status === "visible" && review !== "rejected" ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleHide}
              disabled={saving}
              title="Pull this car out of Ardena's review queue"
            >
              Withdraw submission
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePublish}
              disabled={saving}
            >
              {submitLabel}
            </button>
          )}
        </div>
      </header>

      {error && <p className="form-error">{error}</p>}

      {/* Same bar as a car uploaded from the host app. Listed up front so a
          business fills the form once instead of meeting each gap as a
          separate publish error. Keys come from the server's missing_fields. */}
      {listing && missing.length > 0 && status !== "visible" && (
        <div className="mkt-banner mkt-banner-review mkt-missing">
          <strong>Before this can go on the Ardena app, add:</strong>
          <ul>
            {missing.map((k) => (
              <li key={k}>{REQUIREMENT_LABELS[k] || k}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Publishing submits the vehicle; an Ardena admin still has to approve it,
          exactly as an individual host's car is approved. Without saying so, a
          business publishes, sees "Visible", waits for bookings that can't come,
          and concludes the marketplace is broken. */}
      {/* Publishing is refused until Ardena has verified the business. Saying so
          here means a business finds out before filling in the whole listing,
          rather than from a 400 on the publish button. */}
      {!verified && (
        <div className="mkt-banner mkt-banner-review mkt-banner-action">
          <div>
            <strong>Your business isn&apos;t verified yet.</strong> You can fill this
            in and save it now, but listings only go live on the Ardena app once
            Ardena has confirmed your registration and director ID. Direct bookings
            are unaffected.
          </div>
          {/* KYB is handled by Ardena through support today, so this opens the
              support thread with the request already written. */}
          <button
            type="button"
            className="btn btn-market"
            onClick={() =>
              navigate("/dashboard/support", {
                state: {
                  draft:
                    "Hi Ardena, please verify our business so we can list vehicles on the Ardena app. " +
                    "We're ready to share our registration certificate, KRA PIN and director ID.",
                },
              })
            }
          >
            Verify business
          </button>
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
                  {/* Unsaved form values go along so the draft matches
                        what's on screen, not what was last saved. */}
                    <DescriptionAssist
                      plate={decodedPlate}
                      context={{
                        seats: seats !== "" ? Number(seats) : undefined,
                        fuel_type: fuelType || undefined,
                        transmission: transmission || undefined,
                        color: color || undefined,
                        features: featureList.length ? featureList.slice(0, MAX_FEATURES) : undefined,
                        location: locationName || undefined,
                        drive_setting: driveSetting,
                      }}
                      onAccept={(text) => {
                        setDescription(text);
                        toast("Description added. Save the listing to keep it.");
                      }}
                  >
                    <textarea
                      id="mkt-desc"
                      rows={4}
                      placeholder="Describe the vehicle, comfort, condition, what makes it great for a trip…"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </DescriptionAssist>
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
                  <label>
                    Features{" "}
                    <span className="hint-text">
                      (tap to select, {featureList.length} of {MAX_FEATURES})
                    </span>
                  </label>
                  <FeaturePicker
                    picked={pickedFeatures}
                    onPicked={setPickedFeatures}
                    other={otherFeatures}
                    onOther={setOtherFeatures}
                    otherOpen={otherOpen}
                    onOtherOpen={setOtherOpen}
                    total={featureList.length}
                    max={MAX_FEATURES}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="field field-full">
                  <label htmlFor="mkt-rules">
                    Rental rules <span className="hint-text">(tap the common ones, add your own below)</span>
                  </label>
                  <RulePicker picked={pickedRules} onPicked={setPickedRules} />
                  <textarea
                    id="mkt-rules"
                    rows={2}
                    placeholder="Any other rule, one per line"
                    value={customRules}
                    onChange={(e) => setCustomRules(e.target.value)}
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
                <label>
                  Cover image <span className="hint-text">optional, defaults to the first gallery photo</span>
                </label>
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
                <label>
                  Gallery images{" "}
                  <span className="mkt-count">
                    {carImages.length}/{MAX_PHOTOS}
                  </span>
                </label>
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
                  disabled={uploading || carImages.length >= MAX_PHOTOS}
                  onClick={() => galleryInputRef.current?.click()}
                  style={{ marginTop: carImages.length > 0 ? "0.5rem" : 0 }}
                >
                  {uploading ? "Uploading…" : "Add images"}
                </button>
              </div>

              {/* A walkaround clip converts better than photos alone. Uploaded
                  like a host-app listing's video, not linked from elsewhere. */}
              <div className="field" style={{ marginTop: "1rem" }}>
                <label>
                  Video <span className="hint-text">optional, MP4 or MOV up to 100 MB</span>
                </label>
                {carVideo && (
                  <video
                    src={carVideo}
                    className="mkt-cover-preview"
                    controls
                    preload="metadata"
                  />
                )}
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/quicktime"
                  style={{ display: "none" }}
                  onChange={handleVideoUpload}
                />
                <div className="mkt-actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={uploading}
                    onClick={() => videoInputRef.current?.click()}
                  >
                    {carVideo ? "Replace video" : "Upload video"}
                  </button>
                  {carVideo && (
                    <button
                      type="button"
                      className="btn btn-ghost danger-btn"
                      disabled={uploading}
                      onClick={() => setCarVideo("")}
                    >
                      Remove video
                    </button>
                  )}
                </div>
              </div>
            </section>

          </div>

          {/* ── Right column ─── */}
          <div className="details-side">

            {status !== "visible" && (
              <ReadinessCard
                checks={checks}
                saving={saving}
                submitLabel={submitLabel}
                onSubmit={handlePublish}
                commission={commissionAcknowledged}
                onCommission={setCommissionAcknowledged}
                onReadTerms={() => {
                  setCommissionMode("read");
                  setShowCommission(true);
                }}
              />
            )}

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
                    onChange={(e) => {
                      const v = e.target.value;
                      setDailyRate(v);
                      const d = Number(v);
                      if (weeklyAuto) setWeeklyRate(d > 0 ? String(Math.round(d * 7)) : "");
                      if (monthlyAuto) setMonthlyRate(d > 0 ? String(Math.round(d * 30)) : "");
                    }}
                  />
                </div>
                <div className="field">
                  <label htmlFor="mkt-weekly">
                    Weekly rate{weeklyAuto && weeklyRate !== "" && <span className="hint-text"> (7 × daily)</span>}
                  </label>
                  <input
                    id="mkt-weekly"
                    type="number"
                    min={0}
                    placeholder="50000"
                    value={weeklyRate}
                    onChange={(e) => {
                      setWeeklyRate(e.target.value);
                      setWeeklyAuto(e.target.value === "");
                    }}
                  />
                </div>
              </div>
              <div className="form-row form-row-2">
                <div className="field">
                  <label htmlFor="mkt-monthly">
                    Monthly rate{monthlyAuto && monthlyRate !== "" && <span className="hint-text"> (30 × daily)</span>}
                  </label>
                  <input
                    id="mkt-monthly"
                    type="number"
                    min={0}
                    placeholder="180000"
                    value={monthlyRate}
                    onChange={(e) => {
                      setMonthlyRate(e.target.value);
                      setMonthlyAuto(e.target.value === "");
                    }}
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
                  onChange={(e) => {
                    setLocationName(e.target.value);
                    setCoords(null);
                  }}
                />
              </div>
              <button
                type="button"
                className="btn btn-ghost loc-btn"
                onClick={pinCurrentLocation}
                disabled={locating}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" />
                  <circle cx="12" cy="12" r="7" />
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                </svg>
                {locating ? "Finding you…" : "Use current location"}
              </button>
              {coords && listing?.latitude != null && (
                <p className="loc-pinned">
                  <span aria-hidden="true">✓</span> Pinned on the map at{" "}
                  {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                </p>
              )}
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
