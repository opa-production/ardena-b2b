#!/usr/bin/env node
/**
 * Remove em and en dashes from everything a user can read.
 *
 *   node scripts/strip-dashes.mjs           # report, changes nothing
 *   node scripts/strip-dashes.mjs --write   # apply
 *   node scripts/strip-dashes.mjs --write --comments   # code comments too
 *
 * Why not a find-and-replace: an em dash is punctuation in prose, but the same
 * character sits in code comments explaining a decision, and a lone "—" is a
 * table cell meaning "no value" rather than a sentence. A blind sweep mangles
 * both.
 *
 * This inverts the earlier approach. Rather than trying to identify which
 * ranges are user-facing text — which meant guessing at JSX and giving up on
 * anything containing an expression, so "your whole team — no card required"
 * survived three passes — it identifies what to SKIP and rewrites the rest:
 *
 *   skipped   line and block comments (not shipped to a reader)
 *             import paths, URLs, and the SVG data: URIs in the heroes
 *   rewritten everything else, which in a JS/JSX/HTML file is string
 *             literals, template literals and JSX text
 *
 * CSS is scanned for reporting but never written: a dash outside a comment
 * there would be inside a content: property, and there are none.
 *
 * Replacements, in order:
 *   "5 – 9" / "5–9"    → "5 to 9"      a numeric or date range
 *   "word — word"      → "word, word"  a parenthetical mid-sentence
 *   "word— "           → "word, "      a dash doing a full stop's job
 *   leading "— word"   → "word"        a dash opening a line
 *   a lone "—"         → "-"           a placeholder cell, see below
 *
 * The placeholder is the one judgement call. `{value || "—"}` renders an empty
 * cell as a dash; emptying it leaves a blank that reads as a bug, so it becomes
 * an ASCII hyphen. It is no longer an em dash, which is the character being
 * objected to, and the cell still says "nothing here".
 *
 * Opting out: a dash that is data rather than prose — an API enum value, say —
 * is protected by wrapping it in
 *
 *     // strip-dashes: keep-start
 *     ...
 *     // strip-dashes: keep-end
 *
 * There is one such region today, the fleet_size map in Signup.jsx, whose
 * values the backend defines. Rewriting those would have sent "3 to 10" to an
 * endpoint expecting "3–10" and failed every access request. Prefer changing
 * the data over adding a marker; use this only when the value is not ours.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname, sep } from "node:path";

const ROOT = process.cwd();
const WRITE = process.argv.includes("--write");
const COMMENTS = process.argv.includes("--comments");

const ROOTS = ["src", "index.html"];
const CODE = new Set([".js", ".jsx", ".mjs"]);
const MARKUP = new Set([".html"]);
const REPORT_ONLY = new Set([".css"]);

const DASH = /[—–]/;

/* ---- Rules -------------------------------------------------------------- */

const RULES = [
  // An en dash is a range wherever it appears, including between template
  // expressions where neither side is a word character: `${from} – ${to}`.
  // Commafying those reads as a list of two dates rather than a span.
  [/\s*–\s*/g, " to "],
  // em dash spaced between two words: a parenthetical
  [/(\S)\s+—\s+(\S)/g, "$1, $2"],
  // em dash tight against the previous word, then a space
  [/(\w)—\s+/g, "$1, "],
  // em dash opening a line or following a quote
  [/(^|\n|["'`>])\s*—\s+/g, "$1"],
  // anything left with space on at least one side
  [/\s*—\s*/g, ", "],
  // bare leftovers
  [/[—–]/g, ", "],
];

function fixProse(text) {
  // A quoted string that is nothing but a dash is a placeholder, whatever else
  // is on the line: `{c.phone || "—"}` renders an empty cell. Handle these
  // before the prose rules, which would otherwise turn it into a stray comma.
  let out = text
    .replace(/"\s*[—–]\s*"/g, '"-"')
    .replace(/'\s*[—–]\s*'/g, "'-'")
    .replace(/`\s*[—–]\s*`/g, '`-`');
  for (const [re, to] of RULES) out = out.replace(re, to);
  return out
    .replace(/,\s*,/g, ",")
    .replace(/,\s*([.!?])/g, "$1")
    .replace(/\(\s*,\s*/g, "(")
    .replace(/\s+,/g, ",");
}

/* ---- Masking: blank out what must not be touched ------------------------
   Each skipped region is replaced by spaces of the same length, so every
   offset in the masked copy still matches the original. Rewrites are computed
   against the mask and applied to the original by index. */
function mask(src, ext) {
  const out = src.split("");
  const blank = (a, b) => {
    for (let i = a; i < b && i < out.length; i++) {
      if (out[i] !== "\n") out[i] = " ";
    }
  };

  if (MARKUP.has(ext)) {
    for (const m of src.matchAll(/<!--[\s\S]*?-->/g)) {
      blank(m.index, m.index + m[0].length);
    }
  } else {
    // line comments, but not the // inside an http:// or a data: URI
    for (const m of src.matchAll(/(^|[^:"'`\\])\/\/[^\n]*/g)) {
      const at = m.index + m[1].length;
      blank(at, at + m[0].length - m[1].length);
    }
    for (const m of src.matchAll(/\/\*[\s\S]*?\*\//g)) {
      blank(m.index, m.index + m[0].length);
    }
  }

  // explicitly protected regions: data that happens to contain a dash
  const keepStart = /strip-dashes:\s*keep-start/g;
  for (const m of src.matchAll(keepStart)) {
    const endMatch = /strip-dashes:\s*keep-end/g;
    endMatch.lastIndex = m.index;
    const e = endMatch.exec(src);
    blank(m.index, e ? e.index + e[0].length : src.length);
  }

  // import/export specifiers, URLs, and the inline SVG data URIs in the heroes
  for (const m of src.matchAll(/from\s+["'][^"']+["']/g)) {
    blank(m.index, m.index + m[0].length);
  }
  for (const m of src.matchAll(/https?:\/\/\S+/g)) {
    blank(m.index, m.index + m[0].length);
  }
  for (const m of src.matchAll(/data:[a-z/+]+[;,][^"')]+/gi)) {
    blank(m.index, m.index + m[0].length);
  }

  return out.join("");
}

/* ---- Walk ---------------------------------------------------------------- */

function walk(target, acc = []) {
  let st;
  try {
    st = statSync(target);
  } catch {
    return acc;
  }
  if (st.isFile()) {
    acc.push(target);
    return acc;
  }
  for (const name of readdirSync(target)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    walk(join(target, name), acc);
  }
  return acc;
}

let filesChanged = 0;
let replaced = 0;
let skippedComments = 0;
let skippedCss = 0;
const report = [];

for (const root of ROOTS) {
  for (const file of walk(join(ROOT, root))) {
    const ext = extname(file);
    if (!CODE.has(ext) && !MARKUP.has(ext) && !REPORT_ONLY.has(ext)) continue;

    const src = readFileSync(file, "utf8");
    if (!DASH.test(src)) continue;

    if (REPORT_ONLY.has(ext)) {
      skippedCss += (src.match(/[—–]/g) || []).length;
      continue;
    }

    const masked = COMMENTS ? src : mask(src, ext);
    let out = "";
    let cursor = 0;
    let hits = 0;

    // Rewrite one contiguous run of non-skipped text at a time, so a comment
    // sitting between two sentences does not merge them.
    for (const m of masked.matchAll(/[^\s][^\n]*/g)) {
      const start = m.index;
      const end = start + m[0].length;
      const maskedChunk = masked.slice(start, end);
      if (!DASH.test(maskedChunk)) continue;
      if (start < cursor) continue;

      const chunk = src.slice(start, end);
      const fixed = fixProse(chunk);
      if (fixed === chunk) continue;

      out += src.slice(cursor, start) + fixed;
      cursor = end;
      hits += (chunk.match(/[—–]/g) || []).length;
      report.push({
        file: relative(ROOT, file).split(sep).join("/"),
        before: chunk.trim().replace(/\s+/g, " ").slice(0, 76),
        after: fixed.trim().replace(/\s+/g, " ").slice(0, 76),
      });
    }

    const inComments = (src.match(/[—–]/g) || []).length - hits;
    skippedComments += Math.max(0, inComments);
    if (!hits) continue;

    out += src.slice(cursor);
    filesChanged++;
    replaced += hits;
    if (WRITE) writeFileSync(file, out, "utf8");
  }
}

for (const r of report) {
  console.log(`\n${r.file}`);
  console.log(`  -  ${r.before}`);
  console.log(`  +  ${r.after}`);
}

console.log(
  `\n${replaced} dash${replaced === 1 ? "" : "es"} in ${filesChanged} file${
    filesChanged === 1 ? "" : "s"
  }${WRITE ? " rewritten." : ". Dry run, pass --write to apply."}`
);
if (!COMMENTS && skippedComments) {
  console.log(
    `${skippedComments} left in code comments (not shipped; --comments includes them).`
  );
}
if (skippedCss) console.log(`${skippedCss} left in CSS comments.`);
