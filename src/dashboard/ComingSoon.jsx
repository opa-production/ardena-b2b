import comingArt from "../assets/coming.svg";
import "./coming.css";

/* The one way this dashboard says "not yet".
 *
 * Every page that is built but switched off used to invent its own version of
 * this — a dot and a sentence here, an empty-state card there — so the same
 * message read as a different kind of nothing on each screen. One component,
 * one illustration, one shape: what it is, when it lands, and where to go in
 * the meantime.
 *
 * The illustration is decorative and carries `alt=""`: the heading below it
 * already says everything it says, and a screen reader announcing "under
 * construction" twice is worse than not announcing it at all.
 */
export default function ComingSoon({ title, message, action }) {
  return (
    <div className="coming">
      <img className="coming-art" src={comingArt} alt="" />
      <h2 className="coming-title">{title} is coming soon</h2>
      {message && <p className="coming-note">{message}</p>}
      {action && <div className="coming-action">{action}</div>}
    </div>
  );
}
