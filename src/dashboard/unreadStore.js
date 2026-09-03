/* The two unread badges — notifications and support — polled once for the
 * whole dashboard.
 *
 * They used to be fetched in two places: the layout, on a 60-second poll for
 * the sidebar badges, and QuickLinks on the Overview, which asked for the
 * support count again on its own. Two requests for one number, and on a
 * backend where that endpoint answers in ~1.8s the second one is pure wait.
 *
 * Same shape as the other stores: module state, a listener set, and
 * useSyncExternalStore on the components. The poll belongs to the layout —
 * `startUnreadPolling` is called once there — so a component reading the
 * counts never triggers a fetch of its own.
 */
import { fetchUnreadCount, fetchSupportUnread } from "../lib/api";

const POLL_MS = 60_000;

let state = { notifications: 0, support: 0 };
const listeners = new Set();
let ticker = null;
let inFlight = false;

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getUnread() {
  return state;
}

/** Fetch both counts once. Safe to call at any time; overlapping calls are
 *  collapsed, so a visibility change landing on top of a tick costs nothing. */
export async function refreshUnread() {
  if (inFlight) return;
  inFlight = true;
  try {
    const [notifs, support] = await Promise.allSettled([
      fetchUnreadCount(),
      fetchSupportUnread(),
    ]);
    const next = {
      notifications:
        notifs.status === "fulfilled" ? notifs.value?.unread_count ?? 0 : state.notifications,
      support:
        support.status === "fulfilled" ? support.value?.unread_count ?? 0 : state.support,
    };
    if (next.notifications !== state.notifications || next.support !== state.support) {
      state = next;
      emit();
    }
  } finally {
    inFlight = false;
  }
}

/** Start the shared 60s poll. Returns a stop function. Polling pauses while
 *  the tab is hidden — nobody is looking at a badge in a background tab — and
 *  catches up the moment it comes back. */
export function startUnreadPolling() {
  refreshUnread();
  if (ticker) return () => {};

  ticker = setInterval(() => {
    if (!document.hidden) refreshUnread();
  }, POLL_MS);

  const onVisible = () => {
    if (!document.hidden) refreshUnread();
  };
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    clearInterval(ticker);
    ticker = null;
    document.removeEventListener("visibilitychange", onVisible);
  };
}

/** Clear the badges without waiting for the next poll — after marking a
 *  thread or the notification list read. */
export function setUnread(patch) {
  state = { ...state, ...patch };
  emit();
}
