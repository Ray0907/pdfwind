# pdfwind

## Status and scope

**Alpha 0.1.0; not published to npm yet.** Vue 3 only: 29 components, 20 blocks and 11 themes. There is no React version. The Vue SFCs and browser entry require a Vite-like bundler (`@vitejs/plugin-vue`, `?raw`, `?url`, `import.meta.glob`); ordinary Node cannot import `.vue` files directly.

Takumi supports a **CSS subset**, not browser-equivalent layout: individual `rotate` utilities are ignored (use `transform`); text `opacity` can clip glyphs; one-sided dashed/dotted borders need SVG; transparent repeating gradients can leave artifacts; flex text fragments lose edge spaces; fixed-position elements reserve no space; some descendant selectors/custom-property overrides are ignored; explicit page-break templates can overflow with longer custom content. See [technical notes](docs/development/PROGRESS.md) for details and known gaps. Use a covering custom font for scripts outside the bundled fonts (including Hangul).

**Inspired by [pdfcn (shadcn-labs)](https://github.com/shadcn-labs/pdfcn) and [PDFx (akii09)](https://github.com/akii09/pdfx).** pdfcn's MIT design, props, theme values and chart math are ported; PDFx is inspiration only, with no copied code. [Full notices](THIRD_PARTY_NOTICES.md).

Vue 3 + Tailwind v4 components and document blocks that render to PDF with [Takumi](https://takumi.kane.tw) (`takumi-pdf`, no headless browser).
The same code runs in Node and in the browser: write a document as Vue components, call `renderPdf(Component, props, options)`, get PDF bytes.
Feature target: [pdfcn](https://github.com/shadcn-labs/pdfcn) (props, variants and defaults follow it); styling is Tailwind classes plus semantic CSS-variable tokens (`src/themes/default.css`).

## Preview

Rendered by this repo's own E2E scripts (`scripts/screenshots.sh` rebuilds these images from `out/`).

**Six invoices**

![Six invoice blocks](docs/images/invoices.png)

**Reports**

![Four report blocks](docs/images/reports.png)

**More blocks** (event agenda, lesson plan, patient intake form, meeting minutes, packing slip, press release, work order, gift certificate)

![Document blocks](docs/images/blocks.png)

**Other page sizes** (event ticket, shipping label)

![Ticket and shipping label](docs/images/small-formats.png)

**Components in one document** (heading, text, alert, badges, graph, list, data table, QR code, form, signature: the playground's first screen, default theme)

![Components showcase](docs/images/components.png)

**The same document in the `dark` theme** (every color is a theme token, and the PDF paper itself is painted with the theme's background)

![Components showcase, dark theme](docs/images/components-dark.png)

**Eleven themes** (default, pdfcn's nine, dark), switched at run time with `{ theme: "vivid" }`

![The themes side by side](docs/images/themes.png)

**Theme Builder** (playground `?view=builder`: colors, fonts, sizes, gaps and margins with live WCAG contrast, undo/redo, CSS export/import)

![Theme Builder](docs/images/theme-builder.png)

```js
import { renderPdf } from "pdfwind/node"; // Node renderer, no SFC loader included
import { InvoiceModern, InvoiceFooter, blockPage } from "pdfwind"; // load through Vite SSR
const pdf = await renderPdf(InvoiceModern, { data }, { ...blockPage, footer: InvoiceFooter });
```

## Develop

Needs Node 22.12+, pnpm 10 (via Corepack), and for E2E: poppler (`pdftotext`, `pdftoppm`, `pdfinfo`, `pdffonts`), ImageMagick 6 or 7 and Playwright Chromium (`npx playwright-core install chromium`; Linux CI: `--with-deps`). See [CONTRIBUTING](CONTRIBUTING.md) for setup, dependency rationale and tools.

```
pnpm install
pnpm dev                # playground at http://localhost:5173
pnpm check              # color tokens + generated llms staleness
pnpm test               # all offline/headless E2Es, sequential; totals + reports
pnpm test:all           # adds public comparisons, registry installs, Nuxt and packed consumer
```

## E2E scripts (the only tests; each writes PDFs/PNGs and a PASS/FAIL table under out/)

| command | covers | output |
|---|---|---|
| `node scripts/e2e-phase1.mjs` | render core, `<PdfPreview>`, Node + Chromium | `out/report.md` |
| `node scripts/e2e-phase1-headed.mjs` | real PDF viewer swap (opens a window) | `out/report-headed.md` |
| `node scripts/e2e-phase2a.mjs` | 14 layout/text components | `out/phase2a/` |
| `node scripts/e2e-phase2b.mjs` | Table, DataTable, KeyValue, Graph, QRCode, Alert, Badge, Form, Signature, PdfImage | `out/phase2b/` |
| `node scripts/e2e-phase3a.mjs` | six invoice blocks + compare PNGs against pdfcn | `out/phase3a/` |
| `node scripts/e2e-phase3b1.mjs` | report-financial/marketing/operations/security, event-agenda/ticket, gift-certificate | `out/phase3b1/` |
| `node scripts/e2e-phase5b.mjs` | playground interface review: 320/360/640px, landmarks, skip link, hit areas, text sizes, error banner + Retry, axe on the main playground in light and dark | `out/phase5b/` |
| `node scripts/e2e-phase5.mjs` | color tokens guard, dark theme + painted paper, playground light/dark + axe, llms.txt examples, Nuxt example (install, build, server route, page), README showcase and images | `out/phase5/` |
| `node scripts/e2e-phase4b.mjs` | the Theme Builder: controls, history, persistence, export/import, contrast, keyboard, axe | `out/phase4b/` |
| `node scripts/e2e-phase4a.mjs` | 10 themes x 20 blocks + component sampler: fonts, colors, headings, contrast, lazy font loading, picker | `out/phase4a/` |
| `node scripts/e2e-phase3b2.mjs` | lesson-plan, medical-intake-form, meeting-minutes, packing-slip, press-release, shipping-label, work-order | `out/phase3b2/` |

[PROGRESS](docs/development/PROGRESS.md) has per-phase notes, results, Takumi limitations and known gaps; [PLAN](docs/development/PLAN.md) describes the contributor roadmap. Each phase also has a `pnpm e2e:<phase>` alias. `pnpm e2e:static` verifies the production build under `/pdfwind/`; `pnpm e2e:consumer` installs a local tarball in a temporary project (npm registry required for dependencies). `pnpm e2e:phase1-headed` is separate and opens a window. `PDFWIND_HEADED=1` opts into viewer screenshots in phases 4b/5.

Reference comparisons download public demo PDFs into `.cache/pdfcn-ref/` with bounded timeouts. Offline/unavailable references produce **SKIP**, never PASS; other checks still run. Theme values are vendored as an attributed fixture, so phase4a needs no upstream checkout.

## Themes

Nine themes ported from pdfcn plus the default and a `dark` theme: `blueprint corporate elegant executive forest minimal modern professional vivid dark`.
Every color in the library is a theme token (`bg-primary`, `text-muted-foreground`, ...; `scripts/check-tokens.mjs` fails the E2E on a palette class or a raw hex), and `renderPdf` paints the page itself with the theme's `--background`, so a dark theme has no white margins.
They are runtime-switchable: no rebuild, no remount.

```js
await renderPdf(Component, props, { theme: "vivid" });          // Node and browser
// <PdfPreview :component="Doc" :options="{ theme }" />          // change `theme` and it re-renders in place
import { themes, themeNames } from "pdfwind/themes/index";     // meta: description, fonts, recommended page margins
```

A theme is a CSS file of variables (`src/themes/<name>.css`: the 12 color tokens, paragraph/component/section gaps, type scale, line heights, `--font-heading`)
layered over `default.css`; `themeCss` still works on top for your own tweaks. An unknown name throws and lists the valid ones.
Fonts are bundled WOFF2 (theme-family latin subsets, Inter, and the Noto Sans TC fallback; OFL, `fonts/OFL-*.txt`) and loaded lazily: only the active theme's files are fetched.
pdfcn's PDF base-14 names have no Takumi equivalent, so Helvetica -> Inter, Times-Roman -> Lora, Courier -> Source Code Pro (see `src/themes/index.js`).
`out/phase4a/themes-*.png` shows all themes side by side. The playground has a theme picker.

**Theme Builder**: run the playground (`pnpm exec vite`, root `playground`) and open `?view=builder` (or the link in the sidebar). Edit the 12 colors, fonts, sizes, gaps and margins
against a live preview of any document, watch the WCAG contrast of the key pairs, undo/redo, then copy or download `theme.css` and pass it as `themeCss`
(`--font-body` / `--font-heading` pick the bundled fonts). Import takes a theme CSS back in and reports anything it cannot use. Screenshots: `out/phase4b/`.

## Use with Vue / Nuxt

pdfwind is not on npm. Clone, run `pnpm install`, then `npm pack` (works while the package stays private). In another project install the resulting tarball plus Vue: `npm install /path/to/pdfwind-0.1.0.tgz vue`.

**Vue + Vite** (verified from the packed tarball, production bundle):

```js
// vite.config.js
import vue from "@vitejs/plugin-vue";
export default {
  plugins: [vue()],
  optimizeDeps: { exclude: ["pdfwind", "takumi-pdf"], include: ["pdfwind > qrcode"] },
  ssr: { noExternal: ["pdfwind"] }, // needed when loading SFCs with Vite SSR
};
```

```vue
<script setup>
import { PdfPreview, InvoiceModern, InvoiceFooter, blockPage } from "pdfwind/browser";
const options = { ...blockPage, footer: InvoiceFooter, theme: "vivid" };
</script>
<template><div style="height:90vh"><PdfPreview :component="InvoiceModern" :options="options" /></div></template>
```

The exclusions keep SFC/asset imports out of dependency prebundling. Explicitly including the transitive CommonJS `qrcode` dependency is needed by Nuxt's dev optimizer; the example exercises this configuration.

**Node**: import `renderPdf` from `pdfwind/node`. It accepts a Vue component or ready-made HTML. To load exported SFC blocks in a Node script, use Vite's SSR loader (with the config above):

```js
import { createServer } from "vite";
import { writeFile } from "node:fs/promises";
import { renderPdf } from "pdfwind/node";
const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
try {
  const { InvoiceModern, InvoiceFooter, blockPage } = await vite.ssrLoadModule("pdfwind");
  await writeFile("invoice.pdf", await renderPdf(InvoiceModern, {}, { ...blockPage, footer: InvoiceFooter, theme: "vivid" }));
} finally { await vite.close(); }
```

Exports: `pdfwind` (components/blocks/theme metadata), `pdfwind/node` (renderer), `pdfwind/browser` (renderer + components + PdfPreview), `pdfwind/themes/index`, `pdfwind/themes/builder`, `pdfwind/theme-css/vivid` (CSS; add `?raw` to read it as text in Vite), `pdfwind/fonts/Inter.woff2`, `pdfwind/package.json`.

- **Nuxt 4**: [`examples/nuxt`](examples/nuxt) is a small app with a server route (`GET /api/invoice.pdf?theme=vivid&number=INV-1&client=Initech`, validated, `400` with a clear message otherwise) and a client-only `<PdfPreview>` with a theme switcher.
  `cd examples/nuxt && pnpm install && pnpm dev`. Its README lists what Nitro bundling needed (the Vue plugin for the server, server assets for the wasm, fonts and CSS).
- **For LLMs and agents**: [`llms.txt`](llms.txt) (index) and [`llms-full.txt`](llms-full.txt) (every component and block with props, types, defaults, variants and slots, parsed from the source; the `renderPdf` options; themes; fonts; Takumi's CSS limits; runnable examples). Regenerate with `node scripts/gen-llms.mjs`.

## Try it

```
pnpm install
pnpm exec vite        # root: playground, opens the showcase; pick any component, block or theme in the sidebar
# ?view=builder       # the Theme Builder
```

The sidebar has a theme picker, and the page has a System / Light / Dark switch for the playground chrome (the PDF keeps its own paper color).
There is no hosted demo; the screenshots above are produced by `scripts/screenshots.sh` from the E2E outputs.

## Local builds and hosting

`pnpm build:playground` writes `dist-playground/` with relative asset URLs. `pnpm e2e:static` serves it under a project-site subpath and reports actual bundle/request bytes (WASM and the whole CJK font make the first render substantial). No hosted demo is promised. Workflow files are provided but GitHub Actions/Pages have not been run or enabled by this preparation. Publishing, Pages and a domain are owner decisions.

## Credits and licence

MIT, see `LICENSE`. pdfwind re-implements pdfcn's (shadcn-labs, MIT) component and block design for Vue and ports its chart math;
PDFx (akii09, MIT) was read for ideas and none of its code is used. Full notices: `THIRD_PARTY_NOTICES.md`.
