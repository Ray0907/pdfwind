# pdfwind

Vue 3 + Tailwind v4 components and document blocks that render to PDF with [Takumi](https://takumi.kane.tw) (`takumi-pdf`, no headless browser).
The same code runs in Node and in the browser: write a document as Vue components, call `renderPdf(Component, props, options)`, get PDF bytes.
Feature target: [pdfcn](https://github.com/shadcn-labs/pdfcn) (props, variants and defaults follow it); styling is Tailwind classes plus semantic CSS-variable tokens (`src/themes/default.css`).

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

`PROGRESS.md` has the per-phase notes, results, Takumi limitations and known gaps.

## Status

Phase 1 render core, 2a/2b all 24 components, 3a six invoices: done. 3b-1 (this README's last update) adds seven blocks; the remaining
blocks, the nine named themes, the playground polish and `llms.txt` are not built yet. Not published to npm; SFCs need Vite.

## Credits and licence

MIT, see `LICENSE`. pdfwind re-implements pdfcn's (shadcn-labs, MIT) component and block design for Vue and ports its chart math;
PDFx (akii09, MIT) was read for ideas and none of its code is used. Full notices: `THIRD_PARTY_NOTICES.md`.
