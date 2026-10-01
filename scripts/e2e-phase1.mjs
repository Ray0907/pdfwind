// Phase 1 E2E: renderPdf in Node + in Chromium (via Vite playground). Writes out/*.pdf and out/report.md.
import { writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { h } from "vue";
import { createServer } from "vite";
import { chromium } from "playwright-core";
import { renderPdf, loadResources } from "../src/render/node.js";
import { createRenderPdf } from "../src/render/core.js";
import { DemoDoc, DemoHeader, DemoFooter } from "../playground/DemoDoc.js";

mkdirSync("out", { recursive: true });
const checks = [];
const add = (name, pass, detail = "") => checks.push({ name, pass: !!pass, detail });
const guard = async (name, fn) => { try { await fn(); } catch (e) { add(name, false, `threw: ${String(e?.message ?? e).slice(0, 200)}`); } };
const sh = (c, a) => execFileSync(c, a, { encoding: "utf8" });
const text = (f, extra = []) => sh("pdftotext", [...extra, "-layout", f, "-"]);
const norm = (s) => s.replace(/\s+/g, " ").trim();
const opts = { header: DemoHeader, footer: DemoFooter };
const time = async (fn) => { const t = performance.now(); const r = await fn(); return [r, Math.round(performance.now() - t)]; };

// ---- Node ----
let nodeParity;
await guard("Node render", async () => {
  const [pdf, ms1] = await time(() => renderPdf(DemoDoc, { title: "NODE-MARK 繁體中文測試", rows: 70 }, { ...opts, metadata: { title: "Node Doc" } }));
  writeFileSync("out/node.pdf", pdf);
  const info = sh("pdfinfo", ["out/node.pdf"]);
  const pages = +info.match(/Pages:\s+(\d+)/)[1];
  add("Node render", pdf.length > 1000 && String(Buffer.from(pdf.slice(0, 5))) === "%PDF-" && pages >= 2, `${pdf.length} bytes, ${pages} pages, first render ${ms1}ms (incl. wasm+fonts+tailwind init)`);
  const pt = Array.from({ length: pages }, (_, i) => text("out/node.pdf", ["-f", i + 1, "-l", i + 1]));
  add("Chinese text (Noto Sans TC woff2)", pt[0].includes("繁體中文測試") && pt[0].includes("品項 1"), "title + table cells extracted");
  add("Header on every page", pt.every((t) => t.includes("HEADER-MARK")));
  add("Footer page counter 'Page n / N'", pt.every((t, i) => new RegExp(`Page\\s+${i + 1}\\s*/\\s*${pages}`).test(t)), pt.map((t) => (t.match(/Page\s+\d+\s*\/\s*\d+/) || ["-"])[0]).join(" | "));
  add("Metadata passthrough + Inter embedded", /Title:\s+Node Doc/.test(info) && sh("pdffonts", ["out/node.pdf"]).includes("Inter"));
  const [, ms2] = await time(() => renderPdf(DemoDoc, { title: "again", rows: 8 }, opts));
  add("Renderer/Tailwind/fonts reused (2nd render faster)", ms2 < ms1, `1st ${ms1}ms -> 2nd ${ms2}ms`);
  const par = await renderPdf(DemoDoc, { title: "PARITY 繁體", rows: 8 }, opts);
  writeFileSync("out/node-parity.pdf", par);
  nodeParity = norm(text("out/node-parity.pdf"));
});

await guard("Tailwind pixels", async () => {
  const Box = { render: () => h("div", { class: "p-4" }, [h("div", { class: "bg-primary w-40 h-20" }), h("div", { class: "border-4 border-[#ff0000] w-40 h-20 mt-4" })]) };
  const pdf = await renderPdf(Box, {}, { themeCss: "@theme inline{--color-primary:var(--primary)} :root{--primary:#7c3aed}" });
  writeFileSync("out/tailwind.pdf", pdf);
  const ppm = execFileSync("pdftoppm", ["-r", "72", "-singlefile", "out/tailwind.pdf"], { maxBuffer: 1 << 26 }); // P6 to stdout
  const [, w, ht] = ppm.subarray(0, 20).toString("latin1").match(/^P6\s+(\d+)\s+(\d+)\s+255\s/) ?? [];
  const px = ppm.subarray(ppm.length - w * ht * 3);
  const near = (r, g, b) => { let n = 0; for (let i = 0; i < px.length; i += 3) n += Math.abs(px[i] - r) < 12 && Math.abs(px[i + 1] - g) < 12 && Math.abs(px[i + 2] - b) < 12; return n; };
  const purple = near(124, 58, 237), red = near(255, 0, 0);
  add("Tailwind + themeCss var + preflight border render (pixels)", purple > 1000 && red > 200, `bg-primary #7c3aed: ${purple}px, border-[#f00]: ${red}px`);
});

await guard("Escaped class scan", async () => {
  // Vue SSR emits [&amp;&gt;p]:... and content-[&#39;x&#39;]; both must still compile
  const Esc = { render: () => h("div", { class: "p-4" }, [h("div", { class: "[&>p]:bg-[#ff0000] [&>p]:h-10 before:content-['XBEFORE']" }, [h("p", "child")])]) };
  const pdf = await renderPdf(Esc);
  writeFileSync("out/escaped-classes.pdf", pdf);
  const ppm = execFileSync("pdftoppm", ["-r", "72", "-singlefile", "out/escaped-classes.pdf"], { maxBuffer: 1 << 26 });
  const [, w, ht] = ppm.subarray(0, 20).toString("latin1").match(/^P6\s+(\d+)\s+(\d+)\s+255\s/) ?? [];
  const px = ppm.subarray(ppm.length - w * ht * 3);
  let red = 0; for (let i = 0; i < px.length; i += 3) red += px[i] > 240 && px[i + 1] < 12 && px[i + 2] < 12;
  const txt = text("out/escaped-classes.pdf");
  add("Escaped Tailwind syntax applies ([&>p]:bg-[#f00], before:content-['x'])", red > 500 && txt.includes("XBEFORE"), `[&>p] red pixels: ${red}px, ::before text "XBEFORE" extracted: ${txt.includes("XBEFORE")}`);
});

await guard("Node retry", async () => {
  let loads = 0, fontCalls = 0;
  const flaky = createRenderPdf(async () => {
    if (loads++ === 0) throw new Error("simulated resource load failure");
    const r = await loadResources();
    return { ...r, fonts: r.fonts.map((f) => (f.ranges ? { ...f, data: () => (fontCalls++ === 0 ? Promise.reject(new Error("simulated font failure")) : f.data()) } : f)) };
  });
  const En = { render: () => h("p", "english") }, Zh = { render: () => h("p", "中文重試") };
  const e1 = await flaky(En).then(() => null, (e) => e);
  const ok1 = await flaky(En).then((b) => b.length > 1000, () => false);
  const e2 = await flaky(Zh).then(() => null, (e) => e);
  const ok2 = await flaky(Zh).then((b) => { writeFileSync("out/node-retry.pdf", b); return text("out/node-retry.pdf").includes("中文重試"); }, () => false);
  add("Failed resource load / lazy font fetch is retried on next render (Node)", e1 && ok1 && e2 && ok2, `boot: fail "${e1?.message}" then ok=${ok1}; font: fail "${e2?.message}" then ok=${ok2}`);
});

await guard("uncoveredText", async () => {
  const Hangul = { render: () => h("p", { class: "p-4" }, "한글 fallback") };
  const pdf = await renderPdf(Hangul);
  add("Default uncoveredText is safe (Hangul does not throw)", pdf.length > 1000, `${pdf.length} bytes`);
  let msg = "";
  await renderPdf(Hangul, {}, { uncoveredText: "error" }).catch((e) => (msg = e.message));
  add("Glyph error names the glyph + gives fix", /U\+D55C/.test(msg) && /uncoveredText/.test(msg), msg);
});

await guard("AbortSignal", async () => {
  const pre = AbortSignal.abort();
  const e1 = await renderPdf(DemoDoc, {}, { signal: pre }).then(() => null, (e) => e);
  const c = new AbortController();
  const p = renderPdf(DemoDoc, { rows: 100 }, { signal: c.signal }).then(() => null, (e) => e);
  c.abort(); // right after the call: render is in flight
  const e2 = await p;
  add("AbortSignal (pre-aborted + mid-flight) rejects", e1?.name === "AbortError" && e2?.name === "AbortError", `pre: ${e1?.name}, mid: ${e2?.name}`);
});

// ---- Browser (Chromium via Vite dev server) ----
let server, browser;
try {
  server = await createServer({ configFile: "vite.config.js", server: { port: 0, host: "127.0.0.1" }, logLevel: "error" });
  await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}/`;
  browser = await chromium.launch();
  const errors = [];
  const newPage = async () => {
    const pg = await browser.newPage();
    pg.on("pageerror", (e) => errors.push(e.message));
    pg.on("console", (m) => m.type() === "error" && !/Failed to load resource|net::ERR_FAILED/.test(m.text()) && errors.push(m.text()));
    return pg;
  };
  const page = await newPage();
  // MED-3: record when the preview mounts and when it first reports busy
  await page.addInitScript(() => {
    window.__t = {};
    new MutationObserver(() => {
      const el = document.querySelector(".pdf-preview");
      if (el && !window.__t.mounted) window.__t.mounted = performance.now();
      if (el?.dataset.busy === "true" && !window.__t.busy) window.__t.busy = performance.now();
    }).observe(document, { subtree: true, childList: true, attributes: true });
  });
  const t0 = Date.now();
  await page.goto(url + "?demo=invoice");
  await page.waitForFunction(() => window.__pdfwind?.renders.length >= 1, null, { timeout: 60000 });
  const firstMs = Date.now() - t0;
  const settle = (n) => page.waitForFunction((n) => window.__pdfwind.renders.length >= n, n, { timeout: 30000 });
  const save = async (file, i) => { writeFileSync(file, Buffer.from(await page.evaluate((i) => window.__pdfwind.pdfBytes(i), i))); return file; };
  const count = () => page.evaluate(() => window.__pdfwind.renders.length);

  await guard("Browser render", async () => {
    const f = await save("out/browser-first.pdf");
    add("Browser render (Chromium)", String(readHead(f)) === "%PDF-" && /Pages:\s+1/.test(sh("pdfinfo", [f])), `page load -> first PDF emitted ${firstMs}ms (includes the 2s swap fallback: headless has no PDF viewer, so no iframe load event)`);
  });

  await guard("Node/browser parity", async () => {
    const n = await count();
    await page.evaluate(() => window.__pdfwind.set({ title: "PARITY 繁體", rows: 8 }));
    await settle(n + 1);
    const f = await save("out/browser-parity.pdf");
    const b = norm(text(f));
    add("Same component renders same text in Node and browser", b === nodeParity && b.includes("PARITY 繁體") && b.includes("HEADER-MARK") && /Page 1 \/ 1/.test(b), b === nodeParity ? `text identical (${b.length} chars)` : `DIFF\nnode: ${nodeParity}\nbrowser: ${b}`);
  });

  await guard("debounce", async () => {
    const n = await count();
    await page.evaluate(async () => { for (let i = 1; i <= 6; i++) { window.__pdfwind.set({ title: `BURST-${i}` }); await new Promise((r) => setTimeout(r, 30)); } });
    await settle(n + 1);
    await page.waitForTimeout(400);
    const total = (await count()) - n;
    const f = await save("out/browser-burst.pdf");
    add("Rapid changes debounced (6 changes -> <=2 renders, last wins)", total <= 2 && text(f).includes("BURST-6"), `${total} render(s)`);
  });

  await guard("stale cancel", async () => {
    const n = await count();
    // A renders slowly (300ms injected latency); B lands while A is in flight (100ms debounce + 50ms)
    await page.evaluate(async () => { const w = window.__pdfwind; w.setDelay(300); w.set({ title: "STALE-A" }); await new Promise((r) => setTimeout(r, 150)); w.setDelay(0); w.set({ title: "FINAL-B" }); });
    await settle(n + 1);
    await page.waitForTimeout(800);
    const log = await page.evaluate(() => window.__pdfwind.renders.map((r) => r.id));
    const f = await save("out/browser-stale.pdf");
    const t = text(f);
    add("Stale render cancelled; newest wins, ids in order", t.includes("FINAL-B") && !t.includes("STALE-A") && (await count()) - n === 1 && log.every((v, i) => !i || v > log[i - 1]), `renders emitted since change: ${(await count()) - n} (expect 1: A discarded), ids ${log.slice(-3).join(",")}`);
  });

  await guard("keeps previous", async () => {
    await page.evaluate(() => window.__pdfwind.set({ rows: 8, title: "BASE" }));
    await settle((await count()) + 1);
    const r = await page.evaluate(async () => {
      const w = window.__pdfwind, n = w.renders.length, prev = w.frontSrc(), seen = [];
      w.setDelay(300); // render in flight for 300ms
      w.set({ rows: 120, title: "NEXT" });
      const t = performance.now();
      while (w.renders.length === n && performance.now() - t < 20000) { seen.push(w.frontSrc()); await new Promise((x) => setTimeout(x, 5)); }
      w.setDelay(0);
      return { prev, next: w.frontSrc(), seen, ms: Math.round(performance.now() - t), srcs: w.iframeSrcs() };
    });
    const ok = r.prev && r.seen.length > 3 && r.seen.every((s) => s === r.prev) && r.next && r.next !== r.prev;
    add("Previous PDF stays visible until next is ready", ok, `${r.seen.length} samples over ${r.ms}ms all on previous blob; then swapped (headless: swap came from the 2s fallback, not a load event; real viewer behaviour is in the headed script)`);
  });

  await guard("latency", async () => {
    await page.evaluate(() => window.__pdfwind.set({ rows: 8, title: "L0" }));
    await settle((await count()) + 1);
    const n0 = await count(), ms = [];
    for (let i = 1; i <= 5; i++) {
      await page.evaluate((i) => window.__pdfwind.set({ title: `LAT-${i}` }), i);
      await page.waitForFunction((n) => window.__pdfwind.renders.length >= n, n0 + i, { timeout: 30000 });
      ms.push(100 + (await page.evaluate(() => window.__pdfwind.renders.at(-1).ms)));
    }
    const med = [...ms].sort((a, b) => a - b)[2];
    add("Prop change -> 1-page PDF ready <= 300ms (100ms debounce + render ms, median of 5; swap latency is measured in the headed script)", med <= 300, `median ${med}ms, samples ${ms.join(", ")}`);
  });

  await guard("immediate first render", async () => {
    const t = await page.evaluate(() => window.__t);
    add("First render starts immediately (no debounce): busy within 50ms of mount", t.busy - t.mounted < 50, `mounted -> busy ${Math.round(t.busy - t.mounted)}ms`);
  });

  await guard("lazy CJK font", async () => {
    const pg = await newPage();
    let noto = 0;
    pg.on("request", (r) => /NotoSansTC\.woff2(?!\?import)/.test(r.url()) && noto++); // real font fetches; Vite dev also serves a tiny ?import JS stub
    await pg.goto(url + "?demo=invoice&lang=en");
    await pg.waitForFunction(() => window.__pdfwind?.renders.length >= 1, null, { timeout: 60000 });
    const enNoto = noto;
    const en = text(writeTmp(await pg.evaluate(() => window.__pdfwind.pdfBytes()), "out/browser-en.pdf"));
    await pg.evaluate(() => window.__pdfwind.set({ lang: "zh" }));
    await pg.waitForFunction(() => window.__pdfwind.renders.length >= 2, null, { timeout: 30000 });
    const zh = text(writeTmp(await pg.evaluate(() => window.__pdfwind.pdfBytes()), "out/browser-zh.pdf"));
    add("English-only render does NOT fetch NotoSansTC; Chinese render does (lazy ranges)", enNoto === 0 && noto === 1 && en.includes("English only") && /品項/.test(zh), `Noto fetches after English render: ${enNoto}; after Chinese render: ${noto}`);
    await pg.close();
  });

  await guard("browser retry", async () => {
    const pg = await newPage();
    let wasmFail = 1, notoFail = 0;
    await pg.route(/\.wasm(\?|$)/, (r) => (wasmFail-- > 0 ? r.abort() : r.continue()));
    await pg.route(/NotoSansTC/, (r) => (notoFail-- > 0 ? r.abort() : r.continue()));
    await pg.goto(url + "?demo=invoice&lang=en");
    await pg.waitForFunction(() => window.__pdfwind?.errors.length >= 1, null, { timeout: 30000 });
    const banner = await pg.locator(".pdf-preview-error").isVisible();
    await pg.evaluate(() => window.__pdfwind.set({ title: "RETRY-1" }));
    await pg.waitForFunction(() => window.__pdfwind.renders.length >= 1, null, { timeout: 30000 });
    const bootOk = text(writeTmp(await pg.evaluate(() => window.__pdfwind.pdfBytes()), "out/browser-retry-boot.pdf")).includes("RETRY-1");
    notoFail = 1;
    await pg.evaluate(() => window.__pdfwind.set({ lang: "zh" }));
    await pg.waitForFunction(() => window.__pdfwind.errors.length >= 2, null, { timeout: 30000 });
    await pg.evaluate(() => window.__pdfwind.set({ title: "RETRY-2" }));
    await pg.waitForFunction(() => window.__pdfwind.renders.length >= 2, null, { timeout: 30000 });
    const fontOk = /品項/.test(text(writeTmp(await pg.evaluate(() => window.__pdfwind.pdfBytes()), "out/browser-retry-font.pdf")));
    add("Browser: failed wasm load and failed Noto fetch each recover on next render; error shown", banner && bootOk && fontOk, `error banner visible: ${banner}; wasm retry ok: ${bootOk}; Noto retry ok: ${fontOk}`);
    await pg.close();
  });

  add("No browser console/page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
} catch (e) {
  add("Browser run", false, `threw: ${String(e?.stack ?? e).slice(0, 300)}`);
} finally {
  await browser?.close();
  await server?.close();
}

function writeTmp(arr, file) { writeFileSync(file, Buffer.from(arr)); return file; }
function readHead(f) { return sh("head", ["-c", "5", f]); }

const md = ["| # | check | result | detail |", "|---|---|---|---|", ...checks.map((c, i) => `| ${i + 1} | ${c.name} | ${c.pass ? "PASS" : "FAIL"} | ${c.detail.replace(/\n/g, "<br>").replace(/\|/g, "\\|")} |`)].join("\n");
const summary = `${checks.filter((c) => c.pass).length}/${checks.length} pass`;
writeFileSync("out/report.md", `# Phase 1 E2E\n\n${md}\n\n${summary}\n`);
console.log(md + `\n\n${summary}`);
process.exit(checks.every((c) => c.pass) ? 0 : 1);
