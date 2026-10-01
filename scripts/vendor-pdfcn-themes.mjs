// One-time values-only fixture generator. Usage: node scripts/vendor-pdfcn-themes.mjs <pdfcn checkout>
// Reads upstream files; never modifies them. See THIRD_PARTY_NOTICES.md (pdfcn, MIT).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
const root = process.argv[2];
if (!root) throw new Error("Pass a trusted pdfcn checkout directory (read-only input).");
const names = ["blueprint", "corporate", "elegant", "executive", "forest", "minimal", "modern", "professional", "vivid"];
const values = Object.fromEntries(names.map((name) => {
  const source = readFileSync(join(root, "apps/web/registry/themes", `${name}.ts`), "utf8")
    .replace(/import[^;]*;/g, "").replace(/export const \w+: PdfcnTheme =/, "globalThis.theme =").replace(/primitives: defaultPrimitives,/, "");
  const context = {}; runInNewContext(source, context, { timeout: 1000 });
  const { colors, spacing, typography } = context.theme;
  return [name, { colors, spacing, typography }];
}));
mkdirSync("scripts/fixtures", { recursive: true });
writeFileSync("scripts/fixtures/pdfcn-themes.json", JSON.stringify(values, null, 2) + "\n");
console.log(`Vendored values for ${names.length} pdfcn themes`);
