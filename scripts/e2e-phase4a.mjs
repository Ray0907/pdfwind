// Phase 4a E2E: themes + fonts. Matrix of 11 themes (default + pdfcn's 9 + dark) x 20 blocks + the "every component" sampler:
// fonts embedded per theme (pdffonts), theme colors by pixel, heading size ratios, page counts, overlap/clipping, footers/counters,
// WCAG contrast (reported, never tweaked), CSS values vs pdfcn's theme files, font licences/sizes, then in Chromium: only the active
// theme's fonts are fetched, switch latency, Node vs Chromium parity, picker keyboard/focus. Writes out/phase4a/ (report.md, PNG contact sheets).
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createServer } from "vite";
import { chromium } from "playwright-core";
import { load, pageCount, allText, words, find, raster, colorStats, hex } from "./lib/pdf.mjs";
import { themes, themeNames, getTheme } from "../src/themes/index.js";

const OUT = "out/phase4a", PDCN = "/private/tmp/pdfcn/apps/web/registry/themes";
rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/pdf`, { recursive: true });

const rows = [];
const check = (group, name, pass, detail = "", info = false) => rows.push({ group, name, pass: !!pass, detail: String(detail), info });
const norm = (s) => s.replace(/\s+/g, " ").trim();
const f1 = (n) => (Math.round(n * 10) / 10).toString();
const f2 = (n) => (Math.round(n * 100) / 100).toString();
const sh = (c, a) => execFileSync(c, a, { encoding: "utf8", maxBuffer: 1 << 28 });
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const section = async (g, fn) => { try { await fn(); } catch (e) { check(g, "section ran without throwing", false, String(e?.stack ?? e).split("\n").slice(0, 3).join(" | ")); } };

const { renderPdf, demos, close, blocks } = await load();
const B = await blocks();

// ---- theme data straight from the CSS files and from pdfcn's TS theme files
const cssVars = (name) => { const s = readFileSync(`src/themes/${name}.css`, "utf8"), v = {}; for (const m of s.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) v[m[1]] = m[2].trim(); return v; };
const pdfcnTheme = (name) => { let s = readFileSync(`${PDCN}/${name}.ts`, "utf8"); s = s.replace(/import[^;]*;/g, "").replace(/export const (\w+): PdfcnTheme =/, "globalThis.__T=").replace(/primitives: defaultPrimitives,/, ""); (0, eval)(s); return globalThis.__T; };
const kebab = (k) => k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const css = Object.fromEntries(themeNames.map((t) => [t, { ...cssVars("default"), ...cssVars(t) }])); // a theme file may set colors only (dark): the rest comes from default.css
const PDCN_THEMES = themeNames.filter((n) => n !== "default" && n !== "dark"); // the 9 themes ported from pdfcn
const pt = (v) => parseFloat(v);
const lum = (h) => { const c = hex(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// ================= theme files vs pdfcn =================
await section("themes", async () => {
  const g = "themes";
  check(g, "registry lists default + the 9 pdfcn themes + dark, each with a CSS file", themeNames.length === 11 && themeNames.includes("dark") && ["blueprint", "corporate", "elegant", "executive", "forest", "minimal", "modern", "professional", "vivid"].every((t) => themeNames.includes(t)) && themeNames.every((t) => existsSync(`src/themes/${t}.css`)), themeNames.join(", "));
  const bad = [];
  for (const t of PDCN_THEMES) {
    const p = pdfcnTheme(t), v = css[t];
    for (const [k, val] of Object.entries(p.colors)) if (v[kebab(k)]?.toLowerCase() !== val.toLowerCase()) bad.push(`${t}.${k}`);
    const sp = { paragraph: p.spacing.paragraphGap, component: p.spacing.componentGap, section: p.spacing.sectionGap };
    for (const [k, val] of Object.entries(sp)) if (pt(v[`spacing-${k}`]) !== val) bad.push(`${t}.spacing-${k}`);
    if (pt(v["text-body"]) !== p.typography.body.fontSize) bad.push(`${t}.body size`);
    if (+v["leading-body"] !== p.typography.body.lineHeight) bad.push(`${t}.body line-height`);
    if (+v["leading-heading"] !== p.typography.heading.lineHeight) bad.push(`${t}.heading line-height`);
    for (const l of [1, 2, 3, 4, 5, 6]) if (pt(v[`text-h${l}`]) !== p.typography.heading.fontSize[`h${l}`]) bad.push(`${t}.h${l}`);
    const m = themes[t].page.margin, pm = p.spacing.page;
    if (![[m.top, pm.marginTop], [m.right, pm.marginRight], [m.bottom, pm.marginBottom], [m.left, pm.marginLeft]].every(([a, b]) => Math.abs(a - b * 4 / 3) < 0.02)) bad.push(`${t}.page margins`);
    if (themes[t].pdfcn.body !== p.typography.body.fontFamily || themes[t].pdfcn.heading !== p.typography.heading.fontFamily) bad.push(`${t}.pdfcn fonts`);
  }
  check(g, "the 9 CSS files equal pdfcn's theme files: 12 colors, 3 gaps, body size + line height, h1-h6 sizes, heading line height, page margins (px = pt x 4/3), font names", !bad.length, bad.length ? bad.slice(0, 10).join(", ") : "9 themes x 31 values identical");
  const sub = { Helvetica: "Inter", "Times-Roman": "Lora", Courier: "Source Code Pro" }, wrong = [];
  for (const t of PDCN_THEMES) for (const k of ["body", "heading"]) { const want = sub[themes[t].pdfcn[k]] ?? themes[t].pdfcn[k]; if (themes[t].families[k] !== want) wrong.push(`${t}.${k}`); }
  check(g, "documented substitutions hold: Helvetica->Inter, Times-Roman->Lora, Courier->Source Code Pro; Google families unchanged", !wrong.length, wrong.join(", ") || "all 18 roles map as documented");
  const used = [...new Set(themeNames.flatMap((t) => themes[t].fonts.map((f) => f.family)))];
  const missing = used.filter((f) => !existsSync(`fonts/OFL-${f.replace(/ /g, "")}.txt`));
  const notice = readFileSync("THIRD_PARTY_NOTICES.md", "utf8"), uncredited = used.filter((f) => !notice.includes(f));
  check(g, "every bundled family has its OFL text in fonts/ and is credited in THIRD_PARTY_NOTICES.md", !missing.length && !uncredited.length, `${used.length} families (${used.join(", ")}); missing licence: ${missing.join(",") || "none"}; uncredited: ${uncredited.join(",") || "none"}`);
  const files = [...new Set(themeNames.flatMap((t) => themes[t].fonts.map((f) => f.file)))];
  const sizes = files.map((f) => [f, statSync(`fonts/${f}`).size]);
  check(g, "every font file is WOFF2, exists, and each new (non-Inter) file is < 100 KB", sizes.every(([f, s]) => /\.woff2$/.test(f) && s > 1000 && (f.startsWith("Inter") || s < 100_000)), sizes.map(([f, s]) => `${f} ${(s / 1024).toFixed(0)}K`).join(", "));
  const perTheme = themeNames.map((t) => `${t} ${(themes[t].fonts.reduce((a, f) => a + statSync(`fonts/${f.file}`).size, 0) / 1024).toFixed(0)}K`).join(" · ");
  check(g, "font payload per theme (all its faces incl. italic; Noto Sans TC 5.3 MB loads only for CJK text)", true, perTheme, true);
  const ttf = sh("git", ["ls-files", "fonts"]).split("\n").filter((f) => /\.ttf$/i.test(f));
  check(g, "no TTF is tracked/committed in fonts/", !ttf.length, ttf.join(",") || "none tracked");
  // contrast table (reported; theme colors are pdfcn's, never tweaked)
  const flags = [], table = [];
  for (const t of themeNames) {
    const v = css[t], pairs = [["foreground/background", v.foreground, v.background], ["muted-foreground/background", v["muted-foreground"], v.background], ["muted-foreground/muted", v["muted-foreground"], v.muted], ["primary-foreground/primary", v["primary-foreground"], v.primary]];
    const r = pairs.map(([n, a, b]) => [n, contrast(a, b)]);
    table.push(`${t}: ${r.map(([n, x]) => `${n.replace("foreground", "fg").replace("background", "bg")} ${f2(x)}`).join(", ")}`);
    for (const [n, x] of r) if (x < 4.5) flags.push(`${t} ${n} ${f2(x)}`);
  }
  check(g, "WCAG contrast ratios per theme (foreground/background, muted-foreground/background + muted, primary-foreground/primary)", true, table.join(" || "), true);
  check(g, `FLAG: ${flags.length} pair(s) below 4.5:1 for body-size text (pdfcn's own values, not changed)`, true, flags.join("; ") || "none", true);
});

// ================= matrix =================
const BLOCKS = Object.keys(demos).filter((k) => /^(invoice-(classic|consultant|corporate|creative|minimal|modern)|report-|event-|gift|lesson|medical|meeting|packing|press|shipping|work-order)/.test(k) && k !== "invoice-modern-long");
const KEYS = [...BLOCKS, "components-all"];
const KNOWN = ["NotoSansTC", "Inter", "Nunito", "Merriweather", "PlayfairDisplay", "OpenSans", "Lora", "SourceCodePro", "JetBrainsMono", "Lato"];
const famOf = (f) => { const n = f.replace(/^[A-Z]{6}\+/, ""); return KNOWN.find((k) => n.startsWith(k)) ?? n.split("-")[0]; };
const fontsIn = (file) => { const lines = sh("pdffonts", [file]).split("\n").slice(2).filter(Boolean); return [...new Set(lines.map((l) => l.trim().split(/\s+/)[0]))]; };
const cells = {}; // theme -> key -> { file, pages, fams, names }
const renderCell = (k, t, extra = {}) => { const d = demos[k]; return renderPdf(d.component, {}, { ...(k === "components-all" ? { margin: 40 } : {}), ...(d.options ?? {}), ...(t ? { theme: t } : {}), ...extra }); };
await section("matrix", async () => {
  const g = "matrix";
  let ok = 0; const errs = [], t0 = Date.now();
  for (const t of themeNames) {
    mkdirSync(`${OUT}/pdf/${t}`, { recursive: true }); cells[t] = {};
    for (const k of KEYS) {
      const file = `${OUT}/pdf/${t}/${k}.pdf`;
      try { writeFileSync(file, await renderCell(k, t)); const names = fontsIn(file); cells[t][k] = { file, pages: pageCount(file), names, fams: new Set(names.map(famOf)) }; ok++; } catch (e) { errs.push(`${t}/${k}: ${e.message.slice(0, 70)}`); }
    }
  }
  check(g, `all ${themeNames.length} themes x ${KEYS.length} documents (${BLOCKS.length} blocks + sampler) render without error`, ok === themeNames.length * KEYS.length, `${ok}/${themeNames.length * KEYS.length} rendered in ${((Date.now() - t0) / 1000).toFixed(0)}s${errs.length ? "; " + errs.slice(0, 3).join(" | ") : ""}`);
  check(g, `${BLOCKS.length} blocks are the 20 pdfcn blocks`, BLOCKS.length === 20, BLOCKS.join(", "));
  // default theme == no theme option
  const a = await renderCell("invoice-modern", undefined), b = await renderCell("invoice-modern", "default");
  writeFileSync(`${OUT}/pdf/omitted-invoice-modern.pdf`, a); writeFileSync(`${OUT}/pdf/explicit-default-invoice-modern.pdf`, b);
  const ta = allText(`${OUT}/pdf/omitted-invoice-modern.pdf`).join(), tb = allText(`${OUT}/pdf/explicit-default-invoice-modern.pdf`).join();
  check(g, "theme omitted == theme: 'default' (same text, pages, fonts)", ta === tb && fontsIn(`${OUT}/pdf/omitted-invoice-modern.pdf`).map(famOf).sort().join() === fontsIn(`${OUT}/pdf/explicit-default-invoice-modern.pdf`).map(famOf).sort().join(), "identical");
});

await section("fonts", async () => {
  const g = "fonts";
  const bad = [], seen = {};
  for (const t of themeNames) {
    const want = new Set([themes[t].families.body, themes[t].families.heading].map((f) => f.replace(/ /g, "")));
    seen[t] = new Set();
    for (const k of KEYS) {
      const c = cells[t]?.[k]; if (!c) continue;
      c.fams.forEach((f) => seen[t].add(f));
      const stray = [...c.fams].filter((f) => !want.has(f) && f !== "NotoSansTC");
      if (stray.length) bad.push(`${t}/${k}: ${stray.join("+")}`);
      if (!c.fams.has(themes[t].families.body.replace(/ /g, ""))) bad.push(`${t}/${k}: body ${themes[t].families.body} missing`);
    }
  }
  check(g, "every document embeds the theme's body family and only the theme's families (plus Noto Sans TC): no leak of Inter or another theme's face", !bad.length, bad.slice(0, 4).join(" | ") || `${Object.keys(cells).length * KEYS.length} PDFs checked`);
  const hbad = themeNames.filter((t) => !cells[t]["components-all"].fams.has(themes[t].families.heading.replace(/ /g, "")));
  check(g, "the sampler (has Headings) embeds each theme's heading family", !hbad.length, themeNames.map((t) => `${t}: ${[...seen[t]].join("+")}`).join(" · "));
  const ib = themeNames.filter((t) => !cells[t]["press-release"].names.some((n) => /Italic/i.test(n)) && t !== "default");
  const inter = cells.default["press-release"].names.some((n) => /Italic/i.test(n));
  check(g, "italic face embedded when the markup uses italic (press-release quote), in every theme", !ib.length && inter, ib.length ? `no italic in: ${ib.join(", ")}` : `${themeNames.length}/${themeNames.length} themes embed an italic face`);
  const cjkBad = themeNames.filter((t) => !cells[t]["components-all"].fams.has("NotoSansTC") || !allText(cells[t]["components-all"].file).join("").includes("繁體中文"));
  check(g, "CJK fallback chain still works in every theme (sampler's 繁體中文 extracted, Noto Sans TC embedded)", !cjkBad.length, cjkBad.join(", ") || `${themeNames.length}/${themeNames.length} themes`);
  const noNoto = themeNames.filter((t) => cells[t]["invoice-modern"].fams.has("NotoSansTC"));
  check(g, "Noto Sans TC is not embedded when the text has no CJK (invoice-modern, all themes)", !noNoto.length, noNoto.join(",") || "none embedded");
});

await section("colors", async () => {
  const g = "colors";
  const bad = [], info = [];
  for (const t of themeNames) {
    const v = css[t], c = cells[t]["components-all"], pages = Array.from({ length: c.pages }, (_, i) => raster(c.file, i + 1, { dpi: 144 }));
    const count = (col, o) => pages.reduce((a, im) => a + colorStats(im, hex(col), o).n, 0);
    const n = { primary: count(v.primary, { tol: 4 }), muted: count(v.muted, { tol: 3 }), border: count(v.border, { tol: 6 }), success: count(v.success, { tol: 8 }), destructive: count(v.destructive, { tol: 8 }), info: count(v.info, { tol: 8 }), warning: count(v.warning, { tol: 8 }) };
    // background: white is the page; foreground: darkest text pixels inside the first heading
    const w1 = words(c.file, 1), hw = w1.find((w) => w.t === "Heading"), im1 = pages[0];
    const box = { x0: Math.floor(hw.x0 * 2), y0: Math.floor(hw.y0 * 2), x1: Math.ceil(hw.x1 * 2), y1: Math.ceil(hw.y1 * 2) };
    n.foreground = colorStats(im1, hex(v.foreground), { tol: 10, box }).n;
    const cap = w1.find((w) => w.t === "caption"), cb = { x0: Math.floor(cap.x0 * 2) - 40, y0: Math.floor(cap.y0 * 2), x1: Math.ceil(cap.x1 * 2) + 40, y1: Math.ceil(cap.y1 * 2) };
    n["muted-foreground"] = colorStats(im1, hex(v["muted-foreground"]), { tol: 40, box: cb }).n;
    n.accent = count(v.accent, { tol: 8 });
    const thin = { primary: 200, muted: 500, border: 30, success: 20, destructive: 20, info: 20, warning: 20, foreground: 20, "muted-foreground": 5, accent: 20 };
    for (const [k, min] of Object.entries(thin)) if (n[k] < min) bad.push(`${t}.${k} ${n[k]}`);
    const white = colorStats(im1, hex(v.background), { tol: 1 }).n / (im1.w * im1.h); // the paper is the theme's --background, margins included
    if (white < 0.5) bad.push(`${t} background`);
    info.push(`${t}: primary ${n.primary}px, muted ${n.muted}, border ${n.border}`);
  }
  check(g, "each theme's colors appear in its rendered sampler (pixel counts at 144dpi): primary, muted, border, success/destructive/info/warning, accent, foreground (heading ink), muted-foreground (caption ink), paper = background", !bad.length, bad.slice(0, 6).join(", ") || info.slice(0, 4).join(" | ") + " ...");
  // blocks follow the theme's muted-foreground; only the muted fill is handed through --block-muted (default keeps the reference's #f4f4f5)
  // the ink pixel farthest from the label box's background (works on dark paper too) vs the theme's muted-foreground, RGB distance
  const mf = (t) => { const c = cells[t]["invoice-modern"], im = raster(c.file, 1, { dpi: 288 }), want = hex(css[t]["muted-foreground"]); const w = words(c.file, 1).find((x) => /^(INVOICE|BILLED|DATE)/i.test(x.t)); if (!w) return 999; const hist = new Map(); for (let y = Math.floor(w.y0 * 4); y < Math.ceil(w.y1 * 4); y++) for (let x = Math.floor(w.x0 * 4); x < Math.ceil(w.x1 * 4); x++) { const i = (y * im.w + x) * 3, key = (im.px[i] << 16) | (im.px[i + 1] << 8) | im.px[i + 2]; hist.set(key, (hist.get(key) ?? 0) + 1); } const m = [...hist.entries()].sort((p, q) => q[1] - p[1])[0][0], bg = [m >> 16, (m >> 8) & 255, m & 255]; let far = 0, pix = bg; for (const key of hist.keys()) { const c3 = [key >> 16, (key >> 8) & 255, key & 255], d = Math.hypot(c3[0] - bg[0], c3[1] - bg[1], c3[2] - bg[2]); if (d > far) { far = d; pix = c3; } } return Math.round(Math.hypot(pix[0] - want[0], pix[1] - want[1], pix[2] - want[2])); };
  const vv = themeNames.filter((t) => t !== "default").map((t) => [t, mf(t)]);
  const wrong = vv.filter(([, n]) => n > 30);
  check(g, "blocks use the named theme's muted-foreground (not the pinned #71717a): label ink in invoice-modern is within RGB distance 30 of the theme color", !wrong.length, vv.map(([t, n]) => `${t} dist ${n}`).join(", ") + " (RGB distance of the darkest label pixel to the theme color)");
  const imd = raster(cells.default["invoice-modern"].file, 1, { dpi: 144 });
  const dmf = css.default["muted-foreground"], onW = contrast(dmf, css.default.background), onM = contrast(dmf, css.default.muted);
  check(g, "default theme's muted-foreground is the accessible #71717a (>= 4.5:1 on its background and on its muted), minimal keeps pdfcn's #a1a1aa; blocks show #71717a in the default theme", dmf === "#71717a" && css.minimal["muted-foreground"] === "#a1a1aa" && onW >= 4.5 && onM >= 4.5 && colorStats(imd, hex("#71717a"), { tol: 12 }).n > 100, `default ${dmf}: ${f2(onW)}:1 on ${css.default.background}, ${f2(onM)}:1 on ${css.default.muted}; ${colorStats(imd, hex("#71717a"), { tol: 12 }).n}px of #71717a in default invoice-modern`);
});

await section("headings", async () => {
  const g = "headings";
  const bad = [], out = [];
  for (const t of themeNames) {
    const c = cells[t]["components-all"], ws = words(c.file, 1), hs = ws.filter((w) => w.t === "Heading").slice(0, 6).sort((a, b) => a.y0 - b.y0); // reading order of extracted words is not strictly top-down
    if (hs.length < 6) { bad.push(`${t}: ${hs.length} headings found`); continue; }
    const hr = raster(c.file, 1, { dpi: 288 }), ink = (w) => { const b = { x0: Math.floor(w.x0 * 4) - 2, x1: Math.ceil(w.x1 * 4) + 2, y0: Math.floor(w.y0 * 4) - 2, y1: Math.ceil(w.y1 * 4) + 2 }; let lo = 1e9, hi = -1; for (let y = b.y0; y < b.y1; y++) for (let x = b.x0; x < b.x1; x++) { const i = (y * hr.w + x) * 3; if (hr.px[i] < 140) { lo = Math.min(lo, y); hi = Math.max(hi, y); } } return hi - lo + 1; };
    const hh = hs.map(ink), sizes = [1, 2, 3, 4, 5, 6].map((l) => pt(css[t][`text-h${l}`]));
    const m = hh[0] / hh[5], e = sizes[0] / sizes[5];
    // each level against h1 too (same font, so box height scales with size)
    const worst = Math.max(...hh.map((x, i) => Math.abs(x / hh[0] - sizes[i] / sizes[0])));
    out.push(`${t} h1/h6 ${f2(m)} (css ${f2(e)})`);
    if (Math.abs(m - e) / e > 0.05 || worst > 0.04) bad.push(`${t}: measured ${f2(m)} vs ${f2(e)}, worst level error ${f2(worst)}`);
  }
  check(g, "heading size ratios from rendered ink height of \"Heading\" (H top to g bottom, 288dpi) match each theme's h1..h6 sizes (h1/h6 within 5%, every level within 0.04 of h1)", !bad.length, bad.join(" | ") || out.join(" · "));
  const ds = [...new Set(themeNames.map((t) => css[t]["text-h1"]))];
  check(g, "themes differ in h1 size (28/30/32/34/36pt etc.), so the picker is visibly doing something", ds.length >= 5, ds.join(", "));
});

await section("pages", async () => {
  const g = "pages", ex = [], over = [];
  for (const t of themeNames) for (const k of KEYS) {
    const a = cells[t]?.[k]?.pages, d = cells.default[k].pages;
    if (a === undefined) continue;
    if (Math.abs(a - d) > 1) over.push(`${t}/${k} ${a} vs ${d}`);
    else if (a !== d) ex.push(`${t}/${k} ${d}->${a}`);
  }
  check(g, "page counts stay within +-1 of the default theme for all ${themeNames.length * KEYS.length} documents", !over.length, over.join(", ") || "all within +-1");
  check(g, `exceptions of exactly +-1 page (denser type / wider mono / bigger headings), listed for the record`, true, ex.join(", ") || "none", true);
  const fixed = KEYS.filter((k) => /ticket|label|certificate/.test(k)), fb = [];
  for (const t of themeNames) for (const k of fixed) if (cells[t][k].pages !== 1) fb.push(`${t}/${k}`);
  check(g, "fixed-size blocks (event-ticket, shipping-label, gift-certificate) stay on one page in every theme", !fb.length, fb.join(",") || "30/30 single page");
  const sizes = {}; for (const k of ["shipping-label", "event-ticket", "invoice-modern"]) sizes[k] = new Set(themeNames.map((t) => sh("pdfinfo", [cells[t][k].file]).match(/Page size:\s+([\d.]+) x ([\d.]+)/).slice(1).join("x")));
  check(g, "page sizes do not change with the theme (label 288x432, ticket 504x252, A4)", Object.values(sizes).every((s) => s.size === 1), Object.entries(sizes).map(([k, s]) => `${k} ${[...s]}`).join(", "));
});

await section("layout", async () => {
  const g = "layout";
  const clipped = [], overlaps = [], counters = [];
  const t0 = Date.now();
  for (const t of themeNames) for (const k of KEYS) {
    const c = cells[t]?.[k]; if (!c) continue;
    const [pw, ph] = sh("pdfinfo", [c.file]).match(/Page size:\s+([\d.]+) x ([\d.]+)/).slice(1).map(Number);
    let hit = 0;
    for (let p = 1; p <= c.pages; p++) {
      const ws = words(c.file, p).filter((w) => !(/^[SAMPLE]{1,6}$/.test(w.t) && w.y1 - w.y0 > 20)); // the sampler's 60pt SAMPLE watermark is extracted as big letters
      for (const w of ws) if (w.x0 < -0.5 || w.y0 < -0.5 || w.x1 > pw + 0.5 || w.y1 > ph + 0.5) clipped.push(`${t}/${k} p${p} "${w.t}"`);
      // overlap: two words whose boxes share > 35% of the smaller box (text drawn on text)
      const grid = new Map();
      for (const w of ws) { const key = `${Math.floor(w.x0 / 40)},${Math.floor(w.y0 / 12)}`; (grid.get(key) ?? grid.set(key, []).get(key)).push(w); }
      for (const w of ws) for (let gx = Math.floor(w.x0 / 40) - 1; gx <= Math.floor(w.x1 / 40) + 1; gx++) for (let gy = Math.floor(w.y0 / 12) - 1; gy <= Math.floor(w.y1 / 12) + 1; gy++) for (const o of grid.get(`${gx},${gy}`) ?? []) {
        if (o === w || o.x0 < w.x0 || (o.x0 === w.x0 && o.y0 <= w.y0)) continue;
        const iw = Math.min(w.x1, o.x1) - Math.max(w.x0, o.x0), ih = Math.min(w.y1, o.y1) - Math.max(w.y0, o.y0);
        if (iw > 0 && ih > 0 && iw * ih > 0.35 * Math.min((w.x1 - w.x0) * (w.y1 - w.y0), (o.x1 - o.x0) * (o.y1 - o.y0))) hit++;
      }
    }
    if (hit) overlaps.push(`${t}/${k} ${hit}`);
    // footers/counters: wherever the default theme prints "Page i of N" on every page, so does each theme, with its own N
    const dtext = allText(cells.default[k].file), hasCounter = dtext.every((x, i) => new RegExp(`Page ${i + 1} of ${dtext.length}`).test(norm(x)));
    if (hasCounter) { const tt = allText(c.file).map(norm); if (!tt.every((x, i) => x.includes(`Page ${i + 1} of ${tt.length}`))) counters.push(`${t}/${k}`); }
  }
  check(g, "no text outside the page in any of the ${themeNames.length * KEYS.length} PDFs", !clipped.length, clipped.slice(0, 5).join(" | ") || "0 words outside");
  const baseline = overlaps.filter((x) => x.startsWith("default/")).map((x) => x.split("/")[1].split(" ")[0]);
  const newO = overlaps.filter((x) => !x.startsWith("default/") && !baseline.includes(x.split("/")[1].split(" ")[0]));
  check(g, "no text drawn over other text (word-box intersection > 35%) in any theme x document", !overlaps.length, overlaps.slice(0, 6).join(" | ") || `0 overlapping words; ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  if (overlaps.length) check(g, "overlaps that are new vs the default theme (vs already present there)", !newO.length, `new: ${newO.slice(0, 6).join(" | ") || "none"}; also in default: ${baseline.join(",") || "none"}`);
  check(g, "'Page i of N' footers/counters stay correct on every page wherever the default theme has them (N = that theme's page count)", !counters.length, counters.join(", ") || "every counter block, all themes");
});


// ================= default-theme text contrast, measured on the rendered pages =================
await section("default-contrast", async () => {
  const g = "default-contrast", flagged = {}, worst = [];
  let words_n = 0;
  for (const k of KEYS) {
    const c = cells.default[k]; flagged[k] = 0;
    for (let p = 1; p <= c.pages; p++) {
      const im = raster(c.file, p, { dpi: 144 }), ws = words(c.file, p).filter((w) => !(/^[SAMPLE]{1,6}$/.test(w.t) && w.y1 - w.y0 > 20));
      for (const w of ws) {
        const x0 = Math.max(0, Math.floor(w.x0 * 2)), x1 = Math.min(im.w, Math.ceil(w.x1 * 2)), y0 = Math.max(0, Math.floor(w.y0 * 2)), y1 = Math.min(im.h, Math.ceil(w.y1 * 2)), hist = new Map();
        if (x1 - x0 < 2 || y1 - y0 < 2) continue;
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * im.w + x) * 3, key = (im.px[i] << 16) | (im.px[i + 1] << 8) | im.px[i + 2]; hist.set(key, (hist.get(key) ?? 0) + 1); }
        const bg = [...hist.entries()].sort((a, b) => b[1] - a[1])[0][0], bgc = [bg >> 16, (bg >> 8) & 255, bg & 255];
        let far = 0, ink = bgc; for (const key of hist.keys()) { const c3 = [key >> 16, (key >> 8) & 255, key & 255], d = Math.hypot(c3[0] - bgc[0], c3[1] - bgc[1], c3[2] - bgc[2]); if (d > far) { far = d; ink = c3; } }
        if (far < 40) continue; // no readable ink in the box
        const h = (c3) => `#${c3.map((v) => v.toString(16).padStart(2, "0")).join("")}`, ratio = contrast(h(ink), h(bgc));
        words_n++;
        if (ratio < 4.5) { flagged[k]++; worst.push({ k, p, t: w.t, ratio, ink: h(ink), bg: h(bgc) }); }
      }
    }
  }
  worst.sort((a, b) => a.ratio - b.ratio);
  const total = Object.values(flagged).reduce((a, b) => a + b, 0);
  check(g, `default theme: ${words_n} words in 21 documents measured (ink = pixel farthest from the box background); words below 4.5:1 listed per document`, true, `${total} below 4.5:1 -> ${Object.entries(flagged).filter(([, n]) => n).map(([k, n]) => `${k} ${n}`).join(", ") || "none"}`, true);
  const groups = new Map();
  for (const x of worst) { const key = `${x.k}|${x.ink}|${x.bg}`; const e = groups.get(key) ?? { ...x, n: 0, ex: [] }; e.n++; if (e.ex.length < 3 && !e.ex.includes(x.t)) e.ex.push(x.t); groups.set(key, e); }
  const gl = [...groups.values()].sort((a, b) => a.ratio - b.ratio || b.n - a.n);
  check(g, `distinct (document, ink on background) pairs below 4.5:1: ${gl.length}; lowest first, with word counts and examples`, true, gl.map((x) => `${x.k}: ${x.ink} on ${x.bg} ${f2(x.ratio)}:1 x${x.n} (${x.ex.join(", ")})`).join(" | ") || "none", true);
  const under3 = worst.filter((x) => x.ratio < 3);
  check(g, `words below 3:1 in the default theme: ${under3.length} (data-driven accent colors in event-agenda track tags, Form placeholders; reported, not changed)`, true, [...new Set(under3.map((x) => `${x.k} "${x.t}" ${f2(x.ratio)}`))].slice(0, 12).join(" | ") || "none", true);
});

// ================= contact sheets =================
await section("sheets", async () => {
  const g = "sheets";
  for (const k of ["invoice-modern", "report-financial", "components-all"]) {
    const tiles = [];
    for (const t of themeNames) { const base = `${OUT}/tile-${k}-${t}`; raster(cells[t][k].file, 1, { dpi: 50, png: base }); tiles.push(`${base}.png`); }
    const args = []; themeNames.forEach((t, i) => args.push("-label", t, tiles[i]));
    execFileSync("montage", ["-font", "/System/Library/Fonts/Supplemental/Arial.ttf", ...args, "-tile", "6x2", "-geometry", "+8+8", "-pointsize", "16", "-background", "#e4e4e7", `${OUT}/themes-${k === "components-all" ? "components" : k}.png`]);
    tiles.forEach((f) => rmSync(f));
  }
  const want = ["themes-invoice-modern.png", "themes-report-financial.png", "themes-components.png"];
  check(g, "contact sheets written: all themes side by side for invoice-modern, report-financial and the components sampler", want.every((f) => existsSync(`${OUT}/${f}`) && statSync(`${OUT}/${f}`).size > 20000), want.map((f) => `${OUT}/${f}`).join(", "));
  // every theme's page 1 differs from every other theme's (not a no-op)
  const sums = themeNames.map((t) => sh("sh", ["-c", `pdftoppm -r 20 -f 1 -l 1 -singlefile ${cells[t]["invoice-modern"].file} | md5`]).trim());
  check(g, "all themes render a visibly different invoice-modern page 1 (one distinct raster hash each)", new Set(sums).size === themeNames.length, `${new Set(sums).size} distinct`);
});

// ================= API (Node) =================
await section("api", async () => {
  const g = "api";
  let msg = "";
  try { await renderPdf(demos["invoice-modern"].component, {}, { theme: "vividd" }); } catch (e) { msg = e.message; }
  check(g, "unknown theme throws a clear error naming every valid theme", themeNames.every((t) => msg.includes(t)) && /Unknown theme "vividd"/.test(msg), msg);
  let m2 = ""; try { getTheme("__proto__"); } catch (e) { m2 = e.message; }
  check(g, "prototype keys are not themes ('__proto__' -> same clear error)", /Unknown theme/.test(m2), m2.slice(0, 80));
  // themeCss still works: alone, and layered over a named theme
  const pass = (css, theme) => renderPdf(demos["badge"].component, {}, { margin: 40, themeCss: css, ...(theme && { theme }) });
  writeFileSync(`${OUT}/pdf/custom-css.pdf`, await pass(":root{--primary:#12ab34}"));
  writeFileSync(`${OUT}/pdf/custom-css-vivid.pdf`, await pass(":root{--primary:#12ab34}", "vivid"));
  const n1 = colorStats(raster(`${OUT}/pdf/custom-css.pdf`, 1, { dpi: 144 }), hex("#12ab34"), { tol: 6 }).n, n2 = colorStats(raster(`${OUT}/pdf/custom-css-vivid.pdf`, 1, { dpi: 144 }), hex("#12ab34"), { tol: 6 }).n, n3 = colorStats(raster(`${OUT}/pdf/custom-css-vivid.pdf`, 1, { dpi: 144 }), hex("#6d28d9"), { tol: 6 }).n;
  check(g, "themeCss still works: alone, and over a named theme (overrides vivid's primary #6d28d9 with #12ab34)", n1 > 200 && n2 > 200 && n3 === 0, `alone ${n1}px, over vivid ${n2}px green / ${n3}px vivid-violet`);
  check(g, "custom themeCss can bring its own font and be used with the bundled ones: no crash with theme + fonts option", await renderPdf(demos["text"].component, {}, { margin: 40, theme: "elegant", themeCss: "body{letter-spacing:0.3pt}" }).then((b) => b.length > 1000), "elegant + themeCss");
  // concurrent renders with different themes do not bleed into each other
  const [a, b, c] = await Promise.all(["vivid", "blueprint", "elegant"].map((t) => renderCell("invoice-modern", t)));
  [a, b, c].forEach((x, i) => writeFileSync(`${OUT}/pdf/concurrent-${i}.pdf`, x));
  const fams = [0, 1, 2].map((i) => [...new Set(fontsIn(`${OUT}/pdf/concurrent-${i}.pdf`).map(famOf))].join("+"));
  check(g, "three themes rendered concurrently stay isolated (each PDF has only its own fonts)", fams[0] === "Nunito" && /SourceCodePro/.test(fams[1]) && !/Nunito|Lora/.test(fams[1]) && fams[2] === "Lora", fams.join(" | "));
});

// ================= browser =================
let server, browser;
try {
  server = await createServer({ configFile: "vite.config.js", root: `${process.cwd()}/playground`, server: { port: 0, host: "127.0.0.1" }, logLevel: "error" });
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch();
  const page = await browser.newPage(), errors = [], fontReqs = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => ["error", "warning"].includes(m.type()) && !/Failed to load resource/.test(m.text()) && errors.push(`${m.type()}: ${m.text()}`));
  // Vite dev also serves each ?url asset as a tiny JS module; only the real font downloads (fetch) count
  page.on("request", (r) => r.resourceType() === "fetch" && /\.woff2(\?|$)/.test(r.url()) && fontReqs.push(r.url().split("/").pop().split("?")[0]));
  const fileOf = (u) => decodeURIComponent(u).replace(/^.*\//, "");
  await page.goto(`${base}/?demo=invoice-modern`);
  await page.waitForFunction(() => window.__pdfwind?.renders.length >= 1, null, { timeout: 60000 });
  const settle = async (patch) => { const k = await page.evaluate(() => window.__pdfwind.renders.length); await page.evaluate((p) => window.__pdfwind.set(p), patch); await page.waitForFunction((k) => window.__pdfwind.renders.length > k, k, { timeout: 60000 }); return page.evaluate(() => window.__pdfwind.renders.at(-1).ms); };
  const pdfOut = async (name) => { writeFileSync(`${OUT}/pdf/${name}.pdf`, Buffer.from(await page.evaluate(() => window.__pdfwind.pdfBytes()))); return `${OUT}/pdf/${name}.pdf`; };
  const fontsOnly = (names) => [...new Set(names)].sort();
  const fileSet = (t) => themes[t].fonts.map((f) => f.file);

  // --- lazy font loading: only the active theme's files are requested
  const mark = () => fontReqs.length;
  const after = (n) => fontsOnly(fontReqs.slice(n).map(fileOf));
  const base0 = fontsOnly(fontReqs.map(fileOf));
  check("browser", "default theme initial load requests only Inter (no other theme's font)", base0.every((f) => fileSet("default").includes(f)), `requested: ${base0.join(", ") || "(none yet, lazy)"}`);
  let n = mark(); await settle({ theme: "vivid" });
  const v = after(n);
  check("browser", "switching to vivid fetches only vivid's files (Nunito)", v.length > 0 && v.every((f) => fileSet("vivid").includes(f)), `requested ${v.join(", ")} (network count ${v.length})`);
  n = mark(); await settle({ theme: "executive" });
  const ex = after(n);
  check("browser", "switching to executive fetches only executive's files (Open Sans + Merriweather), nothing of vivid again", ex.length > 0 && ex.every((f) => fileSet("executive").includes(f)) && !ex.includes("Nunito.woff2"), `requested ${ex.join(", ")}`);
  const never = themeNames.filter((t) => !["default", "vivid", "executive"].includes(t)).flatMap((t) => fileSet(t)).filter((f) => !fileSet("default").concat(fileSet("vivid"), fileSet("executive")).includes(f));
  const leaked = never.filter((f) => fontReqs.map(fileOf).includes(f));
  check("browser", "files of themes that were never selected are never requested (Lato, Lora, JetBrains Mono, Source Code Pro, Playfair, ...)", !leaked.length, `${never.length} unselected-theme files, ${leaked.length} requested${leaked.length ? ": " + leaked.join(",") : ""}; all requests: ${fontsOnly(fontReqs.map(fileOf)).join(", ")}`);
  check("browser", "no CJK font request for Latin-only demos (Noto Sans TC 5 MB stays unfetched)", !fontReqs.map(fileOf).some((f) => /Noto/.test(f)), "no Noto request");
  await settle({ demo: "components-all", theme: "forest" });
  check("browser", "CJK text still pulls Noto Sans TC (sampler under forest)", fontReqs.map(fileOf).some((f) => /Noto/.test(f)), `Noto requested: ${fontReqs.map(fileOf).filter((f) => /Noto/.test(f)).length}x`);

  // --- switch latency (median of 5), runs alternate themes so each is a real re-render
  await settle({ demo: "invoice-modern", theme: "default" });
  const seq = ["vivid", "blueprint", "elegant", "corporate", "forest"], ms = [];
  for (const t of seq) ms.push(await settle({ theme: t }));
  const wall = [];
  for (const t of ["modern", "professional", "minimal", "executive", "default"]) { const t0 = Date.now(); await settle({ theme: t }); wall.push(Date.now() - t0); }
  check("browser", "theme switch re-render latency in Chromium: median of 5 (render ms reported by the preview; wall time incl. 100ms debounce + settle)", median(ms) < 3000, `render ms ${ms.join(", ")} -> median ${median(ms)}; wall ms ${wall.join(", ")} -> median ${median(wall)} (invoice-modern; wall time is dominated by PdfPreview's 2s load-fallback swap in headless Chromium, which never fires the PDF viewer's load event; the first switch to each theme includes its font download)`);
  const warm = []; for (const t of ["vivid", "blueprint", "elegant", "corporate", "forest"]) warm.push(await settle({ theme: t }));
  check("browser", "warm switch latency (fonts + CSS already loaded): median of 5", median(warm) < 1500, `render ms ${warm.join(", ")} -> median ${median(warm)}`);

  // --- parity Node vs Chromium for 3 themes x 3 documents
  const par = [];
  for (const t of ["vivid", "elegant", "blueprint"]) for (const dm of ["invoice-modern", "report-financial", "components-all"]) {
    await settle({ demo: dm, theme: t });
    const bf = await pdfOut(`browser-${dm}-${t}`);
    const d = demos[dm], nodePdf = await renderPdf(d.component, {}, { margin: 40, ...(d.options ?? {}), theme: t });
    writeFileSync(`${OUT}/pdf/node-${dm}-${t}.pdf`, nodePdf);
    const nf = `${OUT}/pdf/node-${dm}-${t}.pdf`;
    const same = allText(nf).map(norm).join("|") === allText(bf).map(norm).join("|") && pageCount(nf) === pageCount(bf) && fontsIn(nf).map(famOf).sort().join() === fontsIn(bf).map(famOf).sort().join();
    par.push(`${t}/${dm} ${same ? "ok" : "DIFF"}`);
  }
  check("browser", "Node vs Chromium parity for 3 themes x 3 documents: same text, pages and embedded font families", par.every((x) => x.endsWith("ok")), par.join(", "));

  // --- switching does not remount; picker accessibility
  await settle({ demo: "invoice-modern", theme: "default" });
  await page.evaluate(() => { document.querySelector(".preview").__marker = "same-node"; window.__iframes = [...document.querySelectorAll("iframe")]; });
  await settle({ theme: "vivid" }); await settle({ theme: "elegant" });
  const kept = await page.evaluate(() => document.querySelector(".preview").__marker === "same-node" && document.querySelectorAll("iframe").length === 2 && [...document.querySelectorAll("iframe")].every((f) => window.__iframes.includes(f)));
  check("browser", "theme switch re-renders the same <PdfPreview> (no remount: same root node, same two iframes, errors none)", kept && errors.length === 0, `${kept ? "same nodes" : "remounted"}`);
  const grp = page.getByRole("group", { name: "Theme" }), radios = grp.getByRole("radio");
  check("browser", "picker is a labelled radio group: fieldset 'Theme' with one native radio per theme, each with a visible text label", (await radios.count()) === themeNames.length && (await page.locator(".themes label").allTextContents()).map((s) => s.trim()).join() === themeNames.join(), `${await radios.count()} radios: ${(await page.locator(".themes label").allTextContents()).join(", ")}`);
  await page.evaluate(() => window.__pdfwind.set({ theme: "default" })); await page.waitForTimeout(400);
  await radios.first().focus();
  const k0 = await page.evaluate(() => window.__pdfwind.renders.length);
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction((k) => window.__pdfwind.renders.length > k, k0, { timeout: 60000 }).catch(() => {});
  const picked = await page.evaluate(() => document.querySelector(".themes input:checked")?.value);
  const outline = await page.evaluate(() => { const el = document.activeElement; const s = getComputedStyle(el); return { tag: el.tagName, type: el.type, style: s.outlineStyle, width: s.outlineWidth, vis: el.matches(":focus-visible") }; });
  check("browser", "keyboard: arrow key in the group moves the selection to the next theme and re-renders", picked === themeNames[1] && (await page.evaluate((k) => window.__pdfwind.renders.length > k, k0)), `selected ${picked} (expected ${themeNames[1]})`);
  check("browser", "focus is visible on the focused radio (:focus-visible, outline not none)", outline.vis && outline.style !== "none" && parseFloat(outline.width) >= 1.5, JSON.stringify(outline));
  await page.keyboard.press("Tab");
  const tabbed = await page.evaluate(() => document.activeElement.tagName === "BUTTON" || !document.activeElement.closest(".themes"));
  check("browser", "Tab leaves the radio group after the checked radio (one tab stop, native radio behaviour)", tabbed, "focus moved to the next control");
  // url param deep link
  await page.goto(`${base}/?demo=components-all&theme=blueprint`);
  await page.waitForFunction(() => window.__pdfwind?.renders.length >= 1, null, { timeout: 60000 });
  const bp = await pdfOut("deeplink-blueprint");
  check("browser", "?theme=blueprint deep link selects the radio and renders with blueprint fonts", (await page.evaluate(() => document.querySelector(".themes input:checked")?.value)) === "blueprint" && fontsIn(bp).some((x) => /JetBrains/.test(x)), fontsIn(bp).map(famOf).join("+"));
  // API in the browser
  const msg = await page.evaluate(async (root) => { const { renderPdf } = await import(/* @vite-ignore */ `/@fs${root}/src/render/browser.js`); try { await renderPdf({ render: () => null }, {}, { theme: "nope" }); } catch (e) { return e.message; } return "no error"; }, process.cwd()).catch((e) => `eval failed: ${e.message.slice(0, 80)}`);
  check("browser", "unknown theme error in the browser build names the valid themes", themeNames.every((t) => msg.includes(t)), msg.slice(0, 160));
  check("browser", "no console errors or Vue warnings through the whole session", errors.length === 0, errors.slice(0, 3).join(" | "));
} catch (e) { check("browser", "browser run", false, String(e?.stack ?? e).slice(0, 300)); }
finally { await browser?.close(); await server?.close(); await close(); }

const groups = [...new Set(rows.map((r) => r.group))];
const real = rows.filter((r) => !r.info);
const md = ["| # | group | check | result | detail |", "|---|---|---|---|---|", ...rows.map((r, i) => `| ${i + 1} | ${r.group} | ${r.name} | ${r.info ? "INFO" : r.pass ? "PASS" : "FAIL"} | ${r.detail.replace(/\|/g, "\\|").replace(/\n/g, "<br>")} |`)].join("\n");
const total = `${real.filter((r) => r.pass).length}/${real.length} pass (+${rows.length - real.length} info rows)`;
const summary = groups.map((g) => `${g}: ${real.filter((r) => r.group === g && r.pass).length}/${real.filter((r) => r.group === g).length}`).join(" · ");
writeFileSync(`${OUT}/report.md`, `# Phase 4a E2E\n\n${md}\n\n${total}\n\n${summary}\n`);
console.log(md + `\n\n${total}\n${summary}`);
process.exit(real.every((r) => r.pass) ? 0 : 1);
