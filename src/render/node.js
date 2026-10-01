import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createRenderPdf } from "./core.js";
import { CJK_RANGES, ITALIC_WHEN } from "./cjk.js";
import { themeResources } from "./themes.js";

const require = createRequire(import.meta.url);
const read = (spec) => readFile(require.resolve(spec));
const font = (file) => () => readFile(new URL(`../../fonts/${file}`, import.meta.url));

export const loadResources = async () => {
  const [wasm, theme, utilities, preflight, themeCss] = await Promise.all([read("takumi-pdf/takumi_pdf_wasm_bg.wasm"), read("tailwindcss/theme.css"), read("tailwindcss/utilities.css"), read("tailwindcss/preflight.css"), readFile(new URL("../themes/default.css", import.meta.url))]);
  return {
    wasm,
    themes: themeResources((n) => readFile(new URL(`../themes/${n}.css`, import.meta.url), "utf8"), font),
    themeCss: String(themeCss),
    tailwind: { theme: String(theme), utilities: String(utilities), preflight: String(preflight) },
    fonts: [{ name: "Inter", data: font("Inter.woff2") }, { name: "Noto Sans TC", ranges: CJK_RANGES, data: font("NotoSansTC.woff2") }, { name: "Inter", style: "italic", when: ITALIC_WHEN, data: font("Inter-Italic.woff2") }],
  };
};

export const renderPdf = createRenderPdf(loadResources);
