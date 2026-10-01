// Sequential report-driven E2E runner. --all adds registry installs and public reference comparisons, never a window.
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { requireTools } from "./lib/tools.mjs";
requireTools();
const all = process.argv.includes("--all");
const phases = ["phase1", "phase2a", "phase2b", "phase3a", "phase3b1", "phase3b2", "phase4a", "phase4b", "phase5", "phase5b", "static", ...(all ? ["consumer"] : [])];
mkdirSync("out/runner", { recursive: true });
const rows = []; let pass = 0, fail = 0, skip = 0;
for (const phase of phases) {
  const report = phase === "phase1" ? "out/report.md" : `out/${phase}/report.md`;
  rmSync(report, { force: true });
  console.log(`Running ${phase} (${all ? "network allowed" : "offline/headless"})…`);
  const r = spawnSync(process.execPath, [`scripts/e2e-${phase}.mjs`], { env: { ...process.env, PDFWIND_OFFLINE: all ? "0" : "1", PDFWIND_HEADED: "0" }, encoding: "utf8", maxBuffer: 1 << 27 });
  writeFileSync(`out/runner/${phase}.log`, (r.stdout || "") + (r.stderr || ""));
  const md = existsSync(report) ? readFileSync(report, "utf8") : "";
  const counts = Object.fromEntries(["PASS", "FAIL", "SKIP"].map((key) => [key, (md.match(new RegExp(`\\| ${key} \\|`, "g")) || []).length]));
  const failed = r.status !== 0 || !md || counts.FAIL > 0;
  if (failed && !counts.FAIL) counts.FAIL++;
  pass += counts.PASS; fail += counts.FAIL; skip += counts.SKIP;
  const line = `${phase}: ${counts.PASS} PASS, ${counts.FAIL} FAIL, ${counts.SKIP} SKIP; exit ${r.status}`;
  console.log(line); if (failed) console.error((r.stderr || r.stdout || String(r.error)).slice(-2000));
  rows.push(`| ${phase} | ${failed ? "FAIL" : "PASS"} | ${counts.PASS} | ${counts.FAIL} | ${counts.SKIP} |`);
}
const total = `TOTAL: ${pass} PASS, ${fail} FAIL, ${skip} SKIP (${phases.length} scripts)`;
writeFileSync("out/runner/report.md", `# E2E runner\n\n${all ? "Network-enabled" : "Offline/headless"}; logs in out/runner/*.log.\n\n| script | result | PASS | FAIL | SKIP |\n|---|---|---|---|---|\n${rows.join("\n")}\n\n${total}\n`);
console.log(total); process.exitCode = fail ? 1 : 0;
