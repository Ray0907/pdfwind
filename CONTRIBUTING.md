# Contributing

pdfwind is an alpha Vue 3 PDF library. Read [README](README.md), [the architecture/roadmap](docs/development/PLAN.md) and [technical notes](docs/development/PROGRESS.md) first. Changes should be small and reproducible; a PDF/PNG and an E2E report are better than an unsupported claim.

## Setup and tools

Use Node >=22.12 and pnpm 10 (`corepack enable`; packageManager pins the version). Run `pnpm install --frozen-lockfile`, then `pnpm dev`.

E2E prerequisites:

- macOS: `brew install poppler imagemagick`.
- Ubuntu: `sudo apt-get install poppler-utils imagemagick` (ImageMagick 6 and 7 supported; no system font is needed for contact sheets).
- `npx playwright-core install chromium` (Linux CI: `npx playwright-core install --with-deps chromium`). Playwright's version must match the lockfile.

Scripts fail early if poppler, ImageMagick or the matching Chromium binary is missing. Headed checks additionally need a desktop/display.

## Scripts and reports

- `pnpm check`: semantic color-token guard, offline relative-link/image/heading-anchor checks in README/CONTRIBUTING/SECURITY/CHANGELOG/CODE_OF_CONDUCT, and generated llms staleness.
- `pnpm test`: sequential **offline/headless** E2Es, final PASS/FAIL/SKIP totals and nonzero exit on any failure. Public-reference comparisons and Nuxt registry installation explicitly SKIP. It still runs all non-network component, block, theme, Builder, playground, documentation and static-build checks.
- `pnpm test:all`: also permits public pdfcn downloads, the Nuxt install/build/routes/preview checks, and packed consumer installation. Needs npm/pnpm registry access; no headed window.
- `pnpm build:playground`: relative-base build in `dist-playground/`.
- `pnpm screenshots`: rebuild README images from phase3/4/5 outputs; run those E2Es first.
- `pnpm gen:llms`: regenerate `llms.txt` and `llms-full.txt` after source/API/technical-note changes.
- `node scripts/fetch-pdfcn-refs.mjs`: idempotent public demos in `.cache/pdfcn-ref/`, bounded timeouts; comparison failures are explicit SKIP, not silent PASS.
- `node scripts/vendor-pdfcn-themes.mjs <trusted-pdfcn-checkout>`: regenerate values-only theme fixture from read-only upstream files. Preserve MIT attribution and review changed values.

### E2E coverage

Each command runs `scripts/e2e-<name>.mjs`; reports include PASS/FAIL/SKIP/INFO rows, with PDFs/PNGs in the listed folders where applicable.

| command | coverage | output |
|---|---|---|
| `pnpm e2e:phase1` | render core, `<PdfPreview>`, Node + Chromium | `out/report.md`, artifacts in `out/` |
| `pnpm e2e:phase1-headed` | native PDF viewer painting, replacement/flash sampling and scroll reset; opens a window | `out/report-headed.md`, `out/headed-*.png` |
| `pnpm e2e:phase2a` | layout/text components, pagination, headers/footers | `out/phase2a/` |
| `pnpm e2e:phase2b` | Table parts, DataTable, KeyValue, Graph, QRCode, Alert, Badge, Form, Signature, PdfImage | `out/phase2b/` |
| `pnpm e2e:phase3a` | six invoice blocks, long/CJK data, money, public pdfcn PDF comparisons | `out/phase3a/` |
| `pnpm e2e:phase3b1` | financial/marketing/operations/security reports, agenda, ticket, gift certificate; pdfcn comparisons | `out/phase3b1/` |
| `pnpm e2e:phase3b2` | lesson plan, intake form, minutes, packing slip, press release, shipping label, work order; pdfcn comparisons | `out/phase3b2/` |
| `pnpm e2e:phase4a` | 11 themes × 20 blocks + sampler; fixture values, fonts, colors, headings, contrast, lazy loading, picker | `out/phase4a/` |
| `pnpm e2e:phase4b` | Theme Builder controls, history, persistence, CSS export/import, contrast, keyboard, axe | `out/phase4b/` |
| `pnpm e2e:phase5` | token guard, dark paper, playground light/dark + axe, llms examples, Nuxt install/build/routes/preview, README images | `out/phase5/` |
| `pnpm e2e:phase5b` | responsive playground, landmarks, skip link, hit areas, text sizes, error banner/Retry, light/dark axe | `out/phase5b/` |
| `pnpm e2e:static` | production build under `/pdfwind/`, preview/themes/Builder, per-request transfer bytes | `out/static/` |
| `pnpm e2e:consumer` | dry/real pack, isolated tarball install, Node + production Vite preview, CSS/assets/fonts | `out/consumer/` |

`PDFWIND_OFFLINE=1` disables public-reference downloads and Nuxt installation even for direct phase commands; unavailable references are explicit SKIP, not PASS. Phase4a uses an attributed fixture, not an upstream checkout. `PDFWIND_HEADED=1` opts into visible viewer screenshots in phases 4b/5; phase1-headed is always separate.

The consumer needs registry access for Vue/Vite/runtime dependencies and is excluded from offline `test`. Set `TMPDIR` to choose its temp parent; its script-owned `pdfwind-consumer` folder is **recreated**, so never keep important files there.

Runner logs/totals are in `out/runner/`. Every behavioral change must run the relevant script; final changes should run `pnpm check` and `pnpm test`. **E2E-only philosophy: no unit tests.** Extend existing scripts with real PDF text, geometry, pixels, font, browser and accessibility evidence. Info/SKIP rows are not passing assertions.

## Adding library features

- **Component**: add an SFC under `src/components/<Name>/`, export it from `src/index.js`, use `inheritAttrs: false`, existing `cn()` and `rest()` helpers for merged classes/attributes, add a playground demo and relevant phase2 E2E checks. Use existing components rather than a second layout system.
- **Block**: compose components under `src/blocks/<Name>/`, add neutral sample data and recommended render options, export from `src/blocks/index.js`, register a playground demo, exercise long data/CJK/pagination/money in phase3. Never put real customer documents into fixtures.
- **Theme**: add semantic variables in `src/themes/<name>.css`, registry metadata/font faces in `src/themes/index.js`, include any font's OFL text, then exercise phase4a/4b. New names are not automatically part of the pdfcn fixture; restrict fixture comparisons to upstream theme names.
- **Colors** must be tokens (`bg-primary`, `text-muted-foreground`, etc.), not palette/black/white/arbitrary literals. `pnpm check` enforces this. A fixed non-themeable color (QR ink, user color) needs `token-ok: <reason>`; don't use that marker to bypass theming.
- Keep `fonts/*.woff2` and their OFL texts packaged. Do not commit TTF scratch, generated `out/`, caches, tarballs or build directories.

## Dependency rationale

Runtime dependencies: `@vue/server-renderer` produces markup; `tailwindcss` compiles classes at render time (not merely a build tool); `takumi-pdf` is the WASM PDF engine; `qrcode` produces QR SVG; `tailwind-merge` makes user classes override component defaults. Vue is a **peer** so consumers share one Vue runtime, and also a dev dependency for this checkout.

Dev dependencies: Vite + Vue plugin compile SFCs/playground/SSR examples; Playwright drives Chromium; axe-core audits accessibility; jsQR independently decodes rendered QR codes. None is required just to call the Node renderer on ready-made HTML, but SFC consumers must supply their own compatible bundler/plugin.

## Privacy and security

Never commit credentials, access tokens, `.env` files, private documents or sensitive report content. Scrub repro data and logs. History also exposes author metadata; inspect it before publication. Report vulnerabilities privately following [SECURITY](SECURITY.md), not in public issues. Follow [CODE_OF_CONDUCT](CODE_OF_CONDUCT.md).

Publication, repository visibility, release tags and hosted deployment are owner decisions. Keep `private: true` until explicitly authorized.
