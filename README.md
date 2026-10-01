# pdfwind

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

**Components** (heading, card, list, data table, graph, form)

![Components](docs/images/components.png)

```js
import { renderPdf } from "./src/render/node.js";           // browser: ./src/render/browser.js
import { InvoiceModern, InvoiceFooter, blockPage } from "./src/blocks/index.js";
const pdf = await renderPdf(InvoiceModern, { data }, { ...blockPage, footer: InvoiceFooter });
```

## Develop

Needs Node 20+, pnpm, and for the E2E scripts: poppler (`pdftotext`, `pdftoppm`, `pdfinfo`, `pdffonts`), ImageMagick (`magick`) and a Playwright Chromium (`npx playwright-core install chromium`).

```
pnpm install
pnpm exec vite          # playground at http://localhost:5173 (sidebar: every component, every block, live PDF preview)
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
| `node scripts/e2e-phase4b.mjs` | the Theme Builder: controls, history, persistence, export/import, contrast, keyboard, axe | `out/phase4b/` |
| `node scripts/e2e-phase4a.mjs` | 10 themes x 20 blocks + component sampler: fonts, colors, headings, contrast, lazy font loading, picker | `out/phase4a/` |
| `node scripts/e2e-phase3b2.mjs` | lesson-plan, medical-intake-form, meeting-minutes, packing-slip, press-release, shipping-label, work-order | `out/phase3b2/` |

`PROGRESS.md` has the per-phase notes, results, Takumi limitations and known gaps.

## Themes

Nine themes ported from pdfcn plus the default: `blueprint corporate elegant executive forest minimal modern professional vivid`.
They are runtime-switchable: no rebuild, no remount.

```js
await renderPdf(Component, props, { theme: "vivid" });          // Node and browser
// <PdfPreview :component="Doc" :options="{ theme }" />          // change `theme` and it re-renders in place
import { themes, themeNames } from "./src/themes/index.js";     // meta: description, fonts, recommended page margins
```

A theme is a CSS file of variables (`src/themes/<name>.css`: the 12 color tokens, paragraph/component/section gaps, type scale, line heights, `--font-heading`)
layered over `default.css`; `themeCss` still works on top for your own tweaks. An unknown name throws and lists the valid ones.
Fonts are bundled latin-subset WOFF2 (OFL, `fonts/OFL-*.txt`) and loaded lazily: only the active theme's files are fetched.
pdfcn's PDF base-14 names have no Takumi equivalent, so Helvetica -> Inter, Times-Roman -> Lora, Courier -> Source Code Pro (see `src/themes/index.js`).
`out/phase4a/themes-*.png` shows all themes side by side. The playground has a theme picker.

**Theme Builder**: run the playground (`pnpm exec vite`, root `playground`) and open `?view=builder` (or the link in the sidebar). Edit the 12 colors, fonts, sizes, gaps and margins
against a live preview of any document, watch the WCAG contrast of the key pairs, undo/redo, then copy or download `theme.css` and pass it as `themeCss`
(`--font-body` / `--font-heading` pick the bundled fonts). Import takes a theme CSS back in and reports anything it cannot use. Screenshots: `out/phase4b/`.

## Status

Phase 1 render core, 2a/2b all 24 components, 3a six invoices, 3b-1 seven blocks, 3b-2 the last seven blocks (lesson-plan, medical-intake-form,
meeting-minutes, packing-slip, press-release, shipping-label, work-order): done, so all 20 pdfcn blocks are ported. 4a: the nine named themes + bundled fonts + runtime switching + playground picker. 4b: the Theme Builder
(playground `?view=builder`). Playground polish and `llms.txt` are not built yet. Not published to npm; SFCs need Vite.

## Credits and licence

MIT, see `LICENSE`. pdfwind re-implements pdfcn's (shadcn-labs, MIT) component and block design for Vue and ports its chart math;
PDFx (akii09, MIT) was read for ideas and none of its code is used. Full notices: `THIRD_PARTY_NOTICES.md`.
