/* Last-known list rows, kept so a detail page has something true to draw
 * while its own record is in flight.
 *
 * Clicking a row in a list used to blank the screen: the detail page mounted
 * with nothing, showed a skeleton, and asked the server for a record whose
 * headline fields — the customer, the vehicle, the dates, the status — were
 * already on the screen you just clicked. On a backend answering in the better
 * part of a second that is a second of staring at grey for data nobody
 * actually needed to wait for.
 *
 * So the list hands its rows here on the way past, and the detail page paints
 * from the matching one immediately, then fills in the rest when the full
 * record lands.
 *
 * Two things this deliberately is not:
 *
 *   · a cache. Nothing is served from here instead of fetching — the request
 *     goes out either way, and what comes back always wins. A seed only
 *     decides what is on screen for the second in between.
 *   · a store. There are no subscribers and no invalidation rules: rows are
 *     overwritten whenever a list loads, and the whole thing is dropped when
 *     the session changes hands (see resetLocalCaches in lib/api.js).
 */

const collections = new Map();

/** Remember a list's rows. `key` maps a row to the id its detail route uses. */
export function seedRecords(collection, rows, key) {
  if (!Array.isArray(rows) || rows.length === 0) return;
  const byId = new Map();
  for (const row of rows) {
    const id = key(row);
    if (id != null) byId.set(String(id), row);
  }
  collections.set(collection, byId);
}

/** The row for this id, or null. Callers must treat it as partial: it has
 *  whatever the list needed and nothing more. */
export function getSeed(collection, id) {
  if (id == null) return null;
  return collections.get(collection)?.get(String(id)) || null;
}

export function resetSeeds() {
  collections.clear();
}
