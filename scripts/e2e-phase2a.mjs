// Phase 2a E2E: 14 components x every variant. Renders each demo (playground/demos.js) in Node, checks text, geometry,
// pixels and page breaks with poppler, then renders the same demos in Chromium and compares text.
// Writes out/phase2a/*.pdf, *.png (every page) and report.md.
import { writeFileSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { createServer } from "vite";
import { chromium } from "playwright-core";
import { load, pageCount, allText, pageText, fonts, words, find, raster, colorStats, hex } from "./lib/pdf.mjs";

const OUT = "out/phase2a";
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const rows = [];
const check = (group, name, pass, detail = "") => rows.push({ group, name, pass: !!pass, detail: String(detail) });
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const f1 = (n) => (Math.round(n * 10) / 10).toString();

// ---- geometry: pt in poppler bboxes, 144dpi rasters (2px per pt) ----
const DPI = 144, S = DPI / 72;
const PAGE_W = 595.28, LEFT = 30, RIGHT = PAGE_W - 30, CENTER = PAGE_W / 2; // A4, 30pt margin (40 css px)
const C = { primary: "#18181b", border: "#e4e4e7", muted: "#fafafa", mutedFg: "#71717a", accent: "#71717a", success: "#15803d", destructive: "#b91c1c", info: "#0369a1", warning: "#a16207", magenta: "#ff00ff" };

const { renderPdf, demos: allDemos, close } = await load();
// phase 2a covers its own 19 demos; phase 2b has its own script
const demos = Object.fromEntries(Object.entries(allDemos).filter(([k]) => ["stack", "section", "card", "card-wrap", "divider", "keep-together", "page-break", "page-header", "page-header-fixed", "page-footer", "page-footer-fixed", "page-number", "watermark", "watermark-variants", "heading", "text", "link", "list", "list-nowrap"].includes(k)));
const pdfs = {}, rasters = {};
const R = (name, p = 1) => (rasters[`${name}:${p}`] ??= raster(`${OUT}/${name}.pdf`, p, { dpi: DPI }));
const W = (name, p = 1) => words(`${OUT}/${name}.pdf`, p);
const px = (name, p, color, opts) => colorStats(R(name, p), hex(color), opts);
// pixels of `color` inside a pt box
const inBox = (name, p, color, b, tol = 14) => px(name, p, color, { tol, box: { x0: Math.max(0, Math.floor(b.x0 * S)), y0: Math.max(0, Math.floor(b.y0 * S)), x1: Math.ceil(b.x1 * S), y1: Math.ceil(b.y1 * S) } });
const row = (w, pad = 0) => ({ x0: 0, x1: PAGE_W, y0: w.y0 - pad, y1: w.y1 + pad }); // full-width band around a word
const mix = (fg, alpha) => hex(fg).map((c) => 255 - (255 - c) * alpha);
const dark = (name, p, b) => { // count of dark (ink) pixels in a pt box
  const { w, px: d } = R(name, p); let n = 0;
  for (let y = Math.floor(b.y0 * S); y < Math.ceil(b.y1 * S); y++) for (let x = Math.floor(b.x0 * S); x < Math.ceil(b.x1 * S); x++) { const i = (y * w + x) * 3; n += d[i] < 110 && d[i + 1] < 110 && d[i + 2] < 110; }
  return n;
};

// ---- render every demo ----
for (const [name, d] of Object.entries(demos)) {
  try {
    pdfs[name] = await renderPdf(d.component, {}, { margin: 40, ...(d.options ?? {}) });
    writeFileSync(`${OUT}/${name}.pdf`, pdfs[name]);
    const pages = pageCount(`${OUT}/${name}.pdf`);
    for (let p = 1; p <= pages; p++) raster(`${OUT}/${name}.pdf`, p, { dpi: 110, png: `${OUT}/${name}-${p}` });
    check("render", `${name}: renders to PDF + PNG`, pdfs[name].length > 1000, `${pdfs[name].length} bytes, ${pages} page(s)`);
  } catch (e) { check("render", `${name}: renders to PDF + PNG`, false, e.message); }
}

const section = async (group, fn) => { try { await fn(); } catch (e) { check(group, "section ran without throwing", false, String(e?.stack ?? e).split("\n").slice(0, 3).join(" | ")); } };
// first page that has the word wins; the result carries its page as .p
const wd = (name, t, p) => {
  for (let q = p ?? 1; q <= (p ?? pageCount(`${OUT}/${name}.pdf`)); q++) { const w = find(W(name, q), t); if (w) return { ...w, p: q }; }
  throw new Error(`word "${t}" not found in ${name}`);
};
// rightmost x1 on the same text line as w (a bbox is per word; right-aligned text can be several words)
const lineEnd = (name, w) => Math.max(...W(name, w.p).filter((x) => Math.abs(x.y0 - w.y0) < 1.5).map((x) => x.x1));
const passthrough = (group, name, p = 1, near_ = "PASS-") => { // magenta from class="bg-[#ff00ff]" / text-[#ff00ff]
  const n = px(name, p, C.magenta, { tol: 10 }).n;
  check(group, "class passthrough applies (magenta pixels from class=\"...[#ff00ff]\")", n > 150, `${n} px`);
};
const fullText = (name) => allText(`${OUT}/${name}.pdf`).join("\n");
const hasText = (name, t) => fullText(name).includes(t);
// pages on which a word with exactly this text appears
const pagesWith = (name, text) => Array.from({ length: pageCount(`${OUT}/${name}.pdf`) }, (_, i) => i + 1).filter((p) => W(name, p).some((w) => w.t === text));
const hasAll = (group, name, markers) => { const t = fullText(name); const miss = markers.filter((m) => !t.includes(m)); check(group, "all variant labels present in extracted text", miss.length === 0, miss.length ? `missing: ${miss.join(", ")}` : `${markers.length} markers`); };

// ================= Stack =================
await section("Stack", async () => {
  const g = "Stack", n = "stack";
  const dy = (k) => wd(n, `GV-${k}-B`).y0 - wd(n, `GV-${k}-A`).y0;
  const base = dy("none"), d = Object.fromEntries(["sm", "md", "lg", "xl"].map((k) => [k, dy(k) - base]));
  check(g, "vertical gap none/sm/md/lg/xl = 0/8/16/24/32pt (spacing 0/2/4/6/8)", near(d.sm, 8, 1.5) && near(d.md, 16, 1.5) && near(d.lg, 24, 1.5) && near(d.xl, 32, 1.5), `extra gap vs none: sm ${f1(d.sm)} md ${f1(d.md)} lg ${f1(d.lg)} xl ${f1(d.xl)}`);
  const ha = wd(n, "HA"), hb = wd(n, "HB");
  check(g, "horizontal: items in a row, 56pt box + 8pt gap", near(hb.y0, ha.y0, 1) && near(hb.x0 - ha.x0, 64, 1.5), `dx ${f1(hb.x0 - ha.x0)} dy ${f1(hb.y0 - ha.y0)}`);
  const span = (t) => inBox(n, 1, C.primary, row(wd(n, t), 6), 6);
  const jb = span("JB-1"), jc = span("JC-1"), je = span("JE-1"), ac = span("AC-1"), ae = span("AE-1");
  check(g, "justify between: first at left edge, last at right edge", near(jb.x0 / S, LEFT, 1.5) && near(jb.x1 / S, RIGHT, 1.5), `x ${f1(jb.x0 / S)}..${f1(jb.x1 / S)}`);
  check(g, "justify center: row centered on the page", near((jc.x0 + jc.x1) / 2 / S, CENTER, 2), `center ${f1((jc.x0 + jc.x1) / 2 / S)} vs ${f1(CENTER)}`);
  check(g, "justify end: row flush right", near(je.x1 / S, RIGHT, 1.5), `x1 ${f1(je.x1 / S)}`);
  check(g, "align center / end (vertical stack)", near((ac.x0 + ac.x1) / 2 / S, CENTER, 2) && near(ae.x1 / S, RIGHT, 1.5), `center ${f1((ac.x0 + ac.x1) / 2 / S)}, end x1 ${f1(ae.x1 / S)}`);
  const w1 = wd(n, "W1"), w3 = wd(n, "W3"), w4 = wd(n, "W4");
  check(g, "wrap: 4th item wraps to a second row", near(w1.y0, w3.y0, 1) && w4.y0 > w1.y0 + 20 && near(w4.x0, w1.x0, 4), `W1..W3 y ${f1(w1.y0)}, W4 y ${f1(w4.y0)}`);
  passthrough(g, n);
});

// ================= Section =================
await section("Section", async () => {
  const g = "Section", n = "section";
  const dy = (k) => wd(n, `SP-${k}-BELOW`).y0 - wd(n, `SP-${k}-ABOVE`).y0;
  const base = dy("none"), d = Object.fromEntries(["sm", "md", "lg", "xl"].map((k) => [k, dy(k) - base]));
  check(g, "spacing = vertical margin: sm 2x16, md 2x36 (section gap), lg 2x32, xl 2x48 pt", near(d.sm, 32, 2) && near(d.md, 72, 2) && near(d.lg, 64, 2) && near(d.xl, 96, 2), `extra vs none: sm ${f1(d.sm)} md ${f1(d.md)} lg ${f1(d.lg)} xl ${f1(d.xl)}`);
  const bar = (t, color) => { const w = wd(n, t); return inBox(n, 1, color, { x0: LEFT - 2, x1: LEFT + 8, y0: w.y0 - 12, y1: w.y1 + 12 }, 10); };
  const cal = bar("SEC-CALLOUT", C.primary), calI = bar("SEC-CALLOUT-INFO", C.info), hi = bar("SEC-HIGHLIGHT", C.primary), hiO = bar("SEC-HIGHLIGHT-ORANGE", "#ff6600");
  check(g, "callout: 4pt primary bar; accentColor=info token recolors it", cal.n > 100 && calI.n > 100 && near((cal.x1 - cal.x0 + 1) / S, 4, 1), `bar ${f1((cal.x1 - cal.x0 + 1) / S)}pt wide, ${cal.n}px primary, ${calI.n}px info`);
  const hiBg = inBox(n, 1, C.muted, { x0: LEFT + 20, x1: LEFT + 120, y0: wd(n, "SEC-HIGHLIGHT").y0 - 4, y1: wd(n, "SEC-HIGHLIGHT").y1 + 4 }, 1);
  check(g, "highlight: bg-muted fill + bar; accentColor=#ff6600 raw color", hiBg.n > 500 && hi.n > 100 && hiO.n > 100, `muted ${hiBg.n}px, bar ${hi.n}px, orange bar ${hiO.n}px`);
  const cardW = wd(n, "SEC-CARD"), cardB = inBox(n, 1, C.border, row(cardW, 22), 6);
  check(g, "card variant: rounded 2pt-border outline", cardB.n > 800, `${cardB.n} border px`);
  const bor = inBox(n, wd(n, "SEC-BORDER").p, C.border, row(wd(n, "SEC-BORDER"), 22), 6);
  check(g, "border prop outlines the default variant", bor.n > 800, `${bor.n} border px`);
  const bg = inBox(n, wd(n, "SEC-BG").p, "#ffedd5", row(wd(n, "SEC-BG"), 22), 3), bgT = inBox(n, wd(n, "SEC-BG-TOKEN").p, C.success, row(wd(n, "SEC-BG-TOKEN"), 14), 6);
  check(g, "background: raw color #ffedd5 and token success", bg.n > 3000 && bgT.n > 3000, `raw ${bg.n}px, token ${bgT.n}px`);
  const x0 = (t) => wd(n, t).x0, none = x0("SEC-PAD-NONE");
  check(g, "padding none/sm/lg: text inset +0/+12/+24pt", near(x0("SEC-PAD-SM") - none, 12, 1.5) && near(x0("SEC-PAD-LG") - none, 24, 1.5), `sm +${f1(x0("SEC-PAD-SM") - none)} lg +${f1(x0("SEC-PAD-LG") - none)}`);
  passthrough(g, n, wd(n, "SEC-PAD-LG").p);
});

// ================= Card =================
await section("Card", async () => {
  const g = "Card", n = "card";
  hasAll(g, n, ["CARD-DEFAULT title", "CARD-BORDERED title", "CARD-MUTED title"]);
    const edge = (t) => { // border thickness (px) at the card's left edge, scanning right from the page margin on the title row
    const w = wd(n, t), { w: W_, px: d } = R(n, 1), y = Math.round(((w.y0 + w.y1) / 2) * S);
    let i = Math.round(LEFT * S) - 3, run = 0;
    for (; i < Math.round(LEFT * S) + 12; i++) { const p = (y * W_ + i) * 3; if (d[p] < 250 || d[p + 1] < 250 || d[p + 2] < 250) run++; else if (run) break; }
    return run;
  };
  const eDef = edge("CARD-DEFAULT"), eBor = edge("CARD-BORDERED");
  check(g, "variants: default 1pt border, bordered 2pt (px at 144dpi)", near(eDef, 2, 1) && near(eBor, 4, 1) && eBor > eDef, `default ${eDef}px, bordered ${eBor}px`);
  const mu = inBox(n, 1, C.muted, { x0: LEFT + 30, x1: LEFT + 200, y0: wd(n, "CARD-MUTED").y0 + 14, y1: wd(n, "CARD-MUTED").y1 + 30 }, 1);
  const de = inBox(n, 1, C.muted, { x0: LEFT + 30, x1: LEFT + 200, y0: wd(n, "CARD-DEFAULT").y0 + 14, y1: wd(n, "CARD-DEFAULT").y1 + 30 }, 1);
  check(g, "muted variant fills #fafafa; default stays white", mu.n > 3000 && de.n < 200, `muted ${mu.n}px, default ${de.n}px`);
  const x0 = (t) => wd(n, t).x0;
  const insets = ["CARD-PAD-SM", "CARD-DEFAULT", "CARD-PAD-LG"].map((t) => x0(t) - LEFT - 1.3);
  check(g, "padding sm / md (default) / lg: text inset 8 / 12 / 16pt (inside a 1pt border)", near(insets[0], 8, 1.5) && near(insets[1], 12, 1.5) && near(insets[2], 16, 1.5), `insets ${insets.map(f1).join(" / ")}pt`);
  const ov = x0("CARD-OVERRIDE-P1") - LEFT;
  check(g, "class override: class=\"p-1\" beats the default p-3 (tailwind-merge)", ov < 8, `inset ${f1(ov)}pt (default would be ~13pt)`);
  const tl = wd(n, "CARD-DEFAULT"), ruleY = inBox(n, 1, C.border, { x0: LEFT + 20, x1: LEFT + 400, y0: tl.y1, y1: tl.y1 + 14 }, 6);
  check(g, "title has a rule beneath it", ruleY.n > 400, `${ruleY.n} border px under title`);
  passthrough(g, n);
  // wrap / no wrap
  const wr = "card-wrap", linePages = (prefix) => [...new Set(Array.from({ length: 16 }, (_, i) => pagesWith(wr, `${prefix}-${i + 1}`)[0]))];
  const nw = linePages("CARD-NOWRAP-LINE"), ww = linePages("CARD-WRAP-LINE"), t1 = allText(`${OUT}/${wr}.pdf`)[0];
  check(g, "wrap=false (default): card jumps whole to the next page", nw.length === 1 && nw[0] === 2 && !t1.includes("CARD-NOWRAP"), `no-wrap card lines on page(s) ${nw.join(",")}; page 1 has none`);
  check(g, "wrap=true: card splits across pages", ww.length >= 2, `wrap card lines on page(s) ${ww.join(",")}`);
});

// ================= Divider =================
await section("Divider", async () => {
  const g = "Divider", n = "divider";
  hasAll(g, n, ["DIV-LABEL-TEXT", "DIV-LABEL-DASHED"]);
  // line geometry below each label: vertical thickness at mid-page, and horizontal on/off runs along it
  const line = (key, color) => {
    const w = wd(n, key), { w: W_, px: d } = R(n, 1), x = Math.round(300 * S);
    const isInk = (xx, yy) => { const i = (yy * W_ + xx) * 3; return Math.abs(d[i] - hex(color)[0]) < 40 && Math.abs(d[i + 1] - hex(color)[1]) < 40 && Math.abs(d[i + 2] - hex(color)[2]) < 40; };
    let y = Math.round(w.y1 * S) + 2; const ymax = y + 60;
    // first row with ink anywhere in 100px of the row start (dashes may miss x)
    const hit = (yy) => { for (let xx = Math.round(LEFT * S); xx < Math.round(LEFT * S) + 40; xx++) if (isInk(xx, yy)) return true; return false; };
    while (y < ymax && !hit(y)) y++;
    let thick = 0; while (hit(y + thick)) thick++;
    const ym = y + Math.floor(thick / 2); let runs = 0, prev = false;
    for (let xx = Math.round(LEFT * S); xx < Math.round(RIGHT * S); xx++) { const on = isInk(xx, ym); if (on && !prev) runs++; prev = on; }
    return { thick, runs };
  };
  const solid = ["thin", "medium", "thick"].map((t) => line(`DIV-solid-${t}`, C.primary)), dashed = ["thin", "medium", "thick"].map((t) => line(`DIV-dashed-${t}`, C.primary)), dotted = ["thin", "medium", "thick"].map((t) => line(`DIV-dotted-${t}`, C.primary));
  check(g, "solid thin/medium/thick = 1/2/4pt (2/4/8px)", solid.every((s, i) => near(s.thick, [2, 4, 8][i], 1)) && solid.every((s) => s.runs === 1), `thickness ${solid.map((s) => s.thick).join("/")}px, runs ${solid.map((s) => s.runs).join("/")}`);
  check(g, "dashed: many dashes, fewer as thickness grows", dashed.every((s) => s.runs > 8) && dashed[0].runs > dashed[1].runs && dashed[1].runs > dashed[2].runs, `dash count ${dashed.map((s) => s.runs).join("/")}`);
  check(g, "dotted: dots, more than dashes at the same thickness", dotted.every((s, i) => s.runs > dashed[i].runs) && dotted[2].runs > 20, `dot count ${dotted.map((s) => s.runs).join("/")}`);
  const lb = wd(n, "DIV-LABEL-TEXT"), lL = inBox(n, lb.p, C.border, { x0: LEFT, x1: lb.x0 - 4, y0: lb.y0, y1: lb.y1 }, 8), lR = inBox(n, lb.p, C.border, { x0: lb.x1 + 4, x1: RIGHT, y0: lb.y0, y1: lb.y1 }, 8);
  check(g, "label: rule on both sides of the text", lL.n > 200 && lR.n > 200, `left ${lL.n}px, right ${lR.n}px`);
  const ld = wd(n, "DIV-LABEL-DASHED"), red = inBox(n, ld.p, C.destructive, row(ld, 4), 10), black = inBox(n, ld.p, C.primary, row(ld, 4), 20);
  check(g, "label + dashed + color=destructive token (no stray black dashes)", red.n > 300 && black.n === 0, `destructive ${red.n}px, black ${black.n}px`);
  const gr = px(n, ld.p, C.success, { tol: 12 });
  check(g, "width=120 (css px) = 90pt wide; color=success token", near((gr.x1 - gr.x0 + 1) / S, 90, 2) && gr.n > 100, `${f1((gr.x1 - gr.x0 + 1) / S)}pt wide`);
  const dsp = (k) => wd(n, `DSP-${k}-B`).y0 - wd(n, `DSP-${k}-A`).y0, b0 = dsp("none");
  check(g, "spacing sm/md/lg = +28/+36/+72pt vs none (2x paragraph/component/section gap)", near(dsp("sm") - b0, 28, 2) && near(dsp("md") - b0, 36, 2) && near(dsp("lg") - b0, 72, 2), `sm +${f1(dsp("sm") - b0)} md +${f1(dsp("md") - b0)} lg +${f1(dsp("lg") - b0)}`);
  passthrough(g, n, pageCount(`${OUT}/${n}.pdf`));
});

// ================= KeepTogether / PageBreak =================
await section("KeepTogether", async () => {
  const g = "KeepTogether", n = "keep-together";
  const per = (prefix) => Array.from({ length: pageCount(`${OUT}/${n}.pdf`) }, (_, i) => i + 1).map((p) => W(n, p).filter((w) => w.t.startsWith(prefix)).length);
  const kt = per("KT-BLOCK-"), loose = per("KT-LOOSE-");
  check(g, "block that would straddle a page moves whole to the next page", kt.filter(Boolean).length === 1 && kt[0] === 0 && Math.max(...kt) === 12, `KT-BLOCK lines per page: ${kt.join(",")}`);
  check(g, "control: same block without KeepTogether does split", loose.filter(Boolean).length >= 2, `KT-LOOSE lines per page: ${loose.join(",")}`);
  passthrough(g, n, pagesWith(n, "PASS-KEEP")[0]);
});
await section("PageBreak", async () => {
  const g = "PageBreak", n = "page-break", pages = pageCount(`${OUT}/${n}.pdf`);
  const where = [1, 2, 3, 4].map((k) => Array.from({ length: pages }, (_, i) => i + 1).find((p) => W(n, p).some((w) => w.t === `PB-PAGE-${k}`)));
  check(g, "each PageBreak starts a new page (4 sections -> pages 1,2,3,4)", where.join() === "1,2,3,4" && pages === 4, `sections on pages ${where.join(",")}; ${pages} pages`);
});

// ================= PageHeader =================
await section("PageHeader", async () => {
  const g = "PageHeader", n = "page-header", T = fullText(n);
  const markers = ["PH-SIMPLE Acme", "PH-SIMPLE-SUB", "PH-SIMPLE-RIGHT", "PH-SIMPLE-RSUB", "PH-CENTERED Quarterly", "PH-CENTERED-SUB", "PH-MINIMAL Meeting", "PH-MINIMAL-SUB", "PH-MINIMAL-RIGHT", "PH-MINIMAL-RSUB", "PH-BRANDED Welcome", "PH-BRANDED-SUB", "PH-BRANDED-BG", "PH-LOGOLEFT Northwind", "PH-LOGOLEFT-SUB", "PH-LOGOLEFT-RIGHT", "PH-LOGORIGHT Contoso", "PH-LOGORIGHT-SUB", "PH-TWOCOL Fabrikam", "PH-TWOCOL-SUB", "PH-ADDR", "PH-PHONE", "PH-EMAIL"];
  hasAll(g, n, markers);
  const r1 = wd(n, "PH-SIMPLE-RIGHT"), ti = wd(n, "PH-SIMPLE");
  check(g, "simple: title left, rightText flush right", near(ti.x0, LEFT, 1.5) && near(wd(n, "2026", 1).x1, RIGHT, 1.5) && r1.x0 > 300, `title x0 ${f1(ti.x0)}, right x1 ${f1(wd(n, "2026").x1)}`);
  const ce = wd(n, "PH-CENTERED"), ceSub = wd(n, "PH-CENTERED-SUB");
  check(g, "centered: title and subtitle centered on the page", near((ce.x0 + wd(n, "Report").x1) / 2, CENTER, 3) && near((ceSub.x0 + wd(n, "board").x1) / 2, CENTER, 3), `title center ${f1((ce.x0 + wd(n, "Report").x1) / 2)}`);
  const mi = inBox(n, 1, C.primary, { x0: LEFT, x1: RIGHT, y0: wd(n, "PH-MINIMAL-SUB").y1 + 4, y1: wd(n, "PH-MINIMAL-SUB").y1 + 30 }, 8);
  check(g, "minimal: heavy primary rule under the row", mi.n > 3000, `${mi.n} px`);
  const br = inBox(n, 1, C.primary, row(wd(n, "PH-BRANDED"), 10), 6), brBg = inBox(n, 1, C.info, row(wd(n, "PH-BRANDED-BG"), 14), 6), brT = inBox(n, 1, "#ffffff", { x0: wd(n, "PH-BRANDED").x0, x1: wd(n, "PH-BRANDED").x1, y0: wd(n, "PH-BRANDED").y0, y1: wd(n, "PH-BRANDED").y1 }, 20);
  check(g, "branded: primary fill with white text; background=#0369a1 override", br.n > 8000 && brBg.n > 8000 && brT.n > 30, `primary ${br.n}px, custom ${brBg.n}px, white text px ${brT.n}`);
  const lo = px(n, 1, "#ff6600", { tol: 10 }), ll = wd(n, "PH-LOGOLEFT");
  check(g, "logo-left: 48pt logo slot, title to its right", near((lo.x1 - lo.x0 + 1) / S, 48, 2) && near((lo.y1 - lo.y0 + 1) / S, 48, 2) && ll.x0 > lo.x1 / S, `logo ${f1((lo.x1 - lo.x0 + 1) / S)}x${f1((lo.y1 - lo.y0 + 1) / S)}pt, title x0 ${f1(ll.x0)} > logo x1 ${f1(lo.x1 / S)}; right text x1 ${f1(wd(n, "INV-77").x1)}`);
  const lr = px(n, 1, "#00aa55", { tol: 10 });
  check(g, "logo-right: 48pt logo flush right, title left", near((lr.x1 - lr.x0 + 1) / S, 48, 2) && near(lr.x1 / S, RIGHT, 2), `logo x1 ${f1(lr.x1 / S)}`);
  const em = wd(n, "PH-EMAIL"), ad = wd(n, "PH-ADDR");
  check(g, "two-column: contact lines stacked and flush right", near(wd(n, "hi@fabrikam.test").x1, RIGHT, 1.5) && em.y0 > ad.y0 && wd(n, "PH-TWOCOL").x0 < 40, `email x1 ${f1(wd(n, "hi@fabrikam.test").x1)}`);
  const tc = inBox(n, 1, C.destructive, row(wd(n, "PH-TITLECOLOR"), 2), 10);
  check(g, "titleColor=destructive token", tc.n > 100, `${tc.n}px`);
  // two headers of equal height: marginBottom=14 above, marginBottom=0 below; the pitch difference is the margin
  const pitchMb = wd(n, "PH-MB-NONE").y0 - wd(n, "PH-TITLECOLOR").y0, pitch0 = wd(n, "PH-AFTER-MB-NONE").y0 - wd(n, "PH-MB-NONE").y0;
  check(g, "marginBottom is in pt: 14 vs 0 changes the pitch by 14pt", near(pitchMb - pitch0, 14, 2.5), `pitch ${f1(pitchMb)} (mb 14) vs ${f1(pitch0)} (mb 0)`);
  passthrough(g, n, wd(n, "PH-PASS").p);
  // fixed
  const f = "page-header-fixed", fp = pageCount(`${OUT}/${f}.pdf`);
  const tops = Array.from({ length: fp }, (_, i) => { const w = W(f, i + 1).find((x) => x.t === "PHF-REPEAT"); return w ? w.y0 : null; });
  check(g, "fixed: repeats at the top of every page", fp === 3 && tops.every((y) => y !== null && y < 60), `3 pages; y of title per page: ${tops.map((y) => (y === null ? "-" : f1(y))).join(", ")}`);
});

// ================= PageFooter =================
await section("PageFooter", async () => {
  const g = "PageFooter", n = "page-footer";
  hasAll(g, n, ["PF-SIMPLE-L", "PF-SIMPLE-C", "PF-SIMPLE-R", "PF-SLOT-L", "Page 1 of 1", "PF-CENTERED-1", "PF-CENTERED-2", "PF-BRANDED-L", "PF-BRANDED-R", "PF-MINIMAL-L", "PF-MINIMAL-R", "PF-3COL-L", "PF-3COL-ADDR", "PF-3COL-PHONE", "PF-3COL-EMAIL", "PF-3COL-WEB", "PF-3COL-R", "PF-DETAIL-L", "PF-DETAIL-ADDR", "Phone: 555 0100", "Email: a@b.test", "Web: acme.test", "PF-DETAIL-R", "PF-STICKY"]);
  const L = wd(n, "PF-SIMPLE-L"), Cc = wd(n, "PF-SIMPLE-C"), Rr = wd(n, "PF-SIMPLE-R");
  check(g, "simple: left / center / right, right flush", L.x0 < Cc.x0 && Cc.x0 < Rr.x0 && near(lineEnd(n, Rr), RIGHT, 1.5) && near(L.x0, LEFT, 1.5) && near(L.y0, Rr.y0, 1), `x0 ${f1(L.x0)} < ${f1(Cc.x0)} < ${f1(Rr.x0)}, right x1 ${f1(lineEnd(n, Rr))}`);
  const rule = inBox(n, 1, C.border, { x0: LEFT, x1: RIGHT, y0: L.y0 - 16, y1: L.y0 }, 6);
  check(g, "simple: top rule above the row", rule.n > 1500, `${rule.n} px`);
  const sl = wd(n, "PF-SLOT-L"), pn = wd(n, "Page", 1);
  check(g, "slots: #left text + <PageNumber> in #right; pagePadding=20pt insets both sides", near(sl.x0 - L.x0, 20, 1.5), `inset +${f1(sl.x0 - L.x0)}pt`);
  const c1 = wd(n, "PF-CENTERED-1"), c2 = wd(n, "PF-CENTERED-2");
  check(g, "centered: two stacked centered lines", c2.y0 > c1.y0 && near(c1.x0 + (c1.x1 - c1.x0) / 2, CENTER, 40), `y ${f1(c1.y0)} -> ${f1(c2.y0)}`);
  const bp = inBox(n, 1, C.primary, row(wd(n, "PF-BRANDED-L"), 6), 6), bw = inBox(n, 1, "#ffffff", { x0: wd(n, "PF-BRANDED-L").x0, x1: wd(n, "PF-BRANDED-L").x1, y0: wd(n, "PF-BRANDED-L").y0, y1: wd(n, "PF-BRANDED-L").y1 }, 20);
  check(g, "branded: primary band, white text", bp.n > 8000 && bw.n > 30, `band ${bp.n}px, text ${bw.n}px`);
  const bb = inBox(n, 1, C.info, row(wd(n, "PF-BRANDED-BG"), 6), 6), by = inBox(n, 1, "#ffff00", row(wd(n, "PF-BRANDED-BG"), 6), 40);
  check(g, "branded: background=#0369a1 + textColor=#ffff00 overrides", bb.n > 8000 && by.n > 30, `bg ${bb.n}px, yellow text ${by.n}px`);
  const m1 = wd(n, "PF-MINIMAL-L"), m2 = wd(n, "PF-MINIMAL-R");
  check(g, "minimal: left + right, no rule", near(lineEnd(n, m2), RIGHT, 1.5) && inBox(n, 1, C.border, { x0: LEFT, x1: RIGHT, y0: m1.y0 - 10, y1: m1.y0 - 2 }, 6).n < 200, `right x1 ${f1(lineEnd(n, m2))}`);
  const t3 = [wd(n, "PF-3COL-L"), wd(n, "PF-3COL-PHONE"), wd(n, "PF-3COL-R")], tAd = wd(n, "PF-3COL-ADDR");
  check(g, "three-column: company+address | contacts | right", t3[0].x0 < t3[1].x0 && t3[1].x0 < t3[2].x0 && tAd.y0 > t3[0].y0 && wd(n, "PF-3COL-EMAIL").y0 > t3[1].y0 && near(lineEnd(n, t3[2]), RIGHT, 1.5), `x0 ${t3.map((w) => f1(w.x0)).join(" < ")}`);
  const d1 = wd(n, "PF-DETAIL-L"), dr = wd(n, "PF-DETAIL-R");
  check(g, "detailed: company+address left, labeled contacts right, page line below", near(Math.max(...W(n).filter((x) => x.t === "acme.test").map((x) => x.x1)), RIGHT, 2) && dr.y0 > d1.y0 + 20, `PF-DETAIL-R y ${f1(dr.y0)} below company y ${f1(d1.y0)}`);
  passthrough(g, n);
  const host = wd(n, "PF-STICKY-HOST"), st = wd(n, "PF-STICKY"), hostBottom = inBox(n, 1, C.border, { x0: LEFT, x1: RIGHT, y0: host.y0, y1: host.y0 + 160 }, 6);
  check(g, "sticky: pinned to the bottom of its positioned parent", st.y0 - host.y0 > 100 && st.y1 - host.y0 < 150, `host top y ${f1(host.y0)}, footer y ${f1(st.y0)}..${f1(st.y1)} (host is 150pt tall)`);
  const f = "page-footer-fixed", fp = pageCount(`${OUT}/${f}.pdf`);
  const bot = Array.from({ length: fp }, (_, i) => { const w = W(f, i + 1).find((x) => x.t === "PFF-REPEAT"); return w ? w.y1 : null; });
  check(g, "fixed: repeats at the bottom of every page", fp === 3 && bot.every((y) => y !== null && y > 760), `3 pages; y of footer per page: ${bot.map((y) => (y === null ? "-" : f1(y))).join(", ")}`);
});

// ================= PageNumber =================
await section("PageNumber", async () => {
  const g = "PageNumber", n = "page-number", T = allText(`${OUT}/${n}.pdf`), p1 = T[0].replace(/\s+/g, " ");
  check(g, "default format 'Page {page} of {total}' with real counters", /Page 1 of 3/.test(p1), "page 1: " + (p1.match(/Page 1 of 3/) ?? ["not found"])[0]);
  check(g, "custom formats: 'N / M' and CJK '第 N 頁，共 M 頁'", /PN-SLASH 1 \/ 3/.test(p1) && /第 1 頁，共 3 頁/.test(p1), "");
  check(g, "counters advance per page in the body (2 of 3, 3 of 3)", /PN-P2 2 of 3/.test(T[1].replace(/\s+/g, " ")) && /PN-P3 3 of 3/.test(T[2].replace(/\s+/g, " ")), "");
  check(g, "footer option: 'Page n of 3' on every page", T.every((t, i) => new RegExp(`PN-FOOTER Page ${i + 1} of 3`).test(t.replace(/\s+/g, " "))), T.map((t, i) => (t.match(/PN-FOOTER Page \d of \d/) ?? ["-"])[0]).join(" | "));
  const l = wd(n, "PN-LEFT"), c = wd(n, "PN-CENTER"), r = wd(n, "PN-RIGHT");
  const lastOf = (w, t2) => W(n, 1).filter((x) => Math.abs(x.y0 - w.y0) < 1).pop();
  check(g, "align left / center / right", near(l.x0, LEFT, 1.5) && near((c.x0 + lastOf(c).x1) / 2, CENTER, 2) && near(lastOf(r).x1, RIGHT, 1.5), `left x0 ${f1(l.x0)}, center ${f1((c.x0 + lastOf(c).x1) / 2)}, right x1 ${f1(lastOf(r).x1)}`);
  const h = (t) => { const w = wd(n, t); return w.y1 - w.y0; };
  check(g, "size xs < sm < md (10 / 12 / 15pt)", h("PN-XS") < h("PN-SM") && h("PN-SM") < h("PN-MD") && near(h("PN-MD") / h("PN-XS"), 1.5, 0.15), `heights ${f1(h("PN-XS"))} / ${f1(h("PN-SM"))} / ${f1(h("PN-MD"))}`);
  const mu = inBox(n, 1, C.mutedFg, row(wd(n, "PN-SM"), 2), 20), fg = inBox(n, 1, C.primary, row(wd(n, "PN-NOTMUTED"), 2), 20);
  check(g, "muted=true (default) uses muted-foreground, muted=false uses foreground", mu.n > 30 && fg.n > 30, `muted ${mu.n}px, foreground ${fg.n}px`);
  passthrough(g, n);
});

// ================= Watermark =================
await section("Watermark", async () => {
  const g = "Watermark", n = "watermark", pages = pageCount(`${OUT}/${n}.pdf`);
  const wm = mix(C.mutedFg, 0.15).map(Math.round);
  // below the heading: its antialiased edge pixels are also near-white grays
  const stats = Array.from({ length: pages }, (_, i) => colorStats(R(n, i + 1), wm, { tol: 4, box: { x0: 0, y0: 150 * S, x1: PAGE_W * S, y1: 842 * S } }));
  check(g, "visible on every page (fixed, repeats): 15% muted-foreground pixels", pages === 3 && stats.every((s) => s.n > 2000), `pages ${pages}; px per page ${stats.map((s) => s.n).join(", ")}; expected color rgb(${wm})`);
  const s = stats[0], ratio = (s.x1 - s.x0) / (s.y1 - s.y0);
  check(g, "rotated -45deg: bounding box roughly square (an unrotated 5-letter word would be ~4:1)", ratio > 0.6 && ratio < 1.7, `bbox ${f1((s.x1 - s.x0) / S)}x${f1((s.y1 - s.y0) / S)}pt, ratio ${f1(ratio)}`);
  check(g, "centered on the page", near((s.x0 + s.x1) / 2 / S, CENTER, 12) && near((s.y0 + s.y1) / 2 / S, 842 / 2 + 5, 40), `center ${f1((s.x0 + s.x1) / 2 / S)}, ${f1((s.y0 + s.y1) / 2 / S)}pt`);
  const hd = wd(n, "WM-PAGE-1");
  check(g, "content stays above it: heading text extracted and inked", hasText(n, "WM-BODY") && dark(n, 1, hd) > 150, `${dark(n, 1, hd)} ink px in heading`);
  const v = "watermark-variants", q = (c, o) => mix(c, o).map(Math.round);
  const quad = (color, op) => colorStats(R(v, 1), q(color, op), { tol: 6 });
  const exp = { TL: [C.success, "x<", "y<"], TR: [C.destructive, "x>", "y<"], BL: [C.info, "x<", "y>"], BR: [C.warning, "x>", "y>"] };
  const where = Object.entries(exp).map(([k, [col, xs, ys]]) => { const t = quad(col, 0.6), cx = (t.x0 + t.x1) / 2 / S, cy = (t.y0 + t.y1) / 2 / S; return { k, ok: t.n > 200 && (xs === "x<" ? cx < CENTER : cx > CENTER) && (ys === "y<" ? cy < 421 : cy > 421), cx, cy, n: t.n }; });
  check(g, "position top-left / top-right / bottom-left / bottom-right, token colors + opacity 0.6", where.every((w) => w.ok), where.map((w) => `${w.k} (${f1(w.cx)},${f1(w.cy)}) ${w.n}px`).join("; "));
  const cf = quad(C.magenta, 0.3), cr = (cf.x1 - cf.x0) / (cf.y1 - cf.y0);
  check(g, "color=#ff00ff raw, angle=-30, fontSize=50: wide rotated text", cf.n > 2000 && cr > 1.5 && cr < 5, `${cf.n}px, bbox ratio ${f1(cr)}`);
});

// ================= Heading =================
await section("Heading", async () => {
  const g = "Heading", n = "heading";
  const hs = [1, 2, 3, 4, 5, 6].map((l) => { const w = wd(n, `HD-LEVEL-${l}`); return w.y1 - w.y0; });
  check(g, "levels 1-6: strictly decreasing, h1:h6 = 24:10pt", hs.every((v, i) => !i || v < hs[i - 1]) && near(hs[0] / hs[5], 2.4, 0.35), `heights ${hs.map(f1).join(" > ")}`);
  const ys = [1, 2, 3].map((l) => wd(n, `HD-LEVEL-${l}`).y0), gap12 = ys[1] - ys[0], gap23 = ys[2] - ys[1];
  check(g, "level margins: h2 sits 36pt below its predecessor, h3 18pt", gap12 > gap23 + 15, `h1->h2 ${f1(gap12)}pt, h2->h3 ${f1(gap23)}pt`);
  const sample = (t) => W(n).filter((w) => w.t === t);
  const ink = (w) => dark(n, 1, w) / ((w.x1 - w.x0) * (w.y1 - w.y0));
  const wts = sample("HD-WEIGHT-SAMPLE").map(ink);
  check(g, "weight normal < medium < semibold < bold (ink density)", wts.length === 4 && wts.every((v, i) => !i || v > wts[i - 1]), `ink ${wts.map((v) => v.toFixed(3)).join(" < ")}`);
  const trk = sample("HD-TRACK-SAMPLE").map((w) => w.x1 - w.x0);
  check(g, "tracking tighter < tight < normal < wide < wider (word width)", trk.length === 5 && trk.every((v, i) => !i || v > trk[i - 1]), `widths ${trk.map(f1).join(" < ")}`);
  const T = fullText(n);
  check(g, "transform uppercase / lowercase / capitalize", T.includes("HD-TRANSFORM UPPER") && T.includes("hd-transform lower") && T.includes("Hd-Transform Capitalize Me"), "extracted text transformed");
  const ac = wd(n, "HD-ALIGN-CENTER"), ar = wd(n, "HD-ALIGN-RIGHT");
  check(g, "align center / right", near((ac.x0 + ac.x1) / 2, CENTER, 2) && near(ar.x1, RIGHT, 1.5), `center ${f1((ac.x0 + ac.x1) / 2)}, right x1 ${f1(ar.x1)}`);
  const ct = inBox(n, 1, C.destructive, row(wd(n, "HD-COLOR-TOKEN"), 2), 10), cr = inBox(n, 1, C.magenta, row(wd(n, "HD-COLOR-RAW"), 2), 10);
  check(g, "color: destructive token and raw #ff00ff", ct.n > 100 && cr.n > 100, `token ${ct.n}px, raw ${cr.n}px`);
  const ps = wd(n, "HD-PASS"), phh = ps.y1 - ps.y0;
  check(g, "class passthrough: text-h1 (size) AND text-[#ff00ff] (color) both survive tailwind-merge on an h6", phh > hs[1] && inBox(n, 1, C.magenta, row(ps, 2), 10).n > 200, `height ${f1(phh)}pt (h6 default ${f1(hs[5])}), magenta ${inBox(n, 1, C.magenta, row(ps, 2), 10).n}px`);
  check(g, "CJK heading renders (Noto Sans TC)", T.includes("標題 繁體中文") && fonts(`${OUT}/${n}.pdf`).includes("Noto"), "");
});

// ================= Text =================
await section("Text", async () => {
  const g = "Text", n = "text";
  const order = ["xs", "default", "sm", "base", "lg", "xl", "2xl", "3xl"], ht = Object.fromEntries(order.map((k) => { const w = wd(n, `TX-SIZE-${k}`); return [k, w.y1 - w.y0]; }));
  check(g, "variants xs < (11pt default) < sm < base < lg < xl < 2xl < 3xl", order.every((k, i) => !i || ht[k] > ht[order[i - 1]]) && near(ht["3xl"] / ht.xs, 3.6, 0.4), `heights ${order.map((k) => f1(ht[k])).join(" < ")}`);
  const ws = W(n).filter((w) => w.t === "TX-WEIGHT-SAMPLE"), ink = (w) => dark(n, 1, w) / ((w.x1 - w.x0) * (w.y1 - w.y0)), wi = ws.map(ink);
  check(g, "weights normal < medium < semibold < bold (ink density)", wi.length === 4 && wi.every((v, i) => !i || v > wi[i - 1]), `ink ${wi.map((v) => v.toFixed(3)).join(" < ")}`);
  check(g, "italic embeds the real Inter italic face (not a synthetic slant)", /Inter.*Italic|Italic/i.test(fonts(`${OUT}/${n}.pdf`)), fonts(`${OUT}/${n}.pdf`).split("\n").slice(2).map((l) => l.split(/\s+/)[0]).filter(Boolean).join(", "));
  const und = wd(n, "TX-UNDERLINE"), lt = wd(n, "TX-LINETHROUGH");
  check(g, "decoration underline / line-through draw a rule across the text", dark(n, 1, { x0: und.x0, x1: und.x1, y0: und.y1 - 2.5, y1: und.y1 + 1 }) > (und.x1 - und.x0) * S * 0.6 && dark(n, 1, { x0: lt.x0, x1: lt.x1, y0: (lt.y0 + lt.y1) / 2 - 1, y1: (lt.y0 + lt.y1) / 2 + 1.5 }) > (lt.x1 - lt.x0) * S * 0.6, "rule spans >60% of the word width");
  const T = fullText(n);
  check(g, "transform uppercase / lowercase / capitalize", T.includes("TX-UPPER") && T.includes("tx-lower") && T.includes("Tx-Capitalize Me"), "");
  const ac = wd(n, "TX-ALIGN-center"), ar = wd(n, "TX-ALIGN-right");
  check(g, "align center / right", near((ac.x0 + ac.x1) / 2, CENTER, 2) && near(ar.x1, RIGHT, 1.5), `center ${f1((ac.x0 + ac.x1) / 2)}, right ${f1(ar.x1)}`);
  const j = wd(n, "TX-JUSTIFY"), line1 = W(n).filter((w) => near(w.y0, j.y0, 1)), jr = Math.max(...line1.map((w) => w.x1));
  check(g, "align justify: first line runs to the right edge", near(jr, RIGHT, 2), `line 1 right edge ${f1(jr)} vs ${f1(RIGHT)}`);
  const cp = inBox(n, 1, C.primary, row(wd(n, "TX-COLOR-PRIMARY"), 2), 6), cs = inBox(n, 1, C.success, row(wd(n, "TX-COLOR-SUCCESS"), 2), 10), cm = inBox(n, 1, C.magenta, row(wd(n, "TX-COLOR-RAW"), 2), 10);
  check(g, "color: primary / success tokens and raw #ff00ff", cp.n > 80 && cs.n > 80 && cm.n > 80, `${cp.n} / ${cs.n} / ${cm.n}px`);
  const dm = wd(n, "TX-MARGIN-B").y0 - wd(n, "TX-MARGIN-A").y0, dn = wd(n, "TX-NOMARGIN-B").y0 - wd(n, "TX-NOMARGIN-A").y0;
  check(g, "default paragraph margin 14pt; noMargin removes it", near(dm - dn, 14, 1.5), `spacing ${f1(dm)} vs ${f1(dn)} (diff ${f1(dm - dn)})`);
  check(g, "CJK text renders", T.includes("繁體中文測試"), "");
  const ps = wd(n, "TX-PASS"), pm = inBox(n, ps.p, C.magenta, row(ps, 2), 10);
  check(g, "class passthrough: text-xl + color both apply", pm.n > 100 && near((ps.y1 - ps.y0) / ht.base, 22 / 15, 0.2), `magenta ${pm.n}px, height ${f1(ps.y1 - ps.y0)}pt`);
});

// ================= Link =================
await section("Link", async () => {
  const g = "Link", n = "link", raw = readFileSync(`${OUT}/${n}.pdf`).toString("latin1");
  const hrefs = ["default", "muted", "primary", "nounderline", "center", "right", "color", "pass", "inline"].map((k) => `https://example.com/${k}`);
  const miss = hrefs.filter((h) => !raw.includes(h));
  check(g, "every href becomes a /URI link annotation", raw.includes("/URI") && miss.length === 0, miss.length ? `missing ${miss.join(", ")}` : `${hrefs.length}/${hrefs.length} URIs in the PDF`);
  const col = (t, c, tol = 12) => inBox(n, 1, c, row(wd(n, t), 2), tol).n;
  check(g, "variants: default accent #71717a, muted #71717a (the default theme's accessible muted-foreground; it equals accent since the contrast change, the minimal theme still tells them apart in e2e-phase4a), primary #18181b", col("LK-DEFAULT", C.accent) > 100 && col("LK-MUTED", C.mutedFg) > 100 && col("LK-PRIMARY", C.primary, 6) > 100, `${col("LK-DEFAULT", C.accent)} / ${col("LK-MUTED", C.mutedFg)} / ${col("LK-PRIMARY", C.primary, 6)}px`);
  const w1 = wd(n, "LK-DEFAULT"), w2 = wd(n, "LK-NOUNDERLINE"), under = (w) => inBox(n, 1, C.accent, { x0: w.x0 + 1, x1: w.x1 + 40, y0: w.y1 - 1.5, y1: w.y1 + 1.5 }, 30).n;
  check(g, "underline always draws a rule; underline=none does not", under(w1) > under(w2) * 2 && under(w1) > 100, `default ${under(w1)}px vs none ${under(w2)}px under the same-size band`);
  const c = wd(n, "LK-CENTER"), r = wd(n, "LK-RIGHT"), lastX = (w) => W(n).filter((x) => near(x.y0, w.y0, 1)).pop().x1;
  check(g, "align center / right (link as a block inside a flex column)", near((c.x0 + lastX(c)) / 2, CENTER, 2) && near(lastX(r), RIGHT, 1.5), `center ${f1((c.x0 + lastX(c)) / 2)}, right ${f1(lastX(r))}`);
  check(g, "color=#ff00ff and class text-[#00aaff]", col("LK-COLOR", C.magenta, 10) > 100 && col("LK-PASS", "#00aaff", 12) > 100, `${col("LK-COLOR", C.magenta, 10)} / ${col("LK-PASS", "#00aaff", 12)}px`);
  const il = wd(n, "inline"), inl = inBox(n, 1, C.accent, { x0: il.x0, x1: il.x1, y0: il.y0, y1: il.y1 }, 5).n, tx = inBox(n, 1, C.accent, { x0: wd(n, "LK-INLINE").x0, x1: wd(n, "LK-INLINE").x1, y0: wd(n, "LK-INLINE").y0, y1: wd(n, "LK-INLINE").y1 }, 5).n;
  check(g, "inline inside a Text: link-colored, surrounding text is not", inl > 60 && tx < inl / 5, `link ${inl}px accent, text ${tx}px`);
});

// ================= List =================
await section("List", async () => {
  const g = "List", n = "list", pages = pageCount(`${OUT}/${n}.pdf`);
  const where = (t) => { for (let p = 1; p <= pages; p++) { const w = W(n, p).find((x) => x.t === t); if (w) return { ...w, p }; } throw new Error(`no ${t}`); };
  const variants = [["bullet", "LS-BULLET"], ["numbered", "LS-NUM"], ["checklist", "LS-CHECK"], ["icon", "LS-ICON"], ["multi-level", "LS-MULTI"], ["descriptive", "LS-DESC"]];
  hasAll(g, n, variants.flatMap(([, p]) => [`${p}-1`, `${p}-2`, `${p}-3`]));
  const px_ = (name, p, c, b, tol) => inBox(name, p, c, b, tol);
  const b1 = where("LS-BULLET-1"), b1a = where("LS-BULLET-1a"), b1ai = where("LS-BULLET-1a-i");
  check(g, "bullet + nested levels: each level indents 20pt; solid then ring markers", near(b1a.x0 - b1.x0, 20, 2) && near(b1ai.x0 - b1a.x0, 20, 2) && b1ai.y0 > b1a.y0, `indent ${f1(b1a.x0 - b1.x0)} / ${f1(b1ai.x0 - b1a.x0)}pt`);
  const dot = px_(n, 1, C.primary, { x0: LEFT, x1: LEFT + 14, y0: b1.y0 - 2, y1: b1.y1 + 2 }, 8), ring = px_(n, 1, C.accent, { x0: b1a.x0 - 20, x1: b1a.x0 - 3, y0: b1a.y0 - 2, y1: b1a.y1 + 2 }, 60);
  check(g, "bullet markers drawn (5pt primary dot, 4pt muted ring)", dot.n > 20 && ring.n > 6, `dot ${dot.n}px, ring ${ring.n}px`);
  const wrap = where("LS-BULLET-3"), wr2 = W(n, wrap.p).filter((w) => w.t === "indent" && w.y0 > wrap.y0 && w.y0 < wrap.y0 + 40)[0];
  check(g, "wrapped line hangs under the text (not under the marker)", wr2 && near(wr2.x0, wrap.x0, 2), `line 2 x0 ${f1(wr2?.x0 ?? -1)} vs line 1 text x0 ${f1(wrap.x0)}`);
  const nm = ["1", "2", "3"].map((d) => W(n, 1).filter((w) => w.t === d)).flat().length;
  const badge = px_(n, 1, C.primary, { x0: LEFT, x1: LEFT + 22, y0: where("LS-NUM-1").y0 - 6, y1: where("LS-NUM-3").y1 + 8 }, 8);
  check(g, "numbered: three 20pt round badges with digits 1,2,3", nm >= 3 && badge.n > 3 * 600, `${nm} digit words, ${badge.n} primary px in badge column`);
  const ck = (t) => px_(n, 1, C.success, { x0: LEFT, x1: LEFT + 20, y0: where(t).y0 - 6, y1: where(t).y1 + 6 }, 12).n;
  check(g, "checklist: checked items fill success green (items 1,3), unchecked stays empty (item 2)", ck("LS-CHECK-1") > 150 && ck("LS-CHECK-3") > 150 && ck("LS-CHECK-2") === 0, `green px ${ck("LS-CHECK-1")} / ${ck("LS-CHECK-2")} / ${ck("LS-CHECK-3")}`);
  const ib = (t) => px_(n, 1, C.primary, { x0: LEFT, x1: LEFT + 22, y0: where(t).y0 - 6, y1: where(t).y1 + 6 }, 8).n, iw = px_(n, 1, "#ffffff", { x0: LEFT + 3, x1: LEFT + 17, y0: where("LS-ICON-1").y0 - 4, y1: where("LS-ICON-1").y1 + 4 }, 4).n;
  check(g, "icon: primary rounded square with a white star (svg)", ib("LS-ICON-1") > 400 && iw > 60, `box ${ib("LS-ICON-1")}px, white inside ${iw}px`);
  const m0 = where("LS-MULTI-1"), m1 = where("LS-MULTI-1a");
  check(g, "multi-level: top level semibold dark, nested level smaller + muted", dark(n, 1, m0) / ((m0.x1 - m0.x0) * (m0.y1 - m0.y0)) > 0 && px_(n, 1, C.mutedFg, row(m1, 1), 30).n > 80 && (m1.y1 - m1.y0) < (m0.y1 - m0.y0), `nested height ${f1(m1.y1 - m1.y0)} < ${f1(m0.y1 - m0.y0)}`);
  const d1 = where("LS-DESC-1"), dd = where("LS-DESC-1-desc"), d3 = where("LS-DESC-3"), d3d = where("LS-DESC-3-desc");
  const bar = (a, bb) => px_(n, a.p, C.primary, { x0: LEFT, x1: LEFT + 6, y0: a.y0 - 4, y1: bb.y1 + 4 }, 8);
  check(g, "descriptive: accent bar spans title+description (taller for the 2-line item); description smaller + muted", dd.y0 > d1.y0 && (dd.y1 - dd.y0) < (d1.y1 - d1.y0) && (bar(d3, d3d).y1 - bar(d3, d3d).y0) > (bar(d1, dd).y1 - bar(d1, dd).y0) + 10, `bar height item1 ${f1((bar(d1, dd).y1 - bar(d1, dd).y0) / S)}pt, item3 ${f1((bar(d3, d3d).y1 - bar(d3, d3d).y0) / S)}pt`);
  const gp = (k) => where(`LS-GAP-${k}-B`).y0 - where(`LS-GAP-${k}-A`).y0, gx = gp("xs");
  check(g, "gap xs/sm/md = 4/8/12pt between items", near(gp("sm") - gx, 4, 1.5) && near(gp("md") - gx, 8, 1.5), `item pitch ${f1(gx)} / ${f1(gp("sm"))} / ${f1(gp("md"))}pt`);
  const gwrap = where("LS-NUM-3"), nline = where("LS-NUM-3").y0, nb = px_(n, gwrap.p, C.primary, { x0: LEFT, x1: LEFT + 22, y0: nline - 8, y1: nline + 6 }, 8);
  check(g, "wrapped numbered item: badge aligns with the FIRST line (not centered on both lines)", nb.n > 200 && nb.y0 / S < nline + 4, `badge top ${f1(nb.y0 / S)}pt, first-line text top ${f1(nline)}pt`);
  const lp = where("LS-PASS");
  check(g, "class passthrough", px(n, lp.p, C.magenta, { tol: 10 }).n > 150, `${px(n, lp.p, C.magenta, { tol: 10 }).n}px`);
  const ln = "list-nowrap", per = (pre) => Array.from({ length: pageCount(`${OUT}/${ln}.pdf`) }, (_, i) => i + 1).map((p) => W(ln, p).filter((w) => w.t.startsWith(pre)).length);
  const a = per("LSN-NOWRAP-"), b = per("LSN-LOOSE-");
  check(g, "noWrap: list stays whole (jumps to the next page); control list without it splits", a.filter(Boolean).length === 1 && Math.max(...a) === 10 && a[0] === 0 && b.filter(Boolean).length >= 2, `noWrap items per page ${a.join(",")}; loose ${b.join(",")}`);
});

// ================= tailwind-merge theme awareness =================
await section("Class merge", async () => {
  const { cn } = await (async () => { const v = await createServer({ configFile: "vite.config.js", root: process.cwd(), server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true } }); const m = await v.ssrLoadModule("/src/lib/ui.js"); await v.close(); return m; })();
  check("Class merge", "custom theme tokens survive merging: text-h1 + text-primary, mb-paragraph + mt-section, leading-body", cn("text-h1 text-primary mb-paragraph mt-section").split(" ").length === 4 && cn("p-4 p-2") === "p-2" && cn("text-xs text-sm") === "text-sm" && cn("my-section my-2") === "my-2", cn("text-h1 text-primary mb-paragraph mt-section") + " | " + cn("p-4 p-2") + " | " + cn("my-section my-2"));
});

// ================= Browser: playground page lists every demo; same text as Node =================
let server, browser;
try {
  const vite = await createServer({ configFile: "vite.config.js", root: `${process.cwd()}/playground`, server: { port: 0, host: "127.0.0.1" }, logLevel: "error" });
  server = vite; await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}/`;
  browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => ["error", "warning"].includes(m.type()) && !/Failed to load resource/.test(m.text()) && errors.push(`${m.type()}: ${m.text()}`));
  await page.goto(url);
  await page.waitForFunction(() => window.__pdfwind?.renders.length >= 1, null, { timeout: 60000 });
  const listed = await page.locator("nav button").allTextContents();
  const titles = Object.values(demos).map((d) => d.title);
  const missing = titles.filter((t) => !listed.includes(t));
  check("Playground", "page lists every component demo in its sidebar", missing.length === 0, `${listed.length} entries (${titles.length} demos)${missing.length ? "; missing " + missing.join(", ") : ""}`);
  let same = 0; const diffs = [], times = [];
  const norm = (s) => s.replace(/\s+/g, " ").trim();
  for (const [name] of Object.entries(demos)) {
    const k = await page.evaluate(() => window.__pdfwind.renders.length);
    await page.evaluate((d) => window.__pdfwind.set({ demo: d }), name);
    await page.waitForFunction((k) => window.__pdfwind.renders.length > k, k, { timeout: 30000 });
    const bytes = await page.evaluate(() => window.__pdfwind.pdfBytes());
    times.push(await page.evaluate(() => window.__pdfwind.renders.at(-1).ms));
    writeFileSync(`${OUT}/browser-${name}.pdf`, Buffer.from(bytes));
    const a = norm(fullText(name)), b = norm(allText(`${OUT}/browser-${name}.pdf`).join("\n"));
    const pa = pageCount(`${OUT}/${name}.pdf`), pb = pageCount(`${OUT}/browser-${name}.pdf`);
    if (a === b && pa === pb) same++; else diffs.push(`${name} (pages ${pa}/${pb})`);
  }
  check("Playground", "browser (Chromium) renders every demo; text + page count identical to Node", same === Object.keys(demos).length, same === Object.keys(demos).length ? `${same}/${same} demos identical; render ms median ${[...times].sort((x, y) => x - y)[Math.floor(times.length / 2)]}, max ${Math.max(...times)}` : `differs: ${diffs.join(", ")}`);
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
writeFileSync(`${OUT}/report.md`, `# Phase 2a E2E\n\n${md}\n\n${total}\n\n${summary}\n`);
console.log(md + `\n\n${total}\n${summary}`);
process.exit(rows.every((r) => r.pass) ? 0 : 1);
