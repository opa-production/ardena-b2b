import { useEffect, useState } from "react";
import { fetchPublicTestimonials } from "../lib/api";

/* Testimonial wall for the landing page.

   A handful of quotes sit still in a grid. Once there are enough of them to
   crowd the band (MARQUEE_MIN), they become a single row that drifts
   sideways, rendered twice back to back so translating by -50% loops without
   a seam. Hovering or focusing the row pauses it so a quote can actually be
   read.

   The second copy of the row is aria-hidden: screen readers get every quote
   exactly once. Under prefers-reduced-motion the row stops and becomes
   horizontally scrollable instead (see landingArdena.css).

   TestimonialsSection fetches the approved list (docs/testimonials-api.md)
   and renders nothing at all, heading included, while it loads, when the
   list is empty, or when the endpoint fails, so the landing page never
   shows an empty band. */

const MARQUEE_MIN = 5;
// seconds a single card takes to cross, so speed stays constant however many
// quotes the API returns
const SECONDS_PER_CARD = 7;
// cards per set; at ~360px each that clears a 2560px screen
const MIN_SET = 8;
// colour for the initials fallback, picked from the id so a person keeps
// theirs in both copies of the loop and across reloads
const ACCENTS = ["#007ffa", "#f59e0b", "#10b981", "#f43f5e", "#8b5cf6", "#06b6d4"];

function accentFor(id) {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) | 0;
  return ACCENTS[Math.abs(h) % ACCENTS.length];
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function Avatar({ name, src, color }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span
        className="ard-tm-avatar ard-tm-avatar--initials"
        style={{ background: color }}
        aria-hidden="true"
      >
        {initials(name)}
      </span>
    );
  }
  return (
    <img
      className="ard-tm-avatar"
      src={src}
      alt=""
      loading="lazy"
      width="48"
      height="48"
      onError={() => setFailed(true)}
    />
  );
}

function TestimonialCard({ t }) {
  return (
    <figure className="ard-tm-card">
      <span className="ard-tm-mark" aria-hidden="true">
        &ldquo;
      </span>
      {t.highlight && <span className="ard-tm-chip">{t.highlight}</span>}
      <blockquote className="ard-tm-quote">{t.quote}</blockquote>
      <figcaption className="ard-tm-person">
        <Avatar name={t.name} src={t.avatar} color={accentFor(t.id)} />
        <span className="ard-tm-who">
          <span className="ard-tm-name">{t.name}</span>
          {(t.title || t.business) && (
            <span className="ard-tm-role">
              {t.title}
              {t.title && t.business && ", "}
              {t.business && <strong>{t.business}</strong>}
            </span>
          )}
        </span>
      </figcaption>
    </figure>
  );
}

function MarqueeRow({ items }) {
  // a short row would leave a gap on wide screens before the copy comes
  // round, so repeat it until one set comfortably outruns the viewport
  const filled = [];
  while (filled.length < MIN_SET) filled.push(...items);
  const style = { "--tm-duration": `${filled.length * SECONDS_PER_CARD}s` };

  return (
    <div className="ard-tm-row">
      <div className="ard-tm-track" style={style}>
        <div className="ard-tm-set">
          {filled.map((t, i) => (
            <div
              className="ard-tm-slot"
              key={`${t.id}-${i}`}
              aria-hidden={i >= items.length || undefined}
            >
              <TestimonialCard t={t} />
            </div>
          ))}
        </div>
        <div className="ard-tm-set" aria-hidden="true">
          {filled.map((t, i) => (
            <div className="ard-tm-slot" key={`${t.id}-${i}`}>
              <TestimonialCard t={t} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Testimonials({ items }) {
  if (!items?.length) return null;

  if (items.length < MARQUEE_MIN) {
    return (
      <div className="ard-tm-grid">
        {items.map((t) => (
          <TestimonialCard t={t} key={t.id} />
        ))}
      </div>
    );
  }

  return (
    <div className="ard-tm-marquee">
      <MarqueeRow items={items} />
    </div>
  );
}

// API rows → the card's shape; rows missing a name or quote are dropped
function fromApi(row) {
  return {
    id: row.id,
    name: row.name,
    title: row.title || "",
    business: row.business_name || "",
    avatar: row.avatar_url || null,
    quote: row.quote,
    highlight: row.highlight || null,
  };
}

export function TestimonialsSection() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let live = true;
    fetchPublicTestimonials()
      .then((data) => {
        const rows = Array.isArray(data) ? data : data?.items || [];
        if (live) setItems(rows.filter((r) => r?.name && r?.quote).map(fromApi));
      })
      .catch(() => {
        /* no testimonials yet, or the endpoint is down: stay hidden */
      });
    return () => {
      live = false;
    };
  }, []);

  if (!items.length) return null;

  return (
    <section className="ard-section ard-section--white ard-tm-section">
      <div className="ard-container">
        <h2 className="ard-section-title">What operators say</h2>
      </div>
      <Testimonials items={items} />
    </section>
  );
}
