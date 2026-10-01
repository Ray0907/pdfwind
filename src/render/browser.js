// Vite-only (?raw / ?url imports).
import theme from "tailwindcss/theme.css?raw";
import utilities from "tailwindcss/utilities.css?raw";
import preflight from "tailwindcss/preflight.css?raw";
import themeCss from "../themes/default.css?raw";
import wasm from "takumi-pdf/wasm-url";
import interUrl from "../../fonts/Inter.woff2?url";
import notoUrl from "../../fonts/NotoSansTC.woff2?url";
import italicUrl from "../../fonts/Inter-Italic.woff2?url";
import { createRenderPdf } from "./core.js";
import { CJK_RANGES, ITALIC_WHEN } from "./cjk.js";

const bytes = (url) => async () => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`font fetch failed: ${url} (${res.status})`);
  return new Uint8Array(await res.arrayBuffer());
};

// fonts are lazy: the Noto file is fetched only when a render's text needs it
export const renderPdf = createRenderPdf(async () => ({
  wasm,
  themeCss,
  tailwind: { theme, utilities, preflight },
  fonts: [{ name: "Inter", data: bytes(interUrl) }, { name: "Noto Sans TC", ranges: CJK_RANGES, data: bytes(notoUrl) }, { name: "Inter", style: "italic", when: ITALIC_WHEN, data: bytes(italicUrl) }],
}));
