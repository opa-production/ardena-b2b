import ScaleLoader from "./ScaleLoader";
import "./scaleloader.css";

/* A centred, page-level wait.
 *
 * For work the person has to wait on rather than work happening in a corner:
 * a registry lookup, an STK push they are about to answer on their phone.
 * Those take seconds, and a spinner tucked inside the button that started them
 * asks the reader to find it. This puts the loader in the middle of the screen
 * where the eye already is, and the scrim stops anything else being clicked
 * while the answer is outstanding.
 *
 * Renders above modals (z-index sits over .modal-overlay), because the two
 * flows that use it both start from inside one.
 */
export default function LoadingOverlay({ label, note, onCancel, cancelLabel = "Stop waiting" }) {
  return (
    <div className="load-overlay" role="alertdialog" aria-live="assertive" aria-label={label}>
      <div className="load-panel">
        <ScaleLoader size={38} width={5} gap={3} label={label} />
        <p className="load-label">{label}</p>
        {note && <p className="load-note">{note}</p>}
        {onCancel && (
          <button type="button" className="btn btn-ghost load-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
        )}
      </div>
    </div>
  );
}
