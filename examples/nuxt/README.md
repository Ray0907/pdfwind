# pdfwind in Nuxt

A minimal Nuxt 4 app that renders a pdfwind invoice two ways:

- **server**: `GET /api/invoice.pdf` renders `InvoiceModern` with `renderPdf` inside Nitro (query: `theme`, `number`, `company`, `client`, `currency`; a bad value is a `400` with a message that says what to send)
- **client**: `/` shows `<PdfPreview>` (client-only, nothing to hydrate) with a theme switcher that re-renders in place, and a link to the server route

```
cd examples/nuxt
pnpm install        # also copies pdfwind into this folder (scripts/sync.mjs) and runs nuxt prepare
pnpm dev            # http://localhost:3000   (try /api/invoice.pdf?theme=vivid)
pnpm build && pnpm preview
```

It lives in the repository, not in the main install: its own `package.json`, its own `node_modules`.

## What Nuxt/Nitro needed (honest list)

pdfwind is not on npm, so the example copies it: `scripts/sync.mjs` copies `../../src` and the WOFF2 fonts into `pdfwind/` (git-ignored) and the runtime assets into `server/pdfwind-assets/`. The copy is what makes `pnpm install` inside this folder enough: the copied sources resolve `vue`, `tailwindcss`, `takumi-pdf` ... from this folder's `node_modules`. With a published package this step disappears.

1. **Vue SFCs on the server.** Nitro's rollup does not know `.vue`; `nuxt.config.ts` adds `@vitejs/plugin-vue` to `nitro.rollupConfig.plugins`.
2. **wasm, fonts and CSS under bundling.** `src/render/node.js` finds them with `require.resolve(...)` and `new URL("../x", import.meta.url)`, which break once Nitro bundles the server into one file. The example does not use `node.js`: `server/utils/pdf.ts` calls pdfwind's `createRenderPdf(loadResources)` (the same core the Node and browser entries use) with a loader that reads the takumi wasm, Tailwind's `theme/utilities/preflight.css`, the theme CSS and the fonts from **Nitro server assets** (`nitro.serverAssets`, bundled into `.output` by `nuxt build`). Nothing in `src/` changed for this.
3. **Externals.** `takumi-pdf` (wasm glue) and `tailwindcss` stay normal node_modules that Nitro traces into `.output/server/node_modules`. The copied library itself must be bundled: `nitro.externals.inline` lists `pdfwind/src`, because `nuxt dev` otherwise emits an import of it by a path that does not resolve.
4. **Browser.** The client uses pdfwind's `browser.js` unchanged (Vite `?url` / `?raw` imports; `vite.optimizeDeps.exclude: ["takumi-pdf"]`). The component is `InvoicePreview.client.vue`, so it is skipped on the server.
5. **Size.** The server bundle embeds the assets (about 7 MB with Noto Sans TC, which is only used for CJK text).
