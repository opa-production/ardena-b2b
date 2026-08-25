import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ICONS } from "./icons";
import { fetchSupportUnread } from "../lib/api";
import useRole from "../hooks/useRole";

/* Billing and support have no sidebar entry — they live only in the tenant
   menu behind the avatar, which is easy to miss. These two icons match the
   ones used there so the same destination looks the same in both places. */
const ICON_BILLING = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
  </svg>
);

const ICON_SUPPORT = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M9.1 9a3 3 0 015.8 1c0 2-3 2.5-3 4" />
    <path d="M12 17.5h.01" />
  </svg>
);

/* The three the business asked to have surfaced come first; the rest follow
   in the order someone setting up a workspace tends to need them.
   `requires` is a capability from hooks/useRole.js — a Booking agent should
   not be shown a billing tile that answers 403. */
const LINKS = [
  {
    key: "billing",
    to: "/dashboard/billing",
    name: "Billing",
    desc: "Invoices, payments and receipts",
    icon: ICON_BILLING,
    requires: "manageBilling",
  },
  {
    key: "support",
    to: "/dashboard/support",
    name: "Support",
    desc: "Message the Ardena team",
    icon: ICON_SUPPORT,
    badge: "support",
  },
  {
    key: "tracking",
    to: "/dashboard/tracking",
    name: "Vehicle tracking",
    desc: "Live location of your connected vehicles",
    icon: ICONS.tracking,
  },
  {
    key: "verification",
    to: "/dashboard/verification",
    name: "Verification",
    desc: "Renter ID, licence and liveness checks",
    icon: ICONS.verification,
  },
  {
    key: "staff",
    to: "/dashboard/staff",
    name: "Staff & roles",
    desc: "Invite your team and set their access",
    icon: ICONS.staff,
  },
  {
    key: "payments",
    to: "/dashboard/payments",
    name: "Finances",
    desc: "Payments, deposits and payouts",
    icon: ICONS.payments,
    requires: "manageBilling",
  },
];

/**
 * Everything a business regularly needs from its profile, in one grid.
 *
 * Billing, support and tracking are reachable only from the tenant menu, so
 * without this they are three clicks and a guess away from the page people
 * actually land on.
 */
export default function QuickLinks() {
  const { can } = useRole();
  const [supportUnread, setSupportUnread] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchSupportUnread()
      .then((d) => {
        if (alive) setSupportUnread(d?.unread_count || 0);
      })
      .catch(() => {
        /* the badge is a nicety — a failed count just doesn't show one */
      });
    return () => {
      alive = false;
    };
  }, []);

  const links = LINKS.filter((l) => !l.requires || can(l.requires));
  if (links.length === 0) return null;

  return (
    <section className="panel-card">
      <header className="card-head">
        <h2>Quick links</h2>
        <p>The parts of your workspace you'll need most often</p>
      </header>

      <div className="quick-links">
        {links.map((l) => (
          <Link className="quick-link" to={l.to} key={l.key}>
            <span className="quick-link-icon">{l.icon}</span>
            <span className="quick-link-body">
              <span className="quick-link-name">
                {l.name}
                {l.badge === "support" && supportUnread > 0 && (
                  <span className="nav-badge">{supportUnread}</span>
                )}
              </span>
              <span className="quick-link-desc">{l.desc}</span>
            </span>
            <svg
              className="quick-link-caret"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </Link>
        ))}
      </div>
    </section>
  );
}
