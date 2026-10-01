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

- `pnpm check`: semantic color-token guard and generated llms staleness.
- `pnpm test`: sequential **offline/headless** E2Es, final PASS/FAIL/SKIP totals and nonzero exit on any failure. Public-reference comparisons and Nuxt registry installation explicitly SKIP. It still runs all non-network component, block, theme, Builder, playground, documentation and static-build checks.
- `pnpm test:all`: also permits public pdfcn downloads, the Nuxt install/build/routes/preview checks, and packed consumer installation. Needs npm/pnpm registry access; no headed window.
- `pnpm e2e:phase1`, `phase2a`, `phase2b`, `phase3a`, `phase3b1`, `phase3b2`, `phase4a`, `phase4b`, `phase5`, `phase5b`: aliases for `scripts/e2e-<phase>.mjs`. `PDFWIND_OFFLINE=1` disables reference downloads/Nuxt installation even when running a phase directly.
- `pnpm e2e:phase1-headed`: separate native PDF viewer check, opens a window. `PDFWIND_HEADED=1` opts into visible viewer screenshots in phases 4b/5.
- `pnpm e2e:static`: build + plain static server under `/pdfwind/`, built preview/theme/Builder checks and per-request byte accounting.
- `pnpm e2e:consumer`: dry/real pack, disposable temp consumer, npm install from the **tarball**, Node + production Vite browser checks. Registry required for Vue/Vite/runtime dependencies; excluded from offline `test`. Set `TMPDIR` to choose the temp parent. Do not keep important files in the script-owned `pdfwind-consumer` temp folder: it is recreated.
- `pnpm build:playground`: relative-base build in `dist-playground/`.
- `pnpm screenshots`: rebuild README images from phase3/4/5 outputs; run those E2Es first.
- `pnpm gen:llms`: regenerate `llms.txt` and `llms-full.txt` after source/API/technical-note changes.
- `node scripts/fetch-pdfcn-refs.mjs`: idempotent public demos in `.cache/pdfcn-ref/`, bounded timeouts; comparison failures are explicit SKIP, not silent PASS.
- `node scripts/vendor-pdfcn-themes.mjs <trusted-pdfcn-checkout>`: regenerate values-only theme fixture from read-only upstream files. Preserve MIT attribution and review changed values.

Reports are under `out/` (phase1: `out/report.md`, others: `out/<phase>/report.md`; runner logs/totals: `out/runner/`). Every behavioral change must run the relevant report script; final changes should run `pnpm check` and `pnpm test`. **E2E-only philosophy: no unit tests.** Extend existing scripts with real PDF text, geometry, pixels, font, browser and accessibility evidence. Info/SKIP rows are not passing assertions.

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
