// Phase 4b E2E: the Theme Builder (playground ?view=builder). Pure model in Node (round trip, importer, contrast), then Playwright Chromium:
// color/font/margin controls change the PDF, validation, undo/redo (one step per drag, limit 30), persistence + blocked storage, export/import
// into a fresh context, contrast panel vs an independent calculation, keyboard-only run, hit areas / motion / layout shift, axe-core scan,
// screenshots (headed, because headless Chromium shows an empty PDF viewer). Writes out/phase4b/.
import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { createServer } from "vite";
import { chromium } from "playwright-core";
import { load, pageCount, allText, words, raster, colorStats, fonts as pdfFonts, hex } from "./lib/pdf.mjs";
import * as BM from "../src/themes/builder.js";
import { themes, themeNames } from "../src/themes/index.js";

const OUT = "out/phase4b";
rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/pdf`, { recursive: true });
const require = createRequire(import.meta.url);

const rows = [];
const check = (group, name, pass, detail = "", info = false) => rows.push({ group, name, pass: !!pass, detail: String(detail), info });
const norm = (s) => s.replace(/\s+/g, " ").trim();
const f2 = (n) => (Math.round(n * 100) / 100).toString();
const md5 = (b) => createHash("md5").update(b).digest("hex").slice(0, 10);
const section = async (g, fn) => { try { await fn(); } catch (e) { check(g, "section ran without throwing", false, String(e?.stack ?? e).split("\n").slice(0, 3).join(" | ")); } };

// ---- seeded random states (for round trips)
let seed = 7; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const rhex = () => `#${Array.from({ length: 3 }, () => Math.floor(rnd() * 256).toString(16).padStart(2, "0")).join("")}`;
const rnum = (r) => { const steps = Math.round((r.max - r.min) / r.step); return Math.round((r.min + Math.floor(rnd() * (steps + 1)) * r.step) * 100) / 100; };
const randomState = () => { const s = BM.defaultState(); s.name = `t${Math.floor(rnd() * 1e6)}`; for (const k of BM.COLOR_KEYS) s.colors[k] = rhex(); const fam = BM.bundledFamilies; s.fonts = { body: fam[Math.floor(rnd() * fam.length)], heading: fam[Math.floor(rnd() * fam.length)] }; for (const [p, r] of Object.entries(BM.RANGES)) BM.setPath(s, p, rnum(r)); return s; };
// independent WCAG 2.x contrast (not the builder's code path)
const wcag = (a, b) => { const L = (h) => { const [r, g, bl] = [1, 3, 5].map((i) => Number(`0x${h.slice(i, i + 2)}`) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * bl; }; const [x, y] = [L(a), L(b)]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

// ================= pure model =================
await section("model", async () => {
  const g = "model";
  const css = (n) => readFileSync(`src/themes/${n}.css`, "utf8");
  const bases = themeNames.map((n) => [n, BM.baseState(n, css(n))]);
  const noisy = bases.filter(([, r]) => r.issues.some((i) => i.level !== "note"));
  check(g, "all 10 shipped theme CSS files parse with zero unknown/rejected variables (default.css's Tailwind-side scale is recognized as fixed)", !noisy.length, noisy.map(([n, r]) => `${n}: ${r.issues.filter((i) => i.level !== "note").map((i) => i.variable)}`).join("; ") || "10/10 clean (only 'not set' notes for --font-body and page margins)");
  check(g, "parsing default.css gives exactly the builder's defaultState()", BM.statesEqual(bases[0][1].state, BM.defaultState()), "identical");
  const fixed = bases.every(([n, r]) => { const c = BM.toCss(r.state), r2 = BM.fromCss(c, BM.defaultState()); return BM.toCss({ ...r2.state, base: r.state.base }) === c && !r2.issues.length; });
  check(g, "toCss(fromCss(toCss(x))) is a fixed point for all 10 themes with no issues", fixed, "10/10");
  let bad = 0; const N = 200;
  for (let i = 0; i < N; i++) { const s = randomState(), r = BM.fromCss(BM.toCss(s), BM.defaultState()); if (r.issues.length || !BM.statesEqual({ ...r.state, base: s.base }, s)) bad++; }
  check(g, `round trip is lossless for ${N} random states (12 colors, 2 fonts, 21 numeric values, name)`, bad === 0, `${N - bad}/${N} identical, 0 issues`);
  // importer: every declaration is applied or reported
  const sample = `/* pdfwind theme "mine" */\n@theme { --text-h1: 30pt; --text-h2: 500pt; --foo-bar: 1; --text-h3: big; --text-xs--line-height: 2; --leading-body: 1.5; --spacing: 5pt; --color-primary: red; }\n:root { --primary: #0f4c81; --accent: #abc; --info: #12345; --success: rgb(0,0,0); --font-body: "Comic Sans"; --font-heading: "Lora"; --block-muted: #123456; --page-margin-top: 20pt; --muted-foreground: #A1A1AA; }\nbody { font-size: 13pt; line-height: 1.2; }`;
  const r = BM.fromCss(sample, BM.defaultState()), by = (v) => r.issues.find((i) => i.variable.includes(v));
  const declared = [...sample.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]);
  const accounted = declared.filter((d) => r.issues.some((i) => i.variable.split(", ").includes(d)) || ["--text-h1", "--leading-body", "--primary", "--font-heading", "--page-margin-top", "--muted-foreground", "--accent"].includes(d));
  check(g, "importer reports instead of dropping: unknown, out-of-range, non-number, bad hex, rgb(), fixed-scale edit, unbundled font, derived values", declared.length === accounted.length && by("--foo-bar")?.level === "warning" && by("--text-h2")?.level === "error" && by("--text-h3")?.level === "error" && by("--info")?.level === "error" && by("--success")?.level === "error" && by("--font-body")?.level === "error" && by("--spacing")?.level === "warning" && by("--color-primary")?.level === "warning" && by("--block-muted")?.level === "warning", `${declared.length} declarations: ${accounted.length} applied or reported; ${r.issues.map((i) => `${i.level}:${i.variable}`).join(" ")}`);
  check(g, "valid values from the same file are applied (h1 30, primary #0f4c81, #abc -> #aabbcc note, heading font Lora, name, margin) and invalid ones keep the old value", r.state.type.h.h1 === 30 && r.state.colors.primary === "#0f4c81" && r.state.colors.accent === "#aabbcc" && r.state.fonts.heading === "Lora" && r.state.name === "mine" && r.state.margin.top === 20 && r.state.type.h.h2 === 20 && r.state.colors.info === "#0369a1" && r.state.fonts.body === "Inter" && r.state.colors["muted-foreground"] === "#a1a1aa", `applied ${r.applied}`);
  check(g, "derived values are normalized with a note (per-size line heights, body rule) and 'not set' variables are listed", r.issues.some((i) => i.level === "note" && /line-height/.test(i.variable)) && r.issues.some((i) => i.level === "note" && /body/.test(i.variable)) && r.issues.some((i) => i.level === "note" && /not set/.test(i.message)), r.issues.filter((i) => i.level === "note").map((i) => i.variable.slice(0, 40)).join(" | "));
  // contrast independent
  let worst = 0; for (let i = 0; i < 300; i++) { const a = rhex(), b = rhex(); worst = Math.max(worst, Math.abs(BM.contrastRatio(a, b) - wcag(a, b))); }
  const known = [[BM.contrastRatio("#000000", "#ffffff"), 21], [BM.contrastRatio("#777777", "#ffffff"), 4.48], [BM.contrastRatio("#767676", "#ffffff"), 4.54]];
  check(g, "contrastRatio equals an independent WCAG implementation on 300 random pairs and the textbook values (21:1, #777 4.48, #767676 4.54)", worst < 1e-9 && known.every(([a, b]) => Math.abs(a - b) < 0.01), `max diff ${worst.toExponential(1)}; ${known.map(([a, b]) => `${f2(a)}~${b}`).join(", ")}`);
  const reg = BM.toRegistryObject(BM.defaultState()), shape = Object.keys(themes.vivid).sort().join();
  check(g, "registry export has the src/themes/index.js entry shape (same keys, font files exist, margins in px)", Object.keys(reg).sort().join() === shape && reg.fonts.every((f) => existsSync(`fonts/${f.file}`)) && reg.page.margin.top === 96 && reg.page.margin.left === 74.67, `${shape}`);
  const sc = BM.scaleSizes(11, 1.25);
  check(g, "heading scale presets: h6 = body size, each level x ratio, rounded to 0.5pt (major third at 11pt)", sc.h6 === 11 && sc.h5 === 14 && sc.h1 === 33.5 && BM.matchScale({ type: { bodySize: 11, h: sc } }) === "major-third", JSON.stringify(sc));
});

// ================= render path (Node) =================
const { renderPdf, demos, close, blocks } = await load();
await section("render", async () => {
  const g = "render";
  const d = demos["components-all"], opts = { margin: 40, ...(d.options ?? {}) };
  const s = BM.defaultState(); s.fonts = { body: "Nunito", heading: "Playfair Display" }; s.colors.primary = "#ff00aa";
  writeFileSync(`${OUT}/pdf/node-custom.pdf`, await renderPdf(d.component, {}, { ...opts, themeCss: BM.toCss(s) }));
  const fams = pdfFonts(`${OUT}/pdf/node-custom.pdf`);
  check(g, "themeCss from the builder picks bundled fonts through --font-body / --font-heading (Nunito body, Playfair heading embedded; no Inter)", /Nunito/.test(fams) && /Playfair/.test(fams) && !/Inter/.test(fams), fams.split("\n").slice(2).map((l) => l.split(/\s+/)[0].replace(/^[A-Z]{6}\+/, "")).filter((v, i, a) => a.indexOf(v) === i).join(", "));
  const mag = colorStats(raster(`${OUT}/pdf/node-custom.pdf`, 1, { dpi: 72 }), hex("#ff00aa"), { tol: 6 }).n;
  check(g, "the builder's primary color reaches the PDF through themeCss alone (no named theme)", mag > 100, `${mag} px of #ff00aa`);
  let msg = ""; try { await renderPdf(d.component, {}, { ...opts, themeCss: ":root{--font-body:\"Papyrus\"}" }); } catch (e) { msg = e.message; }
  check(g, "an unbundled family in the CSS gives a clear error naming the bundled ones", /Unknown font family "Papyrus"/.test(msg) && BM.bundledFamilies.every((f) => msg.includes(f)), msg.slice(0, 120));
  const t0 = Date.now(), pdfs = []; for (let i = 0; i < 20; i++) { const x = BM.defaultState(); x.colors.primary = BM.COLOR_KEYS.length ? `#${(0x100000 + i * 4099).toString(16).slice(0, 6)}` : "#000000"; pdfs.push(await renderPdf(d.component, {}, { ...opts, themeCss: BM.toCss(x) })); }
  check(g, "20 consecutive edits (20 distinct CSS strings, compiler cache is an LRU of 12) all render", pdfs.every((p) => p.length > 1000), `${((Date.now() - t0) / 20).toFixed(0)} ms per render incl. compile`);
  // blocks follow builder muted colors
  const B = await blocks(), im = demos["invoice-modern"], x = BM.defaultState(); x.colors["muted-foreground"] = "#ff0000";
  writeFileSync(`${OUT}/pdf/node-muted.pdf`, await renderPdf(im.component, {}, { ...(im.options ?? {}), themeCss: BM.toCss(x) }));
  check(g, "blocks pick up the builder's muted-foreground (--block-muted-foreground is exported): red labels in invoice-modern", colorStats(raster(`${OUT}/pdf/node-muted.pdf`, 1, { dpi: 144 }), [255, 0, 0], { tol: 40 }).n > 80 && !!B, `${colorStats(raster(`${OUT}/pdf/node-muted.pdf`, 1, { dpi: 144 }), [255, 0, 0], { tol: 40 }).n} red px`);
});

// ================= browser =================
let server, browser;
const AXE = require.resolve("axe-core/axe.min.js");
try {
  server = await createServer({ configFile: "vite.config.js", root: `${process.cwd()}/playground`, server: { port: 0, host: "127.0.0.1" }, logLevel: "error" });
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}/?view=builder`;
  browser = await chromium.launch();
  const errors = [];
  const watch = (p) => { p.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`)); p.on("console", (m) => ["error", "warning"].includes(m.type()) && !/Failed to load resource/.test(m.text()) && errors.push(`${m.type()}: ${m.text()}`)); return p; };
  const open = async (ctx, q = "", { wait = true } = {}) => { const p = watch(await ctx.newPage()); await p.goto(base + q); if (wait) await settle(p); return p; };
  const settle = (p) => p.waitForFunction(() => { const b = window.__builder, r = b?.renders.at(-1); return !!r && r.key === b.key(); }, null, { timeout: 60000 });
  const snap = async (p, name) => { const arr = await p.evaluate(() => Array.from(window.__builder.renders.at(-1).bytes)); const f = `${OUT}/pdf/${name}.pdf`; writeFileSync(f, Buffer.from(arr)); return f; };
  const pix = (f, dpi = 72) => md5(raster(f, 1, { dpi }).px);
  const text = (f) => allText(f).map(norm).join("|");
  const st = (p) => p.evaluate(() => window.__builder.state());
  const hist = (p) => p.evaluate(() => window.__builder.historyLength());
  const setHex = async (p, key, v) => { const el = p.locator(`#f-color-${key}-hex`); await el.fill(v); await el.press("Enter"); };
  const statusText = (p) => p.locator('[data-testid="status"]').innerText();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
  let page = await open(ctx);
  // a fresh context = empty storage (clearing + reloading is not enough: the page saves its state again when it unloads)
  const reopen = async () => { const old = page.context(), c = await browser.newContext({ viewport: { width: 1280, height: 900 } }); await c.grantPermissions(["clipboard-read", "clipboard-write"]); page = await open(c); await old.close(); };

  await section("builder", async () => {
    const g = "builder";
    const h1 = await page.locator("h1").allInnerTexts(), main = await page.locator("main").count();
    check(g, "the builder opens at ?view=builder with one h1, one main landmark, a live preview that renders, and a link back to the playground", h1.length === 1 && main === 1 && (await page.locator('a[href="./"]').count()) === 1 && (await page.evaluate(() => window.__builder.renders.length)) >= 1, `h1 "${h1[0]}", ${await page.evaluate(() => window.__builder.renders.length)} render(s)`);
    const f0 = await snap(page, "initial");
    check(g, "initial preview is invoice-modern in the default theme (text present, 1 page, Inter embedded)", /INV-2026-002/.test(text(f0)) && pageCount(f0) === 1 && /Inter/.test(pdfFonts(f0)), text(f0).slice(0, 60));
    // the playground links to the builder; the playground itself is unchanged
    const pg = watch(await ctx.newPage()); await pg.goto(base.replace("?view=builder", "")); await pg.waitForFunction(() => window.__pdfwind?.renders.length >= 1, null, { timeout: 60000 });
    const link = await pg.locator('a[href="?view=builder"]').count();
    check(g, "the playground nav links to the builder and keeps its own buttons/hook", link === 1 && (await pg.locator("nav button").count()) > 20 && (await pg.evaluate(() => typeof window.__pdfwind)) === "object", `${await pg.locator("nav button").count()} nav buttons`);
    await pg.close();
  });

  await section("controls", async () => {
    const g = "controls";
    const before = await snap(page, "c0"), n0 = await hist(page);
    await setHex(page, "primary", "#ff00aa"); await settle(page);
    const f1 = await snap(page, "c1");
    const mag = colorStats(raster(f1, 1, { dpi: 72 }), hex("#ff00aa"), { tol: 6 }).n;
    check(g, "hex field: typing #ff00aa into Primary changes the preview pixels to that color (header band and table head)", mag > 3000 && colorStats(raster(before, 1, { dpi: 72 }), hex("#ff00aa"), { tol: 6 }).n === 0 && (await st(page)).colors.primary === "#ff00aa", `${mag} px of #ff00aa (0 before)`);
    await page.locator("#f-color-info-pick").fill("#00aa55"); await settle(page);
    check(g, "native color picker input works too (Info -> #00aa55 reaches the state and the hex field)", (await st(page)).colors.info === "#00aa55" && (await page.locator("#f-color-info-hex").inputValue()) === "#00aa55", "state and hex in sync");
    // invalid hex
    const keyBefore = await page.evaluate(() => window.__builder.key());
    const bad = page.locator("#f-color-accent-hex"); await bad.fill("#12"); await bad.press("Enter");
    const inv = await bad.getAttribute("aria-invalid"), descId = await bad.getAttribute("aria-describedby"), msg = descId ? await page.locator(`#${descId.split(" ").pop()}`).innerText() : "";
    check(g, "invalid hex (#12) is rejected: aria-invalid, an explanation linked by aria-describedby, state and preview untouched", inv === "true" && /6 hex digits/.test(msg) && (await st(page)).colors.accent === "#71717a" && (await page.evaluate(() => window.__builder.key())) === keyBefore, `"${msg}"`);
    await bad.fill("zzzzzz"); await bad.press("Enter");
    check(g, "non-hex text (zzzzzz) is rejected too; a valid value then clears the error and applies", (await bad.getAttribute("aria-invalid")) === "true" && (await (async () => { await bad.fill("#336699"); await bad.press("Enter"); return (await bad.getAttribute("aria-invalid")) === null && (await st(page)).colors.accent === "#336699"; })()), "error shown, then cleared");
    // fonts
    let reqs = []; page.on("request", (r) => r.resourceType() === "fetch" && /\.woff2/.test(r.url()) && reqs.push(r.url().split("/").pop().split("?")[0]));
    await page.locator("#font-body").selectOption("Nunito"); await settle(page);
    const f2p = await snap(page, "c2");
    check(g, "body font select: Nunito embeds Nunito (read from the PDF) and replaces Inter; only Nunito's file was fetched", /Nunito/.test(pdfFonts(f2p)) && !/Inter/.test(pdfFonts(f2p)) && reqs.every((r) => /^Nunito/.test(r)) && reqs.length > 0, `requested ${[...new Set(reqs)].join(", ")}`);
    await page.locator("#doc").selectOption("components-all"); await settle(page);
    await page.locator("#font-heading").selectOption("Playfair Display"); await settle(page);
    const f3 = await snap(page, "c3");
    check(g, "heading font select: Playfair Display is embedded for the headings of the components sampler", /Playfair/.test(pdfFonts(f3)) && /Nunito/.test(pdfFonts(f3)), pdfFonts(f3).split("\n").slice(2, 6).map((l) => l.split(/\s+/)[0].replace(/^[A-Z]{6}\+/, "")).join(", "));
    // size / line height
    await page.locator("#doc").selectOption("invoice-modern"); await settle(page);
    await page.locator("#doc").selectOption("components-all"); await settle(page);
    const w0 = words(await snap(page, "s0"), 1).find((w) => w.t === "Body");
    await page.locator("#f-type-bodySize-n").fill("16"); await page.locator("#f-type-bodySize-n").press("Enter"); await settle(page);
    const w1 = words(await snap(page, "s1"), 1).find((w) => w.t === "Body");
    check(g, "body size 11 -> 16pt makes body text larger in the PDF (sampler paragraph: 'Body' is ~1.45x wider)", (w1.x1 - w1.x0) > (w0.x1 - w0.x0) * 1.3, `"Body" ${f2(w0.x1 - w0.x0)} -> ${f2(w1.x1 - w1.x0)} pt wide`);
    await page.locator("#doc").selectOption("invoice-modern"); await settle(page);
    // out-of-range number
    const num = page.locator("#f-type-bodySize-n"); await num.fill("99"); await num.press("Enter");
    check(g, "out-of-range number (99) is rejected with a message and not applied", (await num.getAttribute("aria-invalid")) === "true" && (await st(page)).type.bodySize === 16 && /from 6 to 24/.test(await page.locator("#f-type-bodySize-err").innerText()), await page.locator("#f-type-bodySize-err").innerText());
    await num.fill("16"); await num.press("Enter");
    // margins
    await page.locator("#f-margin-top-n").fill("120"); await page.locator("#f-margin-top-n").press("Enter"); await settle(page);
    const wm = words(await snap(page, "m1"), 1).find((w) => w.t === "Acme"), wm0 = words(f0path(), 1).find((w) => w.t === "Acme");
    function f0path() { return `${OUT}/pdf/initial.pdf`; }
    check(g, "top margin 72 -> 120pt moves the first text down by about 48pt in the PDF", wm.y0 - wm0.y0 > 40 && wm.y0 - wm0.y0 < 56, `"Acme" y ${f2(wm0.y0)} -> ${f2(wm.y0)}`);
    check(g, "the margin note explains where margins apply (A4 document: applies)", /Applies to this document/.test(await page.locator('[data-testid="margin-note"]').innerText()), await page.locator('[data-testid="margin-note"]').innerText());
    await page.locator("#doc").selectOption("shipping-label"); await settle(page);
    const lab = await snap(page, "label");
    const sizeLine = execFileSync("pdfinfo", [lab], { encoding: "utf8" }).match(/Page size:\s+([\d.]+) x ([\d.]+)/);
    check(g, "fixed-size documents (shipping-label 288x432) say margins are not applied and keep their page size", /not applied/.test(await page.locator('[data-testid="margin-note"]').innerText()) && Math.abs(+sizeLine[1] - 288) < 1 && Math.abs(+sizeLine[2] - 432) < 1, sizeLine[0]);
    await page.locator("#doc").selectOption("invoice-modern"); await settle(page);
    // scale preset
    await page.locator("#scale").selectOption("major-third"); await settle(page);
    const hs = (await st(page)).type.h;
    check(g, "heading scale preset 'major third' sets h1-h6 from the body size (16pt: 16/20/25/31.5/39/49 -> rounded to 0.5)", JSON.stringify(hs) === JSON.stringify(BM.scaleSizes(16, 1.25)) && (await page.locator("#scale").inputValue()) === "major-third", JSON.stringify(hs));
    // muted foreground reaches blocks
    await setHex(page, "muted-foreground", "#ff0000"); await settle(page);
    check(g, "Muted foreground = #ff0000 turns the block's labels red (blocks follow the builder, not their pinned grey)", colorStats(raster(await snap(page, "mfg"), 1, { dpi: 144 }), [255, 0, 0], { tol: 40 }).n > 60, "red label ink in invoice-modern");
    // doc switch
    await page.locator("#doc").selectOption("report-financial"); await settle(page);
    check(g, "document select switches the preview to any block (report-financial: 3 pages)", pageCount(await snap(page, "report")) === 3, "3 pages");
    await page.locator("#doc").selectOption("invoice-modern"); await settle(page);
    check(g, "no console errors or Vue warnings so far", errors.length === 0, errors.slice(0, 3).join(" | "));
    void n0;
  });

  await section("clone", async () => {
    const g = "clone";
    await page.locator("#clone-from").selectOption("vivid"); await page.getByRole("button", { name: "Clone theme" }).click(); await settle(page);
    const s = await st(page), vv = BM.baseState("vivid", readFileSync("src/themes/vivid.css", "utf8")).state;
    check(g, "cloning vivid replaces the state with vivid's parsed CSS values (colors, Nunito, sizes, gaps, margins)", BM.statesEqual({ ...s, name: "x" }, { ...vv, name: "x" }), `${s.name}, primary ${s.colors.primary}, ${s.fonts.body}`);
    const f = await snap(page, "vivid");
    check(g, "the clone renders like the named theme: vivid's primary violet and Nunito in the PDF", colorStats(raster(f, 1, { dpi: 72 }), hex("#6d28d9"), { tol: 6 }).n > 3000 && /Nunito/.test(pdfFonts(f)), "violet band + Nunito");
    // per-control reset + undo
    await setHex(page, "primary", "#123456"); await settle(page);
    const rb = page.getByRole("button", { name: "Reset Primary to #6d28d9" });
    check(g, "per-control reset: enabled only when the value differs from the base (vivid) and named with the target value", await rb.isEnabled() && !(await page.getByRole("button", { name: "Reset Accent to #8b5cf6" }).isEnabled()), "Primary enabled, Accent disabled");
    await rb.click(); await settle(page);
    check(g, "per-control reset restores the base value and is one undoable step", (await st(page)).colors.primary === "#6d28d9" && (await (async () => { await page.getByRole("button", { name: "Undo" }).click(); await settle(page); return (await st(page)).colors.primary === "#123456"; })()), "reset, then undo brings #123456 back");
    await page.getByRole("button", { name: "Redo" }).click(); await settle(page);
    await setHex(page, "foreground", "#222222"); await setHex(page, "border", "#999999"); await page.locator("#font-body").selectOption("Lora"); await settle(page);
    await page.getByRole("button", { name: "Reset all" }).click(); await settle(page);
    const s2 = await st(page);
    check(g, "Reset all returns everything to the base theme (keeps the theme name) and is undoable, not a confirm dialog", BM.statesEqual({ ...s2, name: "" }, { ...vv, name: "" }) && !(await page.getByRole("button", { name: "Reset all" }).isEnabled()), `body font ${s2.fonts.body}, foreground ${s2.colors.foreground}`);
    await page.getByRole("button", { name: "Undo" }).click(); await settle(page);
    check(g, "undoing Reset all brings the edits back in one step", (await st(page)).fonts.body === "Lora" && (await st(page)).colors.foreground === "#222222", "Lora + #222222 restored");
    await page.getByRole("button", { name: "Reset all" }).click(); await settle(page);
  });

  await section("history", async () => {
    const g = "history";
    await reopen();
    const undoBtn = page.getByRole("button", { name: "Undo" }), redoBtn = page.getByRole("button", { name: "Redo" });
    check(g, "fresh state: Undo and Redo buttons are disabled (native disabled, not just styled)", (await undoBtn.isDisabled()) && (await redoBtn.isDisabled()), "both disabled");
    // slider drag = one history entry
    const slider = page.locator("#f-gaps-section-r"); await slider.scrollIntoViewIfNeeded(); const box = await slider.boundingBox(), h0 = await hist(page), v0 = (await st(page)).gaps.section;
    const f0 = await snap(page, "h0");
    await page.mouse.move(box.x + box.width * 0.1, box.y + box.height / 2); await page.mouse.down();
    for (let i = 1; i <= 25; i++) await page.mouse.move(box.x + box.width * (0.1 + i * 0.03), box.y + box.height / 2);
    await page.mouse.up(); await settle(page);
    const v1 = (await st(page)).gaps.section, f1 = await snap(page, "h1"), h1 = await hist(page);
    check(g, "dragging a slider through ~25 input events creates exactly one history entry", h1 - h0 === 1 && v1 !== v0, `history ${h0} -> ${h1}; section gap ${v0} -> ${v1}`);
    check(g, "Undo/Redo become enabled (Undo after a change, Redo only after an undo)", (await undoBtn.isEnabled()) && (await redoBtn.isDisabled()), "undo enabled, redo disabled");
    await page.keyboard.press("Control+KeyZ"); await settle(page);
    const f2p = await snap(page, "h2");
    check(g, "Ctrl+Z restores the exact previous state: same value, same PDF text and pixels as before the drag", (await st(page)).gaps.section === v0 && text(f2p) === text(f0) && pix(f2p) === pix(f0), `gap ${v0}; pixels ${pix(f2p)} == ${pix(f0)}`);
    check(g, "the redo button is enabled after undo", await redoBtn.isEnabled(), "enabled");
    await page.keyboard.press("Control+Shift+KeyZ"); await settle(page);
    const f3 = await snap(page, "h3");
    check(g, "Ctrl+Shift+Z redoes: same value and the same pixels as after the drag", (await st(page)).gaps.section === v1 && pix(f3) === pix(f1), `gap ${v1}; pixels ${pix(f3)} == ${pix(f1)}`);
    await page.keyboard.press("Meta+KeyZ"); await settle(page);
    check(g, "Cmd+Z works as well as Ctrl+Z", (await st(page)).gaps.section === v0, "undone with Meta+Z");
    await page.keyboard.press("Control+KeyY"); await settle(page);
    check(g, "Ctrl+Y redoes", (await st(page)).gaps.section === v1, "redone with Ctrl+Y");
    // keyboard stepping = one entry
    await slider.focus(); const hk = await hist(page);
    for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
    await settle(page);
    check(g, "five arrow-key steps on a focused slider coalesce into one history entry", (await hist(page)) - hk === 1, `history ${hk} -> ${await hist(page)}`);
    // typing in a text field keeps native undo, does not hijack
    const hexf = page.locator("#f-color-success-hex"); await hexf.fill("#00ff00"); await hexf.press("Enter"); await settle(page);
    const hb = await hist(page); await hexf.focus(); await hexf.press("Control+KeyZ");
    check(g, "Ctrl+Z inside the hex text field is left to the field (does not undo the theme)", (await hist(page)) === hb && (await st(page)).colors.success === "#00ff00", "theme untouched");
    // limit 30
    await page.locator("#doc").selectOption("components-all");
    const keys = BM.COLOR_KEYS; let cnt = 0;
    for (let i = 0; i < 36; i++) { const k = keys[i % keys.length], v = `#${(0x102030 + i * 0x010203).toString(16).slice(0, 6)}`; const el = page.locator(`#f-color-${k}-hex`); await el.fill(v); await el.press("Enter"); cnt++; }
    await settle(page);
    check(g, "history is capped at 30 entries after 36 distinct edits", (await hist(page)) === 30, `${cnt} edits, ${await hist(page)} undo steps (shown in the toolbar: ${await page.locator(".meta").innerText()})`);
    let undone = 0; while (await undoBtn.isEnabled() && undone < 40) { await undoBtn.click(); undone++; }
    check(g, "30 undos exhaust the history and disable Undo (the oldest 6 edits cannot be undone)", undone === 30 && (await undoBtn.isDisabled()), `${undone} undos`);
    await page.waitForTimeout(150);
    check(g, "undo announces what it did in the status region", /^Undid /.test(await statusText(page)), await statusText(page));
    await page.getByRole("button", { name: "Reset all" }).click().catch(() => {});
  });

  await section("persistence", async () => {
    const g = "persistence";
    await reopen();
    await setHex(page, "primary", "#7a1fa2"); await page.locator("#font-body").selectOption("Lato"); await page.locator("#doc").selectOption("report-financial"); await settle(page);
    await page.waitForTimeout(450);
    const fb = await snap(page, "p0"), sb = await st(page);
    const raw = await page.evaluate(() => localStorage.getItem("pdfwind-theme-builder"));
    check(g, "state is written to localStorage (versioned JSON with the theme state and the document)", !!raw && JSON.parse(raw).v === 1 && JSON.parse(raw).state.colors.primary === "#7a1fa2" && JSON.parse(raw).doc === "report-financial", `${raw?.length} bytes`);
    await page.reload(); await settle(page);
    const fa = await snap(page, "p1"), sa = await st(page);
    check(g, "reload restores the theme and the document: same state, same PDF text and pixels", BM.statesEqual(sa, sb) && (await page.evaluate(() => window.__builder.doc())) === "report-financial" && text(fa) === text(fb) && pix(fa) === pix(fb), `primary ${sa.colors.primary}, body ${sa.fonts.body}, pixels ${pix(fa)}`);
    check(g, "undo history starts fresh after a reload (not persisted) and Undo is disabled", (await page.getByRole("button", { name: "Undo" }).isDisabled()) && (await hist(page)) === 0, "history 0");
    // garbage in storage (set before the app loads: the old page would overwrite it on unload)
    const withStore = async (value) => { const c = await browser.newContext({ viewport: { width: 1280, height: 900 } }); await c.addInitScript((v) => { if (!sessionStorage.getItem("seeded")) { localStorage.setItem("pdfwind-theme-builder", v); sessionStorage.setItem("seeded", "1"); } }, value); const p = await open(c); const r = await st(p); await p.close(); await c.close(); return r; };
    const g1 = await withStore("{not json");
    check(g, "garbage in localStorage is ignored (falls back to the default theme, no crash)", g1.colors.primary === "#18181b" && g1.name === "custom", `primary ${g1.colors.primary}`);
    const g2 = await withStore(JSON.stringify({ v: 1, state: { v: 1, name: "x", base: "default", colors: { primary: "red" } } }));
    check(g, "a persisted state with an invalid color is rejected as a whole (default theme)", g2.colors.primary === "#18181b" && g2.name === "custom", `primary ${g2.colors.primary}`);
    const g3 = await withStore(JSON.stringify({ v: 1, doc: "nope", state: { ...BM.defaultState(), name: "kept", colors: { ...BM.defaultState().colors, primary: "#0a0b0c" } } }));
    check(g, "a valid persisted state with an unknown document restores the theme and falls back to invoice-modern", g3.colors.primary === "#0a0b0c" && g3.name === "kept", `primary ${g3.colors.primary}, name ${g3.name}`);
    // blocked storage: getter throws
    const blocked = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await blocked.addInitScript(() => { Object.defineProperty(window, "localStorage", { get() { throw new DOMException("blocked", "SecurityError"); } }); });
    const e0 = errors.length, bp = await open(blocked);
    await setHex(bp, "primary", "#00aa88"); await settle(bp);
    const ok = (await st(bp)).colors.primary === "#00aa88" && colorStats(raster(await snap(bp, "blocked"), 1, { dpi: 72 }), hex("#00aa88"), { tol: 6 }).n > 1000;
    const meta = await bp.locator(".meta").innerText(), stat = await bp.locator('[data-testid="status"]').innerText();
    check(g, "blocked storage (window.localStorage getter throws) does not crash: editing and rendering work, and the page says nothing is saved", ok && /not saved/.test(meta) && errors.length === e0, `${meta.trim()} | status: ${stat}`);
    await bp.close(); await blocked.close();
    // setItem throws (quota)
    const quota = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await quota.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException("full", "QuotaExceededError"); }; });
    const qp = await open(quota); await setHex(qp, "primary", "#00aa88"); await settle(qp); await qp.waitForTimeout(400);
    check(g, "a full storage (setItem throws) is handled the same way", /not saved/.test(await qp.locator(".meta").innerText()) && (await st(qp)).colors.primary === "#00aa88", await qp.locator(".meta").innerText());
    await qp.close(); await quota.close();
  });

  await section("export", async () => {
    const g = "export";
    await reopen();
    await page.locator("#clone-from").selectOption("executive"); await page.getByRole("button", { name: "Clone theme" }).click();
    await setHex(page, "primary", "#0b6e4f"); await setHex(page, "muted-foreground", "#445566"); await page.locator("#font-heading").selectOption("Lora");
    await page.locator("#f-type-bodySize-n").fill("12.5"); await page.locator("#f-type-bodySize-n").press("Enter");
    await page.locator("#f-gaps-section-n").fill("30"); await page.locator("#f-gaps-section-n").press("Enter");
    await page.locator("#f-margin-left-n").fill("70"); await page.locator("#f-margin-left-n").press("Enter");
    await page.locator("#theme-name").fill("my-theme"); await page.locator("#theme-name").press("Enter");
    await settle(page);
    const cssText = await page.locator('[data-testid="export"]').inputValue(), stA = await st(page), fA = await snap(page, "exA");
    check(g, "the export box shows the generated CSS: theme name header, @theme with type scale, :root with 12 colors, --font-body, page margins", /pdfwind theme "my-theme"/.test(cssText) && /--primary: #0b6e4f;/.test(cssText) && /--font-heading: "Lora"/.test(cssText) && /--font-body: "Open Sans"/.test(cssText) && /--page-margin-left: 70pt;/.test(cssText) && /--text-body: 12.5pt;/.test(cssText) && BM.toCss(stA) === cssText, `${cssText.split("\n").length} lines`);
    const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download theme.css" }).click()]);
    const dpath = `${OUT}/theme.css`; await dl.saveAs(dpath);
    check(g, "Download saves theme.css with exactly the text shown", dl.suggestedFilename() === "theme.css" && readFileSync(dpath, "utf8") === cssText, `${dl.suggestedFilename()}, ${cssText.length} chars`);
    await page.getByRole("button", { name: "Copy CSS" }).click(); await page.waitForTimeout(250);
    const label = await page.locator(".actions .btn.primary").first().innerText(), clip = await page.evaluate(() => navigator.clipboard.readText()).catch((e) => `ERR ${e.message}`);
    check(g, "Copy puts the CSS on the clipboard, the button changes to 'Copied', and the status region announces it", clip === cssText && /Copied/.test(label) && /Copied the theme CSS/.test(await statusText(page)), `button "${label.trim()}", status "${await statusText(page)}"`);
    await page.waitForTimeout(1800);
    check(g, "the 'Copied' feedback goes back to 'Copy CSS' after ~1.6s", /Copy CSS/.test(await page.locator(".actions .btn.primary").first().innerText()), "reset");
    // JS object
    await page.getByLabel("JS object").check();
    const js = await page.locator('[data-testid="export"]').inputValue(), obj = JSON.parse(js.slice(js.indexOf("{")));
    check(g, "JS object format: the registry entry (name, families, fonts, bodySize, h1, page margins in px) equals the library's own conversion", JSON.stringify(obj) === JSON.stringify(BM.toRegistryObject(stA)) && obj.page.margin.left === 93.33 && obj.name === "my-theme", `fonts ${obj.fonts.map((f) => f.file).join(", ")}`);
    await page.getByLabel("CSS", { exact: true }).check();
    // fresh context: import the CSS (paste)
    const fresh = await browser.newContext({ viewport: { width: 1280, height: 900 } }), fp = await open(fresh);
    check(g, "the fresh context starts from the default theme (empty storage)", (await st(fp)).colors.primary === "#18181b" && (await st(fp)).name === "custom", "default");
    await fp.locator("#import-css").fill(cssText); await fp.getByRole("button", { name: "Apply pasted CSS" }).click(); await settle(fp);
    const stB = await st(fp), fB = await snap(fp, "exB"), res = await fp.locator('[data-testid="import-result"]').innerText();
    check(g, "round trip in a fresh browser context: the imported state equals the exported one (all 12 colors, fonts, 21 numbers, name; base excluded)", BM.statesEqual({ ...stB, base: "" }, { ...stA, base: "" }), `name ${stB.name}; ${res.split("\n")[0]}`);
    check(g, "the imported render has identical PDF text and equal pixels (72 and 144 dpi) to the exported one", text(fB) === text(fA) && pix(fB, 72) === pix(fA, 72) && pix(fB, 144) === pix(fA, 144), `pixels ${pix(fB, 144)} == ${pix(fA, 144)}; ${pageCount(fB)} page(s)`);
    check(g, "the import result is announced (summary in the live region) and lists notes for what the file did not set", (await statusText(fp)).startsWith("Imported ") && /Imported \d+ values from the pasted CSS/.test(res), `status: ${await statusText(fp)}`);
    // file import
    const fileCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } }), fl = await open(fileCtx);
    await fl.locator("#import-file").setInputFiles(dpath); await settle(fl);
    check(g, "importing the downloaded theme.css through the file input gives the same state", BM.statesEqual({ ...(await st(fl)), base: "" }, { ...stA, base: "" }) && /from theme\.css/.test(await fl.locator('[data-testid="import-result"]').innerText()), "same state");
    // problems are explained
    const messy = `:root { --primary: #zzzzzz; --foo-bar: 3; --accent: #00ff00; --font-body: "Comic Sans"; }\n@theme { --text-h1: 500pt; --spacing: 9pt; }`;
    await fl.locator("#import-css").fill(messy); await fl.getByRole("button", { name: "Apply pasted CSS" }).click();
    const list = await fl.locator('[data-testid="import-result"] li').allInnerTexts(), sum = await fl.locator('[data-testid="import-result"] .result-summary').innerText();
    const covers = ["--primary", "--foo-bar", "--font-body", "--text-h1", "--spacing"].every((v) => list.some((l) => l.includes(v)));
    check(g, "importing a messy file explains every problem (rejected hex, unknown variable, unbundled font, out of range, fixed scale) next to its variable name", covers && /Rejected/.test(list.join()) && /Ignored/.test(list.join()) && /unknown variable/.test(list.join()), `${list.length} items; summary "${sum}"`);
    check(g, "…while the valid line (--accent #00ff00) was applied and the invalid ones kept their old values", (await st(fl)).colors.accent === "#00ff00" && (await st(fl)).colors.primary === stA.colors.primary && (await st(fl)).fonts.body === stA.fonts.body, `accent ${(await st(fl)).colors.accent}, primary ${(await st(fl)).colors.primary}`);
    await fl.locator("#import-css").fill("hello { color: red }"); await fl.getByRole("button", { name: "Apply pasted CSS" }).click();
    check(g, "CSS without any theme variable changes nothing and says so", /No theme variables found/.test(await fl.locator('[data-testid="import-result"]').innerText()), await fl.locator('[data-testid="import-result"] .result-summary').innerText());
    await fl.close(); await fileCtx.close(); await fp.close(); await fresh.close();
    // import is one undo step
    const hb = await hist(page); await page.locator("#import-css").fill(`:root{--info:#112233;--success:#223344}`); await page.getByRole("button", { name: "Apply pasted CSS" }).click(); await settle(page);
    check(g, "an import is a single undoable step", (await hist(page)) - hb === 1 && (await st(page)).colors.info === "#112233", "history +1");
  });

  await section("contrast", async () => {
    const g = "contrast";
    await reopen();
    const read = async () => Object.fromEntries(await page.locator('[data-testid="contrast-table"] tbody tr').evaluateAll((trs) => trs.map((tr) => [tr.dataset.pair, { ratio: tr.querySelector(".ratio").textContent.trim(), result: tr.querySelector(".badge").textContent.trim() }])));
    const pairs = { "fg-bg": ["foreground", "background"], "mfg-bg": ["muted-foreground", "background"], "mfg-muted": ["muted-foreground", "muted"], "pfg-primary": ["primary-foreground", "primary"] };
    const verify = async (label) => {
      const s = await st(page), got = await read(); let ok = true; const lines = [];
      for (const [id, [a, b]] of Object.entries(pairs)) { const r = wcag(s.colors[a], s.colors[b]), want = `${r.toFixed(2)}:1`, pass = r >= 4.5 ? "Pass" : "Fail"; if (got[id].ratio !== want || got[id].result !== pass) ok = false; lines.push(`${id} ${got[id].ratio} ${got[id].result}`); }
      const nFail = Object.values(got).filter((x) => x.result === "Fail").length, summary = await page.locator('[data-testid="contrast-summary"]').innerText();
      if (!(nFail ? new RegExp(`${nFail} of 4 pairs are below 4.5:1`).test(summary) : /All 4 pairs reach 4.5:1/.test(summary))) ok = false;
      check(g, `${label}: the four ratios, Pass/Fail words and summary equal an independent calculation`, ok, lines.join("; "));
    };
    await verify("default theme (muted pairs fail, as in pdfcn's minimal)");
    await setHex(page, "foreground", "#777777"); await setHex(page, "muted-foreground", "#595959"); await setHex(page, "primary", "#fde047"); await setHex(page, "primary-foreground", "#ffffff"); await settle(page);
    await verify("after editing foreground #777777, muted foreground #595959, primary yellow with white text");
    await page.locator("#clone-from").selectOption("corporate"); await page.getByRole("button", { name: "Clone theme" }).click(); await settle(page);
    await verify("cloned corporate theme");
    const hasWords = (await page.locator('[data-testid="contrast-table"] .badge').allInnerTexts()).every((t) => /Pass|Fail/.test(t)), icons = await page.locator('[data-testid="contrast-table"] .badge svg').count();
    check(g, "pass/fail is not shown by color alone: every row has the word Pass/Fail and an icon, and the summary has an icon and text", hasWords && icons === 4 && (await page.locator('[data-testid="contrast-summary"] svg').count()) === 1, `${icons} icons`);
    check(g, "the panel sits at the top of the Colors card, before the first color control (next to them)", await page.evaluate(() => { const c = document.querySelector('[data-testid="contrast-table"]').getBoundingClientRect().top, f = document.querySelector("#f-color-foreground-hex").getBoundingClientRect().top; return c < f; }), "above the controls");
    // warns, never blocks
    await setHex(page, "foreground", "#fefefe"); await settle(page);
    check(g, "a failing pair warns but never blocks: foreground #fefefe on white (1.0x) is applied and rendered", (await st(page)).colors.foreground === "#fefefe" && (await page.locator('[data-testid="contrast-summary"]').innerText()).includes("below 4.5:1"), "applied with warning");
  });

  await section("keyboard", async () => {
    const g = "keyboard";
    await reopen();
    await page.evaluate(() => document.activeElement?.blur());
    // expected tab stops (visible, enabled, one per radio group), in DOM order
    const expected = await page.evaluate(() => {
      const els = [...document.querySelectorAll('a[href], button, input, select, textarea, [tabindex="0"]')].filter((e) => !e.disabled && e.type !== "hidden" && !e.closest("[inert]") && !e.closest("iframe") && e.getClientRects().length && getComputedStyle(e).visibility !== "hidden" && !e.closest(".frame"));
      const radios = new Set(), out = [];
      for (const e of els) { if (e.type === "radio") { if (radios.has(e.name) || (!e.checked && els.some((o) => o.name === e.name && o.checked))) continue; radios.add(e.name); } out.push(e); }
      out.forEach((e, i) => { e.dataset.tab = String(i); });
      return out.map((e, i) => `${i}:${e.tagName.toLowerCase()}${e.type ? `[${e.type}]` : ""}#${e.id || e.getAttribute("aria-label") || e.textContent.trim().slice(0, 20)}`);
    });
    const visited = [], rings = []; let stray = 0;
    for (let i = 0; i < expected.length + 12; i++) {
      await page.keyboard.press("Tab");
      const info = await page.evaluate(() => {
        const e = document.activeElement; if (!e || e === document.body) return { end: true };
        const t = e.dataset.tab; if (t === undefined) return { tab: -1, tag: e.tagName };
        const target = e.matches('input[type="file"]') ? e.closest("label") : e.matches('input[type="radio"]') ? e.nextElementSibling : e, s = getComputedStyle(target);
        return { tab: +t, ring: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2, vis: e.matches(":focus-visible"), tag: e.tagName };
      });
      if (info.end) break; if (info.tab === -1) { stray++; if (info.tag === "IFRAME") break; continue; }
      visited.push(info.tab); rings.push(info.ring && info.vis);
    }
    const inOrder = visited.every((v, i) => i === 0 || v > visited[i - 1]), all = expected.map((_, i) => i).every((i) => visited.includes(i));
    check(g, `Tab reaches every enabled control in DOM order (${expected.length} stops: skip link, toolbar, base theme, name, 12 colors x (picker, hex, reset), selects, sliders + numbers, export radios/box/buttons, import box/buttons/file, document select)`, inOrder && all, `${visited.length}/${expected.length} visited, in order ${inOrder}, extra stops ${stray}`);
    check(g, "every focused control shows a visible focus ring (:focus-visible, outline >= 2px; on the label/segment for hidden-input controls)", rings.length === visited.length && rings.every(Boolean), `${rings.filter(Boolean).length}/${rings.length}`);
    const tabbableIframes = await page.evaluate(() => [...document.querySelectorAll("iframe")].filter((f) => !f.closest("[inert]") && !f.hasAttribute("inert")).length);
    check(g, "only the visible preview iframe is tabbable (the hidden one is inert), and it has a distinct title", tabbableIframes === 1 && (await page.evaluate(() => [...document.querySelectorAll("iframe")].map((f) => f.title).join("|"))).includes("PDF preview"), `${tabbableIframes} non-inert iframe(s)`);
    // keyboard-only operation of every control kind
    const tabTo = async (sel, max = 160, dir = "Tab") => { for (let i = 0; i < max; i++) { if (await page.evaluate((s) => document.activeElement?.matches(s), sel)) return true; await page.keyboard.press(dir); } return false; };
    await reopen(); // the tab walk above ended inside the PDF iframe; start the operating run from a fresh page, focus at the top
    const log = [], did = async (name, fn) => { try { const ok = await fn(); log.push(`${ok ? "ok" : "FAIL"} ${name}`); return ok; } catch (e) { log.push(`FAIL ${name}: ${e.message.slice(0, 50)}`); return false; } };
    await page.keyboard.press("Tab"); await page.keyboard.press("Tab"); // skip link, back link
    // closed <select>: type-ahead picks an option on every platform (macOS opens the popup on arrow keys)
    await did("select base theme (type-ahead 'b')", async () => { await tabTo("#clone-from"); await page.keyboard.type("b"); return (await page.locator("#clone-from").inputValue()) === "blueprint"; });
    await did("Clone theme (Enter)", async () => { await page.keyboard.press("Tab"); await page.keyboard.press("Enter"); await settle(page); return (await st(page)).name.endsWith("-custom"); });
    await did("theme name (type + Enter)", async () => { await tabTo("#theme-name"); await page.keyboard.press("ControlOrMeta+KeyA"); await page.keyboard.type("kbd-theme"); await page.keyboard.press("Enter"); return (await st(page)).name === "kbd-theme"; });
    await did("hex field (type + Enter)", async () => { await tabTo("#f-color-primary-hex"); await page.keyboard.press("ControlOrMeta+KeyA"); await page.keyboard.type("#a1b2c3"); await page.keyboard.press("Enter"); await settle(page); return (await st(page)).colors.primary === "#a1b2c3"; });
    await did("color reset button (Space)", async () => { await page.keyboard.press("Tab"); const ok = await page.evaluate(() => document.activeElement.getAttribute("aria-label")?.startsWith("Reset Primary")); await page.keyboard.press("Space"); return ok && (await st(page)).colors.primary !== "#a1b2c3"; });
    await did("body font select (type-ahead 'N')", async () => { await tabTo("#font-body"); await page.keyboard.type("N"); return (await page.locator("#font-body").inputValue()) === "Nunito" && (await st(page)).fonts.body === "Nunito"; });
    await did("body size slider (ArrowRight x3)", async () => { await tabTo("#f-type-bodySize-r"); const v = (await st(page)).type.bodySize; for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight"); return (await st(page)).type.bodySize > v; });
    await did("body size number (type + Enter)", async () => { await page.keyboard.press("Tab"); await page.keyboard.press("ControlOrMeta+KeyA"); await page.keyboard.type("13"); await page.keyboard.press("Enter"); return (await st(page)).type.bodySize === 13; });
    await did("heading scale select (type-ahead 'minor')", async () => { await tabTo("#scale"); await page.keyboard.type("minor"); return (await page.locator("#scale").inputValue()) === "minor-third"; });
    await did("margin number (type + Enter)", async () => { await tabTo("#f-margin-top-n"); await page.keyboard.press("ControlOrMeta+KeyA"); await page.keyboard.type("90"); await page.keyboard.press("Enter"); return (await st(page)).margin.top === 90; });
    await did("export format radio (ArrowDown selects JS object)", async () => { await tabTo('input[name="fmt"]'); await page.keyboard.press("ArrowDown"); return /registry|JS/i.test(await page.locator('label[for="out"]').innerText()); });
    await did("Copy (Enter) announces", async () => { await tabTo("#out"); await page.keyboard.press("Tab"); await page.keyboard.press("Enter"); await page.waitForTimeout(300); return /Copied|Could not copy/.test(await statusText(page)); });
    await did("Download (Enter)", async () => { await page.keyboard.press("Tab"); const [d] = await Promise.all([page.waitForEvent("download", { timeout: 5000 }), page.keyboard.press("Enter")]); return d.suggestedFilename() === "theme.js"; });
    await did("import textarea (type) + Apply (Enter)", async () => { await tabTo("#import-css"); await page.keyboard.type(":root{--info:#102030}"); await page.keyboard.press("Tab"); await page.keyboard.press("Enter"); await settle(page); return (await st(page)).colors.info === "#102030"; });
    await did("file input is focusable (Tab) and shows the label focus ring", async () => { await tabTo("#import-file"); return await page.evaluate(() => getComputedStyle(document.querySelector("label.file")).outlineStyle !== "none"); });
    await did("document select (type-ahead 'Report: m')", async () => { await tabTo("#doc"); await page.keyboard.type("Report: m"); await settle(page); return (await page.evaluate(() => window.__builder.doc())) === "report-marketing"; });
    await did("Ctrl+Z from a focused control undoes", async () => { const h = await hist(page); await page.keyboard.press("Control+KeyZ"); return (await hist(page)) < h; });
    await did("Shift+Tab walks backwards", async () => { const a = await page.evaluate(() => document.activeElement?.id); await page.keyboard.press("Shift+Tab"); return (await page.evaluate(() => document.activeElement?.id)) !== a; });
    check(g, "keyboard-only run (no mouse calls): every kind of control operated with Tab / arrows / type / Enter / Space and changed the theme", log.every((l) => l.startsWith("ok")), log.join("; "));
    await page.getByRole("button", { name: "Reset all" }).click().catch(() => {}); await settle(page);
  });

  await section("quality", async () => {
    const g = "quality";
    await reopen();
    // hit areas
    const hits = async (p) => p.evaluate(() => { const bad = []; for (const e of document.querySelectorAll("button, select, input:not([type=radio]):not([type=file]), textarea, a.link, a.skip, .seg span, label.file")) { if (!e.getClientRects().length) continue; const r = e.getBoundingClientRect(); const need = e.matches("textarea") ? 40 : 40; if (r.height < need - 0.5 || (r.width < 40 && !e.matches("a.skip"))) bad.push(`${e.tagName.toLowerCase()}#${e.id || e.getAttribute("aria-label") || e.textContent.trim().slice(0, 12)} ${Math.round(r.width)}x${Math.round(r.height)}`); } return bad; });
    check(g, "hit areas >= 40px (height and width) for every button, select, text/number/color/range input, segment, file button and link at 1280px", (await hits(page)).length === 0, (await hits(page)).slice(0, 5).join(", ") || "all >= 40x40");
    // motion
    const motion = await page.evaluate(() => { const bad = [], seen = new Set(); let max = 0; const curves = new Set(); for (const e of document.querySelectorAll(".builder, .builder *")) { const s = getComputedStyle(e), props = s.transitionProperty, d = s.transitionDuration.split(",").map((x) => parseFloat(x) * (x.includes("ms") ? 1 : 1000)); if (props === "all" && d.some((x) => x > 0)) bad.push(`${e.className}: all`); d.forEach((x) => { max = Math.max(max, x); }); if (d.some((x) => x > 0)) { curves.add(s.transitionTimingFunction); seen.add(props); } } return { bad: bad.slice(0, 3), max, curves: [...curves], props: [...seen] }; });
    check(g, "no `transition: all`; every transition is <= 200ms, on named properties, with an ease-out curve", !motion.bad.length && motion.max <= 200 && motion.curves.every((c) => /cubic-bezier\(0\.23, 1, 0\.32, 1\)|ease-out/.test(c)), `max ${motion.max}ms; ${motion.props.join(" / ")}; curves ${motion.curves.join(" / ")}`);
    const rm = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" }), rp = await open(rm);
    const rmax = await rp.evaluate(() => { let max = 0; for (const e of document.querySelectorAll(".builder, .builder *")) for (const x of getComputedStyle(e).transitionDuration.split(",")) max = Math.max(max, parseFloat(x) * (x.includes("ms") ? 1 : 1000)); return max; });
    check(g, "prefers-reduced-motion: every transition is 0ms", rmax === 0, `max ${rmax}ms`);
    await rp.close(); await rm.close();
    // concentric radii
    const rad = await page.evaluate(() => { const c = getComputedStyle(document.querySelector(".card")), i = getComputedStyle(document.querySelector(".select")); return { outer: parseFloat(c.borderTopLeftRadius), pad: parseFloat(c.paddingLeft), inner: parseFloat(i.borderTopLeftRadius) }; });
    check(g, "concentric radii: card radius = control radius + card padding (16 = 8 + 8)", rad.outer === rad.inner + rad.pad, JSON.stringify(rad));
    // layout shift + previous PDF visible
    await page.evaluate(() => { window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: false }); });
    const rect = () => page.evaluate(() => { const f = document.querySelector(".frame").getBoundingClientRect(), p = document.querySelector(".panel").getBoundingClientRect(); return [f.x, f.y, f.width, f.height, p.width].map(Math.round).join(","); });
    const r0 = await rect(), blanks = []; let polling = true;
    const poll = (async () => { while (polling) { blanks.push(await page.evaluate(() => { const f = document.querySelector("iframe:not(.back)"); return !!f?.getAttribute("src"); })); await page.waitForTimeout(25); } })();
    for (const v of ["#aa3366", "#33aa66", "#3366aa"]) { await setHex(page, "primary", v); await settle(page); }
    await page.locator("#doc").selectOption("report-financial"); await settle(page); await page.locator("#doc").selectOption("invoice-modern"); await settle(page);
    polling = false; await poll;
    const cls = await page.evaluate(() => window.__cls);
    check(g, "no layout shift while the preview re-renders: layout-shift score ~0 and the preview/controls boxes keep their size", cls < 0.01 && (await rect()) === r0, `CLS ${cls.toFixed(4)}; frame ${r0} -> ${await rect()}`);
    check(g, "the previous PDF stays visible while the next one renders (front iframe always had a src across 5 re-renders)", blanks.length > 20 && blanks.every(Boolean), `${blanks.length} samples, ${blanks.filter((b) => !b).length} blank`);
    // layouts
    for (const [w, h, name] of [[1280, 900, "1280"], [360, 780, "360"]]) {
      const c = await browser.newContext({ viewport: { width: w, height: h } }), p = await open(c);
      const m = await p.evaluate(() => { const panel = document.querySelector(".panel").getBoundingClientRect(), stage = document.querySelector(".stage").getBoundingClientRect(), prev = document.querySelector(".frame").getBoundingClientRect(); return { sw: document.documentElement.scrollWidth, iw: innerWidth, panelRight: panel.right, panelBottom: panel.bottom + scrollY, stageLeft: stage.left, stageTop: stage.top + scrollY, frameH: prev.height }; });
      if (name === "1280") check(g, "1280px: controls on the left, preview to the right, no horizontal scroll", m.stageLeft >= m.panelRight - 1 && m.sw <= m.iw, JSON.stringify(m));
      else check(g, "360px: controls first, the preview stacks under them (below the last control), no horizontal scroll, preview at least 70% of the viewport tall", m.stageTop >= m.panelBottom - 1 && m.sw <= m.iw && m.frameH >= h * 0.65, JSON.stringify(m));
      check(g, `${name}px: all controls keep >= 40px hit areas`, (await hits(p)).length === 0, (await hits(p)).slice(0, 4).join(", ") || "ok");
      await p.close(); await c.close();
    }
    // dark chrome does not change the PDF
    const dark = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" }), light = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "light" });
    const dp = await open(dark), lp = await open(light);
    const bgs = [await dp.evaluate(() => getComputedStyle(document.querySelector(".builder")).backgroundColor), await lp.evaluate(() => getComputedStyle(document.querySelector(".builder")).backgroundColor)];
    const fd = await snap(dp, "dark"), fl = await snap(lp, "light");
    check(g, "dark and light page chrome differ, but the PDF is the same (text and pixels): the chrome never leaks into the document", bgs[0] !== bgs[1] && text(fd) === text(fl) && pix(fd, 144) === pix(fl, 144), `chrome ${bgs.join(" vs ")}; pixels ${pix(fd, 144)} == ${pix(fl, 144)}`);
    // axe
    const axeRun = async (p, label) => { await p.addScriptTag({ path: AXE }); const r = await p.evaluate(async () => { const x = await window.axe.run(document, { exclude: [[".frame"]], resultTypes: ["violations"] }); return x.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, n: v.nodes.length, sample: v.nodes[0].target.join(" ") })); }); return { label, r }; };
    const scans = [];
    scans.push(await axeRun(page, "1280 light, default state"));
    await setHex(page, "accent", "#12"); await page.locator("#import-css").fill(":root{--foo:1;--primary:#nope}"); await page.getByRole("button", { name: "Apply pasted CSS" }).click();
    scans.push(await axeRun(page, "1280 light, invalid hex + import errors shown"));
    scans.push(await axeRun(dp, "1280 dark"));
    const small = await browser.newContext({ viewport: { width: 360, height: 780 } }), sp = await open(small); scans.push(await axeRun(sp, "360 light"));
    const byImpact = {}; for (const { r } of scans) for (const v of r) byImpact[v.impact] = (byImpact[v.impact] ?? 0) + 1;
    const serious = scans.flatMap(({ label, r }) => r.filter((v) => ["serious", "critical"].includes(v.impact)).map((v) => `${label}: ${v.id} (${v.impact}) ${v.sample}`));
    check(g, "axe-core: zero serious/critical violations on the builder (4 scans: 1280 light, with errors shown, 1280 dark, 360)", serious.length === 0, serious.join(" | ") || `violations by impact: ${JSON.stringify(byImpact)}; ${scans.map((s) => `${s.label}: ${s.r.length}`).join("; ")}`);
    check(g, "axe-core violations of any impact (reported, not required to be zero)", true, scans.flatMap(({ label, r }) => r.map((v) => `${label}: ${v.id}/${v.impact} x${v.n} (${v.help})`)).join(" | ") || "none", true);
    await sp.close(); await small.close(); await dp.close(); await lp.close(); await dark.close(); await light.close();
  });

  check("builder", "no console errors or Vue warnings through the whole session (all pages)", errors.length === 0, errors.slice(0, 3).join(" | "));

  // ---- screenshots in a headed browser (headless shows an empty PDF viewer)
  let headed = true;
  try {
    const hb = await chromium.launch({ headless: false });
    for (const [w, h, name] of [[1280, 900, "1280"], [360, 780, "360"]]) {
      const c = await hb.newContext({ viewport: { width: w, height: h } }), p = watch(await c.newPage());
      await p.goto(`${base}&base=vivid&doc=components-all`); await settle(p); await p.waitForTimeout(1200);
      await p.screenshot({ path: `${OUT}/builder-${name}.png`, fullPage: name === "360" ? false : false });
      if (name === "360") { await p.evaluate(() => document.querySelector("#preview").scrollIntoView()); await p.waitForTimeout(600); await p.screenshot({ path: `${OUT}/builder-360-preview.png` }); }
      await c.close();
    }
    await hb.close();
  } catch (e) { headed = false; const hb = await chromium.launch(); for (const [w, h, name] of [[1280, 900, "1280"], [360, 780, "360"]]) { const c = await hb.newContext({ viewport: { width: w, height: h } }), p = await c.newPage(); await p.goto(`${base}&base=vivid&doc=components-all`); await settle(p); await p.screenshot({ path: `${OUT}/builder-${name}.png` }); await c.close(); } await hb.close(); }
  check("screenshots", `screenshots at 1280px and 360px written to out/phase4b/ (${headed ? "headed Chromium: the PDF is visible" : "headless fallback: the PDF viewer area is blank"})`, ["builder-1280.png", "builder-360.png"].every((f) => existsSync(`${OUT}/${f}`)), `${OUT}/builder-1280.png, builder-360.png${headed ? ", builder-360-preview.png" : ""}`);
} catch (e) { check("browser", "browser run", false, String(e?.stack ?? e).slice(0, 400)); }
finally { await browser?.close(); await server?.close(); await close(); }

const groups = [...new Set(rows.map((r) => r.group))];
const real = rows.filter((r) => !r.info);
const md = ["| # | group | check | result | detail |", "|---|---|---|---|---|", ...rows.map((r, i) => `| ${i + 1} | ${r.group} | ${r.name} | ${r.info ? "INFO" : r.pass ? "PASS" : "FAIL"} | ${r.detail.replace(/\|/g, "\\|").replace(/\n/g, "<br>")} |`)].join("\n");
const total = `${real.filter((r) => r.pass).length}/${real.length} pass (+${rows.length - real.length} info rows)`;
const summary = groups.map((g) => `${g}: ${real.filter((r) => r.group === g && r.pass).length}/${real.filter((r) => r.group === g).length}`).join(" · ");
writeFileSync(`${OUT}/report.md`, `# Phase 4b E2E\n\n${md}\n\n${total}\n\n${summary}\n`);
console.log(md + `\n\n${total}\n${summary}`);
process.exit(real.every((r) => r.pass) ? 0 : 1);
