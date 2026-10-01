import { load } from "../scripts/lib/pdf.mjs";
import { writeFileSync } from "node:fs";
const { renderPdf, demos, close } = await load();
for (const k of ["components-all", "invoice-modern", "report-financial", "event-agenda", "event-ticket", "medical-intake-form"]) { const d = demos[k]; writeFileSync(`.scratch/dk-${k}.pdf`, await renderPdf(d.component, {}, { ...(k === "components-all" ? { margin: 40 } : {}), ...(d.options ?? {}), theme: "dark" })); }
await close();
