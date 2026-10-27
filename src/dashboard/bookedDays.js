/* Which days a car is taken, from its booked ranges (fetchBookedRanges) and
   the owner-blocked days on the availability calendar.

   `full` is every day nothing more can go on: blocked days, every day of a
   daily booking, and the days in the middle of an hourly booking that runs
   past midnight. `part` is the days an hourly booking only holds some hours
   of, with those hours ("09:00–17:00"), so a by-the-hour booking can still
   be made around them. The server's clash check (409) has the last word. */

const isoOf = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function eachDay(a, b, fn) {
  const cur = new Date(`${a}T00:00:00`);
  const stop = new Date(`${b}T00:00:00`);
  while (cur <= stop) {
    fn(isoOf(cur));
    cur.setDate(cur.getDate() + 1);
  }
}

// skipRef: the booking being edited, which mustn't clash with itself
export function takenDays(ranges = [], blocked = [], skipRef = null) {
  const full = new Set(blocked);
  const part = new Map();
  const addPart = (iso, span) => part.set(iso, [...(part.get(iso) || []), span]);

  for (const r of ranges) {
    if (skipRef && r.ref === skipRef) continue;
    if (!r.start_time) {
      eachDay(r.start, r.end, (iso) => full.add(iso));
      continue;
    }
    if (r.start === r.end) {
      addPart(r.start, `${r.start_time}–${r.end_time}`);
      continue;
    }
    addPart(r.start, `${r.start_time}–24:00`);
    eachDay(r.start, r.end, (iso) => {
      if (iso !== r.start && iso !== r.end) full.add(iso);
    });
    if (r.end_time && r.end_time !== "00:00") addPart(r.end, `00:00–${r.end_time}`);
  }
  for (const iso of full) part.delete(iso);
  return { full, part };
}

// Every day in a range is free for a daily booking: nothing at all on it.
export function rangeIsFree(taken, a, b) {
  let free = true;
  eachDay(a, b, (iso) => {
    if (taken.full.has(iso) || taken.part.has(iso)) free = false;
  });
  return free;
}
