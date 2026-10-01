// Phase 3a E2E: the six invoice blocks. Text for every section, money formatting + totals math from props, 60-item multi-page
// invoices (header repeat, totals never split, footer counter every page, nothing clipped/overlapped), CJK, class passthrough,
// Chromium parity, and side-by-side compare PNGs against pdfcn's reference renders (/tmp/pdfcn-ref).
// Writes out/phase3a/*.pdf, compare/*.png and report.md.
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createServer } from "vite";
import { chromium } from "playwright-core";
import { load, pageCount, allText, words, find, raster, colorStats, fonts, hex } from "./lib/pdf.mjs";

const OUT = "out/phase3a", REF = "/tmp/pdfcn-ref";
rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/compare`, { recursive: true });

const rows = [];
const check = (group, name, pass, detail = "") => rows.push({ group, name, pass: !!pass, detail: String(detail) });
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const f1 = (n) => (Math.round(n * 10) / 10).toString();
const PAGE_H = 841.89;
const norm = (s) => s.replace(/\s+/g, " ").trim();

const { renderPdf, demos, close, blocks } = await load();
const B = await blocks();
const { h } = await import("vue");
const file = (n) => `${OUT}/${n}.pdf`;
const T = (n) => allText(file(n)).join("\n");
const W = (n, p) => words(file(n), p);
const pagesOf = (n) => Array.from({ length: pageCount(file(n)) }, (_, i) => i + 1);

// per block: component, footer, sample, the labels/words that must be on the page, the table header word, the grand-total label
const BLOCKS = {
  classic: { Comp: B.InvoiceClassic, footer: B.InvoiceFooter, sample: B.invoiceClassicSample, header: "Description", total: "Total", labels: ["FROM", "BILL TO", "PAYMENT TERMS", "Description", "QTY", "Rate", "Total", "Subtotal", "Tax (7%)", "Due:"] },
  consultant: { Comp: B.InvoiceConsultant, footer: B.InvoiceFooter, sample: B.invoiceConsultantSample, header: "Service", total: "Amount Due", labels: ["INVOICE", "Project Reference:", "FROM (CONSULTANT)", "BILL TO (CLIENT)", "Service Description", "Hours", "Rate ($/hr)", "Amount", "Total Hours: 60", "Payment:", "Subtotal", "Tax (5%)", "Amount Due", "Due:"], services: true },
  corporate: { Comp: B.InvoiceCorporate, footer: B.InvoiceFooter, sample: B.invoiceCorporateSample, header: "Description", total: "Total Due", labels: ["INVOICE DETAILS", "BILL TO", "Invoice #", "Issue Date", "Due Date", "Payment", "Description", "Qty", "Unit Price", "Amount", "Subtotal", "Tax (8%)", "Total Due"] },
  creative: { Comp: B.InvoiceCreative, footer: B.InvoiceCreativeFooter, sample: B.invoiceCreativeSample, header: "Deliverable", total: "Total", labels: ["INVOICE", "BILLED TO", "INVOICE INFO", "Issue Date", "Due Date", "Payment", "Deliverable", "Qty", "Rate", "Amount", "NOTES & TERMS", "Subtotal", "Tax (6.5%)", "Total"] },
  minimal: { Comp: B.InvoiceMinimal, footer: B.InvoiceFooter, sample: B.invoiceMinimalSample, header: "DESCRIPTION", total: "Balance Due", labels: ["INVOICE", "BILL TO", "INVOICE DETAILS", "Due Date", "Payment", "Tax ID", "DESCRIPTION", "QTY", "RATE", "TOTAL", "Subtotal", "Tax (7%)", "Balance Due"] },
  modern: { Comp: B.InvoiceModern, footer: B.InvoiceFooter, sample: B.invoiceModernSample, header: "DESCRIPTION", total: "Total Due", labels: ["INVOICE NUMBER", "INVOICE DATE", "DUE DATE", "BILLED TO", "DESCRIPTION", "QTY", "UNIT PRICE", "AMOUNT", "PAYMENT METHOD", "Subtotal", "Tax (7%)", "Total Due"] },
};
const render = (b, data, extra = {}, cls) => renderPdf(cls ? { render: () => h(b.Comp, { data, class: cls }) } : b.Comp, { data }, { ...B.blockPage, footer: b.footer, ...extra });
const fmt = (n) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); // independent of the library's money()
// pdfcn does not show these fields in the matching block either (classic: invoiceDate, billTo.phone; corporate: paymentTerms.gst); we keep that
const NOT_SHOWN = { classic: (d) => [d.invoiceDate, d.billTo.phone], corporate: (d) => [d.paymentTerms.gst] };
const sampleStrings = (d) => [d.companyName, d.invoiceNumber, d.invoiceDate, d.dueDate, d.notes, d.projectRef, d.billTo?.name, d.billTo?.address, d.billTo?.email, d.billTo?.phone, d.paymentTerms?.method, d.paymentTerms?.gst, d.consultant?.name, d.consultant?.title, d.consultant?.email, d.client?.name, d.client?.company, d.client?.address, d.client?.email, ...(d.items ?? d.services).map((i) => i.description)].filter(Boolean);
const lineOf = (name, p, label) => { const l = W(name, p).find((w) => w.t === label.split(" ")[0] && (label.split(" ").length === 1 || W(name, p).some((x) => Math.abs(x.y0 - w.y0) < 2 && x.t === label.split(" ")[1]))); return l; };
const section = async (g, fn) => { try { await fn(); } catch (e) { check(g, "section ran without throwing", false, String(e?.stack ?? e).split("\n").slice(0, 3).join(" | ")); } };

// ================= per block: default render, text, compare PNG =================
for (const [name, b] of Object.entries(BLOCKS)) await section(`invoice-${name}`, async () => {
  const g = `invoice-${name}`;
  writeFileSync(file(name), await render(b, b.sample, { metadata: { title: `Invoice ${b.sample.invoiceNumber}` } }));
  check(g, "renders one A4 page", pageCount(file(name)) === 1 && /A4/.test(execFileSync("pdfinfo", [file(name)], { encoding: "utf8" })), `${pageCount(file(name))} page(s)`);
  const skip = NOT_SHOWN[name]?.(b.sample) ?? [], txt = norm(T(name)), notesParts = (b.sample.notes ?? "").length > 60 && name === "creative" ? [b.sample.notes.split(" ").slice(0, 5).join(" "), b.sample.notes.split(" ").slice(-4).join(" ")] : [], miss = [...b.labels, ...sampleStrings(b.sample).filter((x) => !skip.includes(x) && !(notesParts.length && x === b.sample.notes)), ...notesParts].filter((s) => !txt.includes(norm(s)));
  check(g, "every section present: labels, parties, details, notes, payment info, all line items", !miss.length, miss.length ? `missing: ${miss.join(" | ")}` : `${b.labels.length} labels + ${sampleStrings(b.sample).length - skip.length} data strings${skip.length ? ` (${skip.length} fields pdfcn does not show either: ${skip.join(", ")})` : ""}`);
  check(g, "footer: left text + 'Page 1 of 1'", txt.includes("Page 1 of 1") && txt.includes(norm(b.sample.footerText ?? b.sample.notes)), "");
  const items = b.sample.items ?? b.sample.services, line = (i) => (b.services ? i.hours * i.rate : i.quantity * i.unitPrice);
  const sub = items.reduce((s, i) => s + line(i), 0), tax = Math.round(sub * b.sample.taxRate * 100) / 100, tot = Math.round((sub + tax) * 100) / 100;
  const want = [...items.map((i) => fmt(line(i))), fmt(sub), fmt(tax), fmt(tot)], missM = want.filter((s) => !txt.includes(s));
  check(g, "defaults: line totals, subtotal, tax, total computed from the items and formatted $x,xxx.xx", !missM.length, missM.length ? `missing ${missM.join(", ")}` : `total ${fmt(tot)} = ${fmt(sub)} + ${fmt(tax)}`);
  const px = raster(file(name), 1, { dpi: 60, png: `${OUT}/ours-${name}` });
  if (existsSync(`${REF}/invoice-${name}-1.png`)) execFileSync("magick", [`${OUT}/ours-${name}.png`, "-size", "8x702", "xc:#d4d4d8", `${REF}/invoice-${name}-1.png`, "+append", `${OUT}/compare/invoice-${name}-1.png`]);
  check(g, "side-by-side compare PNG written (ours left, pdfcn reference right)", existsSync(`${OUT}/compare/invoice-${name}-1.png`), `out/phase3a/compare/invoice-${name}-1.png`);
  // same-structure check against the reference PDF: anchors must sit where pdfcn puts them (tolerances in pt)
  if (existsSync(`${REF}/invoice-${name}.pdf`)) {
    const o = (t) => find(W(name, 1), t), r = (t) => find(words(`${REF}/invoice-${name}.pdf`, 1), t);
    const anchors = [["invoice number", b.sample.invoiceNumber, 8, 36], ["table header", b.header, 8, 30], ["footer page counter", "Page", 6, 4]].filter(([l]) => !(name === "creative" && l === "footer page counter")).map(([label, t, dx, dy]) => { const a = o(t), c = r(t); return { label, ok: !!a && !!c && near(a.x0, c.x0, dx) && near(a.y0, c.y0, dy), d: a && c ? `dx ${f1(a.x0 - c.x0)} dy ${f1(a.y0 - c.y0)}` : "word missing" }; });
    check(g, "layout anchors vs the pdfcn reference render: invoice number, table header, footer counter (x +-6..8pt, y +-4..36pt)", anchors.every((x) => x.ok), anchors.map((x) => `${x.label}: ${x.d}`).join("; "));
  }
});

// ================= money formatting + totals math from props =================
for (const [name, b] of Object.entries(BLOCKS)) await section(`math-${name}`, async () => {
  const g = `totals-${name}`, key = b.services ? "services" : "items";
  const mk = (a, q, p, c, r) => (b.services ? { description: a, hours: q, rate: p } : { description: a, quantity: q, unitPrice: p });
  const data = { ...b.sample, [key]: [mk("ALPHA", 3, 1234.56), mk("BETA", 2, 99.99), mk("GAMMA", 7, 0.5), mk("DELTA", 3, 0.1)], taxRate: 0.0825, summary: undefined };
  writeFileSync(file(`math-${name}`), await render(b, data));
  const t = norm(T(`math-${name}`)), want = [fmt(3703.68), fmt(199.98), fmt(3.5), fmt(0.3), fmt(3907.46), fmt(322.37), fmt(4229.83), "Tax (8.25%)"];
  const miss = want.filter((s) => !t.includes(s));
  check(g, "edited line items -> line totals, subtotal $3,907.46, tax 8.25% $322.37, total $4,229.83 (float-safe: 3 x 0.1 = $0.30)", !miss.length, miss.length ? `missing ${miss.join(", ")}` : "all amounts present");
  const old = fmt((b.sample.items ?? b.sample.services).reduce((s, i) => s + (b.services ? i.hours * i.rate : i.quantity * i.unitPrice), 0) * (1 + b.sample.taxRate));
  check(g, "no stale totals from the sample data survive", !t.includes(old), `sample total ${old} absent`);
  const labels = W(`math-${name}`, 1).filter((w) => w.t === b.total.split(" ")[0]), val = W(`math-${name}`, 1).find((w) => w.t === "$4,229.83");
  check(g, "the grand total value sits on the grand-total label's line, right-aligned in the totals box", !!val && labels.some((l) => near(l.y0, val.y0, 4)) , val ? `value y ${f1(val.y0)}, x1 ${f1(val.x1)}` : "value missing");
  const ov = await render(b, { ...data, summary: { subtotal: 1000, tax: 50, total: 1050 } });
  writeFileSync(file(`math-${name}-override`), ov);
  const to = norm(T(`math-${name}-override`));
  check(g, "explicit data.summary (pdfcn style) overrides the computation", to.includes("$1,050.00") && to.includes("$50.00") && !to.includes("$4,229.83"), "$1,000.00 / $50.00 / $1,050.00 shown");
  const z = await render(b, { ...data, taxRate: 0 }), zt = (writeFileSync(file(`math-${name}-notax`), z), norm(T(`math-${name}-notax`)));
  check(g, "taxRate 0: label 'Tax' without a percentage and total = subtotal", zt.includes("$3,907.46") && !/Tax \(/.test(zt) && zt.split("$3,907.46").length - 1 >= 2, "");
  const Cmp = b.Comp, de = await renderPdf(Cmp, { data, currency: "EUR", locale: "de-DE" }, { ...B.blockPage, footer: b.footer });
  writeFileSync(file(`math-${name}-eur`), de);
  const dt = norm(T(`math-${name}-eur`));
  check(g, "currency / locale props: EUR de-DE -> 4.229,83 € and 1.234,56 €", dt.includes("4.229,83") && dt.includes("€") && dt.includes("3.703,68"), (dt.match(/4\.229,83.{0,3}/) ?? ["no match"])[0]);
  const jp = await renderPdf(Cmp, { data: { ...data, [key]: [mk("ALPHA", 2, 1500)], taxRate: 0.1 }, currency: "JPY", locale: "en-US" }, { ...B.blockPage, footer: b.footer });
  writeFileSync(file(`math-${name}-jpy`), jp);
  const jt = norm(T(`math-${name}-jpy`));
  check(g, "JPY (0 decimals): 2 x 1,500 + 10% = ¥3,300", jt.includes("¥3,000") && jt.includes("¥300") && jt.includes("¥3,300") && !jt.includes("¥3,300.00"), (jt.match(/¥[\d,.]+/g) ?? []).slice(0, 6).join(" "));
});

// ================= multi-page: 60 items (+ a sweep of page-boundary cases) =================
for (const [name, b] of Object.entries(BLOCKS)) await section(`multi-${name}`, async () => {
  const g = `multipage-${name}`, key = b.services ? "services" : "items";
  const mk = (i) => (b.services ? { description: `ITEM-${i}`, hours: (i % 5) + 1, rate: 100 + i } : { description: `ITEM-${i}`, quantity: (i % 5) + 1, unitPrice: 100 + i });
  const N = 60, data = { ...b.sample, [key]: Array.from({ length: N }, (_, i) => mk(i + 1)), taxRate: 0.1, summary: undefined };
  const nm = `long-${name}`; writeFileSync(file(nm), await render(b, data));
  const pages = pagesOf(nm), np = pages.length;
  check(g, `${N} items flow onto several pages`, np >= 2, `${np} pages`);
  const txt = pages.map((p) => norm(allText(file(nm))[p - 1]));
  check(g, "footer 'Page n of N' on every page, counting correctly", txt.every((t, i) => t.includes(`Page ${i + 1} of ${np}`)), `${np} pages: ${txt.map((t) => (t.match(/Page \d+ of \d+/) ?? ["-"])[0]).join(" | ")}`);
  const withRows = pages.filter((p) => W(nm, p).some((w) => /^ITEM-\d+$/.test(w.t))), hdr = withRows.map((p) => W(nm, p).some((w) => w.t === b.header));
  check(g, `table header ("${b.header}") repeats on every page that has table rows`, hdr.every(Boolean) && withRows.length >= 2, `rows on pages ${withRows.join(",")}; header on pages ${withRows.filter((p, i) => hdr[i]).join(",")}`);
  const items = [...Array(N)].map((_, i) => { for (const p of pages) { const w = W(nm, p).find((x) => x.t === `ITEM-${i + 1}`); if (w) return { ...w, p }; } return null; });
  check(g, "all 60 rows present once, in order", items.every(Boolean) && items.every((w, i) => !i || w.p > items[i - 1].p || (w.p === items[i - 1].p && w.y0 > items[i - 1].y0)), `${items.filter(Boolean).length}/${N}`);
  const lineTot = (i) => (b.services ? ((i % 5) + 1) * (100 + i) : ((i % 5) + 1) * (100 + i));
  const sameRow = items.every((w, i) => { const amt = W(nm, w.p).filter((x) => x.t === fmt(lineTot(i + 1))); return amt.some((x) => near(x.y0, w.y0, 4)); });
  check(g, "every row keeps description and line amount on one line of one page (rows never split)", sameRow, "ITEM-n and its amount share a baseline");
  const sub = Array.from({ length: N }, (_, i) => lineTot(i + 1)).reduce((s, v) => s + v, 0), tax = Math.round(sub * 10) / 100, tot = Math.round((sub + tax) * 100) / 100;
  const lab = ["Subtotal", b.total.split(" ")[0]], L = (t) => pages.flatMap((p) => W(nm, p).filter((w) => w.t === t).map((w) => ({ ...w, p })));
  const sP = L("Subtotal").at(-1), tP = L(b.total.split(" ")[0]).at(-1), taxP = L("Tax").at(-1);
  check(g, "totals block (subtotal, tax, total) is whole on one page, right after the table ends (a trailing notes callout may follow on the next)", sP && tP && taxP && sP.p === tP.p && taxP.p === sP.p && sP.p >= withRows.at(-1) && sP.p <= withRows.at(-1) + 1 && sP.p >= np - 1, `Subtotal p${sP?.p} Tax p${taxP?.p} ${b.total} p${tP?.p}; last table row p${withRows.at(-1)}; ${np} pages`);
  const t2 = norm(T(nm));
  check(g, "totals math over 60 rows: subtotal, 10% tax, total", t2.includes(fmt(sub)) && t2.includes(fmt(tax)) && t2.includes(fmt(tot)), `${fmt(sub)} + ${fmt(tax)} = ${fmt(tot)}`);
  const clip = pages.map((p) => { const ws = W(nm, p), foot = ws.find((w) => w.t === "Page"), body = ws.filter((w) => w.y1 < (foot?.y0 ?? PAGE_H) - 2 && w.t !== "Page"); const bodyMax = Math.max(...ws.filter((w) => w.y0 < (foot?.y0 ?? PAGE_H) - 8).map((w) => w.y1)); return { p, bodyMax, footY: foot?.y0 }; });
  check(g, "nothing clipped or overlapping the footer: body ends >= 6pt above the footer text and inside the page on every page", clip.every((c) => c.footY && c.bodyMax <= c.footY - 6 && c.footY + 12 <= PAGE_H), clip.map((c) => `p${c.p} body ${f1(c.bodyMax)} / footer ${f1(c.footY)}`).join("; "));
  const sliver = withRows.slice(0, -1).map((p) => { const last = W(nm, p).filter((w) => /^ITEM-\d+$/.test(w.t)).at(-1), r = raster(file(nm), p, { dpi: 144 }); const foot = Math.min(...W(nm, p).filter((w) => w.y0 > PAGE_H - 70).map((w) => w.y0)), end = Math.min(last.y1 + 17, foot - 18); let n = 0; for (let y = Math.round((last.y1 + 10) * 2); y < Math.round(end * 2); y++) for (let x = Math.round(60 * 2); x < Math.round(535 * 2); x++) { const i = (y * r.w + x) * 3; n += r.px[i] < 250 || r.px[i + 1] < 250 || r.px[i + 2] < 250; } return { p, n }; });
  check(g, "no sliver of the next row (border/stripe fragment) painted at the bottom of a page", sliver.every((x) => x.n < 40), `non-white px below the last row: ${sliver.map((x) => `p${x.p} ${x.n}`).join(", ")}`);
  // sweep: the totals box must stay whole however the table happens to end on the page
  const bad = [];
  for (let n = 14; n <= 34; n++) {
    const d = { ...b.sample, [key]: Array.from({ length: n }, (_, i) => mk(i + 1)), taxRate: 0.1, summary: undefined }, f = file(`sweep-${name}`);
    writeFileSync(f, await render(b, d));
    const ps = pagesOf(`sweep-${name}`), ll = (t) => ps.flatMap((p) => W(`sweep-${name}`, p).filter((w) => w.t === t).map((w) => w.t && p)).at(-1);
    const sp = ll("Subtotal"), tp = ll(b.total.split(" ")[0]), xp = ll("Tax");
    if (!(sp === tp && tp === xp)) bad.push(`${n} items: Subtotal p${sp} Tax p${xp} ${b.total} p${tp}`);
    const tx = allText(f);
    if (!tx.every((t2_, i) => new RegExp(`Page ${i + 1} of ${ps.length}`).test(t2_.replace(/\s+/g, " ")))) bad.push(`${n} items: footer counter wrong`);
  }
  check(g, "sweep of 21 invoice lengths (14..34 items): totals never split across pages, counters always right", !bad.length, bad.length ? bad.slice(0, 3).join("; ") : "21/21 lengths ok");
});

// ================= CJK =================
for (const [name, b] of Object.entries(BLOCKS)) await section(`cjk-${name}`, async () => {
  const g = `cjk-${name}`, key = b.services ? "services" : "items";
  const cjk = { ...b.sample, companyName: "雨林科技有限公司", subtitle: "專業文件解決方案", billTo: b.sample.billTo && { ...b.sample.billTo, name: "測試客戶股份有限公司", address: "台北市信義區信義路五段七號" }, client: b.sample.client && { ...b.sample.client, name: "王小明", company: "測試客戶股份有限公司", address: "台北市信義區" }, consultant: b.sample.consultant && { ...b.sample.consultant, name: "陳大文", title: "資深顧問" }, notes: "感謝您的惠顧，請於期限內付款。", footerText: "謝謝光臨 Thank you", [key]: [b.services ? { description: "網站開發與維護", hours: 10, rate: 1500 } : { description: "網站開發與維護", quantity: 2, unitPrice: 1500 }, b.services ? { description: "介面設計", hours: 5, rate: 800 } : { description: "介面設計", quantity: 1, unitPrice: 800 }], taxRate: 0.05 };
  writeFileSync(file(`cjk-${name}`), await render(b, cjk));
  const t = norm(T(`cjk-${name}`)), need = ["雨林科技有限公司", cjk.billTo?.name ?? cjk.client.company, "網站開發與維護", "介面設計", "謝謝光臨", ...(name === "consultant" || name === "creative" ? ["感謝您的惠顧"] : [])], miss = need.filter((s) => !t.includes(s));
  check(g, "CJK company, client, line items, notes and footer render (Noto Sans TC embedded)", !miss.length && /Noto/.test(fonts(file(`cjk-${name}`))), miss.length ? `missing ${miss.join(", ")}` : `fonts: ${fonts(file(`cjk-${name}`)).split("\n").slice(2).map((l) => l.split(/\s+/)[0]).filter(Boolean).join(", ")}`);
  const sub = b.services ? 10 * 1500 + 5 * 800 : 2 * 1500 + 800;
  check(g, "CJK invoice totals still correct", t.includes(fmt(sub)) && t.includes(fmt(sub * 1.05)), `${fmt(sub)} -> ${fmt(sub * 1.05)}`);
});

// ================= class passthrough, default props =================
for (const [name, b] of Object.entries(BLOCKS)) await section(`props-${name}`, async () => {
  const g = `props-${name}`;
  writeFileSync(file(`pass-${name}`), await render(b, b.sample, {}, "bg-[#ff00ff] p-0"));
  const r = raster(file(`pass-${name}`), 1, { dpi: 72 }), mag = colorStats(r, hex("#ff00ff"), { tol: 10 }).n;
  check(g, "class passthrough on the block root (bg-[#ff00ff] fills the content area)", mag > 20000, `${mag} magenta px`);
  const d = await renderPdf(b.Comp, {}, { ...B.blockPage, footer: b.footer }); writeFileSync(file(`default-${name}`), d);
  check(g, "renders with no props at all: the neutral sample data is the default", T(`default-${name}`).includes(b.sample.companyName) && T(`default-${name}`).includes(b.sample.invoiceNumber), `company "${b.sample.companyName}", ${b.sample.invoiceNumber}`);
  check(g, "no pdfcn branding or text copied: sample data is neutral (Acme Co)", !/pdfcn/i.test(T(`default-${name}`)) && /Acme|Springfield/.test(T(`default-${name}`)), "");
});

// ================= browser =================
let server, browser;
try {
  server = await createServer({ configFile: "vite.config.js", root: `${process.cwd()}/playground`, server: { port: 0, host: "127.0.0.1" }, logLevel: "error" });
  await server.listen();
  browser = await chromium.launch();
  const page = await browser.newPage(), errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => ["error", "warning"].includes(m.type()) && !/Failed to load resource/.test(m.text()) && errors.push(`${m.type()}: ${m.text()}`));
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/`);
  await page.waitForFunction(() => window.__pdfwind?.renders.length >= 1, null, { timeout: 60000 });
  const listed = await page.locator("nav button").allTextContents();
  check("browser", "playground sidebar has a Blocks group with the six invoices (and hides the 60-item fixture)", ["classic", "consultant", "corporate", "creative", "minimal", "modern"].every((n) => listed.includes(`Invoice: ${n}`)) && !listed.some((l) => /60 items/.test(l)), `${listed.filter((l) => /^Invoice/.test(l)).join(", ")}`);
  let same = 0; const diffs = [], ms = [];
  for (const n of [...Object.keys(BLOCKS).map((k) => `invoice-${k}`), "invoice-modern-long"]) {
    const k = await page.evaluate(() => window.__pdfwind.renders.length);
    await page.evaluate((d) => window.__pdfwind.set({ demo: d }), n);
    await page.waitForFunction((k) => window.__pdfwind.renders.length > k, k, { timeout: 60000 });
    writeFileSync(file(`browser-${n}`), Buffer.from(await page.evaluate(() => window.__pdfwind.pdfBytes())));
    ms.push(await page.evaluate(() => window.__pdfwind.renders.at(-1).ms));
    const d = demos[n], nodePdf = await renderPdf(d.component, {}, { ...(d.options ?? {}) });
    writeFileSync(file(`node-${n}`), nodePdf);
    const a = norm(allText(file(`node-${n}`)).join(" ")), b2 = norm(allText(file(`browser-${n}`)).join(" "));
    if (a === b2 && pageCount(file(`node-${n}`)) === pageCount(file(`browser-${n}`))) same++; else diffs.push(`${n} (pages ${pageCount(file(`node-${n}`))}/${pageCount(file(`browser-${n}`))})`);
  }
  check("browser", "Chromium renders all 6 blocks + a 3-page invoice with text and page count identical to Node", same === 7, same === 7 ? `7/7 identical; render ms median ${[...ms].sort((x, y) => x - y)[3]}, max ${Math.max(...ms)}` : `differs: ${diffs.join(", ")}`);
  check("browser", "no console errors or Vue warnings", errors.length === 0, errors.slice(0, 3).join(" | "));
} catch (e) { check("browser", "browser run", false, String(e?.stack ?? e).slice(0, 300)); }
finally { await browser?.close(); await server?.close(); await close(); }

const groups = [...new Set(rows.map((r) => r.group))];
const md = ["| # | group | check | result | detail |", "|---|---|---|---|---|", ...rows.map((r, i) => `| ${i + 1} | ${r.group} | ${r.name} | ${r.pass ? "PASS" : "FAIL"} | ${r.detail.replace(/\|/g, "\\|").replace(/\n/g, "<br>")} |`)].join("\n");
const total = `${rows.filter((r) => r.pass).length}/${rows.length} pass`;
const summary = groups.map((g) => `${g}: ${rows.filter((r) => r.group === g && r.pass).length}/${rows.filter((r) => r.group === g).length}`).join(" · ");
writeFileSync(`${OUT}/report.md`, `# Phase 3a E2E\n\n${md}\n\n${total}\n\n${summary}\n`);
console.log(md + `\n\n${total}\n${summary}`);
process.exit(rows.every((r) => r.pass) ? 0 : 1);
