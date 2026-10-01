import { load } from "../scripts/lib/pdf.mjs";
import { writeFileSync } from "node:fs";
const { renderPdf, demos, close } = await load();
for (const t of ["default", "dark", "vivid"]) { const d = demos.showcase; writeFileSync(`.scratch/sc-${t}.pdf`, await renderPdf(d.component, {}, { ...d.options, theme: t })); }
await close();
