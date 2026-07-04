// Replace prose em dashes (" — ") with commas across src/.
// Leaves alone:
//  - standalone "—" placeholders (table cells, StepMark) — no whitespace around them
//  - en-dash ranges like "8am – 8pm" (different character)
// Usage: node scripts/remove-dashes.mjs
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = new URL("../src", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const EXTS = new Set([".js", ".jsx", ".css"]);
// whitespace (incl. line breaks) on BOTH sides of an em dash → ", "
const PROSE_DASH = /[^\S\r\n]*\r?\n?[^\S\r\n]*—[^\S\r\n]*\r?\n?[^\S\r\n]*/g;

let filesChanged = 0;
let total = 0;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      walk(p);
      continue;
    }
    if (!EXTS.has(extname(p))) continue;
    const src = readFileSync(p, "utf8");
    let count = 0;
    const out = src.replace(PROSE_DASH, (match) => {
      // keep placeholders: only replace when the dash truly has whitespace around it
      if (!/\s—|—\s/.test(match)) return match;
      count++;
      return ", ";
    });
    if (count > 0) {
      writeFileSync(p, out);
      filesChanged++;
      total += count;
      console.log(`${p}: ${count}`);
    }
  }
}

walk(ROOT);
console.log(`\n${total} em dash(es) replaced in ${filesChanged} file(s).`);
