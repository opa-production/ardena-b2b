/* Feature flags for work that is built but deliberately not shipped yet.
   Each one is a single switch so turning the feature back on is a one-line
   change rather than an archaeology exercise. */

/**
 * Connecting an existing Ardena consumer-app host account to a workspace.
 *
 * Deferred to a later phase, so new workspaces are not offered it at all —
 * neither the Settings panel nor the sign-in suggestion dialog. Workspaces
 * that are *already* linked keep the Settings panel, because they still need
 * to see the link's status and be able to release it.
 *
 * Flip to `true` to bring the whole flow back; nothing else needs changing.
 */
export const HOST_ACCOUNT_LINKING = false;

/**
 * Everything that exists only because of the Ardena consumer app.
 *
 * The first public launch is the B2B dashboard standing on its own: a rental
 * business runs its fleet, bookings, clients, staff and payments without any
 * connection to the consumer marketplace. The B2C half — listing vehicles,
 * renter messages, renter reviews, deposit claims on app bookings, and app
 * earnings and withdrawals — is built but is not part of that launch.
 *
 * This is a harder gate than `business.appLinked`: a workspace that arrives
 * with `app_linked: true` from the backend still sees none of it while this is
 * false, so a stale server flag cannot leak a half-finished surface into a
 * launch build.
 *
 * Flip to `true` to bring the whole B2C side back. What it gates:
 *   · nav       — Reviews, Claims & requests (see nav.js `appOnly`)
 *   · routes    — /reviews, /claims, /renter-messages, /fleet/:plate/marketplace
 *   · Fleet     — the per-vehicle Marketplace action (shown disabled meanwhile)
 *   · Finances  — the app-earnings tab, commission figures and withdrawals
 *   · Support   — the renter-messages cross-links
 */
export const B2C_MARKETPLACE = false;

/**
 * Live vehicle tracking.
 *
 * The screens are built and read from `trackingStore`, but no GPS hardware is
 * integrated yet and Ardena fits the units in person, so a business that turned
 * it on today would sit watching a map that never updates. Shown as a
 * coming-soon page until there is a connector behind it.
 */
export const VEHICLE_TRACKING = false;
