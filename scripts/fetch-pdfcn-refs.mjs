// Public demo references, never required for local correctness checks.
import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
export const REF = ".cache/pdfcn-ref";
export const blocks = ["invoice-classic", "invoice-consultant", "invoice-corporate", "invoice-creative", "invoice-minimal", "invoice-modern", "report-financial", "report-marketing", "report-operations", "report-security", "event-agenda", "event-ticket", "gift-certificate", "lesson-plan", "medical-intake-form", "meeting-minutes", "packing-slip", "press-release", "shipping-label", "work-order"];
export async function fetchRefs(names = blocks) {
  if (process.env.PDFWIND_OFFLINE === "1") return { reason: "PDFWIND_OFFLINE=1: network reference comparisons disabled" };
  mkdirSync(REF, { recursive: true });
  const available = new Set(), failures = [];
  // Bound the entire attempt as well as each HTTP request, so unavailable hosts do not stall an E2E run.
  const deadline = Date.now() + 60_000;
  for (const name of names) {
    const file = `${REF}/${name}.pdf`;
    try {
      if (!existsSync(file) || readFileSync(file).subarray(0, 5).toString() !== "%PDF-") {
        if (Date.now() >= deadline) throw new Error("60s download budget exhausted");
        const res = await fetch(`https://www.pdfcn.dev/api/pdf/takumi?name=${encodeURIComponent(name)}`, { signal: AbortSignal.timeout(Math.min(15_000, deadline - Date.now())) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const bytes = Buffer.from(await res.arrayBuffer());
        if (bytes.subarray(0, 5).toString() !== "%PDF-") throw new Error("response was not a PDF");
        writeFileSync(`${file}.part`, bytes); renameSync(`${file}.part`, file);
      }
      if (!existsSync(`${REF}/${name}-1.png`)) execFileSync("pdftoppm", ["-r", "60", "-png", file, `${REF}/${name}`], { stdio: "pipe" });
      // Poppler pads page numbers when there are >=10 pages; the demo PDFs currently have fewer.
      available.add(name);
    } catch (e) {
      rmSync(`${file}.part`, { force: true });
      failures.push(`${name}: ${e.message}`);
    }
  }
  const reason = failures.length ? `pdfcn reference unavailable: ${failures.join("; ")}. Non-comparison checks still run.` : "";
  if (reason) console.warn(reason);
  return { available, reason };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await fetchRefs();
  console.log(`${result.available?.size ?? 0}/${blocks.length} references available${result.reason ? `; SKIP: ${result.reason}` : ""}`);
  process.exitCode = result.available?.size === blocks.length ? 0 : 1;
}
