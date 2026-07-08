import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import { subscribe as subscribeFleet, getVehicles } from "./fleetStore";
import { subscribe as subscribePolicy, getPolicy, setPolicy, RETURN_HOUR } from "./policyStore";
import {
  subscribe as subscribeBusiness,
  getBusiness,
  setBusiness,
  hydrateBusiness,
  businessInitial,
} from "./businessStore";
import { updateBusiness, updatePolicy, uploadBusinessLogo } from "../lib/api";
import VerifiedBadge from "../components/VerifiedBadge";
import Dropdown from "../components/Dropdown";
import { toast } from "./toastStore";
import "./fleet.css";
import "./bookings.css";
import "./workspace.css";

// Per-vehicle pricing (mock, real numbers come with the billing engine)
const PLAN = { launchRate: 200, minimum: 2000 };

const PREFS = [
  { key: "bookings", name: "Booking activity", desc: "New requests, confirmations and cancellations" },
  { key: "payments", name: "Payments", desc: "Prompts paid, failed or refunded" },
  { key: "verification", name: "Verification results", desc: "When a customer passes or fails a check" },
  { key: "documents", name: "Document expiry", desc: "Insurance and inspection reminders" },
  { key: "staff", name: "Staff changes", desc: "Invites accepted and roles changed" },
];

// draw the picked image onto a canvas capped at 256px so the data URL
// stays small enough for localStorage
function resizeImage(file, max = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Settings() {
  const vehicles = useSyncExternalStore(subscribeFleet, getVehicles);
  const policy = useSyncExternalStore(subscribePolicy, getPolicy);
  const business = useSyncExternalStore(subscribeBusiness, getBusiness);
  const [currency, setCurrency] = useState("KES, Kenyan shilling");
  const [logo, setLogo] = useState(business.logo);
  const [logoFile, setLogoFile] = useState(null); // picked file, awaiting upload
  const [name, setName] = useState(business.name);
  const [phone, setPhone] = useState(business.phone);
  const [email, setEmail] = useState(business.email);
  const [location, setLocation] = useState(business.location);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);
  const fileRef = useRef(null);

  // refresh the form when the store hydrates from GET /business
  useEffect(() => {
    setName(business.name);
    setPhone(business.phone);
    setEmail(business.email);
    setLocation(business.location);
    setLogo((prev) => (logoFile ? prev : business.logo));
  }, [business, logoFile]);

  async function handlePolicySave(e) {
    e.preventDefault();
    if (savingPolicy) return;
    const f = new FormData(e.currentTarget);
    const deposit = Number(f.get("deposit"));
    const lateFeePerHour = Number(f.get("lateFee"));
    setSavingPolicy(true);
    try {
      await updatePolicy({ deposit, late_fee_per_hour: lateFeePerHour });
      setPolicy({ deposit, lateFeePerHour });
      toast("Rental policy saved.");
    } catch (err) {
      toast(err.message, "danger");
    } finally {
      setSavingPolicy(false);
    }
  }
  const [prefs, setPrefs] = useState({
    bookings: true,
    payments: true,
    verification: true,
    documents: true,
    staff: false,
  });

  const monthly = Math.max(PLAN.minimum, vehicles.length * PLAN.launchRate);

  async function handleLogoPick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Please choose an image file.", "danger");
      return;
    }
    try {
      setLogo(await resizeImage(file)); // instant preview
      setLogoFile(file);
    } catch {
      toast("Couldn't read that image.", "danger");
    }
    e.target.value = ""; // allow re-picking the same file
  }

  async function handleSave(e) {
    e.preventDefault();
    if (savingProfile) return;
    setSavingProfile(true);
    const patch = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      location: location.trim(),
    };
    try {
      const updated = await updateBusiness(patch);
      hydrateBusiness(updated || patch);
      toast("Business profile saved.");
    } catch (err) {
      toast(err.message, "danger");
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveLogo() {
    if (savingLogo) return;
    if (!logo) {
      // logo was removed
      setSavingLogo(true);
      try {
        await updateBusiness({ logo_url: null });
        setBusiness({ logo: null });
        setLogoFile(null);
        toast("Business logo removed.");
      } catch (err) {
        toast(err.message, "danger");
      } finally {
        setSavingLogo(false);
      }
      return;
    }
    if (!logoFile) {
      toast("Business logo is up to date.");
      return;
    }
    setSavingLogo(true);
    try {
      const res = await uploadBusinessLogo(logoFile);
      setBusiness({ logo: res?.logo_url || logo });
      setLogoFile(null);
      toast("Business logo saved.");
    } catch (err) {
      toast(err.message, "danger");
    } finally {
      setSavingLogo(false);
    }
  }

  return (
    <>
      <div className="details-grid settings-grid">
        <div className="settings-main">
          <section className="panel-card">
            <header className="card-head">
              <h2>Business profile</h2>
              <p>Shown on customer-facing prompts and receipts</p>
            </header>
            <form onSubmit={handleSave}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="set-name">Business name</label>
                  <input
                    id="set-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="set-phone">Business phone</label>
                  <input
                    id="set-phone"
                    type="tel"
                    placeholder="0700 000 000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="set-email">Contact email</label>
                  <input
                    id="set-email"
                    type="email"
                    placeholder="hello@yourbusiness.co.ke"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="set-city">Location</label>
                  <input
                    id="set-city"
                    type="text"
                    placeholder="Nairobi, Kenya"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="set-currency">Currency</label>
                  <Dropdown
                    id="set-currency"
                    value={currency}
                    onChange={setCurrency}
                    options={["KES, Kenyan shilling", "USD, US dollar"]}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                  {savingProfile ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </section>

          <section className="panel-card">
            <header className="card-head">
              <h2>Rental policy</h2>
              <p>Applied to agreements, deposits and late returns</p>
            </header>
            {/* keyed so the inputs refresh once the policy hydrates from the API */}
            <form onSubmit={handlePolicySave} key={`${policy.deposit}-${policy.lateFeePerHour}`}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="pol-deposit">Security deposit (KES)</label>
                  <input
                    id="pol-deposit"
                    name="deposit"
                    type="number"
                    min="0"
                    step="500"
                    defaultValue={policy.deposit}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="pol-late">Late return penalty (KES per hour)</label>
                  <input
                    id="pol-late"
                    name="lateFee"
                    type="number"
                    min="0"
                    step="50"
                    defaultValue={policy.lateFeePerHour}
                    required
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={savingPolicy}>
                  {savingPolicy ? "Saving…" : "Save policy"}
                </button>
              </div>
            </form>
            <p className="side-hint">
              Vehicles are due back by {RETURN_HOUR}:00 AM on the return date.
              Every started hour after that is charged at the hourly penalty,
              and both figures are written into every rental agreement.
            </p>
          </section>

          <section className="panel-card">
            <header className="card-head">
              <h2>Notification preferences</h2>
              <p>What lands in your inbox and notification feed</p>
            </header>
            {PREFS.map((p) => (
              <div className="pref-row" key={p.key}>
                <div>
                  <p className="pref-name">{p.name}</p>
                  <p className="pref-desc">{p.desc}</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={prefs[p.key]}
                    onChange={(e) =>
                      setPrefs({ ...prefs, [p.key]: e.target.checked })
                    }
                    aria-label={`Toggle ${p.name}`}
                  />
                  <i />
                </label>
              </div>
            ))}
          </section>
        </div>

        <div className="details-side">
          <section className="panel-card">
            <header className="card-head">
              <h2>Business logo</h2>
              <p>Shown on your dashboard and trust page</p>
            </header>
            <div className="logo-uploader">
              <span className="logo-avatar">
                {logo ? (
                  <img src={logo} alt="Business logo" />
                ) : (
                  <span className="logo-initial">{businessInitial(name)}</span>
                )}
              </span>
              <div className="logo-actions">
                <p className="logo-hint">Square works best.</p>
                <div className="logo-buttons">
                  <button
                    type="button"
                    className="btn btn-ghost logo-btn"
                    onClick={() => fileRef.current?.click()}
                  >
                    {logo ? "Change" : "Upload"}
                  </button>
                  {logo && (
                    <button
                      type="button"
                      className="btn btn-ghost logo-btn danger-btn"
                      onClick={() => {
                        setLogo(null);
                        setLogoFile(null);
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="logo-input"
                  onChange={handleLogoPick}
                />
              </div>
            </div>
            <button type="button" className="btn btn-ghost pay-btn" onClick={saveLogo} disabled={savingLogo}>
              {savingLogo ? "Saving…" : "Save logo"}
            </button>
          </section>

          <section className="panel-card">
            <header className="card-head">
              <h2>Plan &amp; billing</h2>
              <p>Fleet plan · billed monthly</p>
            </header>
            <p className="util-hero">KES {monthly.toLocaleString("en-KE")}<span className="util-per">/mo</span></p>
            <p className="plan-price">
              {vehicles.length} vehicles · KES {PLAN.launchRate}/vehicle
            </p>
            <Link to="/dashboard/billing" className="btn btn-ghost pay-btn">
              Manage plan &amp; billing
            </Link>
          </section>

          <section className="panel-card">
            <header className="card-head">
              <h2>Business verification</h2>
              <p>Checked before this account was opened</p>
            </header>
            <div className="pay-row">
              <span>Status</span>
              <VerifiedBadge green />
            </div>
            <div className="pay-row">
              <span>Registration</span>
              <span className="mini-amount verified-ok">Confirmed</span>
            </div>
            <div className="pay-row">
              <span>KRA PIN</span>
              <span className="mini-amount verified-ok">Matched</span>
            </div>
            <div className="pay-row">
              <span>Director ID</span>
              <span className="mini-amount verified-ok">Verified</span>
            </div>
          </section>

          <section className="panel-card">
            <header className="card-head">
              <h2>Workspace</h2>
              <p>Tenant details</p>
            </header>
            <div className="pay-row">
              <span>Tenant ID</span>
              <span className="mini-amount">{business.id ?? "—"}</span>
            </div>
            <div className="pay-row">
              <span>Region</span>
              <span className="mini-amount">{business.location || "Kenya"}</span>
            </div>
            <div className="pay-row">
              <span>Verified since</span>
              <span className="mini-amount">{business.verifiedSince || "—"}</span>
            </div>
            <p className="side-hint">
              Data export and workspace transfer arrive with the platform admin console.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
