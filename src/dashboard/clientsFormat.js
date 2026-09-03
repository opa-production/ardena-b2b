/* Verification state → chip class, for wherever a client is shown.
   Lives here rather than in Clients.jsx so the client detail page can read it
   without importing a whole screen — and, now that routes are code-split,
   without pulling that screen's chunk along behind it. */
export const VERIF_CHIP = {
  Verified: "active",
  Pending: "pending",
  "Not found": "cancelled",
  Mismatch: "cancelled",
  Failed: "cancelled",
};
