/* Cleaning the model's prose for a chat bubble that renders plain text.
 *
 * The server streams markdown out of habit — **bold**, `code`, "- " bullets,
 * the occasional "###" heading and em dash. None of that is rendered here, so
 * left alone it shows up as literal punctuation in the answer. Rather than
 * pull in a markdown renderer for a two-sentence reply, the markers are
 * stripped and the few that carry meaning (a bullet, a line break) are turned
 * into their plain-text equivalent.
 *
 * This runs on every token of a streaming reply, so it stays a handful of
 * regexes over a short string — and it has to tolerate half-written markers,
 * since "**fl" arrives before "**fleet**" does.
 */

/* A fence or an unterminated one mid-stream: the language tag and the ticks
   are noise either way, the code inside is what the reader wants. */
const FENCE = /```[a-z]*\n?/gi;

/* Bold/italic. Longest marker first so "**x**" doesn't get eaten a star at a
   time, and both are only closed pairs — a lone trailing "*" is a marker
   still being streamed and is dropped at the end instead. */
const BOLD = /\*\*([^*]+)\*\*/g;
const BOLD_ALT = /__([^_]+)__/g;
const ITALIC = /(^|[\s(])\*([^*\n]+)\*/g;
const CODE = /`([^`\n]+)`/g;

/* A dangling opener from a marker the stream hasn't closed yet. Without this
   the bubble flashes "**" for a moment on every bolded phrase. */
const TRAILING = /(\*{1,2}|_{1,2}|`)$/;

/** Strip markdown from one line and normalise its dashes. */
function cleanLine(line) {
  let out = line
    .replace(/^\s{0,3}#{1,6}\s+/, "") // heading → plain sentence
    .replace(/^\s*>\s?/, "") // blockquote
    .replace(BOLD, "$1")
    .replace(BOLD_ALT, "$1")
    .replace(ITALIC, "$1$2")
    .replace(CODE, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1"); // [label](url) → label

  // Bullets: the dash itself is the thing that reads as debris, so it becomes
  // a real bullet. Numbered lists already read fine and are left alone.
  out = out.replace(/^(\s*)[-*+]\s+/, "$1• ");

  // Em and en dashes. Spaced, they stand in for a comma; unspaced (a range,
  // "9—5") a plain hyphen is what was meant.
  out = out.replace(/\s+[—–]\s+/g, ", ").replace(/[—–]/g, "-");

  return out.replace(TRAILING, "").trimEnd();
}

/**
 * Clean a whole reply and split it into the lines the bubble renders.
 * Horizontal rules and the blank lines around them are dropped, so a reply
 * never opens or closes on empty space.
 */
export function cleanReply(text) {
  if (!text) return [];
  return text
    .replace(FENCE, "")
    .split("\n")
    .filter((l) => !/^\s*([-*_])\s*\1\s*\1[\s\1]*$/.test(l)) // --- rules
    .map(cleanLine)
    .filter((l, i, all) => l !== "" || (i > 0 && i < all.length - 1 && all[i - 1] !== ""))
    .join("\n")
    .trim()
    .split("\n");
}
