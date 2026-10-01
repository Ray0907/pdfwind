import { raster, pageCount } from "../scripts/lib/pdf.mjs";
import { readdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
const md5 = (b) => createHash("md5").update(b).digest("hex");
const themes = readdirSync("out/phase4a/pdf").filter((n) => !n.includes("."));
let same = 0, diff = {};
for (const t of themes) for (const f of readdirSync(`out/phase4a/pdf/${t}`)) {
  const a = `/tmp/before4a/${t}/${f}`, b = `out/phase4a/pdf/${t}/${f}`;
  if (!existsSync(a)) continue;
  const n = pageCount(a); let d = pageCount(b) !== n;
  for (let p = 1; p <= Math.min(n, pageCount(b)) && !d; p++) d = md5(raster(a, p, { dpi: 72 }).px) !== md5(raster(b, p, { dpi: 72 }).px);
  if (d) (diff[t] ??= []).push(f.replace(".pdf", "")); else same++;
}
console.log("identical:", same); for (const [t, l] of Object.entries(diff)) console.log("CHANGED", t, l.join(", "));
