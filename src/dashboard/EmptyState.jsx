import "./empty.css";

/* Fresh-business empty state, in two strengths.
 *
 * `minimal` is one quiet line and nothing else. It is what a card inside a
 * working page gets: an icon in a circle plus a sentence of guidance is fine
 * once, but the Overview has four cards waiting on their first data at the
 * same time, and four of those read as clutter rather than help.
 *
 * The full treatment — icon, title, a line of guidance and a button — is for
 * a page that is empty end to end and has somewhere to send you. In practice
 * that means: if there is an `action`, it earns the furniture. */
export default function EmptyState({ icon, title, message, action, compact = false, minimal = false }) {
  if (minimal) return <p className="empty-line">{title}</p>;

  return (
    <div className={"empty-state" + (compact ? " compact" : "")}>
      {icon && <span className="empty-state-icon">{icon}</span>}
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

/* A small set of line icons pages can pass in. */
export const EMPTY_ICONS = {
  fleet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17H3v-5l2-5h11l3 5h1a1 1 0 011 1v4h-2" />
      <circle cx="7.5" cy="17.5" r="1.8" />
      <circle cx="17.5" cy="17.5" r="1.8" />
      <path d="M9.5 17.5h5" />
    </svg>
  ),
  bookings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M8 2v4M16 2v4M3 10h18" />
    </svg>
  ),
  clients: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9.5" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13A4 4 0 0118 7" />
    </svg>
  ),
  verification: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  payments: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  ),
  notifications: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 01-3.4 0" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M7 15l3-4 3 2 4-6" />
    </svg>
  ),
};
