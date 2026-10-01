# Contributor roadmap

pdfwind is a Vue 3 + Tailwind v4 PDF library rendered by Takumi (`takumi-pdf`).
The feature/design reference is [pdfcn](https://github.com/shadcn-labs/pdfcn), MIT, particularly its Takumi components, blocks and theme values. [PDFx](https://github.com/akii09/pdfx), MIT, is inspiration only. Attribution lives in [THIRD_PARTY_NOTICES](../../THIRD_PARTY_NOTICES.md).

## Architecture

- `src/render/`: platform-neutral render pipeline plus Node/browser resource loaders. Vue SSR produces HTML; classes are scanned and compiled with Tailwind's in-memory compiler, including preflight. Takumi receives HTML and CSS, not class names alone.
- `src/components/`: Vue SFCs with semantic-token colors and `cn()` class passthrough. `src/index.js` exports the components, blocks and theme metadata.
- `src/blocks/`: 20 document templates, sample data and recommended page/footer options. Totals are computed from items unless explicitly overridden.
- `src/themes/`: default, nine pdfcn themes and dark, metadata, lazy font registry, Theme Builder model.
- `fonts/`: WOFF2 assets and OFL texts. Latin fonts load per theme; Noto Sans TC loads for CJK text. Keep font licenses with assets.
- `playground/`: Vite preview and Theme Builder. The build uses relative asset URLs for subpath hosting.
- `scripts/`: E2E scripts only, PDF/PNG evidence and PASS/FAIL/SKIP reports under `out/`.

## Phases and acceptance

1. **Render core**: Node/browser PDF parity, resource reuse, retry after failed loads, safe uncovered-glyph default, abort discards stale results, `<PdfPreview>` retains the previous PDF until replacement is ready.
2. **Components**: layout/text, tables, charts, QR codes, forms, images, signatures. Exercise variants, typography, geometry, pagination, text extraction, pixels, links and custom classes.
3. **Blocks**: six invoices, four reports, agenda/ticket/certificate, lesson plan, intake, meeting minutes, packing slip, press release, label and work order. Check text, money, page counts, clipping and browser parity. Public pdfcn comparisons are optional, cached, and explicitly SKIP offline.
4. **Themes and Builder**: compare values with the attributed fixture; check fonts/colors/headings, lazy loading, contrast, controls, history, persistence, import/export, keyboard access and accessibility.
5. **Public preparation**: portable scripts, packed consumers, static preview, Nuxt example, contributor/security docs, local CI command validation. Publishing and hosting are owner decisions, not part of local preparation.

## Constraints and known gaps

Takumi implements a CSS subset, not a browser layout engine. See [PROGRESS](PROGRESS.md) for measured limitations: text opacity, long letter-spaced labels, one-sided dashed borders, transformed text, gradients, fixed-position overlap, unsupported selector/custom-property behavior and explicit page breaks.
Rendering cannot currently be stopped mid-Takumi-call; abort discards the result. Headless Chromium does not paint the native PDF viewer; byte extraction and rasterized PDF checks are stronger evidence than a blank iframe screenshot. Preview swaps fall back after 2 seconds without a viewer load event.
Noto's whole CJK font is loaded on the first CJK render. Hangul needs a caller-supplied covering font. Font subsets, React support, a registry/CLI and hosted services are not current promises.

## Working agreements

Read [CONTRIBUTING](../../CONTRIBUTING.md). Keep changes minimal, use existing helpers, maintain semantic tokens, and extend an E2E report rather than adding unit tests. Do not put credentials, generated output, private documents or local machine paths into the repository. Inspect upstream sources read-only and preserve attribution for copied values/code.
