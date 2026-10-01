// Phase 5b E2E: the playground's interface review fixes, measured. App and Builder at 320 / 360 / 640 px (640 = 200% zoom of 1280), landmarks,
// skip link and tab count, aria-current, hit areas, text sizes, theme descriptions, the 3-state toggle on one row, press/hover feedback,
// the PdfPreview error banner with a simulated failed wasm fetch + Retry, and axe-core on the MAIN playground in light and dark.
// Writes out/phase5b/ (report.md, screenshots).
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "vite";
import { chromium } from "playwright-core";
import { themeNames, themes } from "../src/themes/index.js";

const OUT = "out/phase5b";
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const require = createRequire(import.meta.url);
const AXE = require.resolve("axe-core/axe.min.js");

const rows = [];
const check = (group, name, pass, detail = "", info = false) => rows.push({ group, name, pass: !!pass, detail: String(detail), info });
const section = async (g, fn) => { try { await fn(); } catch (e) { check(g, "section ran without throwing", false, String(e?.stack ?? e).split("\n").slice(0, 3).join(" | ")); } };

let server, browser;
try {
  server = await createServer({ configFile: "vite.config.js", root: `${process.cwd()}/playground`, server: { port: 0, host: "127.0.0.1" }, logLevel: "error" });
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
  browser = await chromium.launch();
  const errors = [];
  const URL_ = { app: `${base}/`, builder: `${base}/?view=builder`, invoice: `${base}/?demo=invoice` };
  const ready = (p, which) => which === "builder" ? p.waitForFunction(() => { const b = window.__builder, r = b?.renders.at(-1); return !!r && r.key === b.key(); }, null, { timeout: 60000 }) : p.waitForFunction(() => window.__pdfwind?.renders.length >= 1, null, { timeout: 60000 });
  const open = async (which, o = {}, { wait = true, init } = {}) => { const c = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...o }); if (init) await c.addInitScript(init); const p = await c.newPage(); p.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`)); p.on("console", (m) => ["error", "warning"].includes(m.type()) && !/Failed to load resource/.test(m.text()) && errors.push(`${m.type()}: ${m.text()}`)); await p.goto(URL_[which]); if (wait) await ready(p, which === "invoice" ? "app" : which); return p; };
  const close = (p) => p.context().close();

  await section("overflow", async () => {
    const g = "overflow";
    for (const which of ["app", "builder", "invoice"]) {
      const res = [];
      for (const w of [320, 360, 640]) { const p = await open(which, { viewport: { width: w, height: 800 } }); const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, bsw: document.body.scrollWidth })); res.push(`${w}px: scrollWidth ${m.sw} / ${m.iw}`); if (m.sw > m.iw || m.bsw > m.iw) res.push("OVERFLOW"); await close(p); }
      check(g, `${which === "invoice" ? "app, sample-invoice view (has the form controls)" : which}: no horizontal scroll at 320px, 360px and 640px (= 200% zoom of 1280px)`, !res.includes("OVERFLOW"), res.join("; "));
    }
    // layouts: 1280 keeps sidebar + content side by side; narrow stacks and the sidebar is a closed disclosure
    const w = await open("app"), m = await w.evaluate(() => { const s = document.querySelector(".side").getBoundingClientRect(), c = document.querySelector("main").getBoundingClientRect(), d = document.querySelector("details.navbox"), sum = getComputedStyle(d.querySelector("summary")).display; return { sideRight: s.right, contentLeft: c.left, contentW: c.width, open: d.open, sum }; });
    check(g, "1280px: sidebar on the left, content to its right, the disclosure is open and its summary is hidden", m.contentLeft >= m.sideRight - 1 && m.contentW > 900 && m.open && m.sum === "none", JSON.stringify(m));
    await close(w);
    const n = await open("app", { viewport: { width: 360, height: 800 } });
    const nm = await n.evaluate(() => { const d = document.querySelector("details.navbox"), s = document.querySelector(".side").getBoundingClientRect(), c = document.querySelector("main").getBoundingClientRect(), vis = [...document.querySelectorAll(".side nav button")].some((b) => b.checkVisibility()); return { open: d.open, sumDisplay: getComputedStyle(d.querySelector("summary")).display, stacked: c.top >= s.bottom - 1, demoButtonsVisible: vis, preview: document.querySelector(".preview").getBoundingClientRect().height }; });
    check(g, "360px: the sidebar is a closed 'Documents, themes and settings' disclosure above the content (the ~36 demo buttons are not in the way); the preview is stacked below and tall", !nm.open && nm.sumDisplay !== "none" && nm.stacked && !nm.demoButtonsVisible && nm.preview >= 380, JSON.stringify(nm));
    await n.locator("summary").focus(); await n.keyboard.press("Enter");
    check(g, "the disclosure opens from the keyboard (Enter on the summary) and then shows the theme group and the demo list", await n.evaluate(() => document.querySelector("details.navbox").open && [...document.querySelectorAll(".side nav button")].every((b) => b.checkVisibility())), "open");
    await n.screenshot({ path: `${OUT}/app-360-open.png` }); await close(n);
    const st = await open("app"); const pos = await st.evaluate(() => getComputedStyle(document.querySelector(".stat")).position);
    check(g, "the render stat text is in flow (not position:absolute) so it can wrap with the bar", pos === "static", `position ${pos}`); await close(st);
  });

  await section("landmarks", async () => {
    const g = "landmarks";
    for (const which of ["app", "builder"]) { const p = await open(which); const c = await p.evaluate(() => ({ main: document.querySelectorAll("main, [role=main]").length, h1: document.querySelectorAll("h1").length, nav: document.querySelectorAll("nav").length, banner: document.querySelectorAll("header").length })); check(g, `${which}: exactly one <main>${which === "app" ? " and one <h1>; one labelled <nav>; the 'pdfwind' title is not a heading" : " and one <h1>"}`, c.main === 1 && c.h1 === 1 && (which === "builder" || (c.nav === 1 && c.banner === 1)), JSON.stringify(c)); if (which === "app") check(g, "app: the <nav> keeps its label ('Components') and 'pdfwind' is a plain brand line, not an h1/h2", await p.evaluate(() => document.querySelector("nav").getAttribute("aria-label") === "Components" && ![...document.querySelectorAll("h1,h2,h3")].some((h) => h.textContent.trim() === "pdfwind")), "label ok"); await close(p); }
    const p = await open("app"), t1 = await p.locator("h1").innerText();
    await p.locator(".side nav button", { hasText: "Card (wrap vs no wrap)" }).click();
    const t2 = await p.locator("h1").innerText();
    check(g, "the page <h1> describes the current view and follows it (Showcase -> 'Card (wrap vs no wrap)')", /Showcase/.test(t1) && t2 === "Card (wrap vs no wrap)", `"${t1}" -> "${t2}"`);
    await close(p);
  });

  await section("skip", async () => {
    const g = "skip";
    for (const [which, w] of [["app", 1280], ["app", 360], ["builder", 1280]]) {
      const p = await open(which, { viewport: { width: w, height: 800 } });
      await p.keyboard.press("Tab");
      const first = await p.evaluate(() => ({ text: document.activeElement.textContent.trim(), cls: document.activeElement.className, href: document.activeElement.getAttribute("href") }));
      await p.keyboard.press("Enter");
      const moved = await p.evaluate(() => document.activeElement.id);
      let tabs = 1; await p.keyboard.press("Tab"); tabs++;
      const inside = await p.evaluate(() => { const a = document.activeElement; return { tag: a.tagName, inMain: !!a.closest("main, #preview") || a.id === "preview" }; });
      check(g, `${which} @${w}px: the first Tab lands on 'Skip to preview', Enter moves focus to the preview region, one more Tab is inside it (${tabs + 0} Tabs in total, <= 3)`, first.text === "Skip to preview" && /skip/.test(first.cls) && first.href === "#preview" && moved === "preview" && inside.inMain && tabs <= 3, `${JSON.stringify(first)} -> #${moved}; then ${inside.tag}`);
      await close(p);
    }
    const p = await open("app", { viewport: { width: 1280, height: 800 } });
    const count = await p.evaluate(() => [...document.querySelectorAll("a[href], button, input, select, textarea, summary")].filter((e) => !e.disabled && e.getClientRects().length).length);
    await p.keyboard.press("Tab"); await p.keyboard.press("Enter"); await p.keyboard.press("Tab");
    check(g, "without the link, the preview would be behind all the sidebar controls; with it, it is 3 key presses", count > 40, `${count} focusable controls before the preview in the DOM`); await close(p);
  });

  await section("nav", async () => {
    const g = "nav";
    const p = await open("app");
    const cur = () => p.evaluate(() => [...document.querySelectorAll('nav button[aria-current="true"]')].map((b) => b.textContent.trim()));
    const c1 = await cur(); await p.locator(".side nav button", { hasText: "Stack" }).first().click(); const c2 = await cur();
    await p.locator(".side nav button", { hasText: "Sample invoice" }).click(); const c3 = await cur();
    check(g, "aria-current='true' is on exactly one demo button and moves with the selection (Showcase -> Stack -> Sample invoice)", c1.length === 1 && c1[0].startsWith("Showcase") && c2.length === 1 && c2[0] === "Stack" && c3.length === 1 && c3[0] === "Sample invoice", `${c1} -> ${c2} -> ${c3}`);
    check(g, "the .on class and aria-current agree (the visual state is also in the accessibility tree)", await p.evaluate(() => [...document.querySelectorAll("nav button")].every((b) => b.classList.contains("on") === (b.getAttribute("aria-current") === "true"))), "agree");
    // theme group
    const info = await p.evaluate(() => { const f = document.querySelector("fieldset.themes"), d = document.getElementById(f.getAttribute("aria-describedby")); return { legend: f.querySelector("legend").textContent, titles: [...f.querySelectorAll("[title]")].length, desc: d?.textContent.trim(), vis: d?.getClientRects().length > 0, size: parseFloat(getComputedStyle(d).fontSize) }; });
    await p.locator(".themes label", { hasText: "vivid" }).click();
    const after = await p.evaluate(() => document.getElementById("theme-desc").textContent.trim());
    check(g, "theme descriptions have a non-hover path: visible text under the group, linked with aria-describedby, updating with the selection; no title-only tooltips", info.legend === "Theme" && info.titles === 0 && info.vis && info.desc === themes.default.description && after === themes.vivid.description && info.size >= 12, `"${info.desc.slice(0, 40)}…" -> "${after.slice(0, 40)}…"`);
    // radio rows
    const rowsH = await p.evaluate(() => [...document.querySelectorAll(".themes label")].map((l) => Math.round(l.getBoundingClientRect().height)));
    check(g, "every theme radio row (the label is the hit area) is >= 40px tall; clicking the label text selects the radio", rowsH.length === themeNames.length && Math.min(...rowsH) >= 40 && (await p.locator('.themes input[value="vivid"]').isChecked()), `${rowsH.length} rows, min ${Math.min(...rowsH)}px`);
    check(g, "the theme radio group keeps fieldset/legend and getByRole('group', { name: 'Theme' })", (await p.getByRole("group", { name: "Theme" }).count()) === 1 && (await p.getByRole("radio").count()) >= themeNames.length, "group + radios");
    await close(p);
  });

  await section("targets", async () => {
    const g = "targets";
    for (const [label, which, o] of [["app, showcase, 1280px", "app", {}], ["app, sample invoice (form controls), 1280px", "invoice", {}], ["app, showcase, 360px (disclosure open)", "app", { viewport: { width: 360, height: 800 } }]]) {
      const p = await open(which, o);
      if (o.viewport) await p.locator("summary").click();
      const res = await p.evaluate(() => {
        const stops = [...document.querySelectorAll("a[href], button, input, select, textarea, summary, [tabindex='0']")].filter((e) => !e.disabled && e.type !== "hidden" && e.getClientRects().length && !e.closest("[inert]") && !e.closest("iframe") && getComputedStyle(e).visibility !== "hidden");
        const small = [], radioBox = [];
        for (const e of stops) { const r = e.getBoundingClientRect(); if (e.matches('input[type="radio"]')) { const l = e.closest("label"), lr = l.getBoundingClientRect(); radioBox.push(Math.round(lr.height)); if (lr.height < 39.5) small.push(`radio row ${e.value ?? ""} ${Math.round(lr.height)}`); continue; } if (r.height < 39.5) small.push(`${e.tagName.toLowerCase()} "${(e.getAttribute("aria-label") || e.textContent || e.name || "").trim().slice(0, 20)}" ${Math.round(r.width)}x${Math.round(r.height)}`); if (r.height < 24 || r.width < 24) small.push(`TINY ${e.tagName}`); }
        return { n: stops.length, small, radioMin: Math.min(...radioBox) };
      });
      check(g, `${label}: all ${res.n} tab stops are >= 40px tall (radios: the row is the target); none is smaller than 24px`, res.small.length === 0, res.small.slice(0, 5).join(" | ") || `${res.n} stops, radio rows >= ${res.radioMin}px`);
      await close(p);
    }
  });

  await section("text", async () => {
    const g = "text";
    for (const [label, which, o] of [["app", "app", {}], ["app 360px open", "app", { viewport: { width: 360, height: 800 } }], ["sample invoice", "invoice", {}], ["builder", "builder", {}]]) {
      const p = await open(which, o); if (o.viewport) await p.locator("summary").click();
      const m = await p.evaluate(() => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let min = 99, minEl = "", n = 0; const rem = []; while (w.nextNode()) { const t = w.currentNode; if (!t.textContent.trim()) continue; const e = t.parentElement; if (!e || e.closest("iframe, script, style, .sr-only, option") || !e.getClientRects().length) continue; const fs = parseFloat(getComputedStyle(e).fontSize); n++; if (fs < min) { min = fs; minEl = `${e.tagName.toLowerCase()}.${e.className}: "${t.textContent.trim().slice(0, 24)}"`; } } const sheets = []; for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch { continue; } for (const r of rules) if (r.style?.fontSize && /px$/.test(r.style.fontSize) && /\.side|\.themes|\.scheme|\.bar|\.stat|\.controls|\.lede|\.builder|\.pdf-preview|\.hint/.test(r.selectorText ?? "")) sheets.push(`${r.selectorText} ${r.style.fontSize}`); } return { min, minEl, n, px: sheets }; });
      check(g, `${label}: every visible chrome text node is >= 12px computed (${m.n} nodes; smallest ${m.min}px)`, m.min >= 12, `${m.minEl}`);
      check(g, `${label}: chrome font sizes are in rem (no px font-size left in the app/builder/preview rules)`, m.px.length === 0, m.px.slice(0, 4).join(" | ") || "rem only");
      await close(p);
    }
  });

  await section("toggle", async () => {
    const g = "toggle";
    for (const [which, w] of [["app", 1280], ["app", 320], ["builder", 1280], ["builder", 320]]) {
      const p = await open(which, { viewport: { width: w, height: 800 } }); if (which === "app" && w === 320) await p.locator("summary").click();
      const m = await p.evaluate(() => { const ls = [...document.querySelectorAll(".scheme label")].map((l) => l.getBoundingClientRect()), lg = document.querySelector(".scheme legend").getBoundingClientRect(); return { tops: [...new Set(ls.map((r) => Math.round(r.top)))], legendAbove: lg.bottom <= ls[0].top + 1, h: Math.min(...ls.map((r) => r.height)) }; });
      check(g, `${which} @${w}px: System / Light / Dark sit on ONE row with the 'Page colors' label above (no wrapping next to it), >= 40px tall`, m.tops.length === 1 && m.legendAbove && m.h >= 40, JSON.stringify(m)); await close(p);
    }
  });

  await section("motion", async () => {
    const g = "motion";
    const p = await open("app");
    const sels = [".builder-link", ".side nav button", ".scheme span"];
    const props = await p.evaluate((sels) => sels.map((s) => { const e = document.querySelector(s), c = getComputedStyle(e); return { s, prop: c.transitionProperty, dur: c.transitionDuration, ease: c.transitionTimingFunction }; }), sels);
    check(g, "the nav buttons, Builder link and toggle segments transition named properties only (no 'all'), <= 150ms, ease-out curve", props.every((x) => !/\ball\b/.test(x.prop) && /background-color/.test(x.prop) && /scale/.test(x.prop) && x.dur.split(",").every((d) => parseFloat(d) <= 0.15) && /cubic-bezier\(0\.23, 1, 0\.32, 1\)/.test(x.ease)), props.map((x) => `${x.s}: ${x.prop} ${x.dur}`).join(" | "));
    const press = [];
    for (const s of [".builder-link", ".side nav button:nth-of-type(3)", ".scheme label:nth-child(2) span"]) { await p.locator(s).first().scrollIntoViewIfNeeded(); const box = await p.locator(s).first().boundingBox(); await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down(); await p.waitForTimeout(250); press.push(await p.evaluate((s) => getComputedStyle(document.querySelector(s)).scale, s)); await p.mouse.move(2, 2); await p.mouse.up(); /* released off the control: no click, no navigation */ }
    check(g, "press feedback: scale 0.96 while pressed on the Builder link, a nav button and a toggle segment", press.every((v) => v === "0.96"), press.join(", "));
    const hov = await p.evaluate(() => getComputedStyle(document.querySelector(".builder-link")).backgroundColor);
    await p.hover(".builder-link"); await p.waitForTimeout(250);
    const hov2 = await p.evaluate(() => getComputedStyle(document.querySelector(".builder-link")).backgroundColor);
    await p.locator(".side nav button:nth-of-type(4)").scrollIntoViewIfNeeded(); await p.hover(".side nav button:nth-of-type(4)"); await p.waitForTimeout(250);
    const nb = await p.evaluate(() => getComputedStyle(document.querySelector(".side nav button:nth-of-type(4)")).backgroundColor);
    check(g, "hover feedback (parity with the Builder): the Builder link and nav buttons change background on hover", hov !== hov2 && nb !== "rgba(0, 0, 0, 0)", `link ${hov} -> ${hov2}; nav button ${nb}`);
    await close(p);
    const r = await open("app", { reducedMotion: "reduce" });
    const rd = await r.evaluate((sels) => sels.map((s) => getComputedStyle(document.querySelector(s)).transitionDuration), sels);
    const box = await r.locator(".builder-link").boundingBox(); await r.mouse.move(box.x + 5, box.y + 5); await r.mouse.down(); await r.waitForTimeout(100); const sc = await r.evaluate(() => getComputedStyle(document.querySelector(".builder-link")).scale); await r.mouse.up();
    check(g, "prefers-reduced-motion: no transitions (0s) and no press scale", rd.every((d) => d.split(",").every((x) => parseFloat(x) === 0)) && (sc === "none" || sc === "1"), `${rd.join(" | ")}; pressed scale ${sc}`);
    await close(r);
  });

  await section("error", async () => {
    const g = "error";
    const c = await browser.newContext({ viewport: { width: 1280, height: 800 } }), q = await c.newPage(); const errs = []; q.on("console", (m) => m.type() === "error" && errs.push(m.text()));
    await q.route(/\.wasm(\?|$)/, (r) => r.abort()); // the engine file only (not the wasm-url JS module)
    await q.goto(URL_.app);
    await q.waitForSelector(".pdf-preview-error", { timeout: 60000 });
    const b = await q.evaluate(() => { const e = document.querySelector(".pdf-preview-error"), pr = document.querySelector(".preview").getBoundingClientRect(); const d = e.querySelector("details"); return { role: e.getAttribute("role"), what: e.querySelector(".pdf-preview-error-what").textContent.trim(), btn: e.querySelector("button")?.textContent.trim(), btnH: e.querySelector("button")?.getBoundingClientRect().height, detailsOpen: d?.open, raw: d?.querySelector("pre").textContent.trim(), rawVisible: d?.querySelector("pre").checkVisibility(), preview: `${Math.round(pr.width)}x${Math.round(pr.height)}`, fs: parseFloat(getComputedStyle(e).fontSize), pos: getComputedStyle(e).position }; });
    check(g, "failed wasm fetch: the banner (role=alert) says in plain language what failed and what to try ('check your connection, then press Retry'), has a visible Retry button >= 40px", b.role === "alert" && /did not load/.test(b.what) && /(Check|Press|Choose|Try)/.test(b.what) && /Retry/.test(b.what) && b.btn === "Retry" && b.btnH >= 40 && b.fs >= 12, `"${b.what}"`);
    check(g, "the raw exception is kept in a collapsed 'Technical details' element (not shown by default, still in the DOM)", b.detailsOpen === false && !!b.raw && b.raw.length > 5 && !b.rawVisible, `raw: ${b.raw?.slice(0, 80)}`);
    check(g, "the banner is an overlay (position absolute): the preview keeps its size, no layout shift", b.pos === "absolute", `preview ${b.preview}`);
    const before = await q.evaluate(() => { const r = document.querySelector(".preview").getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; });
    await q.unroute(/\.wasm(\?|$)/);
    await q.getByRole("button", { name: "Retry" }).click();
    await q.waitForFunction(() => window.__pdfwind?.renders.length >= 1 && !document.querySelector(".pdf-preview-error"), null, { timeout: 60000 });
    const after = await q.evaluate(() => ({ preview: (() => { const r = document.querySelector(".preview").getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; })(), renders: window.__pdfwind.renders.length, iframe: !!document.querySelector("iframe[src^='blob:']") }));
    check(g, "Retry re-renders: the banner goes away, a PDF is drawn (render logged, blob iframe), and the preview box is unchanged", after.renders >= 1 && after.iframe && after.preview === before, `renders ${after.renders}; preview ${before} -> ${after.preview}`);
    await c.close();
  });

  await section("axe", async () => {
    const g = "axe";
    const scan = async (p, label) => { await p.addScriptTag({ path: AXE }); const r = await p.evaluate(async () => { const x = await window.axe.run(document, { exclude: [["iframe"], [".pdf-preview"]], resultTypes: ["violations"] }); return x.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, n: v.nodes.length, sample: v.nodes[0].target.join(" ") })); }); return { label, r }; };
    const scans = [];
    for (const scheme of ["light", "dark"]) { const p = await open("app", { colorScheme: scheme }); scans.push(await scan(p, `playground ${scheme}`)); await p.screenshot({ path: `${OUT}/app-${scheme}-1280.png` }); await close(p); }
    for (const scheme of ["light", "dark"]) { const p = await open("invoice", { colorScheme: scheme }); scans.push(await scan(p, `playground sample invoice ${scheme}`)); await close(p); }
    const n = await open("app", { colorScheme: "dark", viewport: { width: 360, height: 800 } }); await n.locator("summary").click(); scans.push(await scan(n, "playground 360 disclosure open, dark")); await n.screenshot({ path: `${OUT}/app-dark-360.png` }); await close(n);
    const serious = scans.flatMap(({ label, r }) => r.filter((v) => ["serious", "critical"].includes(v.impact)).map((v) => `${label}: ${v.id} (${v.impact}) ${v.sample}`));
    check(g, "axe-core: zero serious/critical violations on the MAIN playground in light and dark (showcase, sample invoice, 360px with the disclosure open)", serious.length === 0, serious.join(" | ") || scans.map((s) => `${s.label}: ${s.r.length}`).join("; "));
    check(g, "axe-core violations of any impact (reported)", true, scans.flatMap(({ label, r }) => r.map((v) => `${label}: ${v.id}/${v.impact} x${v.n}`)).join(" | ") || "none", true);
  });

  check("console", "no console errors or page errors during the whole run (the simulated wasm failure is a network error and is filtered)", errors.filter((e) => !/wasm|ERR_FAILED|net::/.test(e)).length === 0, errors.filter((e) => !/wasm|ERR_FAILED|net::/.test(e)).slice(0, 3).join(" | "));
} catch (e) { check("browser", "browser run", false, String(e?.stack ?? e).slice(0, 400)); }
finally { await browser?.close(); await server?.close(); }

const groups = [...new Set(rows.map((r) => r.group))];
const real = rows.filter((r) => !r.info);
const md = ["| # | group | check | result | detail |", "|---|---|---|---|---|", ...rows.map((r, i) => `| ${i + 1} | ${r.group} | ${r.name} | ${r.info ? "INFO" : r.pass ? "PASS" : "FAIL"} | ${r.detail.replace(/\|/g, "\\|").replace(/\n/g, "<br>")} |`)].join("\n");
const total = `${real.filter((r) => r.pass).length}/${real.length} pass (+${rows.length - real.length} info rows)`;
const summary = groups.map((g) => `${g}: ${real.filter((r) => r.group === g && r.pass).length}/${real.filter((r) => r.group === g).length}`).join(" · ");
writeFileSync(`${OUT}/report.md`, `# Phase 5b E2E\n\n${md}\n\n${total}\n\n${summary}\n`);
console.log(md + `\n\n${total}\n${summary}`);
process.exit(real.every((r) => r.pass) ? 0 : 1);
