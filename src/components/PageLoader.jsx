import "./pageloader.css";

/* A centred wait for a page (or a panel) whose data hasn't arrived yet: the
   diamond loader, and one plain sentence saying what is being fetched, so the
   wait reads as something happening rather than a stuck screen.

   `compact` drops the vertical padding for use inside a card. */
export default function PageLoader({ message = "Getting things ready for you…", compact = false }) {
  return (
    <div className={"page-loader" + (compact ? " page-loader--compact" : "")} role="status" aria-live="polite">
      <span className="loader" aria-hidden="true" />
      <p className="page-loader-msg">{message}</p>
    </div>
  );
}
