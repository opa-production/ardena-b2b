import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link } from "react-router-dom";
import {
  subscribe as subscribeBusiness,
  getBusiness,
  setBusiness,
  hydrateBusiness,
  businessInitial,
} from "./businessStore";
import {
  updateBusiness,
  uploadBusinessLogo,
  forgotPassword,
  resetPassword,
} from "../lib/api";
import { getSession } from "../lib/authStore";
import { ICONS } from "./icons";
import VerifiedBadge from "../components/VerifiedBadge";
import Dropdown from "../components/Dropdown";
import { toast } from "./toastStore";
import HostLinkPanel from "./HostLinkPanel";
import QuickLinks from "./QuickLinks";
import "./fleet.css";
import "./bookings.css";
import "./workspace.css";

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
  const business = useSyncExternalStore(subscribeBusiness, getBusiness);
  const [currency, setCurrency] = useState("KES, Kenyan shilling");
  const [logo, setLogo] = useState(business.logo);
  const [logoFile, setLogoFile] = useState(null); // picked file, awaiting upload
  const [name, setName] = useState(business.name);
  const [phone, setPhone] = useState(business.phone);
  const [email, setEmail] = useState(business.email);
  const [location, setLocation] = useState(business.location);
  const [savingProfile, setSavingProfile] = useState(false);
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

  /* ---- Change password: emailed one-time code confirms it's you ---- */
  const accountEmail = getSession().user?.email || "";
  const [pwStage, setPwStage] = useState("idle"); // idle → code
  const [pwBusy, setPwBusy] = useState(false);
  const [pwOtp, setPwOtp] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");

  /* Opening and closing clear the fields, so an abandoned attempt never leaves
     a stale code and a half-typed password behind for the next one. */
  function openPasswordModal() {
    setPwOtp("");
    setPwNew("");
    setPwConfirm("");
    sendPasswordCode();
  }

  function closePasswordModal() {
    setPwStage("idle");
    setPwOtp("");
    setPwNew("");
    setPwConfirm("");
  }

  async function sendPasswordCode() {
    if (pwBusy) return;
    if (!accountEmail) {
      toast("Sign in again to change your password.", "danger");
      return;
    }
    setPwBusy(true);
    try {
      await forgotPassword(accountEmail);
      setPwStage("code");
      toast(`One-time code sent to ${accountEmail}.`);
    } catch (err) {
      toast(err.message, "danger");
    } finally {
      setPwBusy(false);
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    if (pwBusy) return;
    if (pwNew !== pwConfirm) {
      toast("Passwords don't match.", "danger");
      return;
    }
    setPwBusy(true);
    try {
      await resetPassword({ email: accountEmail, otp: pwOtp.trim(), newPassword: pwNew });
      setPwStage("idle");
      setPwOtp("");
      setPwNew("");
      setPwConfirm("");
      toast("Password changed.");
    } catch (err) {
      toast(err.message, "danger");
    } finally {
      setPwBusy(false);
    }
  }

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
      // keep everything the user saved, even fields the API response
      // doesn't echo back yet (phone/email aren't in GET /business)
      setBusiness(patch);
      if (updated) hydrateBusiness(updated);
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
      {/* The gear is the whole of this page's chrome — no title card, the
          sidebar already says Profile. Everything you configure rather than
          fill in lives behind it. */}
      <div className="page-actions">
        <Link
          to="/dashboard/settings/preferences"
          className="icon-btn toolbar-gear"
          aria-label="Settings"
          title="Settings"
        >
          {ICONS.settings}
        </Link>
      </div>

      <h1 className="sr-only">Profile</h1>

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

          <QuickLinks />

          {/* Renders only for workspaces that already linked an app account —
              connecting is deferred, see lib/features.js */}
          <HostLinkPanel />
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
              <h2>Business verification</h2>
              <p>
                {business.verifiedSince
                  ? "Confirmed by Ardena"
                  : "Needed before you can list on the Ardena app"}
              </p>
            </header>
            {/* This panel was hardcoded to "Verified" for every workspace, so an
                unverified business was told it was verified and then hit an
                unexplained wall when it tried to publish a listing. */}
            <div className="pay-row">
              <span>Status</span>
              {business.verifiedSince ? (
                <VerifiedBadge green />
              ) : (
                <span className="mini-amount">Not yet verified</span>
              )}
            </div>
            {business.verifiedSince ? (
              <>
                <div className="pay-row">
                  <span>Verified since</span>
                  <span className="mini-amount verified-ok">
                    {new Date(business.verifiedSince).toLocaleDateString("en-KE", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <p className="side-hint">
                  Your public trust page is live, and your vehicles can be listed on
                  the Ardena app.
                </p>
              </>
            ) : (
              <p className="side-hint">
                Verification confirms your registration, KRA PIN and director ID.
                Direct bookings work without it, it unlocks listing vehicles on the
                Ardena app and your public trust page.{" "}
                <Link to="/dashboard/support">Ask Ardena to verify your business</Link>.
              </p>
            )}
          </section>

          <section className="panel-card">
            <header className="card-head">
              <h2>Password &amp; security</h2>
              <p>Change the password for {accountEmail || "your account"}</p>
            </header>
            <p className="side-hint">
              We&apos;ll email you a one-time code to confirm it&apos;s you, then
              you set the new password.
            </p>
            <button
              type="button"
              className="btn btn-ghost pay-btn"
              onClick={openPasswordModal}
              disabled={pwBusy}
            >
              {pwBusy && pwStage === "idle" ? "Sending…" : "Change password"}
            </button>
          </section>

        </div>
      </div>

      {/* Changing a password is a task, not a panel: it takes over until it is
          done or abandoned. As a card it sat open mid-page in a half-finished
          state — a code sent, three empty fields — while the rest of the
          profile stayed editable around it. */}
      {pwStage === "code" && (
        <div className="modal-overlay" onClick={() => !pwBusy && closePasswordModal()}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-head">
              <h3>Change password</h3>
              <button
                type="button"
                className="icon-btn"
                disabled={pwBusy}
                onClick={closePasswordModal}
                aria-label="Close"
              >
                ✕
              </button>
            </header>
            <form onSubmit={handlePasswordChange} className="modal-body">
              <p className="side-hint" style={{ marginTop: 0 }}>
                We sent a code to {accountEmail || "your email"}.
              </p>
              <label className="field-label">
                One-time code
                <input
                  className="field-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={pwOtp}
                  onChange={(e) => setPwOtp(e.target.value)}
                  required
                  autoFocus
                />
              </label>
              <label className="field-label">
                New password
                <input
                  className="field-input"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  minLength={8}
                  value={pwNew}
                  onChange={(e) => setPwNew(e.target.value)}
                  required
                />
              </label>
              <label className="field-label">
                Confirm new password
                <input
                  className="field-input"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  minLength={8}
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                  required
                />
              </label>
              <p className="side-hint" style={{ marginTop: 0 }}>
                Didn&apos;t get the code?{" "}
                <button
                  type="button"
                  className="auth-linkish"
                  onClick={sendPasswordCode}
                  disabled={pwBusy}
                >
                  Send another
                </button>
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={pwBusy}
                  onClick={closePasswordModal}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={pwBusy}>
                  {pwBusy ? "Saving…" : "Save password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}