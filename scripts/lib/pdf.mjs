// Shared helpers for the E2E scripts: load SFCs in Node through Vite SSR, and inspect PDFs with poppler.
import { execFileSync } from "./tools.mjs";
import { createServer } from "vite";

const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 28, ...opts });

/** Vite SSR loads .vue files in Node; same renderPdf as the browser uses, so output is comparable. */
export const load = async () => {
  const vite = await createServer({ configFile: "vite.config.js", root: process.cwd(), server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true } });
  const { renderPdf } = await vite.ssrLoadModule("/src/render/node.js");
  const mod = await vite.ssrLoadModule("/playground/demos.js");
  return { renderPdf, demos: mod.demos, QR: mod.QR, components: () => vite.ssrLoadModule("/src/index.js"), blocks: () => vite.ssrLoadModule("/src/blocks/index.js"), assets: () => vite.ssrLoadModule("/playground/assets.js"), close: () => vite.close() };
};

export const pageCount = (file) => +sh("pdfinfo", [file]).match(/Pages:\s+(\d+)/)[1];
export const pageText = (file, n) => sh("pdftotext", ["-f", n, "-l", n, "-layout", file, "-"]);
export const allText = (file) => Array.from({ length: pageCount(file) }, (_, i) => pageText(file, i + 1));
export const fonts = (file) => sh("pdffonts", [file]);

/** words with boxes in pt (72dpi), page n: [{ t, x0, y0, x1, y1 }] */
export const words = (file, n) => [...sh("pdftotext", ["-bbox", "-f", n, "-l", n, file, "-"]).matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g)]
  .map((m) => ({ x0: +m[1], y0: +m[2], x1: +m[3], y1: +m[4], t: m[5].replace(/&amp;/g, "&") }));
// exact text match first (so "PF-STICKY" is not shadowed by "PF-STICKY-HOST"), else first word containing it
export const find = (ws, text) => ws.find((w) => w.t === text) ?? ws.find((w) => w.t.includes(text));

/** Rasterize page n at `dpi`; returns { w, h, px } with px = RGB bytes, and optionally writes a PNG. */
export const raster = (file, n, { dpi = 72, png } = {}) => {
  const ppm = sh("pdftoppm", ["-r", dpi, "-f", n, "-l", n, "-singlefile", file], { encoding: "buffer" });
  const [head, w, h] = ppm.subarray(0, 24).toString("latin1").match(/^P6\s+(\d+)\s+(\d+)\s+255\s/);
  if (png) sh("pdftoppm", ["-r", dpi, "-f", n, "-l", n, "-singlefile", "-png", file, png]);
  return { w: +w, h: +h, px: ppm.subarray(head.length) };
};
/** pixels within `tol` of rgb, optionally inside box {x0,y0,x1,y1}; returns count and bounding box */
export const colorStats = ({ w, h, px }, [r, g, b], { tol = 14, box } = {}) => {
  let n = 0, x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = box?.y0 ?? 0; y < Math.min(box?.y1 ?? h, h); y++) for (let x = box?.x0 ?? 0; x < Math.min(box?.x1 ?? w, w); x++) {
    const i = (y * w + x) * 3;
    if (Math.abs(px[i] - r) <= tol && Math.abs(px[i + 1] - g) <= tol && Math.abs(px[i + 2] - b) <= tol) { n++; x < x0 && (x0 = x); x > x1 && (x1 = x); y < y0 && (y0 = y); y > y1 && (y1 = y); }
  }
  return { n, x0, y0, x1, y1 };
};
export const pixel = ({ w, px }, x, y) => { const i = (Math.round(y) * w + Math.round(x)) * 3; return [px[i], px[i + 1], px[i + 2]]; };
export const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
