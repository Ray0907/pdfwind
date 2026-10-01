// Phase 5 E2E: colors are tokens (guard), dark theme + painted paper, playground chrome (light/dark/toggle/axe), llms.txt, the Nuxt example,
// the README showcase and images. Writes out/phase5/ (report.md, pdf/, screenshots).
import { writeFileSync, readFileSync, mkdirSync, rmSync, existsSync, mkdtempSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createServer as netServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";
import { chromium } from "playwright-core";
import { load, pageCount, allText, words, raster, colorStats, fonts as pdfFonts, hex } from "./lib/pdf.mjs";
import { check as tokenCheck } from "./check-tokens.mjs";
import { themeNames, themes } from "../src/themes/index.js";
import { contrastRatio } from "../src/themes/builder.js";

const OUT = "out/phase5";
rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/pdf`, { recursive: true });
const require = createRequire(import.meta.url);

const rows = [];
const check = (group, name, pass, detail = "", info = false) => rows.push({ group, name, pass: !!pass, detail: String(detail), info });
const norm = (s) => s.replace(/\s+/g, " ").trim();
const f2 = (n) => (Math.round(n * 100) / 100).toString();
const sh = (c, a, o = {}) => execFileSync(c, a, { encoding: "utf8", maxBuffer: 1 << 28, ...o });
const section = async (g, fn) => { try { await fn(); } catch (e) { check(g, "section ran without throwing", false, String(e?.stack ?? e).split("\n").slice(0, 3).join(" | ")); } };
const freePort = () => new Promise((res) => { const s = netServer(); s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); }); });
const AXE = require.resolve("axe-core/axe.min.js");
const cssVar = (theme, name) => readFileSync(`src/themes/${theme}.css`, "utf8").match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1].toLowerCase();

// ================= A. tokens =================
await section("tokens", async () => {
  const g = "tokens";
  const r = tokenCheck();
  check(g, "guard: no palette classes, arbitrary/black/white color classes, or raw hex/rgb/hsl literals in src/ and in the playground chrome (scripts/check-tokens.mjs)", r.found.length === 0, `${r.files} files scanned, ${r.found.length} violations${r.found.length ? ": " + r.found.slice(0, 4).map((v) => `${v.file}:${v.line} ${v.text}`).join(" | ") : ""}; ${r.allowed} lines allowed with a token-ok reason (QR modules, ink on user colors)`);
  let exit = 0; try { sh("node", ["scripts/check-tokens.mjs", "--quiet"]); } catch (e) { exit = e.status; }
  check(g, "the guard's command line exits 0 on this repository", exit === 0, `exit ${exit}`);
  // the guard itself: a temp tree full of violations is caught rule by rule, and a token-ok line is allowed
  const tmp = mkdtempSync(join(tmpdir(), "tokens-"));
  mkdirSync(`${tmp}/src`, { recursive: true }); mkdirSync(`${tmp}/playground`, { recursive: true });
  writeFileSync(`${tmp}/src/a.vue`, `<template>\n<div class="text-gray-500">a</div>\n<div class="bg-zinc-100">b</div>\n<div class="bg-[#fff]">c</div>\n<div class="text-white">d</div>\n<div style="color: #123456">e</div>\n<div style="color: rgb(1, 2, 3)">f</div>\n<!-- token-ok: qr -->\n<div style="color: #000000">g</div>\n<div class="text-primary bg-muted border-border">fine</div>\n</template>\n`);
  writeFileSync(`${tmp}/playground/b.vue`, `<style>.x { color: #abc; }</style>\n`);
  const bad = tokenCheck(tmp), rules = [...new Set(bad.found.map((v) => v.rule))].sort();
  check(g, "guard self-test: palette class, arbitrary hex class, white class, hex literal and rgb() in src, plus a hex in playground, are all reported; the token-ok line is allowed; token classes pass", bad.found.length >= 6 && bad.allowed === 1 && rules.length === 5, `${bad.found.length} found (${rules.join(", ")}), ${bad.allowed} allowed`);
  rmSync(tmp, { recursive: true, force: true });
  const chrome = readFileSync("playground/chrome.css", "utf8");
  check(g, "playground/chrome.css defines the chrome palette once with light-dark() and a data-scheme override", /light-dark\(/.test(chrome) && /data-scheme="dark"/.test(chrome) && /color-scheme: light dark/.test(chrome), `${(chrome.match(/light-dark\(/g) ?? []).length} light-dark() variables`);
});

// ================= B. dark theme + paper =================
const { renderPdf, demos, close } = await load();
const COMPONENT_KEYS = Object.entries(demos).filter(([, d]) => (d.group ?? "Components") === "Components" && !d.hidden).map(([k]) => k);
const BLOCK_KEYS = Object.entries(demos).filter(([, d]) => d.group === "Blocks" && !d.hidden && !/long/.test(d.title)).map(([k]) => k);
const withImages = new Set(["qrcode", "pdf-image", "components-all", "event-ticket", "shipping-label", "showcase"]); // QR plates and images are allowed to be light
const renderCell = (k, theme) => { const d = demos[k]; return renderPdf(d.component, {}, { ...((d.group ?? "Components") === "Components" ? { margin: 40 } : {}), ...(d.options ?? {}), theme }); };
const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const cells = {};

await section("dark", async () => {
  const g = "dark";
  const dk = themes.dark, bg = cssVar("dark", "background"), fg = cssVar("dark", "foreground");
  check(g, "dark theme is registered (src/themes/dark.css + registry) with all 12 color tokens", themeNames.includes("dark") && ["background", "foreground", "muted", "muted-foreground", "primary", "primary-foreground", "border", "accent", "destructive", "success", "warning", "info"].every((k) => cssVar("dark", k)), `${dk.description.slice(0, 70)}…`);
  const pairs = [["foreground", "background"], ["muted-foreground", "background"], ["muted-foreground", "muted"], ["primary-foreground", "primary"]].map(([a, b]) => [`${a}/${b}`, contrastRatio(cssVar("dark", a), cssVar("dark", b))]);
  check(g, "dark WCAG: foreground/background, muted-foreground/background, muted-foreground/muted, primary-foreground/primary are all >= 4.5:1 (status colors too)", pairs.every(([, r]) => r >= 4.5) && ["accent", "destructive", "success", "warning", "info", "primary"].every((k) => contrastRatio(cssVar("dark", k), bg) >= 4.5 && contrastRatio(cssVar("dark", k), cssVar("dark", "muted")) >= 4.5), pairs.map(([n, r]) => `${n} ${f2(r)}`).join(", "));
  // render everything under dark and default
  const keys = [...COMPONENT_KEYS, ...BLOCK_KEYS, "showcase"].filter((k) => demos[k]);
  let ok = 0; const errs = [];
  for (const t of ["dark", "default"]) { mkdirSync(`${OUT}/pdf/${t}`, { recursive: true }); cells[t] = {}; for (const k of keys) { try { const f = `${OUT}/pdf/${t}/${k}.pdf`; writeFileSync(f, await renderCell(k, t)); cells[t][k] = { file: f, pages: pageCount(f) }; ok++; } catch (e) { errs.push(`${t}/${k}: ${e.message.slice(0, 60)}`); } } }
  check(g, `all ${COMPONENT_KEYS.length} component demos + ${BLOCK_KEYS.length} blocks + the showcase render under dark and default without error (${keys.length * 2} PDFs)`, ok === keys.length * 2, `${ok}/${keys.length * 2}${errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""}`);
  check(g, "dark and default have the same page counts (the theme changes color, not layout)", keys.every((k) => cells.dark[k]?.pages === cells.default[k]?.pages), keys.filter((k) => cells.dark[k]?.pages !== cells.default[k]?.pages).join(", ") || "all equal");

  const bgc = hex(bg), stray = {}, corner = [], frameBad = [], flip = [], lowInk = [], inkRatios = [];
  const light = [hex("#ffffff"), hex(cssVar("default", "muted")), hex("#f4f4f5")];
  for (const k of keys) {
    const c = cells.dark[k]; if (!c) continue;
    let maxRegion = 0, lightPx = 0;
    for (let p = 1; p <= c.pages; p++) {
      const im = raster(c.file, p, { dpi: 72 }), { w, h: hh, px } = im, at = (x, y) => [px[(y * w + x) * 3], px[(y * w + x) * 3 + 1], px[(y * w + x) * 3 + 2]];
      // paper: every corner is paper (not white margin); a 3px frame around the page is >= 99% paper
      const isBg = (c3) => Math.abs(c3[0] - bgc[0]) <= 3 && Math.abs(c3[1] - bgc[1]) <= 3 && Math.abs(c3[2] - bgc[2]) <= 3;
      // the last pixel column/row of a raster is partly outside a fractional page size (595.28 x 841.89 pt): poppler leaves it white, so analysis stops one pixel short
      const W1 = w - 1, H1 = hh - 1, bleed = /ticket|label|certificate/.test(k); // these three have accent stripes / frames reaching the page edge by design
      if (!bleed) for (const [x, y] of [[1, 1], [W1 - 2, 1], [1, H1 - 2], [W1 - 2, H1 - 2]]) if (lum(...at(x, y)) > 120) corner.push(`${k} p${p} (${x},${y})`);
      let frame = 0, frameN = 0; for (let y = 0; y < H1; y++) for (let x = 0; x < W1; x++) if (x < 3 || y < 3 || x >= W1 - 3 || y >= H1 - 3) { frameN++; if (isBg(at(x, y))) frame++; }
      if (frame / frameN < 0.99 && !withImages.has(k) && !/ticket|label|certificate/.test(k)) frameBad.push(`${k} p${p} ${f2((frame / frameN) * 100)}%`);
      // stray light regions: connected pixels with every channel >= 240 (white / light surfaces; the dark theme's text is 223-236)
      const seen = new Uint8Array(w * hh), isL = (i) => (i % w) < w - 1 && ((i / w) | 0) < hh - 1 && px[i * 3] >= 240 && px[i * 3 + 1] >= 240 && px[i * 3 + 2] >= 240;
      for (let i = 0; i < w * hh; i++) { if (seen[i] || !isL(i)) continue; let n = 0; const st = [i]; seen[i] = 1; while (st.length) { const j = st.pop(); n++; const x = j % w, y = (j / w) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= hh) continue; const q = ny * w + nx; if (!seen[q] && isL(q)) { seen[q] = 1; st.push(q); } } } maxRegion = Math.max(maxRegion, n); lightPx += n; }
      // flip test: none of the default theme's light surface colors (white, #fafafa, #f4f4f5) may remain anywhere
      for (const lc of light) { const n = colorStats(im, lc, { tol: 1, box: { x0: 0, y0: 0, x1: w - 1, y1: hh - 1 } }).n; if (n > 0) flip.push({ k, p, color: lc.join(","), n }); }
    }
    stray[k] = { maxRegion, lightPx };
    // text ink contrast (sample every word of up to 2 pages)
    const c0 = c.file; if (COMPONENT_KEYS.includes(k) && !["components-all", "showcase"].includes(k)) continue; // the component fixture pages carry deliberate user colors (magenta, #ffedd5 ...) that no theme controls
    for (let p = 1; p <= Math.min(c.pages, 2); p++) {
      const im = raster(c0, p, { dpi: 144 });
      for (const w of words(c0, p).filter((x) => !(/^[SAMPLE]{1,6}$/.test(x.t) && x.y1 - x.y0 > 20)).filter((_, i) => i % 3 === 0)) {
        const x0 = Math.max(0, Math.floor(w.x0 * 2)), x1 = Math.min(im.w, Math.ceil(w.x1 * 2)), y0 = Math.max(0, Math.floor(w.y0 * 2)), y1 = Math.min(im.h, Math.ceil(w.y1 * 2)), hist = new Map();
        if (x1 - x0 < 2 || y1 - y0 < 2) continue;
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = (y * im.w + x) * 3, key = (im.px[i] << 16) | (im.px[i + 1] << 8) | im.px[i + 2]; hist.set(key, (hist.get(key) ?? 0) + 1); }
        const b = [...hist.entries()].sort((a, c2) => c2[1] - a[1])[0][0], bb = [b >> 16, (b >> 8) & 255, b & 255];
        let far = 0, ink = bb; for (const key of hist.keys()) { const c3 = [key >> 16, (key >> 8) & 255, key & 255], d = Math.hypot(c3[0] - bb[0], c3[1] - bb[1], c3[2] - bb[2]); if (d > far) { far = d; ink = c3; } }
        if (far < 40) continue;
        const hx = (c3) => `#${c3.map((v) => v.toString(16).padStart(2, "0")).join("")}`, r = contrastRatio(hx(ink), hx(bb));
        inkRatios.push(r); if (r < 4.5) lowInk.push({ k, t: w.t, r, ink: hx(ink), bg: hx(bb) });
      }
    }
  }
  check(g, "paper: every page corner of every dark PDF is the dark paper (no white margins) ", corner.length === 0, corner.slice(0, 4).join(" | ") || `${keys.length} documents, all pages`);
  check(g, "paper: a 3px frame around each page is >= 99% the theme's --background (documents with margins)", frameBad.length === 0, frameBad.slice(0, 4).join(" | ") || `--background ${bg}`);
  const worst = Object.entries(stray).sort((a, b) => b[1].maxRegion - a[1].maxRegion);
  const strayBad = worst.filter(([k, v]) => !withImages.has(k) && v.maxRegion > 0);
  check(g, "no stray white/near-white regions in dark renders outside images/QR (largest connected region of pixels >= 240 per document, at 72dpi)", strayBad.length === 0, strayBad.slice(0, 5).map(([k, v]) => `${k} ${v.maxRegion}px`).join(" | ") || `max ${worst[0][0]} ${worst[0][1].maxRegion}px (allowed: images/QR plates)`, false);
  check(g, "largest light regions found (QR plates and images only)", true, worst.filter(([, v]) => v.maxRegion).slice(0, 6).map(([k, v]) => `${k} ${v.maxRegion}px`).join(", ") || "none", true);
  const flipBad = flip.filter((f) => !withImages.has(f.k));
  check(g, "flip test: no pixel of the default theme's light surfaces (#ffffff, muted #fafafa / #f4f4f5) survives in any dark render outside images/QR", flipBad.length === 0, flipBad.slice(0, 5).map((f) => `${f.k} p${f.p} rgb(${f.color}) x${f.n}`).join(" | ") || `${keys.length} documents x 3 colors, 0 left`);
  // control: the default render does carry white paper
  const dflt = raster(cells.default["invoice-modern"].file, 1, { dpi: 72 });
  check(g, "control: the default render of invoice-modern is white paper (so the dark checks are meaningful)", colorStats(dflt, [255, 255, 255], { tol: 1 }).n > dflt.w * dflt.h * 0.6, `${f2((colorStats(dflt, [255, 255, 255], { tol: 1 }).n / (dflt.w * dflt.h)) * 100)}% white`);
  const sorted = [...inkRatios].sort((a, b) => a - b);
  check(g, `text ink vs its background in dark (sample of ${inkRatios.length} words across the 20 blocks, the sampler and the showcase): all >= 3:1, ${lowInk.length} below 4.5:1 (reported)`, sorted[0] >= 3.5, `min ${f2(sorted[0])}:1, median ${f2(sorted[sorted.length >> 1])}:1; below 4.5: ${[...new Set(lowInk.map((x) => `${x.k} "${x.t}" ${f2(x.r)} (${x.ink} on ${x.bg})`))].slice(0, 6).join(" | ") || "none"}`);
  // paper option still wins
  const d = demos["invoice-modern"], custom = await renderPdf(d.component, {}, { ...(d.options ?? {}), theme: "dark", backgroundColor: "#336699" });
  writeFileSync(`${OUT}/pdf/custom-paper.pdf`, custom);
  check(g, "an explicit backgroundColor option still wins over the theme's paper", colorStats(raster(`${OUT}/pdf/custom-paper.pdf`, 1, { dpi: 72 }), [0x33, 0x66, 0x99], { tol: 2 }).n > 100000, "#336699 paper");
  const named = {}; for (const t of themeNames) { const f = `${OUT}/pdf/paper-${t}.pdf`; writeFileSync(f, await renderPdf(demos["invoice-modern"].component, {}, { ...(demos["invoice-modern"].options ?? {}), theme: t })); const im = raster(f, 1, { dpi: 72 }), want = hex(cssVar(t, "background") ?? cssVar("default", "background")); named[t] = colorStats(im, want, { tol: 1 }).n / (im.w * im.h); }
  check(g, "every theme paints its own --background as the paper (>= 60% of an invoice page), light themes white, dark near-black", Object.values(named).every((v) => v > 0.6), themeNames.map((t) => `${t} ${f2(named[t] * 100)}%`).join(", "));
});

// ================= C. playground chrome =================
let server, browser;
try {
  server = await createServer({ configFile: "vite.config.js", root: `${process.cwd()}/playground`, server: { port: 0, host: "127.0.0.1" }, logLevel: "error" });
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch();
  const errors = [];
  const watch = (p) => { p.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`)); p.on("console", (m) => ["error", "warning"].includes(m.type()) && !/Failed to load resource/.test(m.text()) && errors.push(`${m.type()}: ${m.text()}`)); return p; };
  const PAGES = { app: `${base}/?demo=showcase`, builder: `${base}/?view=builder` };
  const ready = (p, which) => which === "app" ? p.waitForFunction(() => window.__pdfwind?.renders.length >= 1, null, { timeout: 60000 }) : p.waitForFunction(() => { const b = window.__builder, r = b?.renders.at(-1); return !!r && r.key === b.key(); }, null, { timeout: 60000 });
  const open = async (ctxOpts, which, init) => { const c = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...ctxOpts }); if (init) await c.addInitScript(init); const p = watch(await c.newPage()); await p.goto(PAGES[which]); await ready(p, which); return p; };
  const colors = (p) => p.evaluate(() => { const g = (sel, prop) => { const e = document.querySelector(sel); return e ? getComputedStyle(e)[prop] : null; }; return { body: g("body", "backgroundColor"), text: g("body", "color"), nav: g("nav", "borderRightColor") ?? g(".panel", "borderTopColor"), card: g(".card", "backgroundColor"), btn: g(".btn", "backgroundColor") ?? g("nav button", "color"), scheme: getComputedStyle(document.documentElement).colorScheme }; });
  const lumOf = (css) => { const m = css?.match(/\d+(\.\d+)?/g)?.map(Number) ?? [0, 0, 0]; return lum(m[0], m[1], m[2]); };

  await section("chrome", async () => {
    const g = "chrome";
    for (const which of ["app", "builder"]) {
      const L = await open({ colorScheme: "light" }, which), D = await open({ colorScheme: "dark" }, which);
      const cl = await colors(L), cd = await colors(D);
      check(g, `${which}: background and text colors differ between prefers-color-scheme light and dark (light page is light, dark page is dark, text flips)`, cl.body !== cd.body && cl.text !== cd.text && lumOf(cl.body) > 200 && lumOf(cd.body) < 60 && lumOf(cl.text) < lumOf(cl.body) && lumOf(cd.text) > lumOf(cd.body), `body ${cl.body} -> ${cd.body}; text ${cl.text} -> ${cd.text}; ${which === "builder" ? `card ${cl.card} -> ${cd.card}` : `button text ${cl.btn} -> ${cd.btn}`}`);
      // preview chrome vs the PDF: the PDF's own paper is unchanged by the page scheme
      if (which === "app") {
        const bytes = async (p) => Buffer.from(await p.evaluate(() => window.__pdfwind.pdfBytes()));
        const bl = bytes(L), bd = bytes(D); const [a, b] = await Promise.all([bl, bd]); writeFileSync(`${OUT}/pdf/chrome-light.pdf`, a); writeFileSync(`${OUT}/pdf/chrome-dark.pdf`, b);
        check(g, "the PDF does not follow the page chrome: same text and pixels whether the page is light or dark", allText(`${OUT}/pdf/chrome-light.pdf`).join() === allText(`${OUT}/pdf/chrome-dark.pdf`).join() && sh("sh", ["-c", `pdftoppm -r 40 -f 1 -l 1 -singlefile ${OUT}/pdf/chrome-light.pdf | md5`]) === sh("sh", ["-c", `pdftoppm -r 40 -f 1 -l 1 -singlefile ${OUT}/pdf/chrome-dark.pdf | md5`]), "identical");
      }
      await L.context().close(); await D.context().close();
    }
    // the toggle: 3 states, overrides the system setting, persists across reload, works without storage
    for (const which of ["app", "builder"]) {
      const p = await open({ colorScheme: "dark" }, which);
      const group = p.getByRole("group", { name: "Page colors" }), radios = group.getByRole("radio");
      check(g, `${which}: the toggle is a labelled 3-state radio group (System / Light / Dark), native radios, 40px targets`, (await radios.count()) === 3 && (await p.locator(".scheme span").evaluateAll((els) => els.every((e) => e.getBoundingClientRect().height >= 40 && e.getBoundingClientRect().width >= 40))), (await p.locator(".scheme label").allInnerTexts()).join(" / "));
      const sys = await colors(p);
      await group.getByRole("radio", { name: "Light" }).check();
      const lt = await colors(p), dsch = await p.evaluate(() => document.documentElement.dataset.scheme);
      check(g, `${which}: choosing Light overrides a dark system setting immediately`, lumOf(lt.body) > 200 && lumOf(sys.body) < 60 && dsch === "light", `system dark ${sys.body} -> toggle light ${lt.body}`);
      await p.reload(); await ready(p, which);
      check(g, `${which}: the choice persists across a reload (still light under a dark system)`, lumOf((await colors(p)).body) > 200 && (await p.getByRole("group", { name: "Page colors" }).getByRole("radio", { name: "Light" }).isChecked()), "light after reload");
      await p.getByRole("group", { name: "Page colors" }).getByRole("radio", { name: "System" }).check();
      check(g, `${which}: System follows the OS again and clears the stored choice`, lumOf((await colors(p)).body) < 60 && (await p.evaluate(() => { try { return localStorage.getItem("pdfwind-chrome-scheme"); } catch { return "x"; } })) === null, "dark again");
      await p.context().close();
    }
    // no flash: the scheme is on <html> when <body> is first created (before any app code ran)
    const flash = async (stored, system) => { const c = await browser.newContext({ colorScheme: system }); await c.addInitScript((s) => { try { localStorage.setItem("pdfwind-chrome-scheme", s); } catch { /* ignore */ } window.__first = null; new MutationObserver((_, o) => { if (document.body) { window.__first = { scheme: document.documentElement.dataset.scheme ?? null, bg: getComputedStyle(document.documentElement).colorScheme }; o.disconnect(); } }).observe(document, { childList: true, subtree: true }); }, stored); const p = await c.newPage(); await p.goto(PAGES.app); const f = await p.evaluate(() => window.__first); await c.close(); return f; };
    const f1 = await flash("dark", "light"), f2b = await flash("light", "dark");
    check(g, "no flash of the wrong scheme: the stored choice is on <html> before <body> exists (inline script in <head>, before first paint)", f1?.scheme === "dark" && f2b?.scheme === "light", `stored dark under light system: ${JSON.stringify(f1)}; stored light under dark system: ${JSON.stringify(f2b)}`);
    // blocked storage
    const blk = await open({ colorScheme: "light" }, "app", () => { Object.defineProperty(window, "localStorage", { get() { throw new DOMException("blocked", "SecurityError"); } }); });
    const e0 = errors.length; await blk.getByRole("group", { name: "Page colors" }).getByRole("radio", { name: "Dark" }).check();
    check(g, "blocked localStorage: the toggle still works for the session and nothing throws", lumOf((await colors(blk)).body) < 60 && errors.length === e0, "dark applied, no errors");
    await blk.context().close();
    // the chrome has no hard-coded colors: every color-bearing rule in the app/builder stylesheets uses variables
    const lit = await (await open({}, "builder")).evaluate(() => { const bad = []; for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch { continue; } for (const r of rules) { const t = r.cssText; if (/\.builder|\.shell|\.scheme|\.themes|\.pdf-preview/.test(t) && /#[0-9a-f]{3,8}\b|rgba?\(/i.test(t.replace(/color-mix\([^)]*\)/g, ""))) bad.push(t.slice(0, 60)); } } return bad; });
    check(g, "the loaded app/builder/preview stylesheets contain no color literals (all var(--…) or system colors)", lit.length === 0, lit.slice(0, 3).join(" | ") || "0 rules with literals");
  });

  await section("axe", async () => {
    const g = "axe";
    const scan = async (p, label) => { await p.addScriptTag({ path: AXE }); const r = await p.evaluate(async () => { const x = await window.axe.run(document, { exclude: [[".frame"], [".pdf-preview"], ["iframe"]], resultTypes: ["violations"] }); return x.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, n: v.nodes.length, sample: v.nodes[0].target.join(" ") })); }); return { label, r }; };
    const scans = [];
    for (const which of ["app", "builder"]) for (const scheme of ["light", "dark"]) { const p = await open({ colorScheme: scheme }, which); scans.push(await scan(p, `${which} ${scheme}`)); await p.context().close(); }
    const toggled = await open({ colorScheme: "light" }, "builder"); await toggled.getByRole("group", { name: "Page colors" }).getByRole("radio", { name: "Dark" }).check(); await toggled.waitForTimeout(500); /* the 150ms color transition must have finished: axe would read half-way colors */ scans.push(await scan(toggled, "builder, light system + dark toggle")); await toggled.context().close();
    const serious = scans.flatMap(({ label, r }) => r.filter((v) => ["serious", "critical"].includes(v.impact)).map((v) => `${label}: ${v.id} (${v.impact}) ${v.sample}`));
    const byImpact = {}; for (const { r } of scans) for (const v of r) byImpact[v.impact] = (byImpact[v.impact] ?? 0) + 1;
    check(g, "axe-core: zero serious/critical violations on the playground and the Theme Builder in BOTH color schemes (+ the toggle override)", serious.length === 0, serious.join(" | ") || `5 scans: ${scans.map((s) => `${s.label}: ${s.r.length}`).join("; ")}; by impact ${JSON.stringify(byImpact)}`);
    check(g, "axe-core violations of any impact (reported)", true, scans.flatMap(({ label, r }) => r.map((v) => `${label}: ${v.id}/${v.impact} x${v.n}`)).join(" | ") || "none", true);
  });

  await section("playground", async () => {
    const g = "playground";
    const c = await browser.newContext({ viewport: { width: 1280, height: 900 } }), p = watch(await c.newPage());
    await p.goto(`${base}/`); await p.waitForFunction(() => window.__pdfwind?.renders.length >= 1, null, { timeout: 60000 });
    const demo = await p.evaluate(() => window.__pdfwind.renders.at(-1).demo ?? new URLSearchParams(location.search).get("demo"));
    const active = await p.locator("nav button.on").innerText().catch(() => "");
    const f = `${OUT}/pdf/first-screen.pdf`; writeFileSync(f, Buffer.from(await p.evaluate(() => window.__pdfwind.pdfBytes())));
    const t = allText(f).join(" ");
    check(g, "the playground opens on the showcase (first screen), not on an E2E fixture: no HD-/LS-/PASS-/SG- labels and no magenta in the PDF", /showcase/i.test(String(demo)) && !/\b(HD|LS|PASS|SG|FM|TX|AL|BG|CARD|STACK|SEC|GR|QR|LK|IM|TB|DT|KV|WM|PH|PF|PN)-[A-Z0-9]/.test(t) && colorStats(raster(f, 1, { dpi: 72 }), [255, 0, 255], { tol: 40 }).n === 0, `default view "${demo}"; active nav item "${active}"; ${pageCount(f)} page(s)`);
    await c.close();
  });

  // ================= screenshots (headed: the PDF viewer is visible) =================
  let headed = true;
  const shoot = async (hb) => {
    for (const which of ["app", "builder"]) for (const scheme of ["light", "dark"]) {
      const cx = await hb.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: scheme }), p = await cx.newPage(); await p.goto(which === "app" ? `${base}/?demo=showcase` : `${base}/?view=builder&base=vivid&doc=showcase`); await ready(p, which); await p.waitForTimeout(1200);
      await p.screenshot({ path: `${OUT}/${which === "app" ? "playground" : "builder"}-${scheme}-1280.png` }); await cx.close();
    }
  };
  try { const hb = await chromium.launch({ headless: false }); await shoot(hb); await hb.close(); } catch (e) { headed = false; const hb = await chromium.launch(); await shoot(hb); await hb.close(); }
  check("screenshots", `1280px screenshots of the playground and the Theme Builder in light and dark (${headed ? "headed Chromium: the PDF is visible" : "headless fallback: the PDF area is blank"})`, ["playground-light-1280.png", "playground-dark-1280.png", "builder-light-1280.png", "builder-dark-1280.png"].every((f) => existsSync(`${OUT}/${f}`)), `${OUT}/{playground,builder}-{light,dark}-1280.png`);
} catch (e) { check("browser", "browser run", false, String(e?.stack ?? e).slice(0, 400)); }
finally { await browser?.close(); await server?.close(); }

// ================= D. llms.txt =================
await section("llms", async () => {
  const g = "llms";
  const gen = () => sh("node", ["scripts/gen-llms.mjs"]);
  gen(); const a1 = readFileSync("llms-full.txt"), i1 = readFileSync("llms.txt"); gen(); const a2 = readFileSync("llms-full.txt"), i2 = readFileSync("llms.txt");
  check(g, "the generator is deterministic: two runs give byte-identical llms.txt and llms-full.txt", a1.equals(a2) && i1.equals(i2), `${i1.length} + ${a1.length} bytes`);
  let stale = 0; try { sh("node", ["scripts/gen-llms.mjs", "--check"]); } catch (e) { stale = e.status; }
  check(g, "stale-file check: regenerating now produces exactly the committed files (--check exits 0)", stale === 0, `exit ${stale}`);
  const full = a2.toString("utf8"), index = i2.toString("utf8");
  const compNames = [...readFileSync("src/index.js", "utf8").matchAll(/default as (\w+)/g)].map((m) => m[1]), blockNames = [...readFileSync("src/blocks/index.js", "utf8").matchAll(/default as (\w+)/g)].map((m) => m[1]);
  check(g, `every exported component (${compNames.length}) and block (${blockNames.length}) appears in llms-full.txt under its own heading and in the llms.txt index`, compNames.every((n) => full.includes(`### ${n}\n`) && index.includes(`[${n}]`)) && blockNames.every((n) => full.includes(`### ${n}\n`) && index.includes(`[${n}]`)), `${compNames.length + blockNames.length} headings`);
  // every prop in every SFC source appears under its component
  const { parse, compileScript } = await import("vue/compiler-sfc");
  let propsN = 0; const missing = [];
  const files = [...readFileSync("src/index.js", "utf8").matchAll(/default as (\w+) } from "\.\/([^"]+)"/g)].map((m) => [m[1], `src/${m[2]}`]).concat([...readFileSync("src/blocks/index.js", "utf8").matchAll(/default as (\w+)(?:, renderOptions as \w+)? } from "\.\/([^"]+)"/g)].map((m) => [m[1], `src/blocks/${m[2]}`]));
  for (const [name, file] of files) {
    const src = readFileSync(file, "utf8"), { descriptor } = parse(src, { filename: file }); if (!descriptor.scriptSetup) continue;
    const res = compileScript(descriptor, { id: file }), sec = full.split(`### ${name}\n`)[1]?.split(/\n### /)[0] ?? "";
    for (const key of Object.keys(res.bindings ?? {}).filter((k) => res.bindings[k] === "props")) { propsN++; if (!sec.includes(`| \`${key}\` |`)) missing.push(`${name}.${key}`); }
  }
  check(g, `every declared prop appears in the table of its component/block (${propsN} props checked against compileScript bindings)`, missing.length === 0 && propsN > 100, missing.slice(0, 5).join(", ") || `${propsN} props`);
  const defaults = [["Badge", "variant", '`"default"`'], ["Heading", "weight", '`"bold"`'], ["InvoiceModern", "currency", '`"USD"`']].every(([n, p, d]) => (full.split(`### ${n}\n`)[1] ?? "").split(`| \`${p}\` |`)[1]?.includes(d));
  check(g, "types, defaults, variants and slots come from the source (spot checks: Badge.variant default \"default\" with its 7 values, Heading.weight, InvoiceModern.currency; Card slots)", defaults && /outline/.test(full.split("### Badge\n")[1].split("\n### ")[0].split("| `variant` |")[1]) && /Slots: `default`/.test(full.split("### Badge\n")[1]), "ok");
  check(g, "the API section lists every renderPdf option parsed from core.js (theme, themeCss, uncoveredText, missingImages, images, header, footer) and every theme + font family", ["theme", "themeCss", "uncoveredText", "missingImages", "images", "header", "footer", "signal"].every((o) => full.includes(`| \`${o}\` |`)) && themeNames.every((t) => full.includes(`| \`${t}\` |`)) && ["Nunito", "Merriweather", "Lato", "Playfair Display", "Open Sans", "Lora", "Source Code Pro", "JetBrains Mono", "Inter"].every((f) => full.includes(`| ${f} |`)), `${themeNames.length} themes`);
  check(g, "the Takumi CSS limits from PROGRESS.md are in the file (>= 8 items)", (full.split("## Takumi CSS limits that shaped the components")[1]?.split("\n## ")[0].match(/^- /gm) ?? []).length >= 8, `${(full.split("## Takumi CSS limits that shaped the components")[1]?.split("\n## ")[0].match(/^- /gm) ?? []).length} items`);
  // runnable examples: extract every ```js block with `// example:` and run it through Vite SSR in Node
  const blocks = [...full.matchAll(/```js\n(\/\/ example: [\s\S]*?)```\n\nExpected text in the PDF: ([^\n]*)\./g)];
  check(g, "llms-full.txt has runnable examples (>= 3 blocks marked // example:)", blocks.length >= 3, `${blocks.length} examples`);
  mkdirSync(`${OUT}/examples`, { recursive: true });
  const vite = await createServer({ configFile: "vite.config.js", root: process.cwd(), server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true } });
  try {
    for (const [, code, expectRaw] of blocks) {
      const id = code.match(/\/\/ example: (\S+)/)[1], file = `${OUT}/examples/${id}.js`; writeFileSync(file, code);
      const expect = [...expectRaw.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
      const mod = await vite.ssrLoadModule(`/${file}`), pdf = await mod.main(); writeFileSync(`${OUT}/examples/${id}.pdf`, pdf);
      const txt = norm(allText(`${OUT}/examples/${id}.pdf`).join(" ")), miss = expect.filter((e) => !txt.includes(e));
      check(g, `example "${id}" runs in Node (copied verbatim out of llms-full.txt) and the PDF has its expected text`, String.fromCharCode(...pdf.slice(0, 4)) === "%PDF" && miss.length === 0 && pageCount(`${OUT}/examples/${id}.pdf`) >= 1, miss.length ? `missing ${miss.join(", ")}` : `${expect.length} strings, ${pdf.length} bytes`);
    }
    const ctext = norm(allText(`${OUT}/examples/custom-theme.pdf`).join(" ")), cf = pdfFonts(`${OUT}/examples/custom-theme.pdf`);
    check(g, "the custom-theme example embeds Nunito and Lora and the CJK fallback (the code in the docs does what it says)", /Nunito/.test(cf) && /Lora/.test(cf) && /Noto/.test(cf) && ctext.includes("繁體中文"), cf.split("\n").slice(2).map((l) => l.split(/\s+/)[0].replace(/^[A-Z]{6}\+/, "")).filter((v, i, a) => a.indexOf(v) === i).join(", "));
  } finally { await vite.close(); }
  check(g, "README links llms.txt and the files exist at the repository root", existsSync("llms.txt") && existsSync("llms-full.txt") && /llms\.txt/.test(readFileSync("README.md", "utf8")), "linked");
});

// ================= E. Nuxt example =================
await section("nuxt", async () => {
  const g = "nuxt", ex = "examples/nuxt", procs = [];
  const browser = await chromium.launch(); // the playground browser above is closed by now
  const stop = () => procs.forEach((p) => { try { process.kill(-p.pid, "SIGTERM"); } catch { /* gone */ } });
  const wait = async (url, ms = 90000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const r = await fetch(url); if (r.status < 500 || r.status === 500) return true; } catch { /* not up yet */ } await new Promise((r) => setTimeout(r, 500)); } return false; };
  try {
    const inst = spawn("pnpm", ["install", "--frozen-lockfile=false"], { cwd: ex, stdio: "pipe" }); let il = ""; inst.stdout.on("data", (d) => { il += d; }); inst.stderr.on("data", (d) => { il += d; });
    const code = await new Promise((r) => inst.on("close", r));
    check(g, "cd examples/nuxt && pnpm install works (own package.json; copies pdfwind in via scripts/sync.mjs)", code === 0 && existsSync(`${ex}/pdfwind/src/render/core.js`) && existsSync(`${ex}/server/pdfwind-assets/wasm/takumi_pdf_wasm_bg.wasm`), `exit ${code}; ${il.trim().split("\n").slice(-1)[0].slice(0, 80)}`);
    const t0 = Date.now(), build = spawn("pnpm", ["build"], { cwd: ex, stdio: "pipe" }); let bl = ""; build.stdout.on("data", (d) => { bl += d; }); build.stderr.on("data", (d) => { bl += d; });
    const bcode = await new Promise((r) => build.on("close", r));
    check(g, "nuxt build succeeds (Nitro bundles the server route: Vue SFCs via the vue plugin, wasm/fonts/CSS as server assets)", bcode === 0 && /Build complete/.test(bl) && existsSync(`${ex}/.output/server/index.mjs`), `exit ${bcode} in ${((Date.now() - t0) / 1000).toFixed(0)}s; ${(bl.match(/Total size: [^\n]*/) ?? [""])[0]}`);
    const port = await freePort(), srv = spawn("node", [".output/server/index.mjs"], { cwd: ex, env: { ...process.env, PORT: String(port), NITRO_PORT: String(port) }, stdio: "pipe", detached: true }); procs.push(srv);
    let sl = ""; srv.stdout.on("data", (d) => { sl += d; }); srv.stderr.on("data", (d) => { sl += d; });
    const up = await wait(`http://127.0.0.1:${port}/api/invoice.pdf`);
    const get = async (q) => { const r = await fetch(`http://127.0.0.1:${port}/api/invoice.pdf${q}`); return { status: r.status, type: r.headers.get("content-type"), body: Buffer.from(await r.arrayBuffer()) }; };
    const v = await get("?theme=vivid&number=INV-9001&company=Globex&client=Initech");
    writeFileSync(`${OUT}/pdf/nuxt-vivid.pdf`, v.body);
    const info = sh("pdfinfo", [`${OUT}/pdf/nuxt-vivid.pdf`]), vt = norm(allText(`${OUT}/pdf/nuxt-vivid.pdf`).join(" "));
    check(g, "GET /api/invoice.pdf?theme=vivid -> 200 application/pdf, a valid PDF (%PDF, Producer takumi-pdf, 1 A4 page) with the query's invoice number, company and client in the text", up && v.status === 200 && /application\/pdf/.test(v.type) && v.body.subarray(0, 5).toString() === "%PDF-" && /Producer:\s+takumi-pdf/.test(info) && /A4/.test(info) && ["INV-9001", "Globex", "Initech", "Total Due"].every((t) => vt.includes(t)), `${v.status} ${v.type}; ${v.body.length} bytes; ${(info.match(/Producer:[^\n]*/) ?? [""])[0]}`);
    const px = raster(`${OUT}/pdf/nuxt-vivid.pdf`, 1, { dpi: 72 });
    const dflt = await get(""); writeFileSync(`${OUT}/pdf/nuxt-default.pdf`, dflt.body);
    check(g, "the theme reaches the Nitro render: vivid's primary (#6d28d9) is painted, and the default render has none of it", colorStats(px, hex("#6d28d9"), { tol: 6 }).n > 3000 && colorStats(raster(`${OUT}/pdf/nuxt-default.pdf`, 1, { dpi: 72 }), hex("#6d28d9"), { tol: 6 }).n === 0 && /Nunito/.test(pdfFonts(`${OUT}/pdf/nuxt-vivid.pdf`)), `${colorStats(px, hex("#6d28d9"), { tol: 6 }).n} px; fonts ${pdfFonts(`${OUT}/pdf/nuxt-vivid.pdf`).split("\n").slice(2, 3).map((l) => l.split(/\s+/)[0]).join("")}`);
    const dk = await get("?theme=dark"); writeFileSync(`${OUT}/pdf/nuxt-dark.pdf`, dk.body);
    const dim = raster(`${OUT}/pdf/nuxt-dark.pdf`, 1, { dpi: 72 });
    check(g, "theme=dark paints the dark paper through Nitro as well (paper color from --background)", colorStats(dim, hex("#0f1115"), { tol: 2 }).n > dim.w * dim.h * 0.6, `${f2((colorStats(dim, hex("#0f1115"), { tol: 2 }).n / (dim.w * dim.h)) * 100)}% paper`);
    const eur = await get("?currency=EUR"); writeFileSync(`${OUT}/pdf/nuxt-eur.pdf`, eur.body);
    check(g, "currency=EUR formats amounts in euros (query validated and passed to the block)", /€/.test(allText(`${OUT}/pdf/nuxt-eur.pdf`).join("")), "€ in the PDF");
    const bad = await get("?theme=nope"), bj = JSON.parse(bad.body.toString());
    check(g, "bad theme -> 400 with a clear message naming the valid themes", bad.status === 400 && /Unknown theme "nope"/.test(bj.message) && themeNames.every((t) => bj.message.includes(t)), `${bad.status}: ${bj.message}`);
    const checks = await Promise.all([get("?number=bad%20num"), get("?currency=XXX"), get(`?company=${"x".repeat(80)}`), get("?client=")]);
    check(g, "other invalid parameters (number with a space, unknown currency, 80-char company, empty client) -> 400 each with a message that says what to send", checks.every((r) => r.status === 400 && JSON.parse(r.body.toString()).message.length > 20), checks.map((r) => `${r.status} ${JSON.parse(r.body.toString()).message.slice(0, 40)}`).join(" | "));
    // the page: Chromium against the production server and against `nuxt dev` (dev prints hydration mismatches)
    const run = async (url, label) => {
      const cx = await browser.newContext({ viewport: { width: 1280, height: 900 } }), p = await cx.newPage(), errs = [];
      p.on("pageerror", (e) => errs.push(`pageerror: ${e.message}`)); p.on("console", (m) => (["error", "warning"].includes(m.type()) && !/Failed to load resource|favicon/.test(m.text())) && errs.push(`${m.type()}: ${m.text().slice(0, 160)}`));
      await p.goto(url); // the first render loads into the hidden (inert) iframe and is swapped in after the viewer's load or the 2s fallback
      await p.waitForFunction(() => [...document.querySelectorAll("iframe")].some((x) => x.getAttribute("src")?.startsWith("blob:") && !x.hasAttribute("inert")), null, { timeout: 90000 });
      const grab = async () => Buffer.from(await p.evaluate(async () => { const f = [...document.querySelectorAll("iframe")].find((x) => x.getAttribute("src")?.startsWith("blob:") && !x.hasAttribute("inert")) ?? document.querySelector("iframe"); return Array.from(new Uint8Array(await (await fetch(f.getAttribute("src"))).arrayBuffer())); }));
      const a = await grab(); writeFileSync(`${OUT}/pdf/nuxt-page-${label}-1.pdf`, a);
      await p.locator('[data-testid="theme"]').selectOption("vivid");
      await p.waitForFunction((prev) => { const f = [...document.querySelectorAll("iframe")].find((x) => x.getAttribute("src")?.startsWith("blob:") && !x.hasAttribute("inert")); return f && f.getAttribute("src") !== prev; }, await p.evaluate(() => [...document.querySelectorAll("iframe")].find((x) => x.getAttribute("src")?.startsWith("blob:") && !x.hasAttribute("inert"))?.getAttribute("src")), { timeout: 60000 });
      await p.waitForTimeout(2300); const b = await grab(); writeFileSync(`${OUT}/pdf/nuxt-page-${label}-2.pdf`, b);
      const href = await p.locator('[data-testid="download"]').getAttribute("href");
      await p.screenshot({ path: `${OUT}/nuxt-${label}.png` }); await cx.close();
      return { errs, a, b, href };
    };
    const r = await run(`http://127.0.0.1:${port}/`, "prod");
    check(g, "page (production build): <PdfPreview> renders the invoice in the browser, switching the theme to vivid re-renders it in place, no console errors or warnings", r.errs.length === 0 && /INV-2026-002/.test(allText(`${OUT}/pdf/nuxt-page-prod-1.pdf`).join(" ")) && colorStats(raster(`${OUT}/pdf/nuxt-page-prod-2.pdf`, 1, { dpi: 72 }), hex("#6d28d9"), { tol: 6 }).n > 3000 && colorStats(raster(`${OUT}/pdf/nuxt-page-prod-1.pdf`, 1, { dpi: 72 }), hex("#6d28d9"), { tol: 6 }).n === 0, `console: ${r.errs.slice(0, 2).join(" | ") || "clean"}; download link ${r.href}`);
    stop(); procs.length = 0;
    const dport = await freePort(), dev = spawn("pnpm", ["exec", "nuxt", "dev", "--port", String(dport), "--host", "127.0.0.1"], { cwd: ex, env: { ...process.env, NUXT_TELEMETRY_DISABLED: "1" }, stdio: "pipe", detached: true }); procs.push(dev);
    let dl = ""; dev.stdout.on("data", (d) => { dl += d; }); dev.stderr.on("data", (d) => { dl += d; });
    const dup = await wait(`http://127.0.0.1:${dport}/`, 120000);
    const rd = dup ? await run(`http://127.0.0.1:${dport}/`, "dev") : { errs: ["dev server did not start: " + dl.slice(-200)] };
    const hyd = rd.errs.filter((e) => /hydrat|mismatch/i.test(e));
    check(g, "page (nuxt dev, which reports hydration mismatches): preview renders, theme change re-renders, no hydration warnings and no console errors", dup && hyd.length === 0 && rd.errs.length === 0, `console: ${rd.errs.slice(0, 2).join(" | ") || "clean"}`);
    const dr = await fetch(`http://127.0.0.1:${dport}/api/invoice.pdf?theme=vivid`); const dbuf = Buffer.from(await dr.arrayBuffer()); writeFileSync(`${OUT}/pdf/nuxt-dev-vivid.pdf`, dbuf);
    check(g, "the server route also works under nuxt dev (assets read from disk instead of the bundle)", dr.status === 200 && dbuf.subarray(0, 5).toString() === "%PDF-" && /Nunito/.test(pdfFonts(`${OUT}/pdf/nuxt-dev-vivid.pdf`)), `${dr.status}, ${dbuf.length} bytes`);
  } finally { stop(); await browser.close(); }
  const procLeft = sh("sh", ["-c", "pgrep -f 'examples/nuxt|nuxt dev|.output/server/index.mjs' || true"]).trim();
  check(g, "server processes are cleaned up at the end", procLeft === "" || !procLeft.split("\n").some((pid) => { try { return /nuxt|\.output/.test(sh("ps", ["-p", pid, "-o", "command="])); } catch { return false; } }), procLeft || "none left");
});

// ================= F. README showcase + images =================
await section("readme", async () => {
  const g = "readme";
  const k = "showcase";
  if (!demos[k]) { check(g, "showcase demo exists", false, "missing"); return; }
  const out = {};
  for (const t of ["default", "dark"]) { const f = `${OUT}/pdf/showcase-${t}.pdf`; writeFileSync(f, await renderCell(k, t)); out[t] = f; }
  const t0 = norm(allText(out.default).join(" "));
  check(g, "showcase: 1-2 pages, realistic copy, no E2E fixture labels (HD-/LS-/PASS-/SG-/FM-...), every component of the brief present (heading, text, badge, alert, data table, graph, QR, list, form, signature)", pageCount(out.default) <= 2 && !/\b(HD|LS|PASS|SG|FM|TX|AL|BG|CARD|STACK|SEC|GR|QR|LK|IM|TB|DT|KV|WM|PH|PF|PN)-[A-Z0-9]/.test(t0) && !/\b(lorem|foo|bar|test)\b/i.test(t0), `${pageCount(out.default)} page(s), ${t0.length} chars`);
  const im = raster(out.default, 1, { dpi: 100 }), im2 = pageCount(out.default) > 1 ? raster(out.default, 2, { dpi: 100 }) : null;
  const mag = [im, im2].filter(Boolean).reduce((a, x) => a + colorStats(x, [255, 0, 255], { tol: 60 }).n, 0);
  // saturated pixels must be close to a theme token (or its tint): nothing visibly random
  // anti-aliasing keeps a pixel's hue, so "near a token" is judged by hue (<= 22 degrees) for every saturated pixel
  const hue = (r, gg, b) => { const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), d = mx - mn; if (!d) return 0; const h = mx === r ? ((gg - b) / d) % 6 : mx === gg ? (b - r) / d + 2 : (r - gg) / d + 4; return (h * 60 + 360) % 360; };
  const tokenHues = ["destructive", "success", "warning", "info", "primary", "accent"].map((n) => hex(cssVar("default", n))).filter((c) => Math.max(...c) - Math.min(...c) > 25).map((c) => hue(...c));
  let sat = 0, foreign = 0;
  for (const x of [im, im2].filter(Boolean)) for (let i = 0; i < x.px.length; i += 3) { const [r, gg, b] = [x.px[i], x.px[i + 1], x.px[i + 2]], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b); if (mx - mn < 50) continue; sat++; const h = hue(r, gg, b); if (!tokenHues.some((t) => Math.min(Math.abs(h - t), 360 - Math.abs(h - t)) <= 22)) foreign++; }
  check(g, "showcase colors: no magenta, and every saturated pixel has the hue of a theme token (success / warning / destructive / info): one calm palette, nothing random", mag === 0 && foreign <= sat * 0.01, `magenta ${mag}px; saturated ${sat}px, off-token hue ${foreign}px (${sat ? f2((foreign / sat) * 100) : 0}%); token hues ${tokenHues.map(Math.round).join("/")}`);
  const dd = raster(out.dark, 1, { dpi: 72 });
  check(g, "the dark showcase is a dark page (paper #0f1115 >= 60%) with its text intact (same text as the default render)", colorStats(dd, hex(cssVar("dark", "background")), { tol: 2 }).n > dd.w * dd.h * 0.6 && norm(allText(out.dark).join(" ")) === t0, `${f2((colorStats(dd, hex(cssVar("dark", "background")), { tol: 2 }).n / (dd.w * dd.h)) * 100)}% paper`);
  // screenshots.sh: portable (no hard-coded font path), runs, produces the images the README names
  const script = readFileSync("scripts/screenshots.sh", "utf8");
  check(g, "scripts/screenshots.sh is portable: no hard-coded /System/Library font path (it detects a font or skips labels)", !/\/System\/Library/.test(script) && /fc-list|fc-match|-font|label/i.test(script), "no macOS path");
  let sc = 0, sl = ""; try { sl = sh("sh", ["scripts/screenshots.sh"]); } catch (e) { sc = e.status ?? 1; sl = String(e.stderr ?? e.message); }
  const imgs = ["invoices.png", "reports.png", "blocks.png", "small-formats.png", "components.png", "components-dark.png", "themes.png", "theme-builder.png"];
  check(g, "scripts/screenshots.sh runs and writes every image the README uses", sc === 0 && imgs.every((f) => existsSync(`docs/images/${f}`)), sc ? sl.slice(0, 160) : imgs.join(", "));
  const readme = readFileSync("README.md", "utf8");
  check(g, "README references every image, plus Use with Vue/Nuxt (examples/nuxt), llms.txt and the playground instructions, and still says it is not on npm", imgs.every((f) => readme.includes(`docs/images/${f}`)) && /examples\/nuxt/.test(readme) && /llms\.txt/.test(readme) && /not (yet )?(published|on npm)/i.test(readme), "linked");
  // every README image: no magenta, no E2E label colors; the components image comes from the showcase (same size family), dark image is dark
  const png = (f) => { const [w, h] = sh("magick", [`docs/images/${f}`, "-resize", "800x", "-format", "%w %h", "info:"]).split(" ").map(Number); return { w, h, px: execFileSync("magick", [`docs/images/${f}`, "-resize", "800x", "-depth", "8", "rgb:-"], { maxBuffer: 1 << 28 }) }; };
  const magn = Object.fromEntries(imgs.map((f) => [f, colorStats(png(f), [255, 0, 255], { tol: 50 }).n]));
  check(g, "no README image contains the E2E fixtures' magenta (#ff00ff)", Object.values(magn).every((n) => n === 0), imgs.map((f) => `${f} ${magn[f]}`).join(", "));
  const cdk = png("components-dark.png"); let dark = 0; for (let i = 0; i < cdk.px.length; i += 3) if (lum(cdk.px[i], cdk.px[i + 1], cdk.px[i + 2]) < 40) dark++;
  check(g, "components-dark.png is mostly dark pixels (the dark theme proof)", dark > (cdk.px.length / 3) * 0.5, `${f2((dark / (cdk.px.length / 3)) * 100)}% dark`);
});

await close();
const groups = [...new Set(rows.map((r) => r.group))];
const real = rows.filter((r) => !r.info);
const md = ["| # | group | check | result | detail |", "|---|---|---|---|---|", ...rows.map((r, i) => `| ${i + 1} | ${r.group} | ${r.name} | ${r.info ? "INFO" : r.pass ? "PASS" : "FAIL"} | ${r.detail.replace(/\|/g, "\\|").replace(/\n/g, "<br>")} |`)].join("\n");
const total = `${real.filter((r) => r.pass).length}/${real.length} pass (+${rows.length - real.length} info rows)`;
const summary = groups.map((g) => `${g}: ${real.filter((r) => r.group === g && r.pass).length}/${real.filter((r) => r.group === g).length}`).join(" · ");
writeFileSync(`${OUT}/report.md`, `# Phase 5 E2E\n\n${md}\n\n${total}\n\n${summary}\n`);
console.log(md + `\n\n${total}\n${summary}`);
process.exit(real.every((r) => r.pass) ? 0 : 1);
