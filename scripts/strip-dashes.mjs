#!/usr/bin/env node
/**
 * Replace em and en dashes in user-facing dashboard copy.
 *
 *   node scripts/strip-dashes.mjs          # report only, changes nothing
 *   node scripts/strip-dashes.mjs --write  # apply
 *   node scripts/strip-dashes.mjs --write --all   # marketing pages too
 *
 * Why a script and not a find-and-replace: an em dash is punctuation in prose
 * but it is also a legitimate character in code — inside a comment explaining
 * a decision, in a URL, in a data value. A blind sweep rewrites all of them and
 * you find out in review. This one only touches text a user can actually read:
 *
 *   · JSX text nodes            <p>fitted in person — the hardware…</p>
 *   · string and template props  title="No checks yet — look one up"
 *
 * and deliberately skips:
 *
 *   · // and block comments, which are for us, not for customers
 *   · import paths and anything inside a URL
 *   · the marketing pages under src/pages (unless --all), whose voice is set
 *     by ardena.co.ke rather than by the dashboard
 *
 * Replacement rules, in order:
 *   "word — word"  → "word, word"     a parenthetical mid-sentence
 *   "word —"       → "word."           a dash used as a full stop before a clause
 *   "— word"       → "word"            a leading dash
 *   "5 — 9" / "5–9" → "5 to 9"         a numeric range
 */

import { readFileSync, writeFileSync } from "node:fs";
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = process.cwd();
const WRITE = process.argv.includes("--write");
const ALL = process.argv.includes("--all");

const DIRS = ALL ? ["src"] : ["src/dashboard", "src/components", "src/hooks"];
const EXT = /\.(jsx?|mjs)$/;

/* ---- Which parts of a file are user-facing text ----------------------------
   A tiny scanner rather than a parser: walk the file once, tracking whether we
   are inside a line comment, a block comment, a quoted string, a template, or
   JSX text. Only the last three are copy. This is not a JS parser and does not
   need to be — it only has to be right about where text begins and ends. */
function textRanges(src) {
  const ranges = [];
  let i = 0;
  let jsxTextStart = -1;

  const pushJsxText = (end) => {
    if (jsxTextStart >= 0 && end > jsxTextStart) {
      ranges.push([jsxTextStart, end]);
    }
    jsxTextStart = -1;
  };

  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];

    if (c === "/" && next === "/") {
      pushJsxText(i);
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && next === "*") {
      pushJsxText(i);
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      pushJsxText(i);
      const quote = c;
      const start = ++i;
      while (i < src.length) {
        if (src[i] === "\\") i += 2;
        else if (src[i] === quote) break;
        else i++;
      }
      ranges.push([start, i]);
      i++;
      continue;
    }
    // A '>' opens JSX text; the next '<' closes it. Crude, and enough: the
    // only false positives are comparison operators, and a stray range that
    // contains no dash is harmless because nothing matches inside it.
    if (c === ">") {
      pushJsxText(i);
      jsxTextStart = i + 1;
      i++;
      continue;
    }
    if (c === "<" || c === "{") {
      pushJsxText(i);
      i++;
      continue;
    }
    i++;
  }
  pushJsxText(src.length);
  return ranges;
}

/* The two dashes do different jobs, so they get different replacements.
   An en dash (–) is almost always a range: "Mon – Sat", "Jul 2 – Jul 6",
   "8am – 8pm". Turning those into commas reads as a list of two things, which
   is wrong and occasionally misleading. An em dash (—) is punctuation. */
const RULES = [
  // en dash: a range, in words
  [/(\S)\s*–\s*(\S)/g, "$1 to $2"],
  // em dash between two words: a parenthetical, so a comma
  [/(\S)\s+—\s+(\S)/g, "$1, $2"],
  // em dash hard against the previous word, then a space
  [/(\w)—\s+/g, "$1, "],
  // leading em dash on its own line
  [/(^|\n)\s*—\s*/g, "$1"],
  // anything left
  [/\s*—\s*/g, ", "],
];

function fixText(text) {
  let out = text;
  for (const [re, to] of RULES) out = out.replace(re, to);
  // never leave a doubled comma behind
  return out.replace(/,\s*,/g, ",").replace(/,\s*\./g, ".");
}

function walk(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (EXT.test(name)) acc.push(full);
  }
  return acc;
}

let filesTouched = 0;
let replacements = 0;
const report = [];

for (const dir of DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    const src = readFileSync(file, "utf8");
    if (!/[—–]/.test(src)) continue;

    const ranges = textRanges(src);
    let out = "";
    let cursor = 0;
    let changedHere = 0;

    for (const [start, end] of ranges) {
      if (start < cursor) continue; // overlapping range, already consumed
      const chunk = src.slice(start, end);
      if (!/[—–]/.test(chunk)) continue;
      // an import path or URL is not prose
      if (/^[./]|https?:\/\//.test(chunk.trim())) continue;
      // A lone dash is a placeholder for "no value" in a table cell, not
      // punctuation. Emptying it leaves a blank cell that reads as a bug.
      if (/^[\s—–]*$/.test(chunk)) continue;
      // Markup or an expression inside the range means the scanner lost track
      // — an apostrophe in JSX text ("we've") reads as a string delimiter and
      // runs the range on. Refuse to rewrite anything that isn't clean prose;
      // a missed dash is cheap, a mangled component is not.
      if (/[<>{}]/.test(chunk)) continue;

      const fixed = fixText(chunk);
      if (fixed === chunk) continue;

      out += src.slice(cursor, start) + fixed;
      cursor = end;
      changedHere += (chunk.match(/[—–]/g) || []).length;
      report.push({
        file: relative(ROOT, file).split(sep).join("/"),
        before: chunk.trim().replace(/\s+/g, " ").slice(0, 78),
        after: fixed.trim().replace(/\s+/g, " ").slice(0, 78),
      });
    }
    if (!changedHere) continue;
    out += src.slice(cursor);

    filesTouched++;
    replacements += changedHere;
    if (WRITE) writeFileSync(file, out, "utf8");
  }
}

for (const r of report) {
  console.log(`\n${r.file}`);
  console.log(`  -  ${r.before}`);
  console.log(`  +  ${r.after}`);
}

console.log(
  `\n${replacements} dash${replacements === 1 ? "" : "es"} in ${filesTouched} file${
    filesTouched === 1 ? "" : "s"
  }${WRITE ? " rewritten." : ". Dry run — pass --write to apply."}`
);
