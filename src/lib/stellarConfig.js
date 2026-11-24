/* Where the Stellar pilot's API lives. No imports on purpose: both lib/api.js
   and dashboard/stellarStore.js read this at load time, and they import each
   other, so it can't sit in either of them.

   Staging while the pilot runs. Set VITE_STELLAR_API_BASE_URL to override,
   e.g. to the main API URL once Stellar ships to production, which turns the
   separate pilot sign-in off. */
const MAIN_API = (import.meta.env.VITE_API_BASE_URL || "https://api.ardena.xyz/api/v1/b2b").replace(/\/$/, "");
const PILOT_API = "https://testing.ardena.xyz/api/v1/b2b";

export const STELLAR_BASE = (import.meta.env.VITE_STELLAR_API_BASE_URL || PILOT_API).replace(/\/$/, "");

/** True when the pilot runs on another backend (needs its own sign-in). */
export const STELLAR_SPLIT = STELLAR_BASE !== MAIN_API;

/** Shown in the pilot notice: "testing.ardena.xyz". */
export const STELLAR_HOST = STELLAR_BASE.replace(/^https?:\/\//, "").split("/")[0];
