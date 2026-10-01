// This example installs pdfwind via its local file dependency (a packed package also works).
// Copy the installed internals/assets only for Nitro's custom server resource loader:
//   pdfwind/src, pdfwind/fonts          the library (Vue SFCs + render core); node.js is not used, the Nitro loader replaces it
//   server/pdfwind-assets/...           what the server route reads at run time through Nitro's server assets (bundled into .output):
//                                       takumi wasm, tailwind css, theme css, fonts
import { cpSync, mkdirSync, rmSync, readdirSync, existsSync, copyFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url)), ex = join(here, "..");
const require = createRequire(join(ex, "package.json"));
const root = dirname(require.resolve("pdfwind/package.json"));
if (!existsSync(join(root, "src", "render", "core.js"))) { console.error("sync: pdfwind is missing; run pnpm install first"); process.exit(1); }

rmSync(join(ex, "pdfwind"), { recursive: true, force: true });
cpSync(join(root, "src"), join(ex, "pdfwind", "src"), { recursive: true });
mkdirSync(join(ex, "pdfwind", "fonts"), { recursive: true });
for (const f of readdirSync(join(root, "fonts"))) if (f.endsWith(".woff2") || f.startsWith("OFL-")) copyFileSync(join(root, "fonts", f), join(ex, "pdfwind", "fonts", f));

const assets = join(ex, "server", "pdfwind-assets");
rmSync(assets, { recursive: true, force: true });
for (const d of ["fonts", "themes", "tailwind", "wasm"]) mkdirSync(join(assets, d), { recursive: true });
for (const f of readdirSync(join(ex, "pdfwind", "fonts"))) if (f.endsWith(".woff2")) copyFileSync(join(ex, "pdfwind", "fonts", f), join(assets, "fonts", f));
for (const f of readdirSync(join(root, "src", "themes"))) if (f.endsWith(".css")) copyFileSync(join(root, "src", "themes", f), join(assets, "themes", f));
for (const f of ["theme", "utilities", "preflight"]) copyFileSync(require.resolve(`tailwindcss/${f}.css`), join(assets, "tailwind", `${f}.css`));
copyFileSync(require.resolve("takumi-pdf/takumi_pdf_wasm_bg.wasm"), join(assets, "wasm", "takumi_pdf_wasm_bg.wasm"));
console.log("pdfwind synced into examples/nuxt (pdfwind/, server/pdfwind-assets/)");
