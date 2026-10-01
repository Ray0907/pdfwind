// Production-only subpath E2E; no Vite dev server or test hooks.
import { requireTools, execFileSync } from "./lib/tools.mjs";
import { mkdirSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { chromium } from "playwright-core";
import { serve, preview, observe } from "./lib/static.mjs";
import { allText, fonts } from "./lib/pdf.mjs";
requireTools();
const OUT = "out/static"; mkdirSync(OUT, { recursive: true });
const rows = [], traffic = [];
const check = (name, pass, detail = "") => rows.push({ name, pass: !!pass, detail });
let server, browser;
try {
  const log = execFileSync("pnpm", ["build:playground"], { encoding: "utf8", maxBuffer: 1 << 24 });
  writeFileSync(`${OUT}/build.log`, log); check("vite build", true);
  const files = readdirSync("dist-playground/assets").map((n) => ({ name: n, bytes: statSync(`dist-playground/assets/${n}`).size }));
  writeFileSync(`${OUT}/bundle.json`, JSON.stringify(files, null, 2));
  server = await serve("dist-playground", "/pdfwind/"); browser = await chromium.launch();
  // Fresh contexts measure first-load transfer (plain HTTP, no compression), not a warmed cache.
  for (const [label, query] of [["English", "?demo=showcase"], ["CJK", "?demo=invoice&lang=zh"]]) {
    const cx = await browser.newContext(), page = await cx.newPage(), seen = observe(page);
    const network = await cx.newCDPSession(page), pending = new Map(), received = [];
    await network.send("Network.enable");
    network.on("Network.requestWillBeSent", ({ requestId, request }) => {
      if (/^https?:/.test(request.url)) pending.set(requestId, new URL(request.url).pathname);
    });
    network.on("Network.loadingFinished", ({ requestId, encodedDataLength }) => {
      if (pending.has(requestId)) received.push({ url: pending.get(requestId), bytes: encodedDataLength });
    });
    await page.goto(server.url + query);
    const first = await preview(page), file = `${OUT}/${label}.pdf`; writeFileSync(file, Buffer.from(first.bytes));
    check(`${label}: built PDF bytes and fonts`, allText(file).join("").includes(label === "English" ? "Q3 customer report" : "繁體中文") && /Inter/.test(fonts(file)) && (label !== "CJK" || /NotoSansTC/.test(fonts(file))));
    check(`${label}: wasm and fonts served under /pdfwind/assets/`, seen.requests.some((r) => /\.wasm$/.test(r.url)) && seen.requests.some((r) => /\.woff2$/.test(r.url)) && seen.requests.every((r) => r.url.startsWith("/pdfwind/")));
    const firstTraffic = [...seen.requests];
    const transfer = [...received];
    traffic.push(`### ${label} first render\n\n${transfer.reduce((s, r) => s + r.bytes, 0)} HTTP transferred bytes (Chromium CDP encodedDataLength, including response headers; plain HTTP without compression). ${firstTraffic.reduce((s, r) => s + r.bytes, 0)} response-body bytes (Content-Length); includes HTML/JS/CSS/preloads, not in-memory PDF blob bytes.\n\n| request | status | body bytes | HTTP bytes |\n|---|---|---|---|\n${firstTraffic.map((r) => `| ${r.url} | ${r.status} | ${r.bytes} | ${transfer.filter((t) => t.url === r.url).reduce((s, t) => s + t.bytes, 0)} |`).join("\n")}`);
    if (label === "English") {
      await page.locator('input[name="theme"][value="vivid"]').check();
      const next = await preview(page, first.url); writeFileSync(`${OUT}/vivid.pdf`, Buffer.from(next.bytes));
      check("theme switch changes embedded font (Inter to Nunito)", /Nunito/.test(fonts(`${OUT}/vivid.pdf`)) && !/Inter/.test(fonts(`${OUT}/vivid.pdf`)));
      await page.goto(server.url); const showcase = await preview(page); writeFileSync(`${OUT}/showcase.pdf`, Buffer.from(showcase.bytes));
      check("showcase renders from build", allText(`${OUT}/showcase.pdf`).join("").includes("Q3 customer report"));
      await page.locator(".builder-link").click(); await preview(page);
      check("Theme Builder opens and renders", await page.locator("h1").innerText().then((s) => /Theme Builder/.test(s)));
    }
    check(`${label}: no console/page/HTTP errors`, !seen.errors.length, seen.errors.join("; "));
    await cx.close();
  }
} catch (e) { check("static run", false, e.stack); }
finally { await browser?.close(); await server?.close(); }
const total = `${rows.filter((r) => r.pass).length}/${rows.length} pass`;
const md = `# Built playground E2E\n\n| check | result | detail |\n|---|---|---|\n${rows.map((r) => `| ${r.name} | ${r.pass ? "PASS" : "FAIL"} | ${String(r.detail).replace(/\n/g, "<br>").replace(/\|/g, "\\|")} |`).join("\n")}\n\n${total}\n\n${traffic.join("\n\n")}\n`;
writeFileSync(`${OUT}/report.md`, md); console.log(md); process.exitCode = rows.every((r) => r.pass) ? 0 : 1;
