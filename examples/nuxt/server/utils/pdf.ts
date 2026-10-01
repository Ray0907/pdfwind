// renderPdf for Nitro: pdfwind's own render core with a loader that reads its resources from Nitro server assets
// (server/pdfwind-assets, copied there by scripts/sync.mjs and bundled into .output by `nuxt build`).
import { createRenderPdf } from "../../pdfwind/src/render/core.js";
import { themeResources, familyResources } from "../../pdfwind/src/render/themes.js";
import { CJK_RANGES } from "../../pdfwind/src/render/cjk.js";

const assets = () => useStorage("assets:pdfwind");
// unstorage returns a Buffer, an ArrayBuffer or (for text files) a string, depending on driver and mode: normalize
const raw = async (key: string) => {
  const v: unknown = await assets().getItemRaw(key);
  if (v == null) throw new Error(`pdfwind asset "${key}" is missing: run \`pnpm sync\` (it runs on install, dev and build)`);
  return typeof v === "string" ? new TextEncoder().encode(v) : v instanceof Uint8Array ? v : new Uint8Array(v as ArrayBuffer);
};
const bytes = (key: string) => () => raw(key);
const text = async (key: string) => new TextDecoder().decode(await raw(key));

export const renderPdf = createRenderPdf(async () => ({
  wasm: await bytes("wasm:takumi_pdf_wasm_bg.wasm")(),
  themeCss: await text("themes:default.css"),
  themes: themeResources((name: string) => text(`themes:${name}.css`)),
  families: familyResources((file: string) => bytes(`fonts:${file}`)),
  tailwind: { theme: await text("tailwind:theme.css"), utilities: await text("tailwind:utilities.css"), preflight: await text("tailwind:preflight.css") },
  fonts: [{ name: "Noto Sans TC", ranges: CJK_RANGES, data: bytes("fonts:NotoSansTC.woff2") }],
}));
