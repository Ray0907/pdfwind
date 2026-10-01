// Early actionable errors for external E2E prerequisites; ImageMagick 6 and 7 are both supported.
import { execFileSync as exec } from "node:child_process";
import { existsSync } from "node:fs";
import { chromium } from "playwright-core";
const has = (name) => { try { exec("sh", ["-c", 'command -v "$1"', "sh", name], { stdio: "ignore" }); return true; } catch { return false; } };
export function requireTools() {
  const missing = ["pdfinfo", "pdftotext", "pdffonts", "pdftoppm"].filter((n) => !has(n));
  if (missing.length) throw new Error(`Missing ${missing.join(", ")}. Install poppler: brew install poppler / apt-get install poppler-utils.`);
  if (!has("magick") && !(has("convert") && has("montage"))) throw new Error("Missing ImageMagick. Install: brew install imagemagick / apt-get install imagemagick.");
  if (!existsSync(chromium.executablePath())) throw new Error("Missing Playwright Chromium. Run: npx playwright-core install chromium (Linux CI: add --with-deps).");
}
export function execFileSync(cmd, args, options) {
  if (cmd === "magick" && !has("magick")) {
    if (args[0] === "montage") return exec("montage", args.slice(1), options);
    return exec("convert", args, options);
  }
  return exec(cmd, args, options);
}
