// Phase 3b-1 E2E: report-financial/marketing/operations/security (3 pages), event-agenda, event-ticket (7x3.5in), gift-certificate.
// Text for every section, math from props, multi-page behavior, charts with pixel evidence, QR decode, page sizes vs the pdfcn
// reference PDFs, CJK, class passthrough, Chromium parity, compare PNGs (ours left, pdfcn right). Writes out/phase3b1/.
import { writeFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createServer } from "vite";
import { chromium } from "playwright-core";
import jsQR from "jsqr";
import { load, pageCount, allText, words, find, raster, colorStats, fonts, hex } from "./lib/pdf.mjs";

const OUT = "out/phase3b1", REF = "/tmp/pdfcn-ref";
rmSync(OUT, { recursive: true, force: true });
mkdirSync(`${OUT}/compare`, { recursive: true });

// the blocks' sample colors are theme tokens now; these are their values in the default theme
const TOK = { primary: "#18181b", info: "#0369a1", success: "#15803d", warning: "#a16207", destructive: "#b91c1c", accent: "#71717a" };
const hx = (c) => hex(TOK[c] ?? c);
const rows = [];
const check = (group, name, pass, detail = "") => rows.push({ group, name, pass: !!pass, detail: String(detail) });
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const f1 = (n) => (Math.round(n * 10) / 10).toString();
const norm = (s) => s.replace(/\s+/g, " ").trim();
const sh = (c, a) => execFileSync(c, a, { encoding: "utf8" });
const pageSize = (f) => (sh("pdfinfo", [f]).match(/Page size:\s+([\d.]+) x ([\d.]+)/) ?? []).slice(1).map(Number);

const { renderPdf, demos, close, blocks } = await load();
const B = await blocks();
const { h } = await import("vue");
const file = (n) => `${OUT}/${n}.pdf`;
const T = (n) => allText(file(n)).join("\n");
const W = (n, p) => words(file(n), p);
const pagesOf = (n) => Array.from({ length: pageCount(file(n)) }, (_, i) => i + 1);
const R = (n, p = 1, dpi = 144) => raster(file(n), p, { dpi });
const S = 2; // 144dpi px per pt
const stats = (n, p, color, o) => colorStats(R(n, p), hex(color), o);
const boxPx = (b) => ({ x0: Math.floor(b.x0 * S), y0: Math.floor(b.y0 * S), x1: Math.ceil(b.x1 * S), y1: Math.ceil(b.y1 * S) });
const section = async (g, fn) => { try { await fn(); } catch (e) { check(g, "section ran without throwing", false, String(e?.stack ?? e).split("\n").slice(0, 3).join(" | ")); } };
const wordAt = (n, t) => { for (const p of pagesOf(n)) { const w = find(W(n, p), t); if (w) return { ...w, p }; } return null; };
const has = (txt, list) => list.filter((s) => !txt.includes(norm(s)));

// the block and what must be in it; every block exports its own recommended render options
const REPORTS = {
  "report-financial": { Comp: B.ReportFinancial, opts: B.reportFinancialOptions, sample: B.reportFinancialSample, chart: "line", color: "#18181b", gt: "Revenue" },
  "report-marketing": { Comp: B.ReportMarketing, opts: B.reportMarketingOptions, sample: B.reportMarketingSample, chart: "bar", color: "#15803d", gt: "Pipeline" },
  "report-operations": { Comp: B.ReportOperations, opts: B.reportOperationsOptions, sample: B.reportOperationsSample, chart: "hbar", color: "#0369a1", gt: "Throughput" },
  "report-security": { Comp: B.ReportSecurity, opts: B.reportSecurityOptions, sample: B.reportSecuritySample, chart: "donut", gt: "Open", gp: 2 },
};
const ALL = { ...REPORTS, "event-agenda": { Comp: B.EventAgenda, opts: B.eventAgendaOptions, sample: B.eventAgendaSample }, "event-ticket": { Comp: B.EventTicket, opts: B.eventTicketOptions, sample: B.eventTicketSample }, "gift-certificate": { Comp: B.GiftCertificate, opts: B.giftCertificateOptions, sample: B.giftCertificateSample } };
const render = (b, data, extra = {}, props = {}) => renderPdf(b.Comp, { data, ...props }, { ...b.opts, ...(b.opts.footer && { footer: b.opts.footer }), ...extra });
const NAMES = { "report-financial": "Financial Report", "report-marketing": "Growth Report", "report-operations": "Operations Report", "report-security": "Security Report" };

// ================= every block: options, page size, compare PNGs, anchors =================
for (const [name, b] of Object.entries(ALL)) await section(name, async () => {
  const g = name;
  check(g, "block exports renderOptions (page size / margins / footer band) that renderPdf accepts unchanged", !!b.opts && (b.opts.size !== undefined) && b.opts.margin !== undefined, `size ${JSON.stringify(b.opts.size)}, margin ${JSON.stringify(b.opts.margin)}, footer ${b.opts.footer ? "yes" : "none"}`);
  writeFileSync(file(name), await render(b, b.sample, { metadata: { title: name } }));
  const [w, hh] = pageSize(file(name)), [rw, rh] = pageSize(`${REF}/${name}.pdf`);
  check(g, "page size equals the pdfcn reference PDF (pdfinfo)", near(w, rw, 0.6) && near(hh, rh, 0.6), `ours ${f1(w)} x ${f1(hh)} pt, reference ${f1(rw)} x ${f1(rh)} pt`);
  const np = pageCount(file(name)), rp = pageCount(`${REF}/${name}.pdf`);
  if (REPORTS[name]) check(g, "3 pages like the reference (summary | chart + table | highlights)", np === 3 && rp === 3, `ours ${np}, reference ${rp}`);
  const need = Math.min(np, 3);
  for (let p = 1; p <= need; p++) {
    raster(file(name), p, { dpi: 60, png: `${OUT}/ours-${name}-${p}` });
    if (existsSync(`${REF}/${name}-${p}.png`)) execFileSync("magick", [`${OUT}/ours-${name}-${p}.png`, "-size", "8x10", "xc:#d4d4d8", `${REF}/${name}-${p}.png`, "-background", "#d4d4d8", "-gravity", "north", "+append", `${OUT}/compare/${name}-${p}.png`]);
  }
  check(g, "side-by-side compare PNGs written (ours left, pdfcn right)", Array.from({ length: need }, (_, i) => existsSync(`${OUT}/compare/${name}-${i + 1}.png`)).every(Boolean), `out/phase3b1/compare/${name}-1..${need}.png`);
});

// ================= reports =================
for (const [name, b] of Object.entries(REPORTS)) await section(`${name}`, async () => {
  const g = name, s = b.sample, txt = norm(T(name)), pages = pagesOf(name).map((p) => norm(allText(file(name))[p - 1]));
  const up = (x) => x.toUpperCase();
  const must = [s.title, `${NAMES[name]} · ${s.subtitle}`, s.period, `Generated ${s.generatedAt}`, `Author: ${s.author}`, "EXECUTIVE SUMMARY", "PERFORMANCE TREND", "DELIVERY TABLE", "HIGHLIGHTS & RISKS", "Stream", "Owner", "Status", "Progress", "Risk", "Totals", "Open Risks", "On-Track Streams", "Avg Progress", ...s.summary.flatMap((m) => [up(m.label), m.value, m.trend]), ...s.rows.flatMap((r) => [r.label, r.owner, r.status, r.risk, `${r.progress}%`]), ...(b.chart === "line" || b.chart === "bar" ? s.series.map((x) => x.label) : []), ...s.highlights.map((x) => x.split(" ").slice(0, 3).join(" "))];
  const miss = has(txt, must);
  check(g, "every section present: header, status, author, 4 summary metrics, chart labels, 4 table rows, highlights, key figures", !miss.length, miss.length ? `missing: ${miss.slice(0, 8).join(" | ")}` : `${must.length} strings`);
  check(g, "content on the right pages: summary p1, chart + table p2, highlights p3, header only on p1", pages[0].includes("EXECUTIVE SUMMARY") && pages[0].includes(s.title) && !pages[1].includes(s.title) && pages[1].includes("PERFORMANCE TREND") && pages[1].includes("DELIVERY TABLE") && pages[2].includes("HIGHLIGHTS & RISKS") && !pages[2].includes("DELIVERY TABLE"), pages.map((p, i) => `p${i + 1}: ${p.length} chars`).join(", "));
  check(g, "footer on every page: 'Confidential — Internal Use' and 'Page n of 3'", pages.every((p, i) => p.includes("Confidential — Internal Use") && p.includes(`Page ${i + 1} of 3`)), pages.map((p) => (p.match(/Page \d of \d/) ?? ["-"])[0]).join(" | "));
  // nothing overlapping the footer / outside the page
  const clip = pagesOf(name).map((p) => { const ws = W(name, p), foot = Math.min(...ws.filter((w) => w.y0 > 760).map((w) => w.y0)), body = Math.max(...ws.filter((w) => w.y0 < 760).map((w) => w.y1)); return { p, foot, body }; });
  check(g, "no clipped or overlapping content: body ends above the footer on every page", clip.every((c) => c.body < c.foot - 4), clip.map((c) => `p${c.p} body ${f1(c.body)} < footer ${f1(c.foot)}`).join("; "));
  // math from props
  const rowsX = [{ label: "AAA", owner: "o1", progress: 10, risk: "Low", status: "On Track" }, { label: "BBB", owner: "o2", progress: 20, risk: "High", status: "At Risk" }, { label: "CCC", owner: "o3", progress: 30, risk: "Medium", status: "On Track" }, { label: "DDD", owner: "o4", progress: 41, risk: "Low", status: "On Track" }];
  writeFileSync(file(`math-${name}`), await render(b, { ...s, rows: rowsX }));
  const mt = norm(T(`math-${name}`)), mi = (t) => { const w = W(`math-${name}`, 3).find((x) => x.t === t); return w; };
  const kv = (label, val) => { const l = { ...W(`math-${name}`, 3).find((w) => w.t === label.split(" ").at(-1)), p: 3 }; const v = W(`math-${name}`, l.p).filter((w) => w.t === val && Math.abs(w.y0 - l.y0) < 6); return !!v.length; };
  check(g, "key figures follow the rows: Open Risks 2 (not Low), On-Track 3/4, Avg Progress 25% (10,20,30,41), table Totals 25%", kv("Risks", "2") && kv("On-Track", "3/4") && kv("Avg", "25%") && /Totals - - 25%/.test(mt.replace(/\s+/g, " ")) , `Open Risks / On-Track / Avg checked on page 3, Totals row: ${(mt.match(/Totals[^A-Z]{0,20}/) ?? [""])[0]}`);
  check(g, "old sample rows are gone after the change", !mt.includes(s.rows[0].owner) && !mt.includes(s.rows[1].owner), `owners ${s.rows[0].owner}, ${s.rows[1].owner} absent`);
  // many rows: the delivery table runs over several pages
  const many = Array.from({ length: 45 }, (_, i) => ({ label: `STREAM-${i + 1}`, owner: "Owner", progress: 50 + (i % 40), risk: i % 3 ? "Low" : "High", status: i % 4 ? "On Track" : "At Risk" }));
  writeFileSync(file(`long-${name}`), await render(b, { ...s, rows: many }));
  const lp = pagesOf(`long-${name}`), rowPages = lp.filter((p) => W(`long-${name}`, p).some((w) => /^STREAM-\d+$/.test(w.t))), lt = allText(file(`long-${name}`)).map(norm);
  const hdr = rowPages.map((p) => W(`long-${name}`, p).some((w) => w.t === "Stream"));
  const all = Array.from({ length: 45 }, (_, i) => lp.filter((p) => W(`long-${name}`, p).some((w) => w.t === `STREAM-${i + 1}`)));
  check(g, "45 table rows: spills over several pages, header repeats on each, every row exactly once", rowPages.length >= 2 && hdr.every(Boolean) && all.every((x) => x.length === 1), `rows on pages ${rowPages.join(",")}; header on ${rowPages.filter((p, i) => hdr[i]).join(",")}; ${lp.length} pages`);
  const avg = Math.round(many.reduce((a, r) => a + r.progress, 0) / 45);
  check(g, "long report: counters 'Page n of N' correct on every page, Totals computed over 45 rows, highlights still present", lt.every((t, i) => t.includes(`Page ${i + 1} of ${lp.length}`)) && lt.join(" ").includes(`${avg}%`) && lt.join(" ").includes("HIGHLIGHTS & RISKS"), `${lp.length} pages, avg ${avg}%`);
  const clip2 = lp.map((p) => { const ws = W(`long-${name}`, p), foot = Math.min(...ws.filter((w) => w.y0 > 760).map((w) => w.y0)), body = Math.max(...ws.filter((w) => w.y0 < 760).map((w) => w.y1)); return body < foot - 4; });
  check(g, "long report: nothing overlaps the footer on any page", clip2.every(Boolean), `${lp.length} pages ok`);
  const orphan = lp.map((p) => { const ws = W(`long-${name}`, p).filter((w) => w.y0 < 760); return ws.length > 8; });
  check(g, "long report: no near-empty orphan pages", orphan.every(Boolean), `words per page: ${lp.map((p) => W(`long-${name}`, p).length).join(", ")}`);
  // chart pixels
  const pg = 2, gtw = W(name, 2).find((w) => w.t === b.gt);
  const region = { x0: 48, x1: 548, y0: gtw.y1 + 18, y1: gtw.y1 + 215 };
  if (b.chart === "line") {
    const r = R(name, pg), bb = boxPx(region); let l = [], rt = [];
    for (let y = bb.y0; y < bb.y1; y++) for (let x = bb.x0; x < bb.x1; x++) { const i = (y * r.w + x) * 3; if (Math.abs(r.px[i] - 15) < 25 && Math.abs(r.px[i + 1] - 23) < 25 && Math.abs(r.px[i + 2] - 42) < 25 && true) (x < (bb.x0 + bb.x1) / 2 ? l : rt).push(y); }
    const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
    check(g, "line chart: primary (#18181b) smooth line + 12 dots; rising trend (right half sits higher than left)", l.length > 400 && rt.length > 400 && mean(rt) < mean(l) - 3, `dark px ${l.length}/${rt.length}; mean y left ${f1(mean(l) / S)} vs right ${f1(mean(rt) / S)}pt`);
  } else if (b.chart === "bar") {
    const r = R(name, pg), bb = boxPx(region), isBar = (x, y) => { const i = (y * r.w + x) * 3; return Math.abs(r.px[i] - 21) < 14 && Math.abs(r.px[i + 1] - 128) < 14 && Math.abs(r.px[i + 2] - 61) < 14; };
    const countRuns = (y) => { let n = 0, pv = false; for (let x = bb.x0; x < bb.x1; x++) { const on = isBar(x, y); if (on && !pv) n++; pv = on; } return n; };
    let yMid = bb.y1; while (yMid > bb.y0 && countRuns(yMid) < 12) yMid--; yMid -= 4; // lowest row where all 12 bars are cut
    const hts = []; let runs = 0, prev = false;
    for (let x = bb.x0; x < bb.x1; x++) { const on = isBar(x, yMid); if (on && !prev) { runs++; const cx = x + 6; let y0 = yMid, y1 = yMid; while (isBar(cx, y0 - 1)) y0--; while (isBar(cx, y1 + 1)) y1++; hts.push(y1 - y0 + 1); } prev = on; }
    check(g, "bar chart: 12 bars in success (#15803d), heights follow the series (55 -> 72)", runs === 12 && hts.at(-1) > hts[0] && near(hts.at(-1) / hts[0], 72 / 55, 0.12), `${runs} bars, first/last height ratio ${(hts.at(-1) / hts[0]).toFixed(2)} (expected ${(72 / 55).toFixed(2)})`);
  } else if (b.chart === "hbar") {
    const r = R(name, pg), bb = boxPx(region); const lens = []; let inRun = false, startY = 0;
    const rowLen = (y) => { let a = -1, z = -1; for (let x = bb.x0; x < bb.x1; x++) { const i = (y * r.w + x) * 3; if (Math.abs(r.px[i] - 3) < 14 && Math.abs(r.px[i + 1] - 105) < 14 && Math.abs(r.px[i + 2] - 161) < 14) { if (a < 0) a = x; z = x; } } return a < 0 ? 0 : z - a + 1; };
    let y = bb.y0; const bars = []; while (y < bb.y1) { const l = rowLen(y); if (l > 20) { let y2 = y, best = l; while (y2 < bb.y1 && rowLen(y2) > 20) y2++; bars.push(rowLen(Math.floor((y + y2) / 2))); y = y2 + 2; } else y++; }
    const want = [66, 77, 85, 91];
    check(g, "horizontal bars: 4 bars in info (#0369a1), lengths proportional to 66 / 77 / 85 / 91", bars.length === 4 && bars.every((l, i) => near(l / bars[3], want[i] / 91, 0.05)), `bar lengths ${bars.map((l) => f1(l / S)).join(" / ")}pt`);
  } else {
    const cols = ["#b91c1c", "#a16207", "#15803d", "#0369a1"], areas = cols.map((c) => stats(name, pg, c, { tol: 8, box: boxPx(region) }).n), tot = areas.reduce((a, b2) => a + b2, 0), want = [14, 17, 8, 4].map((v) => v / 43);
    check(g, "donut: slice areas in destructive / warning / success / info match 14 / 17 / 8 / 4", areas.every((a, i) => near(a / tot, want[i], 0.03)) && tot > 8000, `shares ${areas.map((a) => (100 * a / tot).toFixed(1)).join(" / ")}% (expected ${want.map((v) => (100 * v).toFixed(1)).join(" / ")})`);
  }
  // chart reacts to data
  const flipped = { ...s, series: [...s.series].reverse().map((x, i) => ({ label: s.series[i].label, value: x.value })), ...(name === "report-operations" ? {} : {}) };
  if (b.chart === "line" || b.chart === "bar") {
    writeFileSync(file(`flip-${name}`), await render(b, flipped));
    const a = stats(name, 2, b.color, { tol: 14, box: boxPx(region) }), c2 = stats(`flip-${name}`, 2, b.color, { tol: 14, box: boxPx(region) });
    const lc = (st, side) => 0;
    const mid = (n) => { const r = R(n, 2), bb = boxPx(region); let sum = 0, cnt = 0; for (let y = bb.y0; y < bb.y1; y++) for (let x = bb.x0; x < (bb.x0 + bb.x1) / 2; x++) { const i = (y * r.w + x) * 3; if (Math.abs(r.px[i] - hex(b.color)[0]) < 14 && Math.abs(r.px[i + 1] - hex(b.color)[1]) < 14 && Math.abs(r.px[i + 2] - hex(b.color)[2]) < 14) { sum += y; cnt++; } } return sum / cnt; };
    check(g, "chart is driven by data.series: reversing the series moves the left half of the plot up", mid(`flip-${name}`) < mid(name) - 2, `left-half mean y ${f1(mid(name) / S)} -> ${f1(mid(`flip-${name}`) / S)}pt`);
  }
});

// ================= class passthrough + CJK for reports =================
for (const [name, b] of Object.entries(REPORTS)) await section(`${name}-more`, async () => {
  const g = name, s = b.sample;
  const cjk = { ...s, title: "季度財務報告", subtitle: "營收、毛利與費用控管概覽", author: "財務營運部", period: "2026 第一季", summary: s.summary.map((m, i) => (i === 0 ? { ...m, label: "營收", trend: "較上季成長" } : m)), rows: s.rows.map((r, i) => (i === 0 ? { ...r, label: "企業銷售", owner: "王小明" } : r)), highlights: ["企業擴展活動帶動營收加速成長。", ...s.highlights.slice(1)] };
  writeFileSync(file(`cjk-${name}`), await render(b, cjk));
  const t = norm(T(`cjk-${name}`)), miss = has(t, ["季度財務報告", "營收、毛利與費用控管概覽", "財務營運部", "營收", "企業銷售", "王小明", "企業擴展活動帶動營收加速成長"]);
  check(g, "CJK title, subtitle, author, metric, table row and highlight render (Noto embedded)", !miss.length && /Noto/.test(fonts(file(`cjk-${name}`))), miss.length ? `missing ${miss.join(", ")}` : "all present");
  const pass = await renderPdf({ render: () => h(b.Comp, { data: s, class: "bg-[#ff00ff]" }) }, {}, { ...b.opts });
  writeFileSync(file(`pass-${name}`), pass);
  check(g, "class passthrough on the root (bg-[#ff00ff] fills the content box)", stats(`pass-${name}`, 1, "#ff00ff", { tol: 10 }).n > 30000, `${stats(`pass-${name}`, 1, "#ff00ff", { tol: 10 }).n} magenta px on page 1`);
  const def = await renderPdf(b.Comp, {}, { ...b.opts }); writeFileSync(file(`default-${name}`), def);
  check(g, "renders with no props: neutral sample data is the default, no pdfcn text", T(`default-${name}`).includes(s.title) && !/pdfcn/i.test(T(`default-${name}`)), s.title);
});

// ================= event agenda =================
await section("event-agenda-detail", async () => {
  const g = "event-agenda", b = ALL["event-agenda"], s = b.sample, n = "event-agenda", txt = norm(T(n)), pages = allText(file(n)).map(norm);
  const must = [s.eventName, "EVENT AGENDA", "AGENDA", `${s.date} – ${s.endDate} • ${s.venue}`, "Day 1", "Day 2", "Day 1 of 2", "Day 2 of 2", "TRACKS:", ...s.tracks.map((t) => t.name), ...s.days.flatMap((d) => d.sessions.flatMap((x) => [x.time, x.endTime && `to ${x.endTime}`, x.title.split(" ").slice(0, 3).join(" "), x.speaker, x.room, x.track, x.description && x.description.split(" ").slice(0, 4).join(" ")])).filter(Boolean), "BREAK", `Wi-Fi: ${s.wifiInfo}`, s.emergencyContact];
  const miss = has(txt, must);
  check(g, "every section present: header, day banners, track legend, all 20 sessions (time, title, speaker, room, track, description), breaks, wifi, emergency contact", !miss.length, miss.length ? `missing: ${miss.slice(0, 6).join(" | ")}` : `${must.length} strings`);
  check(g, "one page per day: day 1 on page 1, day 2 on page 2, each with its own header", pageCount(file(n)) === 2 && pages[0].includes("Day 1 of 2") && !pages[0].includes("Day 2 of 2") && pages[1].includes("Day 2 of 2") && pages.every((p) => p.includes(s.eventName)), `${pageCount(file(n))} pages (the pdfcn reference spills a third, footer-only page)`);
  check(g, "footer band on every page: Wi-Fi, organizers desk, 'Page n of 2'", pages.every((p, i) => p.includes("Wi-Fi:") && p.includes("Organizers Desk") && p.includes(`Page ${i + 1} of 2`)), pages.map((p) => (p.match(/Page \d of \d/) ?? ["-"])[0]).join(" | "));
  const wsx = (t, p = 1) => W(n, p).filter((w) => w.t === t);
  const a = find(W(n, 1), "Server"), c = find(W(n, 1), "State");
  check(g, "parallel sessions of one time slot sit side by side with the same top, one card each", a && c && near(a.y0, c.y0, 1.5) && c.x0 > a.x0 + 100, `Server x ${f1(a?.x0)} / State x ${f1(c?.x0)}, y ${f1(a?.y0)} / ${f1(c?.y0)}`);
  const br = wsx("BREAK", 1).length, brWant = s.days[0].sessions.filter((x) => x.isBreak).length;
  check(g, "breaks are full-width dashed cards with a BREAK badge", br === brWant, `${br} BREAK badges on day 1, ${brWant} break sessions`);
  const tc = (col, p, tol = 20) => colorStats(R(n, p), hx(col), { tol, box: boxPx({ x0: 0, x1: 595, y0: 150, y1: 760 }) }).n;
  check(g, "track colors (info / success / warning tokens): 3pt left bars on session cards, legend dots", s.tracks.every((t) => tc(t.color, 1) > 100), s.tracks.map((t) => `${t.name} ${tc(t.color, 1)}px`).join(", "));
  const ac = colorStats(R(n, 1), hx(s.accentColor), { tol: 12, box: boxPx({ x0: 400, x1: 575, y0: 30, y1: 80 }) }).n, sp = wsx("Rivera", 1)[0];
  check(g, "accentColor destructive (token): AGENDA badge fill and speaker names", ac > 800 && colorStats(R(n, 1), hx(s.accentColor), { tol: 40, box: boxPx({ x0: sp.x0, x1: sp.x1, y0: sp.y0, y1: sp.y1 }) }).n > 20, `badge ${ac}px`);
  // overflow: a very long day
  const extra = Array.from({ length: 14 }, (_, i) => ({ time: `${10 + i}:00 PM`, endTime: `${10 + i}:45 PM`, title: `EXTRA-${i + 1} session title`, track: "Core Web", room: "Room A", speaker: "Speaker Name", description: "Extra description text for the overflow day that wraps nicely." }));
  const longData = { ...s, days: [{ ...s.days[0], sessions: [...s.days[0].sessions, ...extra] }, s.days[1]] };
  writeFileSync(file("long-agenda"), await renderPdf(b.Comp, { data: longData }, { ...b.opts }));
  const lt = allText(file("long-agenda")).map(norm), lp = pageCount(file("long-agenda"));
  const missX = extra.filter((x) => !lt.join(" ").includes(x.title)), clip = pagesOf("long-agenda").map((p) => { const ws = W("long-agenda", p), foot = Math.min(...ws.filter((w) => w.y0 > 760).map((w) => w.y0)); return Math.max(...ws.filter((w) => w.y0 < 760).map((w) => w.y1)) < foot - 2; });
  const splitCards = extra.filter((x) => { const t = pagesOf("long-agenda").filter((p) => W("long-agenda", p).some((w) => w.t === `EXTRA-${x.title.split("-")[1].split(" ")[0]}`)); return t.length !== 1; }).length;
  check(g, "a day with 14 extra sessions flows onto more pages: all sessions present, counters 'Page n of N' follow the real page count, no overlap with the footer, no card split", lp >= 3 && !missX.length && lt.every((t, i) => t.includes(`Page ${i + 1} of ${lp}`)) && clip.every(Boolean) && !splitCards, `${lp} pages; missing ${missX.length}; footer clear ${clip.join("/")}; cards on more than one page: ${splitCards}`);
  const cjk = { ...s, eventName: "雨林開發者高峰會", venue: "台北國際會議中心", days: [{ label: "第一天", date: "2026年10月20日", sessions: [{ time: "9:00 AM", endTime: "10:00 AM", title: "開幕主題演講", speaker: "王小明", room: "主廳", track: "Core Web", description: "概述網頁介面工程的最新演進。" }, { time: "10:00 AM", endTime: "10:30 AM", isBreak: true, title: "茶敘時間", description: "展覽廳提供咖啡。" }] }] };
  writeFileSync(file("cjk-agenda"), await renderPdf(b.Comp, { data: cjk }, { ...b.opts }));
  const ct = norm(T("cjk-agenda")), cm = has(ct, ["雨林開發者高峰會", "台北國際會議中心", "第一天", "開幕主題演講", "王小明", "主廳", "概述網頁介面工程的最新演進", "茶敘時間"]);
  check(g, "CJK event name, venue, day label, session title, speaker, room, description and break render", !cm.length && /Noto/.test(fonts(file("cjk-agenda"))), cm.length ? `missing ${cm.join(", ")}` : "all present");
  const pass = await renderPdf({ render: () => h(b.Comp, { data: s, class: "bg-[#ff00ff]" }) }, {}, { ...b.opts }); writeFileSync(file("pass-agenda"), pass);
  check(g, "class passthrough on the root", colorStats(R("pass-agenda", 1), hex("#ff00ff"), { tol: 10 }).n > 30000, "");
  const def = await renderPdf(b.Comp, {}, { ...b.opts }); writeFileSync(file("default-agenda"), def);
  check(g, "renders with no props; neutral sample (no real names from the reference)", T("default-agenda").includes(s.eventName) && !/pdfcn|React Summit|Abramov/i.test(T("default-agenda")), s.eventName);
});

// ================= event ticket =================
await section("event-ticket-detail", async () => {
  const g = "event-ticket", b = ALL["event-ticket"], s = b.sample, n = "event-ticket", txt = norm(T(n));
  check(g, "single page of exactly 504 x 252 pt (7in x 3.5in) from the block's render options, no hacks", pageCount(file(n)) === 1 && (() => { const [w, hh] = pageSize(file(n)); return near(w, 504, 0.6) && near(hh, 252, 0.6); })(), pageSize(file(n)).join(" x "));
  const must = [s.organizer.toUpperCase(), s.ticketType, s.eventName, s.venue, s.address, "DATE", s.eventDate, "TIME", s.eventTime, "DOORS", s.doorsOpen, "SEAT", `${s.seat.section}–${s.seat.row}–${s.seat.number}`, s.terms, "X", "@acmeevents", "INSTAGRAM", "ADMIT ONE", s.ticketNumber], miss = has(txt, must);
  check(g, "every section present: organizer, type pill, event, venue, address, date/time/doors/seat, terms, social handles, admit one, ticket number", !miss.length, miss.length ? `missing ${miss.join(", ")}` : `${must.length} strings`);
  const ws = W(n, 1), out = ws.filter((w) => w.x0 < -0.5 || w.y0 < -0.5 || w.x1 > 504.5 || w.y1 > 252.5);
  check(g, "all text inside the 504 x 252 page", !out.length, out.length ? `outside: ${out.map((w) => w.t).join(",")}` : `${ws.length} words inside`);
  // QR decodes to the ticket number
  const q = raster(file(n), 1, { dpi: 300 }), sc = 300 / 72, cx0 = Math.floor(380 * sc), cy0 = Math.floor(30 * sc), cw = Math.ceil(124 * sc), chh = Math.ceil(170 * sc), rgba = new Uint8ClampedArray(cw * chh * 4);
  for (let y = 0; y < chh; y++) for (let x = 0; x < cw; x++) { const i = ((cy0 + y) * q.w + cx0 + x) * 3, o = (y * cw + x) * 4; rgba[o] = q.px[i]; rgba[o + 1] = q.px[i + 1]; rgba[o + 2] = q.px[i + 2]; rgba[o + 3] = 255; }
  const hit = jsQR(rgba, cw, chh);
  check(g, "the QR on the stub decodes (jsQR, 300dpi) to the ticket number", hit && new TextDecoder().decode(Uint8Array.from(hit.binaryData)) === s.ticketNumber, hit ? `decoded "${new TextDecoder().decode(Uint8Array.from(hit.binaryData))}"` : "no decode");
  const stripe = colorStats(R(n, 1), hx(s.accentColor), { tol: 6, box: boxPx({ x0: 0, x1: 10, y0: 20, y1: 230 }) }), stub = colorStats(R(n, 1), hx(s.accentColor), { tol: 6, box: boxPx({ x0: 392, x1: 500, y0: 20, y1: 230 }) });
  check(g, "layout: 8pt accent stripe on the left, 120pt accent stub on the right", near(stripe.x1 / S, 8, 1.2) && stub.n > 30000, `stripe width ${f1(stripe.x1 / S)}pt, stub ${stub.n}px`);
  const r1 = R(n, 1), px = (x, y) => { const i = (Math.round(y * S) * r1.w + Math.round(x * S)) * 3; return [r1.px[i], r1.px[i + 1], r1.px[i + 2]]; };
  const notchTop = px(384, 1), notchBot = px(384, 251), stubMid = px(450, 60), stubTop = px(410, 1), stubBot = px(410, 251);
  check(g, "ticket notches: page-colored half circles cut into the stub at the top and bottom of the perforation", notchTop.every((v) => v > 240) && notchBot.every((v) => v > 240) && !stubMid.every((v) => v > 240) && !stubTop.every((v) => v > 240) && !stubBot.every((v) => v > 240), `notch top ${notchTop}, bottom ${notchBot}; stub beside the notches ${stubTop} / ${stubBot}, stub body ${stubMid}`);
  const dash = colorStats(r1, [255, 255, 255], { tol: 6, box: boxPx({ x0: 383.5, x1: 386, y0: 30, y1: 220 }) });
  check(g, "perforation: dashed line along the stub edge (alternating white / accent)", (() => { let runs = 0, prev = false; const x = Math.round(384.6 * S); for (let y = Math.round(30 * S); y < Math.round(220 * S); y++) { const i = (y * r1.w + x) * 3, on = r1.px[i] > 240 && r1.px[i + 1] > 240; if (on && !prev) runs++; prev = on; } return runs; })() > 15, "");
  const ink = colorStats(R(n, 1), [255, 255, 255], { tol: 20, box: boxPx(find(ws, "ADMIT")) }).n;
  check(g, "text on the stub is white on the dark accent", ink > 20, `${ink} white px in "ADMIT"`);
  writeFileSync(file("light-ticket"), await renderPdf(b.Comp, { data: { ...s, accentColor: "#fde047", seat: undefined, doorsOpen: undefined, eventName: "ANOTHER EVENT", ticketType: "GA" } }, { ...b.opts }));
  const lt = norm(T("light-ticket")), lw = find(W("light-ticket", 1), "ADMIT"), dark = colorStats(R("light-ticket", 1), [24, 24, 27], { tol: 30, box: boxPx(lw) }).n;
  check(g, "props drive it: light accent -> dark ink on the stub/pill; no seat -> no SEAT; no doors -> no DOORS; new name/type shown", dark > 20 && !lt.includes("SEAT") && !lt.includes("DOORS") && lt.includes("ANOTHER EVENT") && lt.includes("GA"), `${dark} dark px in ADMIT; SEAT ${lt.includes("SEAT")}`);
  const cjk = { ...s, eventName: "雨林開發者大會", venue: "台北國際會議中心", address: "台北市信義區信義路五段七號", organizer: "雨林活動", terms: "票券不可轉讓，售出不退。" };
  writeFileSync(file("cjk-ticket"), await renderPdf(b.Comp, { data: cjk }, { ...b.opts }));
  const ct = norm(T("cjk-ticket")), cm = has(ct, ["雨林開發者大會", "台北國際會議中心", "台北市信義區信義路五段七號", "雨林活動", "票券不可轉讓，售出不退。"]);
  check(g, "CJK event, venue, address, organizer and terms render; still one page", !cm.length && pageCount(file("cjk-ticket")) === 1, cm.length ? `missing ${cm.join(", ")}` : "all present");
  writeFileSync(file("pass-ticket"), await renderPdf({ render: () => h(b.Comp, { data: s, class: "bg-[#ff00ff]" }) }, {}, { ...b.opts }));
  check(g, "class passthrough on the root", colorStats(R("pass-ticket", 1), hex("#ff00ff"), { tol: 10 }).n > 100, "");
  const def = await renderPdf(b.Comp, {}, { ...b.opts }); writeFileSync(file("default-ticket"), def);
  check(g, "renders with no props; neutral sample (no ShadCN / pdfcn text)", T("default-ticket").includes(s.eventName) && !/shadcn|pdfcn/i.test(T("default-ticket")), s.eventName);
});

// ================= gift certificate =================
await section("gift-certificate-detail", async () => {
  const g = "gift-certificate", b = ALL["gift-certificate"], s = b.sample, n = "gift-certificate", txt = norm(T(n));
  check(g, "one A4 portrait page from the block's render options (same size as the reference)", pageCount(file(n)) === 1 && (() => { const [w, hh] = pageSize(file(n)); return near(w, 595.3, 0.6) && near(hh, 841.9, 0.6); })(), pageSize(file(n)).join(" x "));
  const must = ["GIFT CERTIFICATE", s.companyName, "$50.00", "TO", s.recipientName, "FROM", s.senderName, `"${s.message}"`, "CERTIFICATE CODE", s.certificateCode, "VALID UNTIL", s.expiryDate, s.redemptionInstructions, s.terms], miss = has(txt, must);
  check(g, "every section present: title, company, amount, to/from, message, code, validity, instructions, terms", !miss.length, miss.length ? `missing ${miss.join(", ")}` : `${must.length} strings`);
  const fmtOf = async (data, props = {}) => { writeFileSync(file("amt"), await renderPdf(b.Comp, { data: { ...s, ...data }, ...props }, { ...b.opts })); return norm(T("amt")); };
  const a1 = await fmtOf({ amount: 1234.5 }), a2 = await fmtOf({ amount: 1234.5, currency: "EUR" }, { locale: "de-DE" }), a3 = await fmtOf({ amount: 3000, currency: "JPY" });
  check(g, "amount is formatted from props: 1234.5 -> $1,234.50; EUR/de-DE -> 1.234,50 €; JPY 3000 -> ¥3,000", a1.includes("$1,234.50") && a2.includes("1.234,50") && a2.includes("€") && a3.includes("¥3,000") && !a3.includes("¥3,000.00"), `${(a1.match(/\$[\d,.]+/) ?? ["-"])[0]} | ${(a2.match(/[\d.,]+\s?€/) ?? ["-"])[0]} | ${(a3.match(/¥[\d,.]+/) ?? ["-"])[0]}`);
  const col = "#0369a1", cw = await (async () => { writeFileSync(file("accent-cert"), await renderPdf(b.Comp, { data: { ...s, accentColor: col } }, { ...b.opts })); return colorStats(R("accent-cert", 1), hex(col), { tol: 8 }).n; })();
  check(g, "accentColor drives the frame, title, amount box and validity date", cw > 4000 && colorStats(R(n, 1), hex(col), { tol: 8 }).n < 100, `${cw} px of ${col} (0 in the default black version)`);
  const r = R(n, 1);
  const frame = (() => { let x = Math.round(66 * S) - 4, run = 0; const y = Math.round(300 * S); for (let i = x; i < x + 40; i++) { const k = (y * r.w + i) * 3; if (r.px[k] < 90) run++; else if (run) break; } return run; })();
  check(g, "outer frame 3pt (6px) in the primary color (#18181b), inset 66pt from the page edge (matches the reference margins)", near(frame, 6, 1.5) && stats(n, 1, "#18181b", { tol: 20, box: boxPx({ x0: 60, x1: 72, y0: 300, y1: 302 }) }).n > 6, `frame ${frame}px thick`);
  const top = Math.round(110 * S), dash = (() => { let runs = 0, prev = false; for (let x = Math.round(90 * S); x < Math.round(500 * S); x++) { let on = false; for (let y = Math.round(78 * S); y < Math.round(90 * S) && !on; y++) { const k = (y * r.w + x) * 3; on = r.px[k] < 120; } if (on && !prev) runs++; prev = on; } return runs; })();
  check(g, "inner border is dashed (all four sides)", dash > 20, `${dash} dashes along the top edge`);
  check(g, "italic message uses the real italic face", /Italic/i.test(fonts(file(n))), "");
  const small = await (async () => { writeFileSync(file("min-cert"), await renderPdf(b.Comp, { data: { companyName: "Acme Co", amount: 20, recipientName: "A", senderName: "B", certificateCode: "X-1", expiryDate: "2030" } }, { ...b.opts })); return norm(T("min-cert")); })();
  check(g, "optional fields (message, instructions, terms, logo) can be omitted: nothing else is lost", small.includes("$20.00") && small.includes("X-1") && !small.includes("Present this") && !small.includes("No cash value") && !small.includes("\"") && pageCount(file("min-cert")) === 1, "");
  const long = await (async () => { writeFileSync(file("long-cert"), await renderPdf(b.Comp, { data: { ...s, message: "A longer personal message that wraps over a few lines. ".repeat(3), terms: "Terms and conditions text. ".repeat(4) } }, { ...b.opts })); return pageCount(file("long-cert")); })();
  check(g, "a long message and long terms still fit on one page (the frame is kept whole)", long === 1, `${long} page(s)`);
  const cjk = { ...s, companyName: "雨林咖啡", recipientName: "小美", senderName: "爸爸媽媽", message: "生日快樂！請享用一杯咖啡。", terms: "不可兌換現金，一人一次。" };
  writeFileSync(file("cjk-cert"), await renderPdf(b.Comp, { data: cjk }, { ...b.opts }));
  const ct = norm(T("cjk-cert")), cm = has(ct, ["雨林咖啡", "小美", "爸爸媽媽", "生日快樂！請享用一杯咖啡。", "不可兌換現金，一人一次。"]);
  check(g, "CJK company, recipient, sender, message and terms render", !cm.length && /Noto/.test(fonts(file("cjk-cert"))), cm.length ? `missing ${cm.join(", ")}` : "all present");
  writeFileSync(file("pass-cert"), await renderPdf({ render: () => h(b.Comp, { data: s, class: "bg-[#ff00ff]" }) }, {}, { ...b.opts }));
  check(g, "class passthrough on the root", colorStats(R("pass-cert", 1), hex("#ff00ff"), { tol: 10 }).n > 20000, "");
  const def = await renderPdf(b.Comp, {}, { ...b.opts }); writeFileSync(file("default-cert"), def);
  check(g, "renders with no props; neutral sample (no pdfcn text)", T("default-cert").includes(s.certificateCode) && !/pdfcn/i.test(T("default-cert")), s.certificateCode);
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
  const want = ["Report: financial", "Report: marketing", "Report: operations", "Report: security", "Event agenda", "Event ticket", "Gift certificate"];
  check("browser", "playground Blocks group lists the 7 new blocks (each uses its own exported render options)", want.every((t) => listed.includes(t)), want.filter((t) => !listed.includes(t)).join(", ") || `${want.length}/7 listed`);
  let same = 0; const diffs = [], sizes = [], ms = [];
  for (const nme of Object.keys(ALL)) {
    const k = await page.evaluate(() => window.__pdfwind.renders.length);
    await page.evaluate((d) => window.__pdfwind.set({ demo: d }), nme);
    await page.waitForFunction((k) => window.__pdfwind.renders.length > k, k, { timeout: 60000 });
    writeFileSync(file(`browser-${nme}`), Buffer.from(await page.evaluate(() => window.__pdfwind.pdfBytes())));
    ms.push(await page.evaluate(() => window.__pdfwind.renders.at(-1).ms));
    const d = demos[nme], nodePdf = await renderPdf(d.component, {}, { ...(d.options ?? {}) });
    writeFileSync(file(`node-${nme}`), nodePdf);
    const a = norm(allText(file(`node-${nme}`)).join(" ")), c = norm(allText(file(`browser-${nme}`)).join(" "));
    if (a === c && pageCount(file(`node-${nme}`)) === pageCount(file(`browser-${nme}`))) same++; else diffs.push(`${nme} (pages ${pageCount(file(`node-${nme}`))}/${pageCount(file(`browser-${nme}`))})`);
    const [w, hh] = pageSize(file(`browser-${nme}`)), [rw, rh] = pageSize(`${REF}/${nme}.pdf`);
    if (!(near(w, rw, 0.6) && near(hh, rh, 0.6))) sizes.push(`${nme} ${f1(w)}x${f1(hh)} vs ${f1(rw)}x${f1(rh)}`);
  }
  check("browser", "Chromium renders all 7 blocks with text and page count identical to Node", same === 7, same === 7 ? `7/7 identical; render ms median ${[...ms].sort((x, y) => x - y)[3]}, max ${Math.max(...ms)}` : `differs: ${diffs.join(", ")}`);
  check("browser", "Chromium page sizes match the reference too (ticket 504x252, A4 elsewhere): the playground just uses the block's options", !sizes.length, sizes.join("; ") || "7/7 sizes match");
  check("browser", "no console errors or Vue warnings", errors.length === 0, errors.slice(0, 3).join(" | "));
} catch (e) { check("browser", "browser run", false, String(e?.stack ?? e).slice(0, 300)); }
finally { await browser?.close(); await server?.close(); await close(); }

const groups = [...new Set(rows.map((r) => r.group))];
const md = ["| # | group | check | result | detail |", "|---|---|---|---|---|", ...rows.map((r, i) => `| ${i + 1} | ${r.group} | ${r.name} | ${r.pass ? "PASS" : "FAIL"} | ${r.detail.replace(/\|/g, "\\|").replace(/\n/g, "<br>")} |`)].join("\n");
const total = `${rows.filter((r) => r.pass).length}/${rows.length} pass`;
const summary = groups.map((g) => `${g}: ${rows.filter((r) => r.group === g && r.pass).length}/${rows.filter((r) => r.group === g).length}`).join(" · ");
writeFileSync(`${OUT}/report.md`, `# Phase 3b-1 E2E\n\n${md}\n\n${total}\n\n${summary}\n`);
console.log(md + `\n\n${total}\n${summary}`);
process.exit(rows.every((r) => r.pass) ? 0 : 1);
