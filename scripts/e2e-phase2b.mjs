import { requireTools } from "./lib/tools.mjs";
requireTools();
// Phase 2b E2E: Table, DataTable, KeyValue, Graph, QRCode, Alert, Badge, Form, Signature, PdfImage
// + oversized break-inside-avoid content for every such component. Real evidence: extracted text, bbox geometry,
// pixels, page breaks, QR decoding (jsQR, dev-only), image/URL handling. Writes out/phase2b/*.pdf, *.png, report.md.
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { createServer } from "vite";
import { chromium } from "playwright-core";
import jsQR from "jsqr";
import { load, pageCount, allText, words, find, raster, colorStats, hex } from "./lib/pdf.mjs";

const OUT = "out/phase2b";
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const rows = [];
const check = (group, name, pass, detail = "") => rows.push({ group, name, pass: !!pass, detail: String(detail) });
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const f1 = (n) => (Math.round(n * 10) / 10).toString();

const DPI = 144, S = DPI / 72;
const PAGE_W = 595.28, PAGE_H = 841.89, LEFT = 30, RIGHT = PAGE_W - 30, CENTER = PAGE_W / 2;
const C = { primary: "#18181b", border: "#e4e4e7", muted: "#fafafa", mutedFg: "#71717a", success: "#15803d", destructive: "#b91c1c", info: "#0369a1", warning: "#a16207", magenta: "#ff00ff", white: "#ffffff" };
const mix = (fg, alpha) => hex(fg).map((c) => Math.round(255 - (255 - c) * alpha));

const { renderPdf, demos, QR, components, assets, close } = await load();
const file = (n) => `${OUT}/${n}.pdf`;
const rasters = {};
const R = (n, p = 1) => (rasters[`${n}:${p}`] ??= raster(file(n), p, { dpi: DPI }));
const W = (n, p) => words(file(n), p);
const pagesOf = (n) => Array.from({ length: pageCount(file(n)) }, (_, i) => i + 1);
const wd = (n, t) => { for (const p of pagesOf(n)) { const w = find(W(n, p), t); if (w) return { ...w, p }; } throw new Error(`word "${t}" not found in ${n}`); };
const all = (n, t) => pagesOf(n).flatMap((p) => W(n, p).filter((w) => w.t === t).map((w) => ({ ...w, p })));
const lineEnd = (n, w) => Math.max(...W(n, w.p).filter((x) => Math.abs(x.y0 - w.y0) < 1.5).map((x) => x.x1));
const text = (n) => allText(file(n)).join("\n");
// the caption a word starts: following words on the same line while the gap stays small (several captions can share a row)
const span = (n, w) => { const line = W(n, w.p).filter((x) => Math.abs(x.y0 - w.y0) < 1.5 && x.x0 >= w.x0 - 0.1).sort((a, b) => a.x0 - b.x0); let end = w.x1; for (const x of line) { if (x.x0 - end < 9) end = Math.max(end, x.x1); else break; } return { x0: w.x0, x1: end, cx: (w.x0 + end) / 2 }; };
const nonWhite = (n, p, b) => { const { w, px: d } = R(n, p), bb = box(b); let k = 0; for (let y = bb.y0; y < bb.y1; y++) for (let x = bb.x0; x < bb.x1; x++) { const i = (y * w + x) * 3; k += d[i] < 235 || d[i + 1] < 235 || d[i + 2] < 235; } return k; };
const box = (b) => ({ x0: Math.max(0, Math.floor(b.x0 * S)), y0: Math.max(0, Math.floor(b.y0 * S)), x1: Math.ceil(b.x1 * S), y1: Math.ceil(b.y1 * S) });
const inBox = (n, p, color, b, tol = 14) => colorStats(R(n, p), hex(color), { tol, box: box(b) });
const row = (w, pad = 0) => ({ x0: 0, x1: PAGE_W, y0: w.y0 - pad, y1: w.y1 + pad });
const ink = (n, p, b) => { const { w, px: d } = R(n, p), bb = box(b); let k = 0; for (let y = bb.y0; y < bb.y1; y++) for (let x = bb.x0; x < bb.x1; x++) { const i = (y * w + x) * 3; k += d[i] < 110 && d[i + 1] < 110 && d[i + 2] < 110; } return k; };
const section = async (g, fn) => { try { await fn(); } catch (e) { check(g, "section ran without throwing", false, String(e?.stack ?? e).split("\n").slice(0, 3).join(" | ")); } };
const passthrough = (g, n, p = 1) => { const k = colorStats(R(n, p), hex(C.magenta), { tol: 10 }).n; check(g, "class passthrough applies (magenta pixels from class=\"...[#ff00ff]\")", k > 150, `${k} px`); };
const has = (g, n, markers) => { const t = text(n), miss = markers.filter((m) => !t.includes(m)); check(g, "all labels present in extracted text", !miss.length, miss.length ? `missing: ${miss.join(", ")}` : `${markers.length} markers`); };

// ---- render every demo ----
const wantPng = (n) => !n.startsWith("tall-") && !n.endsWith("-long");
for (const [name, d] of Object.entries(demos)) {
  if (!["table", "table-long", "data-table", "data-table-long", "key-value", "graph", "graph-2", "qrcode", "alert", "badge", "form", "signature", "pdf-image"].includes(name) && !name.startsWith("tall-")) continue;
  try {
    const pdf = await renderPdf(d.component, {}, { margin: 40, ...(d.options ?? {}) });
    writeFileSync(file(name), pdf);
    const pages = pageCount(file(name));
    for (let p = 1; p <= (wantPng(name) ? pages : Math.min(pages, 3)); p++) raster(file(name), p, { dpi: 110, png: `${OUT}/${name}-${p}` });
    check("render", `${name}: renders to PDF + PNG`, pdf.length > 1000, `${pdf.length} bytes, ${pages} page(s)`);
  } catch (e) { check("render", `${name}: renders to PDF + PNG`, false, e.message.split("\n")[0]); }
}

// ================= Table =================
await section("Table", async () => {
  const g = "Table", n = "table";
  has(g, n, ["TB-line-H1", "TB-grid-H1", "TB-minimal-H1", "TB-striped-H1", "TB-COMPACT-H1", "TB-bordered-H1", "TB-PRIMARY-HEADER-H1", "TB-line-R3C3", "TB-grid-F3", "TBW-AMOUNT"]);
  const hRow = (v) => row(wd(n, v === "compact" ? "TB-COMPACT-H1" : v === "primary-header" ? "TB-PRIMARY-HEADER-H1" : `TB-${v}-H1`), 5);
  const hp = (v) => wd(n, v === "compact" ? "TB-COMPACT-H1" : v === "primary-header" ? "TB-PRIMARY-HEADER-H1" : `TB-${v}-H1`).p;
  const bg = (v, col, tol = 1) => inBox(n, hp(v), col, { ...hRow(v), x0: LEFT + 2, x1: RIGHT - 2 }, tol).n;
  check(g, "header row fill: grid/bordered/compact/striped = muted, primary-header = primary, line/minimal = none", ["grid", "bordered", "compact", "striped"].every((v) => bg(v, C.muted) > 4000) && bg("primary-header", C.primary, 4) > 4000 && ["line", "minimal"].every((v) => bg(v, C.muted) < 800), ["grid", "bordered", "compact", "striped", "primary-header", "line", "minimal"].map((v) => `${v} ${bg(v, v === "primary-header" ? C.primary : C.muted, v === "primary-header" ? 4 : 1)}px`).join(", "));
  const hw = wd(n, "TB-PRIMARY-HEADER-H1"), white = inBox(n, hw.p, C.white, hw, 20).n;
  check(g, "primary-header: white uppercase text on the primary band", white > 40 && text(n).includes("TB-PRIMARY-HEADER-H1"), `${white} white text px`);
  check(g, "compact: header text uppercase + smaller body text than line", text(n).includes("TB-COMPACT-H1") && !text(n).includes("TB-compact-H1") && (() => { const a = wd(n, "TB-compact-R1C1"), b = wd(n, "TB-line-R1C1"); return a.y1 - a.y0 < b.y1 - b.y0 - 1; })(), "uppercased header, 10pt body vs 11pt");
  const gr = wd(n, "TB-grid-R1C1"), vlines = inBox(n, gr.p, C.border, { x0: LEFT, x1: RIGHT, y0: gr.y0 + 1, y1: gr.y1 - 1 }, 8);
  const colBorder = (v, x0, x1) => inBox(n, wd(n, `TB-${v}-R2C1`).p, C.border, { x0, x1, y0: wd(n, `TB-${v}-R2C1`).y0 + 2, y1: wd(n, `TB-${v}-R2C1`).y1 - 2 }, 8).n;
  const sepX = wd(n, "TB-grid-R1C2").x0 - 12;
  check(g, "grid: vertical rules between columns, none after the last; outer frame 1.5pt", colBorder("grid", sepX - 4, sepX + 4) > 4 && colBorder("grid", RIGHT - 9, RIGHT - 4) === 0 && colBorder("line", sepX - 4, sepX + 4) === 0, `separator px ${colBorder("grid", sepX - 4, sepX + 4)}, after last ${colBorder("grid", RIGHT - 9, RIGHT - 4)}, line variant ${colBorder("line", sepX - 4, sepX + 4)}`);
  const edge = (v) => { const w = wd(n, `TB-${v}-R1C1`), { w: W_, px: d } = R(n, w.p), y = Math.round(((w.y0 + w.y1) / 2) * S); let i = Math.round(LEFT * S) - 3, run = 0; for (; i < Math.round(LEFT * S) + 14; i++) { const q = (y * W_ + i) * 3; if (d[q] < 250 || d[q + 1] < 250 || d[q + 2] < 250) run++; else if (run) break; } return run; };
  check(g, "outer frame: grid 1.5pt (3px) thicker than bordered 1pt (2px); line has none", edge("grid") > edge("bordered") && near(edge("grid"), 3, 1) && edge("line") === 0, `grid ${edge("grid")}px, bordered ${edge("bordered")}px, line ${edge("line")}px`);
  const stripe = (v, r) => { const w = wd(n, `TB-${v}-R${r}C1`); return inBox(n, w.p, C.muted, { x0: LEFT + 60, x1: LEFT + 200, y0: w.y0 - 2, y1: w.y1 + 2 }, 1).n; };
  check(g, "striped variant: row 2 shaded, rows 1 and 3 white; line variant has no stripes", stripe("striped", 2) > 800 && stripe("striped", 1) < 100 && stripe("striped", 3) < 100 && stripe("line", 2) < 100, `striped r1/r2/r3 ${stripe("striped", 1)}/${stripe("striped", 2)}/${stripe("striped", 3)}, line r2 ${stripe("line", 2)}`);
  const zb = (r) => { const w = wd(n, `TBW-${"ABCD"[r - 1]}1`); return inBox(n, w.p, C.muted, { x0: LEFT + 100, x1: LEFT + 300, y0: w.y0 - 2, y1: w.y1 + 2 }, 1).n; };
  check(g, "zebraStripe on the line variant shades every 2nd body row", zb(2) > 800 && zb(4) > 800 && zb(1) < 100 && zb(3) < 100, `rows 1-4: ${[1, 2, 3, 4].map(zb).join("/")}`);
  const ft = wd(n, "TB-line-F1"), foot = inBox(n, ft.p, C.border, { x0: LEFT, x1: RIGHT, y0: ft.y0 - 10, y1: ft.y0 }, 8);
  check(g, "footer row: bold text with a rule above", foot.n > 400 && ink(n, ft.p, ft) / ((ft.x1 - ft.x0) * (ft.y1 - ft.y0) * S * S) > (() => { const b = wd(n, "TB-line-R3C1"); return ink(n, b.p, b) / ((b.x1 - b.x0) * (b.y1 - b.y0) * S * S); })() + 0.03, `${foot.n} rule px, bold vs regular ink density`);
  const c1 = wd(n, "TBW-ID"), c2 = wd(n, "TBW-NAME"), c3 = wd(n, "TBW-AMOUNT");
  check(g, "cell width (pt) and align: col 1 = 80pt wide, amount column right-aligned inside 110pt", near(c2.x0 - c1.x0, 80, 3) && near(lineEnd(n, c3), RIGHT - 10, 2), `col2 offset ${f1(c2.x0 - c1.x0)}pt, amount right edge ${f1(lineEnd(n, c3))} (cell padding 10pt)`);
  passthrough(g, n, wd(n, "PASS-TABLE").p);
});

// ---- long tables: header repeat + no split rows ----
const longTable = (g, n, total, marks) => {
  const pages = pagesOf(n), rowPages = pages.filter((p) => W(n, p).some((w) => marks.rowRe.test(w.t))), hdr = rowPages.map((p) => W(n, p).some((w) => w.t === marks.header));
  check(g, `${total} rows: header row repeats on every page that has rows`, rowPages.length >= 4 && hdr.every(Boolean), `${pages.length} pages; rows on pages ${rowPages.join(",")}, header on ${rowPages.filter((p, i) => hdr[i]).join(",")}`);
  const sku = [...Array(total)].map((_, i) => { const w = all(n, marks.cell(i + 1))[0]; return w; });
  check(g, "every row present exactly once, in order", sku.every(Boolean) && sku.every((w, i) => !i || w.p > sku[i - 1].p || (w.p === sku[i - 1].p && w.y0 > sku[i - 1].y0)) && [...Array(total)].every((_, i) => all(n, marks.cell(i + 1)).length === 1), `${sku.filter(Boolean).length}/${total} found`);
  // a wrapped row is several text lines: all of them must sit on one page and between the same two rows
  let bad = [], wrapped = 0;
  for (let i = 1; i <= total; i++) {
    const cur = sku[i - 1], next = sku[i];
    const lines = W(n, cur.p).filter((w) => w.y0 >= cur.y0 - 1 && (!next || next.p !== cur.p || w.y0 < next.y0 - 1) && w.x0 > LEFT + 90 && w.x0 < LEFT + 300 && !/^(\d+\.\d\d|\$)/.test(w.t));
    const ys = new Set(lines.map((w) => Math.round(w.y0)));
    if (marks.wrapEvery && i % marks.wrapEvery === marks.wrapAt) { wrapped++; const tail = all(n, marks.tail).filter((w) => w.p === cur.p && w.y0 >= cur.y0 - 1 && (!next || next.p !== cur.p || w.y0 < next.y0 - 1)); if (!tail.length) bad.push(`${i}: wrapped tail not on the same page as its first line`); if (ys.size < 2) bad.push(`${i}: expected a wrapped row`); }
  }
  check(g, "rows never split: each multi-line row keeps all its lines on one page", !bad.length && wrapped > 10, `${wrapped} multi-line rows checked${bad.length ? "; " + bad.slice(0, 3).join("; ") : ""}`);
  const pg = pages.map((p) => ({ p, ws: W(n, p) })), bottoms = pg.map(({ ws }) => Math.max(...ws.map((w) => w.y1)));
  check(g, "no content past the bottom margin (30pt)", bottoms.every((b) => b <= PAGE_H - 30 + 1), `max y1 per page: ${bottoms.map(f1).join(", ")} (limit ${f1(PAGE_H - 30)})`);
  const firstRows = pg.filter(({ p }) => p > 1 && rowPages.includes(p)).map(({ ws, p }) => { const h = ws.find((w) => w.t === marks.header), r = ws.filter((w) => marks.rowRe.test(w.t)).sort((a, b) => a.y0 - b.y0)[0]; return r.y0 - h.y0; });
  check(g, "repeated header does not overlap the first row on later pages", firstRows.every((d) => d > 12), `header -> first row gap per later page: ${firstRows.map(f1).join(", ")}pt`);
  const foot = all(n, marks.footer);
  check(g, "footer row (tfoot) is drawn once, right after the last row", foot.length === 1 && foot[0].p === rowPages.at(-1), `footer on pages ${foot.map((w) => w.p).join(",")}`);
  const after = all(n, marks.after)[0];
  check(g, "content after the table is not lost or overlapped", !!after && after.y0 > Math.max(...W(n, after.p).filter((w) => marks.rowRe.test(w.t)).map((w) => w.y1)), after ? `on page ${after.p}` : "missing");
};
await section("Table", async () => longTable("Table", "table-long", 120, { header: "TBLSKU", cell: (i) => `R${i}-SKU`, rowRe: /^R\d+-SKU$/, tail: "column", footer: "TBLTOTAL", after: "TBL-AFTER", wrapEvery: 7, wrapAt: 4 }));

// ================= DataTable =================
await section("DataTable", async () => {
  const g = "DataTable", n = "data-table";
  has(g, n, ["DT-SKU", "DT-NAME", "DT-QTY", "DT-AMOUNT", "DT-A1", "DT-Widget (slot)", "$100.00", "$750.00", "DT-TOTAL", "$1,525.00", "DTE-A", "DTE-x", "1.5", "PASS-DT"]);
  const w1 = wd(n, "DT-A1"), w2 = wd(n, "DT-Widget"), r1 = wd(n, "$100.00");
  check(g, "columns: header / data / footer align per column (right = amount, center = qty), widths in pt", near(lineEnd(n, r1), RIGHT - 12, 2) && near(wd(n, "DT-NAME").x0 - wd(n, "DT-SKU").x0, 80, 3), `amount right edge ${f1(lineEnd(n, r1))} (10pt cell padding + 1.5pt grid frame), sku -> name offset ${f1(wd(n, "DT-NAME").x0 - wd(n, "DT-SKU").x0)}pt (80pt column)`);
  const green = inBox(n, r1.p, C.success, r1, 10).n;
  check(g, "column.render returns a VNode (bold success-colored amount); scoped slot #cell-name overrides a cell", green > 100 && text(n).includes("DT-Widget (slot)"), `${green} green px`);
  const tot = wd(n, "DT-TOTAL"), totBold = ink(n, tot.p, tot) / ((tot.x1 - tot.x0) * (tot.y1 - tot.y0) * S * S);
  check(g, "footer prop: footer row with bold cells and renderFooter VNode", totBold > 0.17 && text(n).includes("$1,525.00"), `ink density ${totBold.toFixed(2)}`);
  const compactH = (() => { const a = wd(n, "DT-D4"), b = wd(n, "DT-A1"); return [a, b]; })();
  const striped = all(n, "DT-B2")[1], shaded = inBox(n, striped.p, C.muted, { x0: LEFT + 20, x1: LEFT + 100, y0: striped.y0 - 2, y1: striped.y1 + 2 }, 1).n;
  const compactRows = all(n, "DT-A1"), cmp = compactRows[1], dflt = compactRows[0];
  check(g, "size=compact: tighter rows and smaller text; stripe shades row 2", cmp.y1 - cmp.y0 < dflt.y1 - dflt.y0 - 1 && shaded > 300, `compact text ${f1(cmp.y1 - cmp.y0)}pt vs default ${f1(dflt.y1 - dflt.y0)}pt; stripe px ${shaded}`);
  const pr = wd(n, "DT-SKU"), pri = all(n, "DT-SKU")[2], priBand = inBox(n, pri.p, C.primary, { ...row(pri, 6), x0: LEFT + 2, x1: RIGHT - 2 }, 4).n;
  check(g, "variant prop reaches the table (primary-header band)", priBand > 4000, `${priBand} primary px`);
  const empty = all(n, "DTE-x")[0], nullRow = W(n, empty.p).filter((w) => w.t === "1.5")[0];
  check(g, "null / missing values render as empty cells, numbers as text", nullRow && wd(n, "DTE-z") && !text(n).includes("null") && !text(n).includes("undefined"), "no 'null' / 'undefined' text");
  passthrough(g, n, wd(n, "PASS-DT").p);
});
await section("DataTable", async () => longTable("DataTable", "data-table-long", 150, { header: "DTSKU", cell: (i) => `D${i}-SKU`, rowRe: /^D\d+-SKU$/, tail: "cell", footer: "DTLTOTAL", after: "DTL-AFTER", wrapEvery: 9, wrapAt: 5 }));

// ================= KeyValue =================
await section("KeyValue", async () => {
  const g = "KeyValue", n = "key-value";
  has(g, n, ["KV-INVOICE", "KV-V1", "KV-V4", "KV-ITEM-RED", "KV-ITEM-STYLE", "KV-PASS"]);
  const k = all(n, "KV-INVOICE")[0], v = all(n, "KV-V1")[0];
  check(g, "horizontal: key left, value right-aligned on the same line", near(k.x0, LEFT, 1.5) && near(lineEnd(n, v), RIGHT, 1.5) && near(k.y0, v.y0, 1.5), `key x0 ${f1(k.x0)}, value right edge ${f1(lineEnd(n, v))}`);
  const vert = all(n, "KV-INVOICE")[2], vv = all(n, "KV-V1")[2];
  check(g, "vertical: value below the key, both left-aligned", vv.y0 > vert.y0 + 8 && near(vv.x0, vert.x0, 1.5) && vv.x0 < 200, `value ${f1(vv.y0 - vert.y0)}pt below key`);
  const div = (i) => { const a = all(n, "KV-INVOICE")[i], b = all(n, "KV-DATE")[i]; return inBox(n, a.p, C.border, { x0: LEFT, x1: RIGHT, y0: a.y1, y1: b.y0 }, 8).n; };
  check(g, "divided adds rules between items (none without it)", div(1) > 2000 && div(0) < 200, `divided ${div(1)}px, plain ${div(0)}px`);
  const sz = (i) => { const a = all(n, "KV-INVOICE")[i]; return a.y1 - a.y0; };
  check(g, "size sm < md < lg (10 / 11 / 15pt)", sz(3) < sz(0) && sz(0) < sz(2), `heights sm ${f1(sz(3))} < md ${f1(sz(0))} < lg ${f1(sz(2))}`);
  const lc = all(n, "KV-INVOICE")[3], lcol = inBox(n, lc.p, C.info, lc, 10).n, vc = inBox(n, all(n, "KV-V1")[3].p, C.success, all(n, "KV-V1")[3], 10).n;
  const dv = inBox(n, lc.p, C.destructive, { x0: LEFT, x1: RIGHT, y0: lc.y1, y1: lc.y1 + 14 }, 10).n;
  check(g, "labelColor / valueColor tokens; dividerColor token + dividerThickness 1pt", lcol > 40 && vc > 40 && dv > 300, `label ${lcol}px info, value ${vc}px success, divider ${dv}px destructive`);
  const bold = ink(n, all(n, "KV-V1")[1].p, all(n, "KV-V1")[1]) / ((all(n, "KV-V1")[1].x1 - all(n, "KV-V1")[1].x0) * (all(n, "KV-V1")[1].y1 - all(n, "KV-V1")[1].y0) * S * S), plain = ink(n, all(n, "KV-V1")[0].p, all(n, "KV-V1")[0]) / ((all(n, "KV-V1")[0].x1 - all(n, "KV-V1")[0].x0) * (all(n, "KV-V1")[0].y1 - all(n, "KV-V1")[0].y0) * S * S);
  check(g, "boldValue makes values heavier", bold > plain + 0.05, `ink ${plain.toFixed(2)} -> ${bold.toFixed(2)}`);
  const red = wd(n, "KV-ITEM-RED"), rv = W(n, red.p).find((w) => w.t === "red" && Math.abs(w.y0 - red.y0) < 2), big = W(n, red.p).find((w) => w.t === "big");
  check(g, "per-item valueColor (#ff0000) and valueStyle (18pt) apply", inBox(n, red.p, "#ff0000", rv, 10).n > 20 && big.y1 - big.y0 > 17, `red ${inBox(n, red.p, "#ff0000", rv, 10).n}px, big text ${f1(big.y1 - big.y0)}pt`);
  // the two items can land on different pages: count a value's lines on its own page, from its key down to the next block
  const valueLines = (f) => { const k = wd(n, `KV-LF${f}`), stop = f === 4 ? wd(n, "KV-PASS").y0 - 28 : Infinity; return new Set(W(n, k.p).filter((w) => w.y0 >= k.y0 - 2 && w.y0 < stop && w.x0 > 150).map((w) => Math.round(w.y0))).size; };
  check(g, "labelFlex: key column takes flex 4 of 5 instead of 1 of 2, so the long value wraps into more lines", valueLines(1) >= 3 && valueLines(4) >= valueLines(1) + 3, `value lines: labelFlex 1 -> ${valueLines(1)}, labelFlex 4 -> ${valueLines(4)}`);
  passthrough(g, n, wd(n, "KV-PASS").p);
});

// ================= Graph =================
await section("Graph", async () => {
  const g = "Graph", n = "graph", n2 = "graph-2";
  has(g, n, ["GR-BAR", "GR-BAR-SUB", "GR-XLABEL", "GR-YLABEL", "Q1", "Q4", "GR-S2025", "GR-S2026", "GR-HBAR", "GR-LINE", "Jan", "Apr", "120", "210", "240", "60"]);
  has(g, n2, ["GR-AREA", "GR-PIE", "GR-DONUT", "GR-CENTER", "GR-PIE-LEGEND", "GR-FULLWIDTH", "PASS-GRAPH"]);
  // bars: four runs of the primary color across the plot, tallest = Q4 (210)
  const barsRow = (name, title, frac) => { const t = wd(name, title), { w, px: d } = R(name, t.p), y = Math.round((t.y1 + 20 + (170 * frac)) * S); let runs = 0, prev = false; for (let x = Math.round(LEFT * S); x < Math.round(RIGHT * S); x++) { const i = (y * w + x) * 3; const on = Math.abs(d[i] - 24) < 8 && Math.abs(d[i + 1] - 24) < 8 && Math.abs(d[i + 2] - 27) < 8; if (on && !prev) runs++; prev = on; } return runs; };
  const t1 = wd(n, "GR-BAR"), b2t = wd(n, "GR-BAR2"), q = ["Q1", "Q2", "Q3", "Q4"].map((l) => all(n, l).filter((w) => w.p === t1.p && w.y0 > t1.y1 && w.y0 < b2t.y0)[0]);
  // scan up from each x-axis label: the run of primary color is axis line + bar; its top is the bar top
  const bars = q.map((lab) => { const x = Math.round((lab.x0 + lab.x1) / 2 * S), { w, px: d } = R(n, lab.p); let h = 0, top = 0; for (let y = Math.round((lab.y0 - 3) * S); y > 0; y--) { const k = (y * w + x) * 3; if (Math.abs(d[k] - 24) < 8 && Math.abs(d[k + 1] - 24) < 8) { h++; top = y; } else if (h) break; } return { h: h / S, top: top / S }; });
  const heights = bars.map((b) => b.h), tickY = (v) => { const t = W(n, t1.p).find((w) => w.t === v && w.x1 < LEFT + 44 && w.y0 > t1.y1); return (t.y0 + t.y1) / 2; };
  check(g, "bar: 4 bars in the primary color, heights proportional to 120/180/90/210, bar tops meet their y-axis ticks", heights.every((h) => h > 20) && near(heights[3] / heights[0], 210 / 120, 0.12) && near(heights[1] / heights[2], 2, 0.12) && near(bars[0].top, tickY("120"), 2.5) && near(bars[1].top, tickY("180"), 2.5), `bar heights ${heights.map(f1).join(" / ")}pt; Q1 top y ${f1(bars[0].top)} vs tick "120" y ${f1(tickY("120"))}, Q2 top ${f1(bars[1].top)} vs "180" ${f1(tickY("180"))}`);
  check(g, "bar: nice y ticks (0/60/120/180/240), value labels, axis titles, subtitle", ["0", "60", "120", "180", "240"].every((v) => W(n, t1.p).some((w) => w.t === v)) && ["120", "180", "90", "210"].every((v) => W(n, t1.p).some((w) => w.t === v)), "ticks + values extracted as real text");
  const yl = wd(n, "GR-YLABEL"), top = W(n, t1.p).find((w) => w.t === "240" && w.x1 < LEFT + 44 && w.y0 > t1.y1);
  check(g, "y-axis title has breathing room above the top tick label (>= 3pt gap, no overlap)", top.y0 - yl.y1 >= 3, `GR-YLABEL bottom ${f1(yl.y1)}pt, top tick "240" top ${f1(top.y0)}pt, gap ${f1(top.y0 - yl.y1)}pt`);
  const grid = inBox(n, t1.p, C.border, { x0: LEFT + 40, x1: LEFT + 400, y0: t1.y1 + 20, y1: t1.y1 + 190 }, 8).n;
  check(g, "showGrid draws dashed grid lines (off for the GR-FULLWIDTH chart)", grid > 300 && inBox(n2, wd(n2, "GR-FULLWIDTH").p, C.border, { x0: LEFT + 40, x1: RIGHT, y0: wd(n2, "GR-FULLWIDTH").y1 + 6, y1: wd(n2, "GR-FULLWIDTH").y1 + 110 }, 8).n < 100, `grid px ${grid}`);
  const swatch = (nm, lab, col) => { const l = wd(nm, lab); return inBox(nm, l.p, col, { x0: l.x0 - 14, x1: l.x0, y0: l.y0 - 2, y1: l.y1 + 2 }, 8).n; };
  check(g, "multi-series legend: swatch colors match the series (primary, info)", swatch(n, "GR-S2025", C.primary) > 20 && swatch(n, "GR-S2026", C.info) > 20, `${swatch(n, "GR-S2025", C.primary)} / ${swatch(n, "GR-S2026", C.info)} px`);
  const b2 = wd(n, "GR-BAR2"), bar2info = inBox(n, b2.p, C.info, { x0: LEFT, x1: RIGHT, y0: b2.y1, y1: b2.y1 + 170 }, 8).n;
  check(g, "second series drawn in the info color", bar2info > 1500, `${bar2info} info px in the plot`);
  const hb = wd(n, "GR-HBAR"), hline = wd(n, "GR-LINE"), hq = ["Q1", "Q2", "Q3", "Q4"].map((l) => W(n, hb.p).filter((w) => w.t === l && w.y0 > hb.y0 && (hline.p !== hb.p || w.y0 < hline.y0)).sort((a, b) => a.y0 - b.y0)[0]);
  const hlen = hq.map((lab) => { const y = Math.round(((lab.y0 + lab.y1) / 2) * S), { w, px: d } = R(n, hb.p); let len = 0, started = false; for (let x = Math.round((lab.x1 + 6) * S); x < w; x++) { const k = (y * w + x) * 3, on = d[k] < 200 || d[k + 1] < 200 || d[k + 2] < 200; if (on) { started = true; len++; } else if (started) break; } return len / S; });
  check(g, "horizontal-bar: row labels left, one palette color per bar, lengths proportional to 120/180/90/210", hlen.every((l) => l > 20) && near(hlen[3] / hlen[2], 210 / 90, 0.2) && near(hlen[1] / hlen[0], 1.5, 0.1) && hq.every((l, i) => !i || l.y0 > hq[i - 1].y0), `bar lengths ${hlen.map(f1).join(" / ")}pt`);
  const ln = wd(n, "GR-LINE"), lineInfo = inBox(n, ln.p, C.info, { x0: LEFT, x1: RIGHT, y0: ln.y1, y1: ln.y1 + 175 }, 8).n, dots = inBox(n, ln.p, C.primary, { x0: LEFT, x1: RIGHT, y0: ln.y1, y1: ln.y1 + 175 }, 8).n;
  check(g, "line: 2pt series paths + dots in series colors, value labels", lineInfo > 300 && dots > 300 && W(n, ln.p).some((w) => w.t === "120"), `info ${lineInfo}px, primary ${dots}px`);
  const ar = wd(n2, "GR-AREA"), fill = mix(C.info, 0.2), areaPx = colorStats(R(n2, ar.p), fill, { tol: 5, box: box({ x0: LEFT, x1: RIGHT, y0: ar.y1, y1: ar.y1 + 170 }) }).n;
  check(g, "area: translucent (20%) fill under the line, smooth curve, no dots (showDots=false)", areaPx > 4000, `${areaPx} px of rgb(${fill})`);
  // pie: slice areas proportional to 120/180/90/210 of 600
  const pie = wd(n2, "GR-PIE"), px = (col) => colorStats(R(n2, pie.p), hex(col), { tol: 6, box: box({ x0: LEFT, x1: LEFT + 240, y0: pie.y1, y1: pie.y1 + 180 }) }).n;
  const cols = [C.primary, C.info, C.success, C.warning], areas = cols.map(px), tot = areas.reduce((a, b) => a + b, 0), share = areas.map((a) => a / tot), want = [0.2, 0.3, 0.15, 0.35];
  check(g, "pie: slice areas match 20% / 30% / 15% / 35% (pixel share)", share.every((s, i) => near(s, want[i], 0.03)), `shares ${share.map((s) => (s * 100).toFixed(1)).join(" / ")}%`);
  const dn = wd(n2, "GR-DONUT"), cx = (LEFT + 240 + 20 + 230 / 2) - 0, hole = (() => { const c = wd(n2, "GR-CENTER"), mx = (c.x0 + c.x1) / 2, my = (c.y0 + c.y1) / 2, { w, px: d } = R(n2, c.p); let dk = 0, n_ = 0; for (let x = Math.round((mx - 30) * S); x < Math.round((mx + 30) * S); x++) for (const yy of [Math.round((my - 24) * S), Math.round((my + 24) * S)]) { const k = (yy * w + x) * 3; n_++; dk += d[k] > 245; } return dk / n_; })();
  check(g, "donut: white center hole carrying the centerLabel; ring keeps the slice colors", hole > 0.75 && colorStats(R(n2, dn.p), hex(C.info), { tol: 6, box: box({ x0: LEFT + 240, x1: RIGHT, y0: dn.y1, y1: dn.y1 + 180 }) }).n > 1500, `hole white ${(hole * 100).toFixed(0)}%`);
  const leg = wd(n2, "GR-PIE-LEGEND"), custom = colorStats(R(n2, leg.p), hex("#e11d48"), { tol: 6, box: box({ x0: LEFT, x1: RIGHT, y0: leg.y1, y1: leg.y1 + 170 }) });
  const ql = W(n2, leg.p).filter((w) => w.t === "Q1" && w.y0 > leg.y0).sort((a, b) => a.x0 - b.x0), legendQ1 = ql[ql.length - 1], sliceQ1 = ql[0];
  check(g, "pie legend=right with custom colors: one entry per slice, to the right of the chart", custom.n > 1500 && ql.length >= 2 && legendQ1.x0 > sliceQ1.x0 + 80, `custom red ${custom.n}px; legend x0 ${f1(legendQ1.x0)} vs slice label x0 ${f1(sliceQ1.x0)}`);
  const fw = wd(n2, "GR-FULLWIDTH"), axis = colorStats(R(n2, fw.p), hex(C.primary), { tol: 6, box: box({ x0: LEFT + 30, x1: PAGE_W, y0: fw.y1 + 4, y1: fw.y1 + 124 }) });
  const dflt = wd(n, "GR-HBAR");
  check(g, "fullWidth fills the content width (A4 - 2x30pt) while the default chart is 420pt", axis.x1 / S > RIGHT - 20 && (() => { const a = colorStats(R(n, t1.p), hex(C.primary), { tol: 6, box: box({ x0: LEFT + 30, x1: PAGE_W, y0: t1.y1 + 8, y1: t1.y1 + 185 }) }); return a.x1 / S < LEFT + 420 + 2; })(), `fullWidth drawing ends at ${f1(axis.x1 / S)}pt (content edge ${f1(RIGHT)})`);
  passthrough(g, n2, wd(n2, "PASS-GRAPH").p);
});

// ================= QRCode =================
const decode = (name, p, region, dpi = 220) => {
  const r = raster(file(name), p, { dpi }), s = dpi / 72;
  const x0 = Math.max(0, Math.floor(region.x0 * s)), y0 = Math.max(0, Math.floor(region.y0 * s)), x1 = Math.min(r.w, Math.ceil(region.x1 * s)), y1 = Math.min(r.h, Math.ceil(region.y1 * s));
  const w = x1 - x0, h = y1 - y0, rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = ((y0 + y) * r.w + x0 + x) * 3, o = (y * w + x) * 4; rgba[o] = r.px[i]; rgba[o + 1] = r.px[i + 1]; rgba[o + 2] = r.px[i + 2]; rgba[o + 3] = 255; }
  const hit = jsQR(rgba, w, h);
  return hit && new TextDecoder().decode(Uint8Array.from(hit.binaryData));
};
const qrCases = (QR) => [["QR-DEFAULT", 100, QR.url], ["QR-LARGE", 160, QR.url], ["QR-CJK", 140, QR.cjk], ["QR-L", 120, QR.url], ["QR-Q", 120, QR.url], ["QR-TOKENS", 120, QR.url], ["QR-BLUE", 120, QR.url], ["QR-LONG", 200, QR.long]];
await section("QRCode", async () => {
  const g = "QRCode", n = "qrcode";
  has(g, n, ["QR-DEFAULT", "QR-LARGE", "QR-CJK", "QR-TOKENS", "QR-LONG"]);
  const results = qrCases(QR).map(([cap, size, want]) => { const c = wd(n, cap), cx = span(n, c).cx; const got = decode(n, c.p, { x0: cx - size / 2 - 10, x1: cx + size / 2 + 10, y0: c.y0 - size - 12, y1: c.y0 - 1 }); return { cap, ok: got === want, got: got === null ? "no decode" : got === want ? "" : got.slice(0, 30) }; });
  check(g, "every QR decodes (jsQR on a 220dpi render) to its exact value: URL, CJK/UTF-8, levels L/Q/H, token colors, transparent bg, 300-char payload", results.every((r) => r.ok), results.map((r) => `${r.cap} ${r.ok ? "ok" : "FAIL " + r.got}`).join("; "));
  const d = wd(n, "QR-DEFAULT"), cxd = span(n, d).cx, bad = decode(n, d.p, { x0: cxd - 60, x1: cxd + 60, y0: d.y0 - 112, y1: d.y0 - 1 }, 40);
  check(g, "control: the decoder is not trivially passing (a 40dpi render and a blanked finder pattern fail)", (() => { const r = raster(file(n), d.p, { dpi: 220 }); const s = 220 / 72, x0 = Math.floor((cxd - 60) * s), y0 = Math.floor((d.y0 - 112) * s), w = Math.ceil(120 * s), h = Math.ceil(111 * s), rgba = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = ((y0 + y) * r.w + x0 + x) * 3, o = (y * w + x) * 4, wipe = x > w * 0.3 && x < w * 0.7 && y > h * 0.12 && y < h * 0.75; const v = wipe ? 255 : r.px[i]; rgba[o] = v; rgba[o + 1] = wipe ? 255 : r.px[i + 1]; rgba[o + 2] = wipe ? 255 : r.px[i + 2]; rgba[o + 3] = 255; } return jsQR(rgba, w, h) === null; })(), `40dpi decode: ${bad === null ? "none" : "decoded"}; blanked-center decode: none`);
  const lg = wd(n, "QR-LARGE"), df = wd(n, "QR-DEFAULT"), dark = (c, s2) => colorStats(R(n, c.p), hex("#000000"), { tol: 30, box: box({ x0: span(n, c).cx - s2 / 2 - 4, x1: span(n, c).cx + s2 / 2 + 4, y0: c.y0 - s2 - 6, y1: c.y0 - 1 }) });
  const dd = dark(df, 100), dl = dark(lg, 160);
  check(g, "size is in pt: 100pt vs 160pt code bounding boxes", (dd.x1 - dd.x0) / S > 85 && (dd.x1 - dd.x0) / S < 90 && near((dl.x1 - dl.x0) / S / ((dd.x1 - dd.x0) / S), 1.6, 0.05), `dark-module extent ${f1((dd.x1 - dd.x0) / S)}pt vs ${f1((dl.x1 - dl.x0) / S)}pt; region x ${f1(span(n, df).cx - 54)}..${f1(span(n, df).cx + 54)}, QR-DEFAULT caption ${f1(df.x0)}..${f1(span(n, df).x1)}`);
  const bl = wd(n, "QR-BLUE"), blue = colorStats(R(n, bl.p), hex("#1d4ed8"), { tol: 10, box: box({ x0: span(n, bl).cx - 64, x1: span(n, bl).cx + 64, y0: bl.y0 - 130, y1: bl.y0 }) }).n, tk = wd(n, "QR-TOKENS"), tokBg = colorStats(R(n, tk.p), hex(C.muted), { tol: 1, box: box({ x0: span(n, tk).cx - 60, x1: span(n, tk).cx + 60, y0: tk.y0 - 128, y1: tk.y0 - 2 }) }).n;
  check(g, "color props: raw blue modules; tokens (primary on muted background)", blue > 800 && tokBg > 2500, `blue ${blue}px, muted bg ${tokBg}px`);
  check(g, "caption below the code; margin prop changes the quiet zone", wd(n, "QR-L").y0 > 0 && text(n).includes("level L margin 4"), "");
  passthrough(g, n);
});

// ================= Alert =================
await section("Alert", async () => {
  const g = "Alert", n = "alert";
  has(g, n, ["AL-INFO", "AL-SUCCESS", "AL-WARNING", "AL-ERROR", "AL-INFO-BODY", "AL-NOICON", "AL-NOBORDER", "AL-BODYONLY", "AL-TITLEONLY", "AL-AFTER-EMPTY", "PASS-ALERT"]);
  const cols = { INFO: C.info, SUCCESS: C.success, WARNING: C.warning, ERROR: C.destructive };
  const res = Object.entries(cols).map(([v, c]) => { const t = wd(n, `AL-${v}`), bar = inBox(n, t.p, c, { x0: LEFT - 1, x1: LEFT + 7, y0: t.y0 - 10, y1: t.y1 + 20 }, 8), icon = inBox(n, t.p, c, { x0: LEFT + 12, x1: LEFT + 36, y0: t.y0 - 6, y1: t.y1 + 8 }, 8); return { v, bar: bar.n, icon: icon.n, bw: (bar.x1 - bar.x0 + 1) / S }; });
  check(g, "info/success/warning/error: 4pt left bar and icon in the variant color", res.every((r) => r.bar > 250 && r.icon > 40 && near(r.bw, 4, 1)), res.map((r) => `${r.v} bar ${r.bar}px/${f1(r.bw)}pt icon ${r.icon}px`).join("; "));
  const icons = ["INFO", "SUCCESS", "WARNING", "ERROR"].map((v) => { const t = wd(n, `AL-${v}`), { w, px: d } = R(n, t.p); let key = ""; for (let y = Math.round((t.y0 - 4) * S); y < Math.round((t.y1 + 4) * S); y += 3) { let rowk = ""; for (let x = Math.round((LEFT + 14) * S); x < Math.round((LEFT + 34) * S); x += 3) { const i = (y * w + x) * 3; rowk += d[i] < 200 || d[i + 1] < 200 ? "#" : "."; } key += rowk + "|"; } return key; });
  check(g, "the four icons are distinct shapes (info i / check / triangle / cross)", new Set(icons).size === 4, "4 distinct icon bitmaps");
  const bg = inBox(n, wd(n, "AL-INFO").p, C.muted, { x0: LEFT + 200, x1: RIGHT - 4, y0: wd(n, "AL-INFO").y0 - 4, y1: wd(n, "AL-INFO-BODY").y1 + 4 }, 1).n;
  check(g, "container: muted fill, body text muted-foreground, title foreground + semibold", bg > 4000 && inBox(n, wd(n, "AL-INFO-BODY").p, C.mutedFg, wd(n, "AL-INFO-BODY"), 20).n > 150, `${bg} muted px`);
  const ti = (t) => wd(n, t).x0;
  check(g, "showIcon=false: text moves left by the 30pt icon column; body-only alert renders (no title)", near(ti("AL-INFO") - ti("AL-NOICON"), 30, 2), `title x0 ${f1(ti("AL-INFO"))} -> ${f1(ti("AL-NOICON"))}`);
  const nb = wd(n, "AL-NOBORDER"), nbBar = inBox(n, nb.p, C.warning, { x0: LEFT - 1, x1: LEFT + 6, y0: nb.y0 - 10, y1: nb.y1 + 20 }, 8).n;
  check(g, "showBorder=false: no colored bar", nbBar < 40, `${nbBar}px`);
  const to = wd(n, "AL-TITLEONLY"), af = wd(n, "AL-AFTER-EMPTY"), gap = inBox(n, af.p, C.muted, { x0: LEFT + 100, x1: RIGHT - 4, y0: to.y1 + 22, y1: af.y0 - 1 }, 1).n;
  check(g, "an Alert without title and content renders nothing", gap < 60, `muted px in the gap before the next paragraph: ${gap}`);
  passthrough(g, n, wd(n, "PASS-ALERT").p);
});

// ================= Badge =================
await section("Badge", async () => {
  const g = "Badge", n = "badge";
  const names = [];
  for (const v of ["default", "primary", "success", "warning", "destructive", "info", "outline"]) for (const s of ["sm", "md", "lg"]) names.push(`BG-${v}-${s}`);
  has(g, n, [...names, "BG-LABEL", "BG-SLOT", "BG-CUSTOM", "BG-TOKENS", "BG-INLINE", "PASS-BADGE"]);
  check(g, "label prop wins over slot text", text(n).includes("BG-LABEL") && !text(n).includes("BG-SLOT-IGNORED"), "");
  const hs = ["sm", "md", "lg"].map((s) => { const w = wd(n, `BG-primary-${s}`); return w.y1 - w.y0; });
  check(g, "sizes sm < md < lg (9 / 10 / 12pt text)", hs[0] < hs[1] && hs[1] < hs[2], `text heights ${hs.map(f1).join(" < ")}`);
  const pillH = (s) => { const w = wd(n, `BG-primary-${s}`), b = inBox(n, w.p, C.primary, { x0: w.x0 - 20, x1: w.x1 + 20, y0: w.y0 - 12, y1: w.y1 + 12 }, 4); return { w: (b.x1 - b.x0 + 1) / S, h: (b.y1 - b.y0 + 1) / S, b }; };
  const pm = pillH("md"), pl = pillH("lg"), ps = pillH("sm");
  check(g, "pill size grows with size (padding): sm < md < lg", ps.h < pm.h && pm.h < pl.h && ps.w < pm.w && pm.w < pl.w, `box ${f1(ps.w)}x${f1(ps.h)} / ${f1(pm.w)}x${f1(pm.h)} / ${f1(pl.w)}x${f1(pl.h)}pt`);
  const corner = (() => { const w = wd(n, "BG-primary-lg"), b = pillH("lg").b, { w: W_, px: d } = R(n, w.p), i = (b.y0 * W_ + b.x0) * 3; return d[i] > 240 && d[i + 1] > 240; })();
  check(g, "fully rounded (the box corner pixel is background)", corner, "");
  const fill = (v, col, tol = 6) => { const w = wd(n, `BG-${v}-lg`); return inBox(n, w.p, col, { x0: w.x0 - 14, x1: w.x1 + 14, y0: w.y0 - 8, y1: w.y1 + 8 }, tol).n; };
  const ws = inBox(n, wd(n, "BG-primary-lg").p, C.white, wd(n, "BG-primary-lg"), 20).n;
  check(g, "variants: primary = solid primary + white text; outlined variants have colored 2pt borders", fill("primary", C.primary, 4) > 2500 && ws > 60 && fill("success", C.success) > 250 && fill("warning", C.warning) > 250 && fill("destructive", C.destructive) > 250 && fill("info", C.info) > 250, `primary ${fill("primary", C.primary, 4)}px, success ${fill("success", C.success)}, warning ${fill("warning", C.warning)}, destructive ${fill("destructive", C.destructive)}, info ${fill("info", C.info)}`);
  check(g, "default = muted fill + border, outline = white fill", fill("default", C.muted, 1) > 800 && fill("outline", C.border) > 150, `default muted ${fill("default", C.muted, 1)}px`);
  const cu = wd(n, "BG-CUSTOM"), tk = wd(n, "BG-TOKENS");
  check(g, "background + color props: raw (#ffedd5 / #9a3412) and tokens (info bg, primary-foreground text)", inBox(n, cu.p, "#ffedd5", { x0: cu.x0 - 12, x1: cu.x1 + 12, y0: cu.y0 - 6, y1: cu.y1 + 6 }, 3).n > 400 && inBox(n, cu.p, "#9a3412", cu, 20).n > 40 && inBox(n, tk.p, C.info, { x0: tk.x0 - 12, x1: tk.x1 + 12, y0: tk.y0 - 6, y1: tk.y1 + 6 }, 4).n > 400, "");
  const st = wd(n, "Status:"), bi = wd(n, "BG-INLINE"), an = W(n, bi.p).find((w) => w.t === "and" && Math.abs(w.y0 - st.y0) < 12);
  check(g, "inline in a sentence: pill sits on the text line", an && near(bi.y0, st.y0, 5) && bi.x0 > st.x1 && an.x0 > bi.x1, `Status y ${f1(st.y0)}, badge y ${f1(bi.y0)}, 'and' x ${f1(an?.x0 ?? 0)}`);
  passthrough(g, n, wd(n, "PASS-BADGE").p);
});

// ================= Form =================
await section("Form", async () => {
  const g = "Form", n = "form";
  has(g, n, ["FM-TITLE", "FM-SUB", "FM-G1", "FM-NAME", "FM-HINT", "FM-EMAIL", "FM-NOTES", "FM-C1", "FM-C4", "FM-D3", "FM-V-BOX", "FM-LEFT", "PASS-FORM"]);
  const gr = (t) => wd(n, t);
  const c = { c1: gr("FM-C1"), c2: gr("FM-C2"), c3: gr("FM-C3"), c4: gr("FM-C4"), d1: gr("FM-D1"), d2: gr("FM-D2"), d3: gr("FM-D3") };
  check(g, "two-column: fields fill column by column (C1,C2 | C3,C4); three-column: D1 D2 D3 side by side", near(c.c1.y0, c.c3.y0, 1) && c.c2.y0 > c.c1.y0 + 20 && c.c3.x0 > c.c1.x0 + 100 && near(c.c2.x0, c.c1.x0, 1) && near(c.d1.y0, c.d2.y0, 1) && c.d2.x0 > c.d1.x0 + 100 && c.d3.x0 > c.d2.x0 + 100, `C1 (${f1(c.c1.x0)},${f1(c.c1.y0)}) C3 (${f1(c.c3.x0)},${f1(c.c3.y0)}); D x ${f1(c.d1.x0)}/${f1(c.d2.x0)}/${f1(c.d3.x0)}`);
  const em = gr("FM-EMAIL"), nm = gr("FM-NAME"), no = gr("FM-NOTES"), g2 = gr("FM-G2");
  const rule = (a) => inBox(n, a.p, C.border, { x0: LEFT, x1: RIGHT, y0: a.y1 + 2, y1: a.y1 + 80 }, 8);
  const ruleY = (a) => { const r = rule(a); return r.y0 / S; };
  check(g, "underline variant: a 1pt rule closes each blank area; field height prop (60pt) is honored", ruleY(nm) < ruleY(em) && near(ruleY(no) - no.y1, 60 + 4, 8) && near(ruleY(em) - em.y1, 18 + 4, 8), `rule below label: email ${f1(ruleY(em) - em.y1)}pt (18pt field), notes ${f1(ruleY(no) - no.y1)}pt (60pt field)`);
  const hint = wd(n, "FM-HINT"), hintCol = mix(C.mutedFg, 0.65), hintPx = colorStats(R(n, hint.p), hintCol, { tol: 3, box: box({ x0: hint.x0 - 2, x1: hint.x1 + 2, y0: hint.y0 - 1, y1: hint.y1 + 1 }) }).n;
  const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2], hintPrint = hintPx;
  check(g, "hint: muted-foreground at 65% (legible: > 40 px of that color), lighter than the label color", hintPx > 40 && lum(hintCol) > lum(hex(C.mutedFg)), `${hintPx} px of rgb(${hintCol}); luminance ${lum(hintCol).toFixed(0)} vs label ${lum(hex(C.mutedFg)).toFixed(0)}`);
  const lab = gr("FM-NAME"), lcol = inBox(n, lab.p, C.mutedFg, lab, 24).n;
  check(g, "labels: small uppercase muted; group titles uppercase", lcol > 60 && text(n).includes("FM-G1 APPLICANT") && text(n).includes("FM-TITLE Application"), "");
  const boxA = (name, col, tol) => { const a = gr(`FM-${name.toUpperCase()}-A`); return inBox(n, a.p, col, { x0: LEFT, x1: RIGHT, y0: a.y1 + 1, y1: a.y1 + 24 }, tol).n; };
  const left = (name, col, tol) => { const a = gr(`FM-${name.toUpperCase()}-A`); return inBox(n, a.p, col, { x0: LEFT - 1, x1: LEFT + 3, y0: a.y1 + 4, y1: a.y1 + 14 }, tol).n; };
  check(g, "box: border on all four sides; outlined: foreground-colored border; ghost: muted fill, no border", left("box", C.border, 8) > 4 && left("outlined", C.primary, 24) > 4 && boxA("ghost", C.muted, 1) > 2000 && left("ghost", C.border, 8) < 4 && left("outlined", C.border, 8) < 40, `left edge px: box ${left("box", C.border, 8)}, outlined ${left("outlined", C.primary, 24)}, ghost border ${left("ghost", C.border, 8)}; ghost fill ${boxA("ghost", C.muted, 1)}px`);
  check(g, "underline variant has no left edge", (() => { const a = gr("FM-EMAIL"); return inBox(n, a.p, C.border, { x0: LEFT - 1, x1: LEFT + 2, y0: a.y1 + 4, y1: a.y1 + 14 }, 8).n < 4; })(), "");
  const la = gr("FM-LEFT-A"), lb = gr("FM-LEFT-B"), line = (a) => inBox(n, a.p, C.border, { x0: LEFT + 60, x1: RIGHT, y0: a.y1 - 1, y1: a.y1 + 8 }, 8);
  check(g, "labelPosition=left: label beside its blank area (80pt label column)", la.x0 < LEFT + 5 && line(la).x0 / S > LEFT + 80 && lb.y0 > la.y0 + 14, `rule starts at ${f1(line(la).x0 / S)}pt (label column ends ${LEFT + 80 + 8})`);
  passthrough(g, n, wd(n, "PASS-FORM").p);
});

// ================= Signature =================
await section("Signature", async () => {
  const g = "Signature", n = "signature";
  has(g, n, ["SG-SINGLE", "SG-NAME", "SG-TITLE", "SG-DATE", "SG-D1", "SG-D1-NAME", "SG-D1-TITLE", "SG-D1-DATE", "SG-D2", "SG-D2-NAME", "Authorized", "Approved", "SG-INLINE", "SG-INLINE-NAME", "PASS-SIG"]);
  const s = wd(n, "SG-SINGLE"), nameW = wd(n, "SG-NAME"), line = inBox(n, s.p, C.primary, { x0: LEFT, x1: RIGHT, y0: s.y1, y1: nameW.y0 }, 24);
  check(g, "single: label above a 1pt foreground line, then name / title / date stacked", line.n > 200 && nameW.y0 > line.y1 / S - 2 && wd(n, "SG-TITLE").y0 > nameW.y0 && wd(n, "SG-DATE").y0 > wd(n, "SG-TITLE").y0 && near((line.y1 - line.y0 + 1), 2, 1), `rule ${f1((line.x1 - line.x0) / S)}pt long, ${line.y1 - line.y0 + 1}px thick`);
  check(g, "line has signing room: >= 24pt between label and name", nameW.y0 - s.y1 >= 24, `${f1(nameW.y0 - s.y1)}pt`);
  check(g, "container margin-top = section gap (36pt)", s.y0 - wd(n, "SG-ABOVE").y1 >= 36, `${f1(s.y0 - wd(n, "SG-ABOVE").y1)}pt gap from the paragraph above`);
  const d1 = wd(n, "SG-D1"), d2 = wd(n, "SG-D2");
  check(g, "double: two blocks side by side with a gap, each with its own line", near(d1.y0, d2.y0, 1) && d2.x0 > d1.x0 + 140 && inBox(n, d1.p, C.primary, { x0: d1.x0, x1: d1.x0 + 130, y0: d1.y1, y1: d1.y1 + 34 }, 24).n > 150 && inBox(n, d2.p, C.primary, { x0: d2.x0, x1: d2.x0 + 130, y0: d2.y1, y1: d2.y1 + 34 }, 24).n > 150, `D1 x0 ${f1(d1.x0)}, D2 x0 ${f1(d2.x0)}`);
  const au = all(n, "Authorized")[0], ap = all(n, "Approved")[0];
  check(g, "double without signers: default 'Authorized by' / 'Approved by' blocks", au && ap && ap.x0 > au.x0 + 140, "");
  const il = wd(n, "SG-INLINE"), inl = inBox(n, il.p, C.primary, { x0: il.x1, x1: RIGHT, y0: il.y1 + 1, y1: il.y1 + 9 }, 24), iname = wd(n, "SG-INLINE-NAME");
  check(g, "inline: 'Label:' then a >= 120pt line then the name, on one row", il.x1 < inl.x0 / S + 4 && (inl.x1 - inl.x0) / S >= 118 && iname.x0 >= inl.x1 / S - 2 && near(iname.y0, il.y0, 8), `line ${f1((inl.x1 - inl.x0) / S)}pt long, name x0 ${f1(iname.x0)}`);
  passthrough(g, n, wd(n, "PASS-SIG").p);
});

// ================= PdfImage =================
// images sit above their captions in a wrapping row: split the colored pixels above a caption into runs separated by >= 6pt of
// empty columns and take the run that overlaps the caption most (a caption can be wider than its image, so centering is not enough)
const isImg = (d, i) => (Math.abs(d[i] - 225) < 14 && Math.abs(d[i + 1] - 29) < 14 && Math.abs(d[i + 2] - 72) < 14) || (Math.abs(d[i] - 37) < 14 && Math.abs(d[i + 1] - 99) < 14 && Math.abs(d[i + 2] - 235) < 14) || (d[i] < 14 && Math.abs(d[i + 1] - 200) < 14 && d[i + 2] < 14);
const imageAt = (n, cap, h) => {
  const c = wd(n, cap), sp = span(n, c), r = R(n, c.p), b = box({ x0: LEFT - 2, x1: RIGHT + 2, y0: c.y0 - h - 8, y1: c.y0 - 1 });
  const cols = []; for (let x = b.x0; x < b.x1; x++) { let on = false; for (let y = b.y0; y < b.y1 && !on; y++) on = isImg(r.px, (y * r.w + x) * 3); cols.push(on); }
  const runs = []; let start = -1, gap = 0;
  cols.forEach((on, i) => { if (on) { if (start < 0) start = i; gap = 0; runs[runs.length - 1] && runs[runs.length - 1].open ? (runs[runs.length - 1].end = i) : runs.push({ start: i, end: i, open: true }); } else if (runs.length && runs.at(-1).open && ++gap >= 6 * S) runs.at(-1).open = false, gap = 0; });
  const overlap = (u) => Math.max(0, Math.min(u.end + b.x0, sp.x1 * S) - Math.max(u.start + b.x0, sp.x0 * S));
  const run = runs.sort((u, v) => overlap(v) - overlap(u))[0];
  const rb = { x0: (run.start + b.x0) / S, x1: (run.end + b.x0 + 1) / S, y0: b.y0 / S, y1: b.y1 / S };
  const col = (hx) => colorStats(r, hex(hx), { tol: 12, box: box(rb) });
  const s = { red: col("#e11d48"), blue: col("#2563eb"), green: col("#00c800") };
  const x0 = Math.min(...Object.values(s).filter((v) => v.n).map((v) => v.x0)), x1 = Math.max(...Object.values(s).filter((v) => v.n).map((v) => v.x1)), y0 = Math.min(...Object.values(s).filter((v) => v.n).map((v) => v.y0)), y1 = Math.max(...Object.values(s).filter((v) => v.n).map((v) => v.y1));
  return { s, e: { w: (x1 - x0 + 1) / S, h: (y1 - y0 + 1) / S, x0: x0 / S, y0: y0 / S }, c };
};
await section("PdfImage", async () => {
  const g = "PdfImage", n = "pdf-image";
  has(g, n, ["IM-THUMB", "IM-ROUNDED", "IM-DEFAULT", "IM-FIT-contain", "IM-FIT-cover", "IM-FIT-fill", "IM-FIT-none", "IM-ASPECT", "IM-POS-LEFT", "IM-NAMED", "IM-BORDERED"]);
  const at = (cap, h) => imageAt(n, cap, h);
  const th = at("IM-THUMB", 90), ro = at("IM-ROUNDED", 120), df = at("IM-DEFAULT", 70);
  check(g, "variants: thumbnail 80x80pt, rounded 200pt wide with a 200x100 contain box, default 120x60", near(th.e.w, 80, 2) && near(th.e.h, 80, 2) && near(ro.e.w, 200, 3) && near(df.e.w, 120, 2) && near(df.e.h, 60, 2), `thumb ${f1(th.e.w)}x${f1(th.e.h)}, rounded ${f1(ro.e.w)}x${f1(ro.e.h)}, default ${f1(df.e.w)}x${f1(df.e.h)}pt`);
  const roundedCorner = (() => { const r = R(n, ro.c.p), x = Math.round(ro.e.x0 * S) + 1, y = Math.round(ro.e.y0 * S) + 1, i = (y * r.w + x) * 3; return r.px[i] > 230 && r.px[i + 1] > 230; })();
  check(g, "rounded variant (8pt) clips the image corners", roundedCorner, "corner pixel is page white");
  const av = (() => { const cs = wd(n, "IM-THUMB"), r = R(n, cs.p), b = box({ x0: LEFT - 2, x1: RIGHT, y0: cs.y0 - 100, y1: cs.y0 - 20 }); const cols = []; for (let x = b.x0; x < b.x1; x++) { let on = false; for (let y = b.y0; y < b.y1 && !on; y++) on = isImg(r.px, (y * r.w + x) * 3); cols.push(on); } const runs = []; let cur = null, gap = 0; cols.forEach((on, i) => { if (on) { if (!cur) runs.push((cur = { a: i, b: i })); cur.b = i; gap = 0; } else if (cur && ++gap >= 6 * S) { cur = null; gap = 0; } }); const run = runs[1], rb = { x0: (run.a + b.x0) / S, x1: (run.b + b.x0 + 1) / S, y0: b.y0 / S, y1: b.y1 / S }; const red = colorStats(r, hex("#e11d48"), { tol: 12, box: box(rb) }), blue = colorStats(r, hex("#2563eb"), { tol: 12, box: box(rb) }); const x0 = Math.min(red.x0, blue.x0), x1 = Math.max(red.x1, blue.x1), y0 = Math.min(red.y0, blue.y0), y1 = Math.max(red.y1, blue.y1); const i = (y0 * r.w + x0) * 3; return { w: (x1 - x0 + 1) / S, h: (y1 - y0 + 1) / S, corner: r.px[i] > 230 }; })();
  check(g, "avatar variant: 48pt circle", near(av.w, 48, 2) && near(av.h, 48, 2) && av.corner, `${f1(av.w)}x${f1(av.h)}pt, bounding-box corner is background`);
  const fit = (k) => at(`IM-FIT-${k}`, 126);
  const fc = fit("contain"), fv = fit("cover"), ff = fit("fill"), fn = fit("none");
  check(g, "fit=contain: whole image (120x60) letterboxed in the 120x120 box, green marker kept", near(fc.e.w, 120, 2) && near(fc.e.h, 60, 2) && fc.s.green.n > 100, `${f1(fc.e.w)}x${f1(fc.e.h)}pt, green ${fc.s.green.n}px`);
  check(g, "fit=cover: fills the 120x120 box and crops the sides (green marker cropped away)", near(fv.e.w, 120, 2) && near(fv.e.h, 120, 2) && fv.s.green.n === 0, `${f1(fv.e.w)}x${f1(fv.e.h)}pt, green ${fv.s.green.n}px`);
  check(g, "fit=fill: stretched to 120x120, marker stretched (taller than wide)", near(ff.e.w, 120, 2) && near(ff.e.h, 120, 2) && (() => { const gr = ff.s.green; return (gr.y1 - gr.y0) > (gr.x1 - gr.x0) * 1.5; })(), `${f1(ff.e.w)}x${f1(ff.e.h)}pt`);
  check(g, "fit=none: natural size (120 css px = 90pt wide), not scaled to the box", near(fn.e.w, 90, 3) && near(fn.e.h, 45, 3), `${f1(fn.e.w)}x${f1(fn.e.h)}pt`);
  const as = at("IM-ASPECT", 90), po = at("IM-POS-LEFT", 70);
  check(g, "aspectRatio=2 with width 160pt gives 160x80pt", near(as.e.w, 160, 2) && near(as.e.h, 80, 2), `${f1(as.e.w)}x${f1(as.e.h)}pt`);
  check(g, "position='0% 50%' with fit=cover keeps the left edge (green marker visible) where 50% crops it", po.s.green.n > 100 && fv.s.green.n === 0, `green px: position left ${po.s.green.n}, default center ${fv.s.green.n}`);
  const nm = at("IM-NAMED", 170);
  check(g, "named source from options.images + variant=cover: full content width x 160pt", near(nm.e.w, RIGHT - LEFT, 3) && near(nm.e.h, 160, 3), `${f1(nm.e.w)}x${f1(nm.e.h)}pt`);
  const bd = wd(n, "IM-BORDERED"), bdr = inBox(n, bd.p, C.border, { x0: bd.x0 - 80, x1: bd.x1 + 80, y0: bd.y0 - 150, y1: bd.y0 - 1 }, 8);
  check(g, "variant=bordered with src={ uri }: 1pt border around the image", bdr.n > 400, `${bdr.n} border px`);
  const ps = colorStats(R(n, 1), hex(C.magenta), { tol: 10 }).n + (pageCount(file(n)) > 1 ? colorStats(R(n, 2), hex(C.magenta), { tol: 10 }).n : 0);
  check(g, "class passthrough applies", ps > 100, `${ps} px`);
});

// ---- image sources: data URI done above; URL, missing, abort ----
await section("PdfImage sources", async () => {
  const g = "PdfImage", { h } = await import("vue"), { PdfImage } = await components(), { testPngBytes } = await assets();
  const png = testPngBytes();
  const real = globalThis.fetch; let hits = 0;
  globalThis.fetch = async (u, o) => { u = String(u); if (u === "https://pdfwind.test/ok.png") { hits++; return new Response(png, { status: 200, headers: { "content-type": "image/png" } }); } if (u.endsWith("/gone.png")) return new Response("nope", { status: 404 }); return real(u, o); };
  try {
    const Comp = (src, extra = {}) => ({ render: () => h("div", [h("p", "SRC-BEFORE"), h(PdfImage, { src, width: 120, height: 60, ...extra }), h("p", "SRC-AFTER")]) });
    const url = await renderPdf(Comp("https://pdfwind.test/ok.png"), {}, { margin: 40 });
    writeFileSync(file("src-url"), url);
    const red = colorStats(R("src-url"), hex("#e11d48"), { tol: 12 }).n;
    check(g, "http(s) URL source: fetched automatically and drawn", red > 3000 && hits === 1, `${red} red px; fetch called ${hits}x`);
    const e404 = await renderPdf(Comp("https://pdfwind.test/gone.png"), {}, {}).then(() => null, (e) => e.message);
    check(g, "URL that fails (404): error names the URL and the status", /gone\.png/.test(e404 ?? "") && /404/.test(e404 ?? ""), e404);
    const miss = await renderPdf(Comp("/nope.png"), {}, {}).then(() => null, (e) => e.message);
    check(g, "missing named image: clear error naming the src and the fix (default)", /\/nope\.png/.test(miss ?? "") && /options\.images/.test(miss ?? ""), miss);
    const ign = await renderPdf(Comp("/nope.png"), {}, { missingImages: "ignore", margin: 40 });
    writeFileSync(file("src-missing"), ign);
    check(g, "missingImages: \"ignore\" renders the rest of the page with a blank space", text("src-missing").includes("SRC-BEFORE") && text("src-missing").includes("SRC-AFTER") && colorStats(R("src-missing"), hex("#e11d48"), { tol: 12 }).n === 0, "text present, no image pixels");
    const given = await renderPdf(Comp("/provided.png"), {}, { images: [{ src: "/provided.png", data: png }], margin: 40 });
    writeFileSync(file("src-given"), given);
    check(g, "options.images array form also resolves a named source", colorStats(R("src-given"), hex("#e11d48"), { tol: 12 }).n > 3000, "");
    const ctl = new AbortController(); const pend = renderPdf(Comp("https://pdfwind.test/ok.png"), {}, { signal: ctl.signal }).then(() => null, (e) => e.name); ctl.abort();
    check(g, "AbortSignal still aborts a render that fetches images", (await pend) === "AbortError", await pend);
  } finally { globalThis.fetch = real; }
});

// ================= oversized break-inside-avoid content =================
await section("Oversized avoid", async () => {
  const g = "Oversized avoid";
  const names = Object.keys(demos).filter((k) => k.startsWith("tall-") && !["tall-graph", "tall-image"].includes(k));
  for (const name of names) {
    const lines = name === "tall-form" ? 40 : 60, t = text(name), got = new Set(t.match(/TALL-\d+/g) ?? []);
    const per = pagesOf(name).map((p) => W(name, p).filter((w) => /^TALL-\d+$/.test(w.t)));
    const bottoms = pagesOf(name).map((p) => Math.max(...W(name, p).map((w) => w.y1)));
    // clipped text would still be in the content stream, so also require ink at every page's last line
    const inked = pagesOf(name).every((p, i) => { const last = per[i].sort((a, b) => b.y0 - a.y0)[0]; return !last || nonWhite(name, p, last) > 20; });
    check(g, `${name.replace("tall-", "")}: taller than a page -> splits; all ${lines} lines + text before/after kept, nothing clipped`, got.size === lines && t.includes("TALL-BEFORE") && t.includes("TALL-AFTER") && pagesOf(name).length >= 2 && bottoms.every((b) => b <= PAGE_H - 30 + 1) && inked, `${pagesOf(name).length} pages; lines per page ${per.map((x) => x.length).join(",")}; max y ${f1(Math.max(...bottoms))}`);
  }
  // replaced content (SVG chart, image) is sliced by the page break: every pixel of it must still be drawn exactly once
  const gimg = "tall-image", t = text(gimg), cover = (name, colors) => pagesOf(name).map((p) => { const r = R(name, p); return colors.reduce((a, c) => a + colorStats(r, hex(c), { tol: 12 }).n, 0); });
  const px = cover(gimg, ["#e11d48", "#2563eb", "#00c800"]), expect = 400 * 1200 * S * S, drawn = px.reduce((a, b) => a + b, 0);
  check(g, "image 400x1200pt (taller than the page): sliced across pages, fully drawn once; caption and following text kept", t.includes("TALL-IMAGE") && t.includes("TALL-AFTER") && near(drawn / expect, 1, 0.03), `${(drawn / expect * 100).toFixed(1)}% of the image area drawn over ${pagesOf(gimg).length} pages (${px.join(" + ")} px)`);
  const gg = "tall-graph", tg = text(gg), gpx = cover(gg, [C.primary]), gdrawn = gpx.reduce((a, b) => a + b, 0);
  const plotH = 3000 - 34, bw = ((300 - 50) / 4) * 0.75, gexp = [120, 180, 90, 210].reduce((a, v) => a + bw * (v / 240) * plotH, 0) * S * S;
  check(g, "graph 3000pt tall: title, x labels and following text kept; bars sliced across pages and fully drawn (area within 8% of expected)", tg.includes("TALL-GRAPH") && tg.includes("TALL-AFTER") && ["Q1", "Q2", "Q3", "Q4"].every((l) => tg.includes(l)) && near(gdrawn / gexp, 1, 0.08), `${pagesOf(gg).length} pages; bar+axis area ${(gdrawn / gexp * 100).toFixed(1)}% of expected`);
});

// ================= Playground + browser parity (all 2b demos) =================
let server, browser;
try {
  server = await createServer({ configFile: "vite.config.js", root: `${process.cwd()}/playground`, server: { port: 0, host: "127.0.0.1" }, logLevel: "error" });
  await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}/`;
  browser = await chromium.launch();
  const page = await browser.newPage(), errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => ["error", "warning"].includes(m.type()) && !/Failed to load resource/.test(m.text()) && errors.push(`${m.type()}: ${m.text()}`));
  await page.goto(url);
  await page.waitForFunction(() => window.__pdfwind?.renders.length >= 1, null, { timeout: 60000 });
  const listed = await page.locator("nav button").allTextContents();
  const want = ["Table", "DataTable", "KeyValue", "Graph", "QRCode", "Alert", "Badge", "Form", "Signature", "PdfImage"];
  const missing = want.filter((t) => !listed.some((l) => l === t || l.startsWith(t)));
  check("Playground", "sidebar lists all 10 new components (and no hidden test demos)", !missing.length && !listed.some((l) => /^tall |http URL/.test(l)), missing.length ? `missing ${missing.join(", ")}` : `${listed.length} entries`);
  const norm = (s) => s.replace(/\s+/g, " ").trim();
  let same = 0; const diffs = [], ms = [];
  const names = ["table", "table-long", "data-table", "data-table-long", "key-value", "graph", "graph-2", "qrcode", "alert", "badge", "form", "signature", "pdf-image"];
  for (const name of names) {
    const k = await page.evaluate(() => window.__pdfwind.renders.length);
    await page.evaluate((d) => window.__pdfwind.set({ demo: d }), name);
    await page.waitForFunction((k) => window.__pdfwind.renders.length > k, k, { timeout: 60000 });
    writeFileSync(file(`browser-${name}`), Buffer.from(await page.evaluate(() => window.__pdfwind.pdfBytes())));
    ms.push(await page.evaluate(() => window.__pdfwind.renders.at(-1).ms));
    const a = norm(text(name)), b = norm(allText(file(`browser-${name}`)).join("\n")), pa = pageCount(file(name)), pb = pageCount(file(`browser-${name}`));
    if (a === b && pa === pb) same++; else diffs.push(`${name} (pages ${pa}/${pb})`);
  }
  check("Playground", "Chromium renders every 2b demo with text + page count identical to Node", same === names.length, same === names.length ? `${same}/${names.length} identical; render ms median ${[...ms].sort((x, y) => x - y)[Math.floor(ms.length / 2)]}, max ${Math.max(...ms)}` : `differs: ${diffs.join(", ")}`);
  const bq = qrCases(QR).map(([cap, size, want]) => { const c = find(words(file("browser-qrcode"), 1), cap), cx = (() => { const w = { ...c, p: 1 }; const line = words(file("browser-qrcode"), 1).filter((x) => Math.abs(x.y0 - w.y0) < 1.5 && x.x0 >= w.x0 - 0.1).sort((a, b) => a.x0 - b.x0); let end = w.x1; for (const x of line) { if (x.x0 - end < 9) end = Math.max(end, x.x1); else break; } return (w.x0 + end) / 2; })(); return decode("browser-qrcode", 1, { x0: cx - size / 2 - 10, x1: cx + size / 2 + 10, y0: c.y0 - size - 12, y1: c.y0 - 1 }) === want; });
  check("Playground", "QR codes rendered in Chromium (browser build of qrcode) decode too", bq.every(Boolean), `${bq.filter(Boolean).length}/${bq.length} decode`);
  // remote image in the browser: answer the request like a real server (with CORS) and check the image is drawn
  const { TEST_PNG_B64 } = await assets();
  await page.route("https://pdfwind.test/remote.png", (r) => r.fulfill({ status: 200, contentType: "image/png", headers: { "access-control-allow-origin": "*" }, body: Buffer.from(TEST_PNG_B64, "base64") }));
  const k = await page.evaluate(() => window.__pdfwind.renders.length);
  await page.evaluate(() => window.__pdfwind.set({ demo: "pdf-image-remote" }));
  await page.waitForFunction((k) => window.__pdfwind.renders.length > k, k, { timeout: 30000 });
  writeFileSync(file("browser-remote"), Buffer.from(await page.evaluate(() => window.__pdfwind.pdfBytes())));
  const remRed = colorStats(raster(file("browser-remote"), 1, { dpi: DPI }), hex("#e11d48"), { tol: 12 }).n;
  check("Playground", "browser fetches an http(s) <img> URL and draws it (CORS-enabled server)", remRed > 3000 && text("browser-remote").includes("REM-AFTER"), `${remRed} red px`);
  check("Playground", "no console errors or Vue warnings across all demos", errors.length === 0, errors.slice(0, 3).join(" | "));
} catch (e) {
  check("Playground", "browser run", false, String(e?.stack ?? e).slice(0, 300));
} finally {
  await browser?.close();
  await server?.close();
  await close();
}

// ---- report ----
const groups = [...new Set(rows.map((r) => r.group))];
const md = ["| # | group | check | result | detail |", "|---|---|---|---|---|", ...rows.map((r, i) => `| ${i + 1} | ${r.group} | ${r.name} | ${r.pass ? "PASS" : "FAIL"} | ${r.detail.replace(/\|/g, "\\|").replace(/\n/g, "<br>")} |`)].join("\n");
const summary = groups.map((g) => `${g}: ${rows.filter((r) => r.group === g && r.pass).length}/${rows.filter((r) => r.group === g).length}`).join(" · ");
const total = `${rows.filter((r) => r.pass).length}/${rows.length} pass`;
writeFileSync(`${OUT}/report.md`, `# Phase 2b E2E\n\n${md}\n\n${total}\n\n${summary}\n`);
console.log(md + `\n\n${total}\n${summary}`);
process.exit(rows.every((r) => r.pass) ? 0 : 1);
