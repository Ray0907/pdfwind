// Guard: every color in the library and in the playground chrome is a theme TOKEN, so light/dark/named themes never leave a color behind.
// Fails on palette classes (text-gray-500, bg-zinc-100), arbitrary color classes (bg-[#fff], text-[rgb(...)]), bg-white/black and text-white/black,
// and raw hex / rgb() / hsl() literals in src/**/*.vue|js and playground/**/*.vue|js|html.
// Allowed without a marker: theme definitions (src/themes/*), playground/chrome.css (the variable definitions), the E2E fixture pages
// (playground/demos.js, assets.js, DemoDoc.js: they need saturated test colors for pixel detection and are never shown first).
// Allowed with a marker: a line (or the line before it) containing `token-ok: <reason>`, for colors that must not change with the theme
// (QR modules, ink on a user-supplied color).
// Usage: node scripts/check-tokens.mjs [--quiet]        exit 1 on any violation
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const FIXTURES = new Set(["playground/demos.js", "playground/assets.js", "playground/DemoDoc.js"]);
const SCAN = [["src", /\.(vue|js)$/], ["playground", /\.(vue|js|html)$/]];
const SKIP = (rel) => rel.startsWith("src/themes/") || FIXTURES.has(rel) || rel === "playground/chrome.css";

const HUES = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const PROPS = "text|bg|border|ring|fill|stroke|from|to|via|divide|outline|decoration|shadow|accent|caret|placeholder";
const RULES = [
  ["palette class", new RegExp(`\\b(?:${PROPS})-(?:${HUES})-\\d{2,3}\\b`)],
  ["arbitrary color class", new RegExp(`\\b(?:${PROPS})-\\[(?:#|rgba?\\(|hsla?\\(|oklch\\(|oklab\\()[^\\]]*\\]`)],
  ["black/white class", /\b(?:bg|text|border|ring|fill|stroke|outline|from|to|via)-(?:white|black)\b/],
  ["hex literal", /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b(?![\w-])/],
  ["rgb/hsl literal", /\b(?:rgba?|hsla?)\(\s*\d/],
];

// comments are not code: blank them (same length, so columns stay meaningful) before matching
const stripComments = (s) => s.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, " ")).replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/(^|[^:"'`\\])\/\/[^\n]*/g, (m, p) => p + " ".repeat(m.length - p.length));

const walk = (dir) => readdirSync(dir).flatMap((n) => { if (n === "node_modules" || n.startsWith(".")) return []; const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });

export const check = (root = ROOT) => {
  const found = [];
  let files = 0, allowed = 0;
  for (const [dir, re] of SCAN) for (const f of walk(join(root, dir))) {
    const rel = relative(root, f);
    if (!re.test(f) || SKIP(rel)) continue;
    files++;
    const raw = readFileSync(f, "utf8").split("\n"), code = stripComments(raw.join("\n")).split("\n");
    code.forEach((line, i) => {
      for (const [rule, rx] of RULES) {
        const m = line.match(rx); if (!m) continue;
        if (/token-ok:/.test(raw[i]) || (i > 0 && /token-ok:/.test(raw[i - 1]))) { allowed++; continue; }
        found.push({ file: rel, line: i + 1, rule, text: m[0] });
      }
    });
  }
  return { found, files, allowed };
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { found, files, allowed } = check();
  if (!process.argv.includes("--quiet") || found.length) {
    for (const v of found) console.error(`${v.file}:${v.line}  ${v.rule}: ${v.text}`);
    console.log(`check-tokens: ${files} files scanned, ${found.length} violation(s), ${allowed} allowed with token-ok`);
  }
  process.exit(found.length ? 1 : 0);
}
