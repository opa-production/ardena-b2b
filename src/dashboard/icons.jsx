// Minimal 18px stroke icons for the sidebar.
const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const ICONS = {
  overview: (
    <svg {...base}>
      <rect x="3" y="3" width="8" height="8" rx="2" />
      <rect x="13" y="3" width="8" height="5" rx="2" />
      <rect x="13" y="10" width="8" height="11" rx="2" />
      <rect x="3" y="13" width="8" height="8" rx="2" />
    </svg>
  ),
  fleet: (
    <svg {...base}>
      <path d="M5 11l1.5-4.5A2 2 0 018.4 5h7.2a2 2 0 011.9 1.5L19 11" />
      <path d="M4 11h16a1 1 0 011 1v4a1 1 0 01-1 1h-1" />
      <path d="M3 12v4a1 1 0 001 1h1" />
      <circle cx="7.5" cy="17" r="1.8" />
      <circle cx="16.5" cy="17" r="1.8" />
    </svg>
  ),
  bookings: (
    <svg {...base}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
      <path d="M9 15l2 2 4-4" />
    </svg>
  ),
  clients: (
    <svg {...base}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
      <path d="M16 5.5a3 3 0 010 5.5M18.5 20c-.3-2.2-1.3-3.8-2.8-4.6" />
    </svg>
  ),
  verification: (
    <svg {...base}>
      <path d="M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  payments: (
    <svg {...base}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10.5h18" />
      <path d="M7 15h4" />
    </svg>
  ),
  staff: (
    <svg {...base}>
      <circle cx="12" cy="7.5" r="3.2" />
      <path d="M5.5 20.5c.7-3.6 3.2-5.5 6.5-5.5s5.8 1.9 6.5 5.5" />
    </svg>
  ),
  notifications: (
    <svg {...base}>
      <path d="M6 9.5a6 6 0 0112 0c0 5 2 6.5 2 6.5H4s2-1.5 2-6.5z" />
      <path d="M10 19.5a2.2 2.2 0 004 0" />
    </svg>
  ),
  settings: (
    <svg {...base}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 00-2-1.2L14 3h-4l-.5 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.6A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-1a7 7 0 002 1.2L10 21h4l.5-2.6a7 7 0 002-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" />
    </svg>
  ),
};
