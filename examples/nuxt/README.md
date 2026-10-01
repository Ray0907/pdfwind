# pdfwind in Nuxt

A minimal Nuxt 4 app that renders a pdfwind invoice two ways:

- **server**: `GET /api/invoice.pdf` renders `InvoiceModern` with `renderPdf` inside Nitro (query: `theme`, `number`, `company`, `client`, `currency`; a bad value is a `400` with a message that says what to send)
- **client**: `/` shows `<PdfPreview>` (client-only, nothing to hydrate) with a theme switcher that re-renders in place, and a link to the server route

```
cd examples/nuxt
pnpm install        # local pdfwind package dependency, sync Nitro internals/assets, nuxt prepare
pnpm dev            # http://localhost:3000   (try /api/invoice.pdf?theme=vivid)
pnpm build && pnpm preview
```

It lives in the repository, not in the main install: its own `package.json`, its own `node_modules`.

## What Nuxt/Nitro needed (honest list)

pdfwind is not published to npm. This example installs it with `file:../..` (pnpm uses its package whitelist); you can replace that dependency with a local packed tarball. Client code imports `pdfwind/browser`, blocks import `pdfwind`, and theme metadata imports `pdfwind/themes/index`, exercising the public exports. `scripts/sync.mjs` resolves the **installed package** via `pdfwind/package.json` and copies its internals into `pdfwind/` plus runtime assets into `server/pdfwind-assets/`, solely for Nitro's custom resource loader. That Nitro asset step is still required with a published package.

1. **Vue SFCs on the server.** Nitro's rollup does not know `.vue`; `nuxt.config.ts` adds `@vitejs/plugin-vue` to `nitro.rollupConfig.plugins`.
2. **wasm, fonts and CSS under bundling.** `src/render/node.js` finds them with `require.resolve(...)` and `new URL("../x", import.meta.url)`, which break once Nitro bundles the server into one file. The example does not use `node.js`: `server/utils/pdf.ts` calls pdfwind's `createRenderPdf(loadResources)` (the same core the Node and browser entries use) with a loader that reads the takumi wasm, Tailwind's `theme/utilities/preflight.css`, the theme CSS and the fonts from **Nitro server assets** (`nitro.serverAssets`, bundled into `.output` by `nuxt build`). Nothing in `src/` changed for this.
3. **Externals.** `takumi-pdf` (wasm glue) and `tailwindcss` stay normal node_modules that Nitro traces into `.output/server/node_modules`. The copied library itself must be bundled: `nitro.externals.inline` lists `pdfwind` plus the copied `pdfwind/src` internals, because `nuxt dev` otherwise emits an import of it by a path that does not resolve.
4. **Browser.** The client uses pdfwind's `browser.js` unchanged (Vite `?url` / `?raw` imports; `vite.optimizeDeps.exclude: ["pdfwind", "takumi-pdf"]`, `optimizeDeps.include: ["pdfwind > qrcode"]` for the transitive CommonJS dependency, and server-only `$server.ssr.noExternal: ["pdfwind"]`). The component is `InvoicePreview.client.vue`, so it is skipped on the server. In Nuxt's serial Vite builder, a top-level `vite.ssr` setting causes the client optimizer to discard its include list; keep that setting under `vite.$server` as in this example.
5. **Size.** Nitro embeds the assets, including the whole Noto Sans TC font. The phase5 report/build log records the actual server bundle size; do not infer payload size from the package tarball.
