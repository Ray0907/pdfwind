import { load, raster, colorStats } from "../scripts/lib/pdf.mjs";
import { writeFileSync } from "node:fs";
const { renderPdf, close } = await load();
for (const sel of ["body", ":root", "html", "*"]) {
  const pdf = await renderPdf("<div><h1>Hello</h1><p>world text</p></div>", {}, { css: `${sel}{color:#ff0000}`, margin: 40 });
  writeFileSync(`.scratch/pr.pdf`, pdf);
  console.log(sel, colorStats(raster(".scratch/pr.pdf", 1, { dpi: 72 }), [255, 0, 0], { tol: 30 }).n);
}
// body font-size effect?
for (const css of ["body{font-size:30pt}", ":root{font-size:30pt}"]) { writeFileSync(".scratch/pr.pdf", await renderPdf("<div><p>world text</p></div>", {}, { css, margin: 40 })); console.log(css, colorStats(raster(".scratch/pr.pdf", 1, { dpi: 72 }), [0, 0, 0], { tol: 60 }).n); }
await close();
