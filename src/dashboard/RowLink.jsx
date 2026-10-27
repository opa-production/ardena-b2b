import { Link, useNavigate } from "react-router-dom";

/* Pressable table rows: the whole row opens the record, instead of a "View"
   button on every line. Spread `useRowLink()(to)` onto the <tr>, and put a
   <RowGo> in the row's last cell: it is the keyboard and screen-reader way
   in, and the chevron that slides in on hover so the row reads as clickable.

   A click on anything interactive inside the row (a button, another link, a
   toggle) is left to that control, so row actions keep working. */

const INTERACTIVE = "a, button, input, select, textarea, label, [role='button'], [role='switch']";

export function useRowLink() {
  const navigate = useNavigate();
  return (to) => ({
    className: "row-link",
    onClick: (e) => {
      if (e.defaultPrevented || e.target.closest(INTERACTIVE)) return;
      // leave a text selection alone rather than navigating away from it
      if (window.getSelection?.().toString()) return;
      if (e.metaKey || e.ctrlKey) window.open(to, "_blank", "noopener");
      else navigate(to);
    },
  });
}

export function RowGo({ to, label }) {
  return (
    <Link className="row-go" to={to} aria-label={label} title={label}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}
