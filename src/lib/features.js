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
