import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setOnApp } from "./fleetStore";
import { toast } from "./toastStore";
import useRole from "../hooks/useRole";
import "./workspace.css";
import "./marketplace.css";

/* The "On Ardena app" switch for one fleet vehicle.

   The switch is on only when renters can actually book the car
   (live_on_marketplace). Every new car is reviewed by Ardena first; while it
   waits the switch stays off and locked, and the chip says "In review" — an
   "on" switch beside "In review" told businesses two different things.

   Turning it on only publishes directly when the listing is already complete.
   Otherwise it opens the editor: there's no useful error to show from a switch,
   and the editor lists exactly what's missing. */

function chipFor(m) {
  if (!m) return null;
  if (m.live) return { cls: "mkt-live", label: "Live" };
  if (m.review === "rejected") return { cls: "mkt-rejected", label: "Changes needed" };
  if (m.status === "visible") return { cls: "mkt-review", label: "In review" };
  if (m.status === "draft") return { cls: "mkt-draft", label: "Draft" };
  return null; // hidden: the switch being off says it
}

export default function MarketplaceToggle({ vehicle, showLabel = false }) {
  const navigate = useNavigate();
  const { can } = useRole();
  const [busy, setBusy] = useState(false);
  const m = vehicle.marketplace;
  const on = Boolean(m?.live);
  // Submitted and waiting on Ardena: nothing to switch until the review lands.
  const inReview = m?.status === "visible" && !m?.live && m?.review !== "rejected";
  const editor = `/dashboard/fleet/${encodeURIComponent(vehicle.plate)}/marketplace`;
  const chip = chipFor(m);

  async function flip(next) {
    if (next && !m?.ready_to_publish) {
      navigate(editor);
      return;
    }
    setBusy(true);
    try {
      const listing = await setOnApp(vehicle.plate, next);
      toast(
        !next
          ? `${vehicle.plate} is off the Ardena app.`
          : listing?.live_on_marketplace
            ? `${vehicle.plate} is live on the Ardena app.`
            : `${vehicle.plate} submitted. Ardena reviews new listings before renters see them.`
      );
    } catch (err) {
      // Most likely an unverified workspace or a field that changed since the
      // list loaded — the editor explains either.
      toast(err.message);
      if (next) navigate(editor);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span
      className={`mkt-toggle${showLabel ? " mkt-toggle-feature" : ""}${
        m?.live ? " is-live" : on ? " is-on" : ""
      }`}
    >
      {can("manageListing") && (
        <label
          className="switch"
          title={
            inReview
              ? "Ardena is reviewing this car. It switches on once approved."
              : on
              ? "Take off the Ardena app"
              : m?.ready_to_publish
                ? "List on the Ardena app"
                : "Set up the Ardena app listing"
          }
        >
          <input
            type="checkbox"
            checked={on}
            disabled={busy || inReview}
            onChange={(e) => flip(e.target.checked)}
            aria-label={`List ${vehicle.plate} on the Ardena app`}
          />
          <i />
        </label>
      )}
      {showLabel && <span className="mkt-toggle-label">On Ardena app</span>}
      {chip && <span className={`chip ${chip.cls}`}>{chip.label}</span>}
    </span>
  );
}
