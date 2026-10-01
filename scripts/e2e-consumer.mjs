// Real tarball consumer, outside the checkout. Requires npm registry access for dependencies/tooling, never pdfcn.
import { mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "playwright-core";
import { requireTools, execFileSync } from "./lib/tools.mjs";
import { serve, preview, observe } from "./lib/static.mjs";
import { allText, fonts, raster, colorStats, hex } from "./lib/pdf.mjs";
requireTools();
const OUT = "out/consumer", pack = join(tmpdir(), "pdfwind-pack"), consumer = join(tmpdir(), "pdfwind-consumer");
mkdirSync(OUT, { recursive: true }); mkdirSync(pack, { recursive: true });
const rows = []; const check = (name, pass, detail = "") => rows.push({ name, pass: !!pass, detail });
const run = (cmd, args, cwd = process.cwd()) => execFileSync(cmd, args, { cwd, encoding: "utf8", maxBuffer: 1 << 25, timeout: 240000 });
let server, browser;
try {
  const dry = JSON.parse(run("npm", ["pack", "--dry-run", "--json"]))[0];
  const packed = JSON.parse(run("npm", ["pack", "--json", "--pack-destination", pack]))[0];
  writeFileSync(`${OUT}/pack.json`, JSON.stringify(packed, null, 2));
  check("npm pack dry run and tarball whitelist", dry.files.length === packed.files.length && !packed.files.some((f) => /(^scripts\/|^out\/|^playground\/|^examples\/|stress|\.ttf$)/.test(f.path)), `${packed.size} packed bytes; ${packed.unpackedSize} unpacked bytes; ${packed.files.length} files (full list: pack.json)`);
  // Only this script's dedicated temp consumer is removed, never arbitrary user paths.
  rmSync(consumer, { recursive: true, force: true }); mkdirSync(consumer, { recursive: true });
  writeFileSync(join(consumer, "package.json"), JSON.stringify({ name: "pdfwind-consumer", private: true, type: "module", dependencies: { pdfwind: `file:${join(pack, packed.filename)}`, vue: "^3.5.43" }, devDependencies: { vite: "^8.3.1", "@vitejs/plugin-vue": "^6.0.9" } }, null, 2));
  writeFileSync(`${OUT}/install.log`, run("npm", ["install", "--no-audit", "--no-fund"], consumer));
  check("consumer installs local tarball", JSON.parse(readFileSync(join(consumer, "node_modules/pdfwind/package.json"))).version === "0.1.0");
  writeFileSync(join(consumer, "vite.config.js"), `import vue from '@vitejs/plugin-vue';\nexport default { base: './', plugins: [vue()], optimizeDeps: { exclude: ['pdfwind', 'takumi-pdf'], include: ['pdfwind > qrcode'] }, ssr: { noExternal: ['pdfwind'] } };\n`);
  writeFileSync(join(consumer, "node.mjs"), `import { writeFileSync } from 'node:fs';
import { createServer } from 'vite';
import { renderPdf } from 'pdfwind/node';
import { themes } from 'pdfwind/themes/index';
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { InvoiceModern, InvoiceFooter, blockPage, invoiceModernSample } = await vite.ssrLoadModule('pdfwind');
  const data = { ...invoiceModernSample, items: [{ description: '中文品項', quantity: 2, unitPrice: 123 }] };
  const pdf = await renderPdf(InvoiceModern, { data }, { ...blockPage, footer: InvoiceFooter, theme: 'vivid', uncoveredText: 'error' });
  if (themes.vivid.name !== 'vivid' || new TextDecoder().decode(pdf.slice(0, 5)) !== '%PDF-') throw new Error('bad export or PDF');
  writeFileSync('node.pdf', pdf);
  console.log('Node consumer rendered', pdf.length, 'bytes');
} finally { await vite.close(); }
`);
  writeFileSync(`${OUT}/node.log`, run("node", ["node.mjs"], consumer));
  const nodePdf = join(consumer, "node.pdf");
  check("Node consumer: InvoiceModern vivid + Chinese line item", allText(nodePdf).join("").includes("中文品項") && /Nunito/.test(fonts(nodePdf)) && /NotoSansTC/.test(fonts(nodePdf)), fonts(nodePdf).trim());
  writeFileSync(join(consumer, "index.html"), '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>pdfwind consumer</title></head><body><div id="app"></div><script type="module" src="/main.js"></script></body></html>');
  writeFileSync(join(consumer, "main.js"), `import { createApp } from 'vue'; import App from './App.vue'; createApp(App).mount('#app');`);
  writeFileSync(join(consumer, "App.vue"), `<script setup>
import { PdfPreview, InvoiceModern, InvoiceFooter, blockPage, invoiceModernSample } from 'pdfwind/browser';
import css from 'pdfwind/theme-css/vivid?raw';
const data = { ...invoiceModernSample, items: [{ description: '中文品項', quantity: 2, unitPrice: 123 }] };
if (!css.includes('--primary:')) throw new Error('theme CSS export missing');
const options = { ...blockPage, footer: InvoiceFooter, theme: 'vivid', uncoveredText: 'error' };
</script><template><main style="height:95vh"><PdfPreview :component="InvoiceModern" :props="{ data }" :options="options" /></main></template>`);
  writeFileSync(`${OUT}/build.log`, run("npx", ["vite", "build"], consumer)); check("consumer vite build", true);
  server = await serve(join(consumer, "dist")); browser = await chromium.launch();
  const page = await browser.newPage(), seen = observe(page);
  await page.goto(server.url); const result = await preview(page); writeFileSync(`${OUT}/browser.pdf`, Buffer.from(result.bytes));
  const file = `${OUT}/browser.pdf`, text = allText(file).join("");
  check("built PdfPreview renders InvoiceModern with Chinese text/fonts", text.includes("中文品項") && /Nunito/.test(fonts(file)) && /NotoSansTC/.test(fonts(file)));
  check("runtime Tailwind compile paints vivid's primary", colorStats(raster(file, 1), hex("#6d28d9"), { tol: 6 }).n > 1000);
  check("wasm/fonts come from built assets, not source paths", seen.requests.some((r) => /\.wasm$/.test(r.url)) && seen.requests.filter((r) => /\.woff2$/.test(r.url)).length >= 2 && seen.requests.every((r) => r.url === "/" || r.url.startsWith("/assets/")), JSON.stringify(seen.requests));
  check("no browser console/page/HTTP errors", !seen.errors.length, seen.errors.join("; "));
} catch (e) { check("consumer run", false, e.stack); }
finally { await browser?.close(); await server?.close(); }
const total = `${rows.filter((r) => r.pass).length}/${rows.length} pass`;
const md = `# Tarball consumer E2E\n\nRegistry access is required for npm install (Vue, Vite, runtime dependencies); pdfwind itself is installed only from the local tarball.\n\n| check | result | detail |\n|---|---|---|\n${rows.map((r) => `| ${r.name} | ${r.pass ? "PASS" : "FAIL"} | ${String(r.detail).replace(/\n/g, "<br>").replace(/\|/g, "\\|")} |`).join("\n")}\n\n${total}\n`;
writeFileSync(`${OUT}/report.md`, md); console.log(md); process.exitCode = rows.every((r) => r.pass) ? 0 : 1;
