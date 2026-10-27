import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  getTestimonial,
  saveTestimonial,
  uploadTestimonialAvatar,
  withdrawTestimonial,
} from "../lib/api";
import { getSession } from "../lib/authStore";
import { subscribe as subscribeBusiness, getBusiness } from "./businessStore";
import { toast } from "./toastStore";

/* Settings → "Share your experience": the workspace's one testimonial for
   the landing page (docs/testimonials-api.md). Owner and Manager only; the
   server answers anyone else with 403, so Settings doesn't mount this for them.

   Every save, and every new photo, sends it back to "pending" until Ardena's
   team has read it again, so on a live testimonial both ask first. */

const QUOTE_MIN = 40;
const QUOTE_MAX = 320;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_MAX = 2 * 1024 * 1024;

// Counted the way the server counts: HTML stripped, spaces squeezed.
const quoteLength = (q) => q.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().length;

function initials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

/* FastAPI's 422 list → { field: message }, the message without its
   "Value error, " prefix, under the field named in loc[1]. */
function fieldErrors(err) {
  const detail = err?.data?.detail;
  if (!Array.isArray(detail)) return null;
  const out = {};
  for (const d of detail) {
    const field = Array.isArray(d.loc) ? d.loc[1] : null;
    const msg = String(d.msg || "").replace(/^Value error, /, "");
    if (field && !out[field]) out[field] = msg;
  }
  return Object.keys(out).length ? out : null;
}

const BANNERS = {
  pending: { tone: "pending", title: "With our team for review. We'll email you when it's live." },
  approved: {
    tone: "approved",
    title: "Live on ardena.co.ke",
    note: "Changing it takes it off the site until we've read it again.",
  },
  rejected: { tone: "rejected", title: "Not published", note: "Edit and send it again." },
};

const OFF_SITE = "This takes your testimonial off the website until our team approves it again.";

export default function TestimonialPanel() {
  const business = useSyncExternalStore(subscribeBusiness, getBusiness);
  const userName = getSession().user?.name || "";
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [t, setT] = useState(null); // the saved testimonial, null = none
  const [name, setName] = useState(userName);
  const [title, setTitle] = useState("");
  const [quote, setQuote] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirm, setConfirm] = useState(null); // "save" | "photo" | "withdraw"
  const fileRef = useRef(null);

  function fill(row) {
    setT(row);
    if (row) {
      setName(row.name || userName);
      setTitle(row.title || "");
      setQuote(row.quote || "");
      setConsent(true); // given when it was sent; unticking it blocks a save
    }
  }

  useEffect(() => {
    let alive = true;
    getTestimonial()
      .then((row) => alive && fill(row))
      .catch((err) => alive && setLoadError(err.message || "Couldn't load your testimonial."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const live = t?.status === "approved";
  const length = quoteLength(quote);
  const banner = t ? BANNERS[t.status] : null;

  function validate() {
    const next = {};
    const n = name.trim();
    if (n.length < 2 || n.length > 80) next.name = "Your name must be 2 to 80 characters.";
    if (title.trim().length > 80) next.title = "Your role can be up to 80 characters.";
    if (length < QUOTE_MIN || length > QUOTE_MAX) {
      next.quote = `Your testimonial must be ${QUOTE_MIN} to ${QUOTE_MAX} characters (it is ${length}).`;
    }
    if (!consent) next.consent = "Tick the box so we can publish it.";
    setErrors(next);
    return !Object.keys(next).length;
  }

  async function save() {
    setConfirm(null);
    setSaving(true);
    setFormError("");
    try {
      const row = await saveTestimonial({
        name: name.trim(),
        ...(title.trim() ? { title: title.trim() } : {}),
        quote: quote.trim(),
        consent: true,
      });
      fill(row);
      setErrors({});
      toast(t ? "Saved. It's with our team for review." : "Sent for review. We'll email you when it's live.");
    } catch (err) {
      const byField = err.status === 422 ? fieldErrors(err) : null;
      if (byField) setErrors(byField);
      else if (err.status === 429) setFormError(err.message || "You've changed this a lot today. Try again tomorrow.");
      else setFormError(err.message || "Couldn't save your testimonial. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (saving || !validate()) return;
    if (live) setConfirm("save");
    else save();
  }

  function pickPhoto() {
    if (live) setConfirm("photo");
    else fileRef.current?.click();
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // the same file can be picked again after a failure
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) {
      toast("Choose a JPEG, PNG or WebP photo.", "danger");
      return;
    }
    if (file.size > PHOTO_MAX) {
      toast("That photo is over 2 MB. Choose a smaller one.", "danger");
      return;
    }
    setUploading(true);
    try {
      fill(await uploadTestimonialAvatar(file));
      toast("Photo added. It's with our team for review.");
    } catch (err) {
      toast(err.message || "Couldn't upload that photo.", "danger");
    } finally {
      setUploading(false);
    }
  }

  async function withdraw() {
    setConfirm(null);
    setSaving(true);
    try {
      await withdrawTestimonial();
      setT(null);
      setName(userName);
      setTitle("");
      setQuote("");
      setConsent(false);
      setErrors({});
      setFormError("");
      toast("Removed from the website.");
    } catch (err) {
      toast(err.message || "Couldn't remove it. Try again.", "danger");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel-card tm-panel">
      <header className="card-head">
        <h2>Share your experience</h2>
        <p>A testimonial for the Ardena website</p>
      </header>

      {loading ? (
        <p className="side-hint">Loading…</p>
      ) : loadError ? (
        <p className="form-error">{loadError}</p>
      ) : (
        <>
          {banner ? (
            <div className={`tm-banner is-${banner.tone}`} role="status">
              <strong>{banner.title}</strong>
              {t.status === "rejected" && t.rejection_note && <p>{t.rejection_note}</p>}
              {banner.note && <p>{banner.note}</p>}
            </div>
          ) : (
            <p className="side-hint tm-pitch">
              Tell other car-hire businesses how Ardena helps you. We&apos;ll show it on our website once our team has
              read it.
            </p>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="tm-name">Your name</label>
                <input id="tm-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
                {errors.name && <p className="form-error">{errors.name}</p>}
              </div>
              <div className="field">
                <label htmlFor="tm-title">Your role · optional</label>
                <input
                  id="tm-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={80}
                  placeholder="Operations Manager"
                />
                {errors.title && <p className="form-error">{errors.title}</p>}
              </div>
              <div className="field form-full">
                <label htmlFor="tm-quote">Testimonial</label>
                <textarea
                  id="tm-quote"
                  rows="4"
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                  placeholder="What changed for your business after you started using Ardena?"
                  aria-describedby="tm-count"
                />
                <p id="tm-count" className={"field-note tm-count" + (length > QUOTE_MAX ? " is-over" : "")}>
                  <span>
                    {length} / {QUOTE_MAX}
                  </span>
                  <span>at least {QUOTE_MIN}</span>
                </p>
                {errors.quote && <p className="form-error">{errors.quote}</p>}
              </div>
              <div className="field form-full">
                <label>Photo · optional</label>
                <div className="logo-uploader">
                  <span className="logo-avatar tm-avatar">
                    {t?.avatar_url ? (
                      <img src={t.avatar_url} alt="Your testimonial photo" />
                    ) : (
                      <span className="logo-initial">{initials(name) || "?"}</span>
                    )}
                  </span>
                  <div className="logo-actions">
                    <p className="logo-hint">
                      {t ? "JPEG, PNG or WebP, up to 2 MB." : "Add a photo after you've sent it for review."}
                    </p>
                    {t && (
                      <div className="logo-buttons">
                        <button type="button" className="btn btn-ghost logo-btn" disabled={uploading || saving} onClick={pickPhoto}>
                          {uploading ? "Uploading…" : t.avatar_url ? "Change" : "Upload"}
                        </button>
                      </div>
                    )}
                    <input ref={fileRef} type="file" accept={PHOTO_TYPES.join(",")} className="logo-input" onChange={handlePhoto} />
                  </div>
                </div>
              </div>
              <div className="field form-full">
                <label className="check-line tm-consent">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                  Ardena may publish this on its website, with my name, role, business name and photo.
                </label>
                {errors.consent && <p className="form-error">{errors.consent}</p>}
                <p className="field-note">Shown as: {t?.business_name || business.name || "your business name"}</p>
              </div>
            </div>

            {formError && <p className="form-error">{formError}</p>}

            {confirm === "save" || confirm === "photo" ? (
              <div className="confirm-inline tm-confirm">
                {OFF_SITE}
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => {
                    if (confirm === "save") save();
                    else {
                      setConfirm(null);
                      fileRef.current?.click();
                    }
                  }}
                >
                  Continue
                </button>
                <button type="button" className="icon-btn" onClick={() => setConfirm(null)}>
                  Cancel
                </button>
              </div>
            ) : confirm === "withdraw" ? (
              <div className="confirm-inline tm-confirm">
                Remove your testimonial from the website? Your photo is deleted too.
                <button type="button" className="icon-btn danger" onClick={withdraw}>
                  Remove
                </button>
                <button type="button" className="icon-btn" onClick={() => setConfirm(null)}>
                  Keep it
                </button>
              </div>
            ) : (
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Saving…" : t ? (t.status === "rejected" ? "Send for review" : "Save changes") : "Send for review"}
                </button>
                {t && (
                  <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => setConfirm("withdraw")}>
                    Remove from the website
                  </button>
                )}
              </div>
            )}
          </form>
        </>
      )}
    </section>
  );
}
