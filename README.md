# pdfwind

Vue components in, paged PDFs out — in Node or the browser, without a headless browser.

![MIT](https://img.shields.io/badge/license-MIT-blue) ![Alpha 0.1.0](https://img.shields.io/badge/status-alpha%200.1.0-orange) ![Vue 3](https://img.shields.io/badge/Vue-3-42b883)

![Component showcase rendered as a PDF](docs/images/components.png)

## Why pdfwind?

- **Vue 3 + Tailwind v4**: compose documents with semantic colors like `bg-primary` and `text-muted-foreground`.
- **24 components (29 exports including the Table parts)** and **20 blocks** for invoices, reports, forms, tickets and more.
- **Takumi PDFs with selectable text**: the same document components render in Node and the browser, with pagination and repeating headers/footers.
- **11 runtime-switchable themes** and a live **Theme Builder** with WCAG contrast feedback and CSS export/import.

**Inspired by [pdfcn](https://github.com/shadcn-labs/pdfcn), the React equivalent, and [PDFx](https://github.com/akii09/pdfx).** pdfcn's MIT designs, props, theme values and chart math are ported to Vue; PDFx is inspiration only, with no copied code. See [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES.md).

## Status and scope

**Alpha 0.1.0, published on npm as [`pdfwind`](https://www.npmjs.com/package/pdfwind)** (`npm install pdfwind vue`); APIs may still change. **Vue only**, not React. A **[live playground](https://pdfwind.ray-tien0907.workers.dev)** is hosted on Cloudflare (static build; pick any component or block, switch themes, open the Theme Builder), and you can also run it locally.
The components are Vue SFCs: use a Vite-like bundler with the Vue plugin, `?raw`, `?url` and `import.meta.glob`. Ordinary Node cannot import `.vue` files; the Node example below uses Vite SSR.

## Use with Vue / Node

Requires **Node 22.12+**. In a new project:

```sh
mkdir my-pdf && cd my-pdf
npm init -y
npm pkg set type=module
npm install pdfwind vue
npm install -D vite @vitejs/plugin-vue
```

Save this as **`vite.config.js`** (used by both examples):

```js
import vue from "@vitejs/plugin-vue";
export default {
  plugins: [vue()],
  optimizeDeps: { exclude: ["pdfwind", "takumi-pdf"], include: ["pdfwind > qrcode"] },
  ssr: { noExternal: ["pdfwind"] },
};
```

**Node:** save as **`node.mjs`**, then run `node node.mjs` to write `invoice.pdf`:

```js
import { createServer } from "vite";
import { readFile, writeFile } from "node:fs/promises";
import { renderPdf } from "pdfwind/node";
const vite = await createServer({ server: { middlewareMode: true, ws: false }, appType: "custom" });
try {
  const { InvoiceModern, InvoiceFooter, blockPage } = await vite.ssrLoadModule("pdfwind");
  await writeFile("invoice.pdf", await renderPdf(InvoiceModern, {}, { ...blockPage, footer: InvoiceFooter, theme: "vivid" }));
} finally { await vite.close(); }
```

**Browser:** save as **`App.vue`**:

```vue
<script setup>
import { PdfPreview, InvoiceModern, InvoiceFooter, blockPage } from "pdfwind/browser";
const options = { ...blockPage, footer: InvoiceFooter, theme: "vivid" };
</script>
<template><div style="height:90vh"><PdfPreview :component="InvoiceModern" :options="options" /></div></template>
```

Save `main.js` as `import { createApp } from "vue"; import App from "./App.vue"; createApp(App).mount("#app");` and `index.html` as `<!doctype html><html lang="en"><head><meta charset="UTF-8"><title>pdfwind</title></head><body><div id="app"></div><script type="module" src="/main.js"></script></body></html>`. Run `npx vite` for development or `npx vite build` for a production bundle.
For Nuxt server rendering and a client-only preview, see the [Nuxt example and setup notes](examples/nuxt/README.md).

## Gallery

![Changing the primary color in the Theme Builder updates the PDF live](docs/images/theme-builder.gif)

![Themes applied to the same invoice](docs/images/themes.png)
![Theme Builder with live PDF and contrast feedback](docs/images/theme-builder.png)
![Invoice blocks](docs/images/invoices.png)

<details>
<summary>More PDFs: reports, other blocks, small formats and dark paper</summary>

![Report blocks](docs/images/reports.png)
![Document blocks](docs/images/blocks.png)
![Ticket and shipping label](docs/images/small-formats.png)
![Components on dark paper](docs/images/components-dark.png)

</details>

## Themes and Theme Builder

Choose `default`, `blueprint`, `corporate`, `elegant`, `executive`, `forest`, `minimal`, `modern`, `professional`, `vivid` or `dark` via the `theme` option, as in the examples above. Unknown names throw an error listing valid themes. Fonts load lazily; pdfcn's base-14 names map **Helvetica → Inter**, **Times-Roman → Lora**, **Courier → Source Code Pro**.

Run `pnpm dev` in the clone and open `http://localhost:5173/?view=builder`. Edit colors, fonts, sizes, gaps and margins with live contrast feedback, undo/redo, and CSS import/export. Contrast feedback is not a guarantee that every theme meets WCAG.
Download `theme.css`, put it beside `node.mjs`, and add this **inside its `try` block**, after loading the components:

```js
const themeCss = await readFile("theme.css", "utf8");
await writeFile("custom.pdf", await renderPdf(InvoiceModern, {}, { ...blockPage, footer: InvoiceFooter, theme: "vivid", themeCss }));
```

In Vite, use `import themeCss from "./theme.css?raw"` and pass it in `options`; bundled CSS is also exported, e.g. `pdfwind/theme-css/vivid?raw`. Re-import exported CSS into the Builder to continue editing. Exported margin variables are advisory: pass `margin` explicitly when rendering.

## Limitations

- **Not browser CSS:** individual `rotate` utilities are ignored (use `transform`); text `opacity` can clip glyphs; one-sided dashed/dotted borders need SVG; transparent repeating gradients can leave artifacts; fixed-position elements reserve no layout space. See [technical notes and known gaps](docs/development/PROGRESS.md#phase-2a-14-layout--text-components).
- **Fonts:** bundled Latin fonts and Noto Sans TC cover the examples, not all writing systems. Supply covering custom fonts for Hangul, emoji or Arabic; font coverage alone does not guarantee shaping/layout support.
- **Preview:** replacing a PDF resets the viewer's scroll position to page 1. Node SFC loading requires Vite SSR, as above.
- **First-render download:** on the hosted playground (Cloudflare static assets, Brotli) a fresh Chromium measured **~2.3 MB** over the wire for the first English render (the Takumi WASM is 4.1 MB raw, 1.7 MB compressed) and **~7.7 MB** when Chinese text loads the bundled Noto Sans TC font (5.4 MB, already WOFF2). First PDF appeared after about 1.5-3.4 s in that run (one run, headless, one network; not a benchmark). These are playground measurements, not a fixed library cost; the uncompressed figures (5.1 / 10.5 MB) come from `pnpm e2e:static` against a plain static server.
- **Hosting/CI:** [CI](.github/workflows/ci.yml) runs the offline suite on Ubuntu for every push. Its first runs (937 pass, 3 fail, 41 skip) exposed three macOS-only assumptions in the tests (a shell `md5` command and a Ctrl+Z key); the fixes are in the repository, so check the Actions tab for the current result. The hosted playground is a manual static deployment, not tied to CI.

## For LLMs and agents

[llms.txt](llms.txt) — reference index.
[llms-full.txt](llms-full.txt) — component/block props, rendering options, themes and runnable examples.

## Development

```sh
pnpm install
pnpm dev
pnpm check       # tokens, offline docs links/anchors, generated llms staleness
pnpm test        # offline/headless E2Es; explicit SKIP for network-only checks
pnpm test:all    # adds public comparisons, Nuxt and packed consumer; needs network
```

Use pnpm 10; E2Es need Poppler, ImageMagick and the lockfile-matching Playwright Chromium. Setup, coverage and reports: [CONTRIBUTING](CONTRIBUTING.md).

## Credits and licence

[MIT](LICENSE). [pdfcn](https://github.com/shadcn-labs/pdfcn) by shadcn-labs supplies the ported design; [PDFx](https://github.com/akii09/pdfx) by akii09 inspired the project. Bundled fonts use SIL OFL; see [full notices](THIRD_PARTY_NOTICES.md).
[Contribute](CONTRIBUTING.md) · [Code of conduct](CODE_OF_CONDUCT.md) · [Report a vulnerability privately](SECURITY.md).
