import { useState } from "react";
import { verifyHandoverCode } from "../lib/api";

/* The renter's 6-digit pickup/return code, with a Verify button beside it.

   Checking the code first means staff know they have the right renter before
   they fill in odometer, fuel and photos. Verifying records nothing: the input
   keeps its `name`, so the check-out/check-in form still sends the code and the
   backend checks it again there. A wrong code here counts toward the same
   five-try lockout, so the button isn't a free guessing channel. */
export default function HandoverCodeField({ id, name, label, bookingRef, phase, note }) {
  const [value, setValue] = useState("");
  const [state, setState] = useState({ kind: "idle", msg: "" });

  async function verify() {
    if (value.length !== 6 || state.kind === "checking") return;
    setState({ kind: "checking", msg: "" });
    try {
      await verifyHandoverCode(bookingRef, phase, value);
      setState({ kind: "ok", msg: "Code verified. This is the right renter." });
    } catch (err) {
      setState({ kind: "error", msg: err.message || "Couldn't check that code" });
    }
  }

  return (
    <div className="field ho-code-field">
      <label htmlFor={id}>{label}</label>
      <div className="ho-code-row">
        <input
          id={id}
          name={name}
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          autoComplete="off"
          placeholder="6 digits"
          required
          value={value}
          aria-describedby={`${id}-status`}
          onChange={(e) => {
            setValue(e.target.value.replace(/\D/g, ""));
            setState({ kind: "idle", msg: "" });
          }}
          onKeyDown={(e) => {
            // Enter checks the code instead of submitting the whole handover.
            if (e.key === "Enter") {
              e.preventDefault();
              verify();
            }
          }}
        />
        <button
          type="button"
          className={`btn ho-verify-btn${state.kind === "ok" ? " is-ok" : ""}`}
          onClick={verify}
          disabled={value.length !== 6 || state.kind === "checking" || state.kind === "ok"}
        >
          {state.kind === "checking" ? "Checking…" : state.kind === "ok" ? "✓ Verified" : "Verify"}
        </button>
      </div>
      <p
        id={`${id}-status`}
        className={`field-note ho-code-status is-${state.kind}`}
        role="status"
        aria-live="polite"
      >
        {state.msg || note}
      </p>
    </div>
  );
}
