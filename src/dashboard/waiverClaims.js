/* Damage-waiver claim wording shared by the booking's waiver card and the
   Damage claims console (stellar.md §1.4, §1.5). */

export const CLAIM_STATUS_LABEL = {
  awaiting_business: "Awaiting your approval",
  pending: "With Ardena",
  approved: "Approved",
  rejected: "Rejected",
};

/* → the st-pill colour */
export const CLAIM_STATUS_PILL = {
  awaiting_business: "amber",
  pending: "blue",
  approved: "green",
  rejected: "red",
};

export const WAIVER_STATUS_LABEL = {
  held: "Fee held on Stellar",
  claimed: "Frozen for a claim",
  paid_out: "Claim paid",
  rejected: "Claim turned down",
  settled: "Settled to Ardena",
  refunded: "Fee refunded",
};

/** Who turned a rejected claim down, in words. */
export function decidedByLabel(decidedBy) {
  if (decidedBy === "business") return "Your owner or finance turned it down";
  if (decidedBy === "ardena") return "Ardena decided";
  if (decidedBy === "expired") return "Not reviewed within 7 days";
  return null;
}

/** What to tell the person who just filed, from the claim's status. */
export function filedMessage(status) {
  return status === "awaiting_business"
    ? "Claim filed. Sent to your owner/finance for approval."
    : "Claim filed. Sent to Ardena.";
}
