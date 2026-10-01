import vue from "@vitejs/plugin-vue";

// pdfwind in Nuxt/Nitro. Three things differ from running it in plain Node (see README.md):
//  1. the library is Vue SFCs: Nitro's rollup needs @vitejs/plugin-vue to compile them for the server route;
//  2. Nitro bundles the server into one file, so `new URL("../fonts/x", import.meta.url)` and require.resolve of the wasm do not work:
//     server/utils/pdf.ts loads wasm, Tailwind css, theme css and fonts through Nitro server assets instead;
//  3. takumi-pdf (wasm glue) and tailwindcss stay external node_modules, traced into .output by Nitro.
export default defineNuxtConfig({
  compatibilityDate: "2025-07-01",
  devtools: { enabled: false },
  telemetry: false,
  nitro: {
    serverAssets: [{ baseName: "pdfwind", dir: "./pdfwind-assets" }],
    rollupConfig: { plugins: [vue()] },
    // the copied library must be bundled (not treated as an external package): `nuxt dev` otherwise imports it by a path it cannot resolve
    externals: { inline: [/[\\/]pdfwind[\\/](src|fonts)[\\/]/] },
  },
  vite: {
    // the browser entry imports takumi-pdf/wasm-url and fonts as Vite assets
    optimizeDeps: { exclude: ["takumi-pdf"] },
    server: { fs: { allow: [".."] } },
  },
});
