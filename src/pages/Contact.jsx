import { useState } from "react";
import ArdNav from "../components/ArdNav";
import ArdFooter from "../components/ArdFooter";
import Dropdown from "../components/Dropdown";
import usePageTitle from "../hooks/usePageTitle";
import useReveal from "../hooks/useReveal";
import { SOCIALS } from "../components/socials";
import contactImg from "../assets/contact.jpg";
import "./landingArdena.css";

function Reveal({ as: Tag = "div", className = "", children }) {
  const ref = useReveal();
  return (
    <Tag ref={ref} className={`${className} reveal-group`.trim()}>
      {children}
    </Tag>
  );
}

export default function Contact() {
  usePageTitle("Contact");
  const [sent, setSent] = useState(false);
  const [topic, setTopic] = useState("Sales & demos");

  function handleSubmit(e) {
    e.preventDefault();
    setSent(true);
    e.target.reset();
  }

  return (
    <div className="ard">
      <ArdNav />

      <main>
        {/* ---- Hero: the photograph is the background.
               It is a black handset on white, subject hard left. Mirrored so
               the handset sits opposite the copy rather than under it, and
               laid behind a white gradient that keeps the type on clean ground
               however the frame crops. No dark overlay: the picture is almost
               entirely white, so dimming it to carry light text would throw
               away the photograph and the page's white/black rhythm with
               it. ---- */}
        <section className="ct-hero">
          <div className="ct-hero-bg" aria-hidden="true">
            <img src={contactImg} alt="" fetchPriority="high" decoding="async" />
          </div>
          <div className="ct-hero-copy">
            <h1 className="ct-title">Talk to us.</h1>
            <p className="ct-sub">
              Whether you run five cars or five hundred, we&apos;d love to show
              you around or help you get unstuck. We reply within one business
              day.
            </p>
          </div>
        </section>

        {/* ---- Form ---- */}
        <section className="ard-section ard-section--light" id="email">
          <div className="ard-container">
            <div className="ct-split">
              <Reveal className="ard-intro">
                <p className="ard-label">▪ SEND A MESSAGE</p>
                <h2 className="ard-heading">Drop us an email</h2>
                <p className="ard-desc">
                  Fill in the form and it lands straight in our inbox, no
                  ticket numbers, no bots. A real person replies within one
                  business day.
                </p>
              </Reveal>

              <form
                className="ct-form"
                onSubmit={handleSubmit}
                onChange={() => setSent(false)}
              >
                <div className="ct-row">
                  <div className="field">
                    <label htmlFor="c-name">Your name</label>
                    <input id="c-name" type="text" placeholder="Wanjiku Kamau" required />
                  </div>
                  <div className="field">
                    <label htmlFor="c-business">Business name</label>
                    <input id="c-business" type="text" placeholder="Acme Car Hire" />
                  </div>
                </div>
                <div className="ct-row">
                  <div className="field">
                    <label htmlFor="c-email">Work email</label>
                    <input id="c-email" type="email" placeholder="you@business.co.ke" required />
                  </div>
                  <div className="field">
                    <label htmlFor="c-phone">Phone</label>
                    <input id="c-phone" type="tel" placeholder="0700 000 000" />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="c-topic">What&apos;s this about?</label>
                  <Dropdown
                    id="c-topic"
                    value={topic}
                    onChange={setTopic}
                    options={["Sales & demos", "Support", "Partnerships", "Something else"]}
                  />
                </div>
                <div className="field">
                  <label htmlFor="c-message">Message</label>
                  <textarea
                    id="c-message"
                    rows="4"
                    placeholder="Tell us about your fleet and what you need"
                    required
                  />
                </div>
                <div className="ct-actions">
                  <button type="submit" className="ard-btn ard-btn--ink">
                    Send message
                  </button>
                  {sent && (
                    <p className="ct-sent" role="status">
                      Thanks, we&apos;ve got it. Expect a reply within one
                      business day.
                    </p>
                  )}
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* ---- Socials ---- */}
        <section className="ard-section ard-section--cream" id="socials">
          <div className="ard-container">
            <h2 className="ard-section-title">Find us on socials</h2>
            <div className="ct-socials">
              {SOCIALS.map((s) => (
                <a
                  key={s.name}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.name}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>

      <ArdFooter />
    </div>
  );
}
