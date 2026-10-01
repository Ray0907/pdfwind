# Development history and technical notes

Historical results below record the original phase runs, not current verification. See Pre-public preparation for this checkout. Earlier limitations may have been addressed in later phases. Run commands from the repository root.

## Pre-public preparation

All changes remain local and uncommitted on `main`, with HEAD still `fe13cc2`. Package version is 0.1.0 and `private: true` is retained. No publication, visibility change, remote release/tag, deployment or GitHub setting activation was performed.

### Changes and commands

- Portable references: `node scripts/fetch-pdfcn-refs.mjs` downloads the 20 public demo PDFs to the ignored `.cache/pdfcn-ref/`, with 15s HTTP timeouts and a 60s batch budget. Phases 3a/3b1/3b2 call it; offline/unavailable comparisons are explicit SKIP rows, excluded from pass counts, while local checks continue. All 20 references downloaded; a second invocation kept every PDF timestamp unchanged (`Idempotent: true`).
- Theme fixture: `node scripts/vendor-pdfcn-themes.mjs <trusted-upstream-checkout>` reads upstream files without modifying them and writes nine themes' values to `scripts/fixtures/pdfcn-themes.json`. Phase4a now reads that fixture, not an upstream checkout. MIT attribution is in THIRD_PARTY_NOTICES. Contact sheets use plain ImageMagick append, with no machine-specific system font.
- Commands: `pnpm dev`, `pnpm build:playground`, `pnpm check`, `pnpm test`, `pnpm test:all`, every `pnpm e2e:<phase>` alias, `pnpm e2e:static`, `pnpm e2e:consumer`, `pnpm screenshots`, `pnpm gen:llms`. [CONTRIBUTING](../../CONTRIBUTING.md) lists setup, poppler/ImageMagick/Chromium prerequisites and how to extend components/blocks/themes. A negative E2E run with poppler removed from PATH exited 1 before rendering and printed the install instructions (`out/prepublic/missing-tools.log`).
- `pnpm test` is sequential, offline and headless; it ends with totals and exits nonzero on failure. References and Nuxt registry installation explicitly SKIP. `pnpm test:all` adds public comparisons, Nuxt and the packed consumer; the latter requires registry access for Vue/Vite/runtime dependencies, though pdfwind itself comes only from the local tarball. `pnpm e2e:phase1-headed` stays separate. Phases 4b/5 open viewer windows only with `PDFWIND_HEADED=1`.
- Installable package: MIT metadata, Node >=22.12, Vue peer dependency, CSS/SFC sideEffects and a strict source/WOFF2/OFL/docs whitelist. Exports are `pdfwind`, `pdfwind/node`, `pdfwind/browser`, `pdfwind/themes/index`, `pdfwind/themes/builder`, `pdfwind/theme-css/<name>` (CSS, no extension in this alias), `pdfwind/fonts/<filename>`, and `pdfwind/package.json`. Runtime/dev/peer dependency rationale is in CONTRIBUTING.
- `TMPDIR=<temp-parent> pnpm e2e:consumer` performs dry/real `npm pack`, recreates a script-owned consumer outside the checkout, installs the tarball, renders InvoiceModern/vivid/Chinese in Node, and builds/serves/drives a Vue `<PdfPreview>` production app. It checks extracted text, font families, vivid pixels and built wasm/font requests. Reports and the full packed file list: `out/consumer/report.md`, `out/consumer/pack.json`.
- Nuxt uses the public package exports and resolves installed-package internals/assets for Nitro. Verified install, build, PDF routes/validation, production preview and dev preview. The first network run caught a real dev optimizer failure: transitive CommonJS qrcode had no default export. The configuration now includes `pdfwind > qrcode`; in Nuxt the SSR setting is under `vite.$server`, because a top-level `vite.ssr` made its serial client optimizer discard includes. The final phase5 run passed all 12 Nuxt checks; its server build reported 17.3 MB (9.75 MB gzip). Production E2E servers bind to loopback.
- PLAN/PROGRESS moved here; README, llms generation and links updated. README now states alpha/Vue/SFC/CSS limitations and prominently credits pdfcn/PDFx. Contributor/security/conduct/changelog docs and issue/PR templates added. `pnpm gen:llms` reports 29 components and 20 blocks; `pnpm check` scans 88 files with 0 token violations and confirms both generated references are current.
- Workflow files are local drafts: CI on Node 22 with pnpm/Chromium caches, offline E2Es, an optional continue-on-error reference job and report artifacts; Pages is manual workflow_dispatch only. `actionlint .github/workflows/ci.yml .github/workflows/pages.yml` passed (actionlint 1.7.12). Ruby's YAML parser loaded both files successfully. **GitHub Actions and Pages were NOT run or enabled.**

### Final E2E results

`TMPDIR=<temp-parent> pnpm test:all` completed with **1012 PASS, 0 FAIL, 0 SKIP (12 scripts)**. The ten existing phase totals match the supplied baseline. Static was also re-run in Node 24 and Node 22 after adding CDP transfer accounting (10/10 each); phase5 was re-run after binding its production server to loopback (66/66).

| script | network-enabled PASS/total | offline Node 22 PASS/total | offline SKIP |
|---|---:|---:|---:|
| phase1 | 22/22 | 22/22 | 0 |
| phase2a | 139/139 | 139/139 | 0 |
| phase2b | 160/160 | 160/160 | 0 |
| phase3a | 171/171 | 159/159 | 12 |
| phase3b1 | 122/122 | 108/108 | 14 |
| phase3b2 | 122/122 | 108/108 | 14 |
| phase4a | 49/49 | 49/49 | 0 |
| phase4b | 98/98 | 98/98 | 0 |
| phase5 | 66/66 | 54/54 | 1 (Nuxt group) |
| phase5b | 45/45 | 45/45 | 0 |
| static | 10/10 | 10/10 | 0 |
| consumer | 8/8 | excluded: registry install | — |

Offline totals: **952 PASS, 0 FAIL, 41 SKIP (11 scripts)**. Report: `out/prepublic/ci-candidate-report.md`; network report: `out/runner/report.md`. All per-phase evidence is under `out/`. The separate native viewer run passed **4 checks + 2 INFO** (`out/report-headed.md`): median swap 231ms; zero sampled blank frames; the scroll-position INFO confirms it resets on replacement, not that it is preserved.

Earlier preparation attempts did fail (shadowed SKIP helper, leftover reference readers, fontless montage, Nuxt optimizer). Those were corrected and re-run; the initial network run's 1009 PASS / 1 FAIL is preserved in `out/prepublic/initial-network-run.log`, not represented as a passing run.

### Package and built payload measurements

Final tarball `pdfwind-0.1.0.tgz`: **6,805,562 bytes packed; 7,080,158 bytes unpacked; 123 files**. The complete list is `out/consumer/pack.json`: 90 source files, 27 WOFF2/OFL assets and six root metadata/document files. No E2E fixtures/scripts, TTFs, scratch files, examples, playground or out/ were included.

`pnpm build:playground` emits relative-base `dist-playground/`. Measured assets: **11,538,279 bytes** (plus 799-byte HTML), including **734,522 JS bytes**, **4,077,119 WASM bytes** and **5,424,340 Noto Sans TC bytes**. Vite reports a >500kB chunk warning; this is not a small initial payload.

`pnpm e2e:static` serves that build under `/pdfwind/` with a plain loopback static server, not Vite dev. Showcase PDF, theme switch, Theme Builder and no-console-error checks all pass. Fresh-context first-render transfers (Chromium CDP encodedDataLength, response headers included, no HTTP compression):

- English showcase: **5,121,036 HTTP bytes** (5,119,344 body bytes).
- CJK sample invoice: **10,545,530 HTTP bytes** (10,543,684 body bytes).

Every request/status/body/HTTP byte count is listed in `out/static/report.md`; `out/static/bundle.json` lists built asset sizes. These exclude in-memory generated PDF blob bytes and are not a promise about compressed production hosting. WASM and fonts load from built hashed assets under the subpath.

### Clean-checkout validation and limits

The literal requested local clone of HEAD installed successfully but **failed** `pnpm check`: `Command "check" not found`, exit 254. That is unavoidable while new source changes remain uncommitted. No commit was created to conceal it.

A separate candidate validation overlaid the 194 tracked/pending preparation source files into that clone, excluding all scratch TTFs, stress files, node_modules, caches and out/. Under **Node 22.23.3**, `pnpm install --frozen-lockfile`, Chromium installation, `pnpm check` and `pnpm test` then passed (952/0/41 above). This validates the pending-source snapshot, **not an untouched committed checkout of fe13cc2**. Include every new preparation file in the eventual commit and repeat the literal clone before publishing. Logs: `out/prepublic/ci-original-check.log`, `ci-candidate.log`, `ci-static-report.md`.

Local CI-command validation was on macOS with installed poppler/ImageMagick/Chromium, not Ubuntu. Ubuntu apt provisioning, Linux ImageMagick 6 execution, actual hosted Actions/Pages deployment and npm publication were not verified. Reference success, cache reuse and forced-offline mode were exercised; no real public-demo outage was forced. Headless previews are validated by their PDF bytes and poppler rasters, not native viewer screenshots.

### Secrets and owner decisions

Gitleaks 8.30.1 found no leaks in the tracked working-tree snapshot, pending-source snapshot or seven-commit history. Commands used: `gitleaks dir <tracked-source-snapshot> --redact`, `gitleaks git . --log-opts=--all --redact`, and `git log -p --all --no-ext-diff --no-color | gitleaks stdin --redact`. JSON/log artifacts: `out/prepublic/secrets-*`. This is a scanner result, not a guarantee of absence. The author email in history is an owner privacy decision; no history rewrite was performed. A whole tracked-tree machine-path grep found no matches in source/docs (exit 1 = none).

Open decisions: unscoped/scoped publication form; npm name/org and GitHub owner/name availability (not checked); acceptance of public author-history/email exposure; when to remove the private flag; whether to enable Actions, Pages and private vulnerability reporting; demo domain; a private non-security conduct contact channel. No choice was made for the owner.

## Phase 1: render core

**Built**
- `src/render/core.js`: `createRenderPdf(loadResources)`. One `PdfRenderer`, WASM init, fonts and compiled Tailwind are created lazily and reused. A rejected resource load or Tailwind compile is **not cached**: the next render retries. `uncoveredText` defaults to `"placeholder"`; the `"error"` message keeps takumi's glyph list (`U+D55C`) and appends the fix. `AbortSignal` via `signal.throwIfAborted()`.
- `src/render/tailwind.js`: Tailwind compile + class scanner. **Decodes Vue's HTML escapes** (`&amp; &lt; &gt; &quot; &#39;`) before scanning, so `[&>p]:mt-2` and `before:content-['x']` work. Shared with `stress.mjs` (old `tw-browser.mjs` deleted).
- `src/render/node.js` / `browser.js`: only load resources. **Fonts are lazy**: Inter has no ranges (always loaded, 342 KB), `Noto Sans TC` has CJK `ranges` (`cjk.js`), so takumi skips its 5.3 MB `data()` unless the text needs it.
- `src/components/PdfPreview/PdfPreview.vue`: props `component`, `props`, `options`, `debounce` (100ms, **later changes only; first render is immediate**), `render`. Deep-watch, stale renders aborted and discarded. **Two stacked iframes**: the new blob loads into the back one and is swapped in 100 ms after its `load` event; old blob revoked after the swap. First render shows a "Rendering PDF..." skeleton; re-renders show a 2px top bar (opacity transition 150ms ease-out, none under `prefers-reduced-motion`). Errors shown in a banner.
- `playground/`: `App.vue` (title, rows, language inputs), `render.js` (test seam), `e2e-hook.js` (only imported under `import.meta.env.DEV`, installs `window.__pdfwind`). `?lang=en` starts in English.
- Cleanup: removed `@tailwindcss/node`, `esbuild`, `verify*.mjs`, `web/`, `tw-browser.mjs`, `out-*`, `img-*` root clutter. `stress.mjs` kept (covers break/table/image/link checks), now using `src/render/tailwind.js`; it still has its one expected FAIL (Hangul has no font).

**Run**
```
node scripts/e2e-phase1.mjs          # headless Chromium + Node, writes out/*.pdf + out/report.md, exit 1 on FAIL
node scripts/e2e-phase1-headed.mjs   # HEADED Chromium (opens a window), real PDF viewer, writes out/report-headed.md
```
Needs poppler (`pdftotext pdfinfo pdftoppm pdffonts`) and the Playwright Chromium cache.

**Result: headless 22/22 PASS; headed 4 PASS + 2 INFO** (tables in `out/report.md`, `out/report-headed.md`)

Review items:

| item | result |
|---|---|
| HIGH-1 escaped Tailwind syntax (`[&>p]:bg-[#f00]`: 15311 red px; `before:content-['XBEFORE']` text extracted) | PASS |
| HIGH-2 double-buffered iframes, verified headed | PASS with caveats below |
| MED-1 retry after failed load: Node (boot + lazy font) and browser (wasm abort, Noto abort, each then succeeds) | PASS |
| MED-2 lazy Noto: English render 0 fetches, Chinese render 1 (skip is real) | PASS |
| MED-3 first render immediate (mount -> busy 0ms), skeleton, reduced-motion | PASS (skeleton is not asserted visually) |

**HIGH-2: exactly what was and was not verified**
- Verified in headed Chromium 1243 (Chrome for Testing, real PDF viewer): viewer paints the pane; iframe `load` fires (swap latency median 235ms over 5, vs ~2100ms if it never fired); screenshot sampling (~50-100ms apart) during re-render + swap shows 0 blank/empty-viewer frames for 8-row and 120-row docs.
- Found and fixed: `load` fires *before* the viewer paints the PDF. Swapping on `load` alone showed one empty dark-viewer frame (~50ms). Adding `opacity:0`/stacking did not help; a fixed 100ms settle after `load` removed it in every run (8 and 120 rows). Control run (naive `src` reassign) flashed 1 frame under the same sampler, so the sampler can see a flash.
- NOT verifiable: sub-sampling-interval flashes; slower machines / much larger PDFs (100ms is a fixed heuristic, no paint signal exists for the native viewer); other browsers (Firefox/Safari viewers differ; Safari has no inline PDF iframe at all on iOS).
- **Scroll position is NOT preserved** (measured): after a swap the viewer is back at page 1. The native viewer is cross-process, so scroll cannot be read or restored (`#page=N` needs the current page, unreadable).
- **pdf.js canvas alternative**: would fix scroll and give a real paint signal (swap when the new canvas is drawn), identical in all browsers. Cost: ~1 MB+ bundle (`pdfjs-dist` + worker), lose native toolbar (search/print/download/thumbnails/text selection unless a text layer is added), own zoom/page UI. Recommend staying on the native viewer for the playground and adding an optional pdf.js `<PdfPreview>` mode only if scroll retention matters.

**Known gaps**
- takumi's `render` is not cancellable: abort discards the result, the work still finishes.
- No italic face by default (no italic woff2); Hangul is uncovered (placeholder glyph).
- Headless Chromium has no PDF viewer, so its iframe never fires `load`; `PdfPreview` falls back to swapping after 2s. Headless E2E therefore measures latency as debounce + render ms.
- First browser render of a CJK doc still fetches the 5.3 MB Noto file (unicode-range slicing is later).
- `themeCss` compiler cache is unbounded per distinct string.
- No `src/index.ts` public exports or package `exports` map yet.

## Phase 2a: 14 layout / text components

**Built** (`src/components/<Name>/<Name>.vue`, exported from `src/index.js`)
Stack, Section, Card, Divider (+ private `DividerLine.vue`), KeepTogether, PageBreak, PageHeader, PageFooter, PageNumber, Watermark, Heading, Text, Link, List. Props, variants, sizes and defaults follow pdfcn's Takumi components (read each one first). PdfX (`the upstream PDFx checkout`, MIT) was cloned and skimmed for ideas; nothing copied.
- `src/themes/default.css`: pdfcn's `minimal` theme as Tailwind v4 tokens. Semantic colors via `@theme inline` + `:root` vars (background, foreground, muted, muted-foreground, primary, primary-foreground, border, accent, destructive, success, warning, info). `--spacing: 4pt` so `p-4` = 16pt = pdfcn `spacing[4]` (replaces Tailwind's 4px base on purpose); `--text-xs..3xl` = pdfcn's 10/12/15/18/22/28/36pt, `--text-body` 11pt, `--text-h1..h6` 24/20/16/14/12/10pt, `--spacing-paragraph|component|section` 14/18/36pt, radius 2/4/8pt. Loaded automatically by `renderPdf` (caller's `themeCss` goes after it).
- `src/lib/ui.js`: `cn()` = `tailwind-merge` configured for the theme names (so `text-h1 text-primary` and `my-section my-2` merge correctly), `rest($attrs)`, `color()` (token name or raw CSS color, like pdfcn's `resolveColor`).
- **Class passthrough**: every component sets `inheritAttrs:false` and renders `:class="cn(defaults, $attrs.class)"`, so a user's `class="p-1"` really overrides the default `p-3` (plain Vue fallthrough can't: Tailwind sorts by value, not attribute order). Cost: one extra dependency (`tailwind-merge`) and the 2-line pattern in each SFC.
- Render core: default theme CSS, Vue SSR comment markers stripped, `Inter-Italic.woff2` (386 KB, converted from the repo's `Inter-Italic.ttf` with fonttools) registered only when the markup contains `italic` (`when:` regexp on the font entry).
- `playground/demos.js`: one demo document per component covering every variant/size (19 demos incl. fixed header/footer, card wrap, watermark positions, list noWrap). `playground/App.vue` now has a sidebar listing every demo; each renders live in `<PdfPreview>`. `?demo=<key>` deep-links.
- `scripts/e2e-phase2a.mjs` + `scripts/lib/pdf.mjs` (Vite SSR loads the SFCs in Node; poppler for text boxes / rasters / fonts).

**Run**
```
node scripts/e2e-phase2a.mjs     # writes out/phase2a/*.pdf, *.png (every page, 110dpi), browser-*.pdf, report.md
```

**Result: 139/139 PASS** (full table `out/phase2a/report.md`; Stack 8, Section 8, Card 9, Divider 9, KeepTogether 3, PageBreak 1, PageHeader 12, PageFooter 13, PageNumber 8, Watermark 6, Heading 9, Text 11, Link 6, List 13, class-merge 1, render 19, playground 3). Phase 1 re-run after the core changes: headless 22/22, headed unchanged.
Evidence per component: extracted text for every variant label; bbox geometry (gaps, indents, alignment, sizes in pt); pixel color samples at 144dpi (variant fills, borders, bars, watermark color/position/rotation); page-break behavior over multi-page demos (KeepTogether, Card `wrap`, List `noWrap`, PageBreak, fixed header/footer repeating on 3 pages); page counters per page (body + footer); `/URI` annotations for links; real italic face embedded; class passthrough pixels on every component; the same 19 demos rendered in Chromium have identical text and page count to Node, with no console errors/Vue warnings. Mutation-checked: breaking Stack `md` gap and Card `md` padding both turn their checks red.

**Takumi CSS limitations hit (verified by probes)**
1. Tailwind v4 `rotate-*` utilities (CSS `rotate:` property) are ignored; `transform: rotate()` works. Watermark uses an inline transform.
2. `opacity` on text clips the glyphs to a too-narrow measured box (wide bold / letter-spaced / uppercase text loses its last letters). Watermark uses color alpha (`color-mix(in srgb, <color> N%, transparent)` works) instead of `opacity`.
3. `border-dashed|dotted` only draws when set on all four sides; on one side (`border-b`) nothing is drawn. Divider dashed/dotted is an SVG `stroke-dasharray` line (fixed 1600px wide inside an `overflow-hidden` wrapper; `width="100%"` scales the pattern unevenly).
4. `repeating-linear-gradient` with `transparent` stops leaves dark slivers in the gaps for colored (non-near-black) lines; avoided.
5. Vue SSR fragment markers (`<!--[-->text<!--]-->`) make Takumi drop the text next to them: `renderPdf` now strips HTML comments.
6. Text parts that are flex items lose their edge spaces (`Page ` + counter); `PageNumber` uses inline spans inside one block. `.pageNumber`/`.totalPages` counters work in the page body, not only in header/footer bands.
7. Takumi lays out `<a>` inline: a Link is block-level only as a flex/column child (like pdfcn's own demo inside a Section).
8. `position: fixed` repeats on every page and `-z-10` keeps it behind content, but fixed elements do not reserve space (verified: a fixed bar and the first body line land at the same y; add your own margin).
9. The default fonts have no `Courier`/monospace face (pdfcn `minimal` uses Courier headings; here headings use Inter).

**Deliberate differences from pdfcn** (all in the component, one line each)
- Divider thickness thin/medium/thick = 1/2/4pt (pdfcn 2/4/8pt; a 2pt "thin" rule reads heavy next to 1pt card borders). Dashed/dotted via SVG, so thick dotted = round dots.
- List: numbered/checklist/icon markers align with the first line of wrapped text (pdfcn centers); descriptive item's description is 10pt, smaller than the 11pt title (pdfcn 12pt, larger); checklist checked state also draws a tick (two borders, no glyph); icon star is an SVG (no ★ glyph dependency).
- PageHeader/PageFooter `fixed` is implemented (repeat on every page); pdfcn's Takumi version ignores it. `sticky` pins to the nearest positioned parent as pdfcn does.
- Link: inline `<a>` (see 7).
- Section `spacing`: md = 36pt (theme section gap) > lg = 32pt, as in pdfcn's minimal theme; kept for parity.

**Known gaps**
- pdfcn's Takumi renders could not be compared: `the upstream pdfcn checkout` has no installed deps or pre-rendered images and must not be touched. Taste was judged from its source values (sizes, gaps, radii) and my own PNGs, not side by side.
- `muted-foreground` (#a1a1aa on white, from pdfcn's minimal theme) is about 2.5:1 contrast: footer text, labels and page numbers are below WCAG AA for small text. Left as the parity default; a theme can darken it.
- `tailwind-merge` only knows the theme names listed in `src/lib/ui.js`; a user-added `--text-*` name needs adding there.
- Default `--spacing: 4pt` / `--text-*` replace Tailwind's scales: user classes like `p-4`, `text-sm` mean 16pt / 12pt, not 16px / 14px.
- Not built (next phases): Table, DataTable, KeyValue, Graph, QRCode, Alert, Badge, Form, Signature, PdfImage; blocks; named themes (only `minimal` as default.css); `src/index.js` is not yet a published package (SFCs need Vite).

## Phase 2b: Table, DataTable, KeyValue, Graph, QRCode, Alert, Badge, Form, Signature, PdfImage

**Built** (`src/components/<Name>/`, exported from `src/index.js`; props/variants/defaults follow pdfcn's Takumi components, read first; PdfX (MIT) skimmed, nothing copied)
- **Table** family: `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableCell`. Real `<table>/<thead>/<tbody>/<tfoot>/<tr>/<td>`, so Takumi **repeats `<thead>` on every page** (pdfcn's flex-row version cannot). Variants line / grid / minimal / striped / compact / bordered / primary-header, `zebraStripe`, `noWrap`, cell `align` + `width` (pt). Variant/section/row state travels by `provide`/`inject` (no cloning children).
- **DataTable**: `columns` ([{key, header, align, width, render(value,row), renderFooter(value)}]), `data`, `variant` (default grid), `footer`, `stripe`, `size` (compact), `noWrap`; scoped slot `#cell-<key>="{ value, row }"` as the Vue alternative to `render`.
- **KeyValue**: `items` [{key, value, valueColor, valueStyle, keyStyle}], direction, divided, size, labelFlex, labelColor, valueColor, boldValue, noWrap, dividerColor/Thickness/Margin.
- **Graph**: every pdfcn type: bar, horizontal-bar, line, area (+ `smooth`), pie, donut (+ `centerLabel`); single or multi series, title/subtitle, x/y labels, `colors`, `showValues`, `showGrid`, `legend` bottom/right/none, `showDots`, `yTicks`, `fullWidth` (+ container/wrapperPadding), `noWrap`. Shapes are SVG; **all text (ticks, labels, values) is real HTML text** (selectable/searchable; pdfcn needed an overlay fallback because Takumi turns SVG `<text>` into outlines).
- **QRCode**: uses the `qrcode` npm package, the same library pdfcn uses (`QRCode.create(...).modules`); drawn as one SVG `<path>` (a run per row of dark modules). Justification: Reed-Solomon + mask selection is not "a few lines"; `qrcode` is small, runs in Node and the browser, and matches pdfcn's output. Props: value, size (pt), color, backgroundColor (or transparent), errorLevel, margin, caption.
- **Alert** (info/success/warning/error, title, showIcon, showBorder; renders nothing when empty), **Badge** (7 variants x 3 sizes, label or slot, background/color), **Form** (pdfcn's *printable blank form*: title/subtitle, groups with single/two/three-column layout, fields {label, hint, height, width}, variants underline/box/outlined/ghost, labelPosition above/left; note pdfcn's Form has no checkbox/radio/select fields, and neither does this), **Signature** (single/double/inline), **PdfImage** (variants default/full-width/thumbnail/avatar/cover/bordered/rounded, width/height (pt), fit, position, caption, aspectRatio, borderRadius, noWrap).
- **Images in the render core**: `<img src>` values are resolved by `renderPdf`: `data:` URIs as-is, **http(s) URLs fetched automatically** (Node and browser, honors the AbortSignal), names registered through `options.images` ([{src,data}] or {sources}). Anything else raises a clear error naming the src; `missingImages: "ignore"` leaves a blank space instead. Not supported: pdfcn's `src` object with `method/headers/body` (pass bytes through `options.images` instead).
- Playground: sidebar lists the 10 new components (E2E-only fixtures `tall-*`, remote image are `hidden`). Default theme comment block explains the pt-based scale (`text-sm` = 12pt etc.).

**Run**
```
node scripts/e2e-phase2b.mjs     # writes out/phase2b/*.pdf, *.png, browser-*.pdf, report.md
```
Dev-only dependency `jsqr` decodes the QR renders; runtime additions: `qrcode`.

**Result: 159/159 PASS** (table in `out/phase2b/report.md`; Table 18, DataTable 15, KeyValue 10, Graph 15, QRCode 7, Alert 8, Badge 10, Form 9, Signature 8, PdfImage 19, oversized break-inside-avoid 11, playground 5, render 24).
Evidence: extracted text per variant; bbox geometry (columns, gaps, alignment, field heights); pixel samples (header fills, borders, stripes, slice areas = 20/30/15/35%, bar heights vs y ticks, icon/variant colors, image fit/crop extents); page breaks over **120-row Table and 150-row DataTable** (header on every page, every row once and in order, multi-line rows never split, nothing past the bottom margin, footer at the end, header never overlaps the first row); **QR codes decode** (jsQR on a 220dpi render: URL, UTF-8/CJK, levels L/M/Q/H, token colors, transparent background, 300-char payload, in Node and in Chromium; control: a 40dpi render and a blanked finder pattern do not decode); images: data URI, named source, http(s) URL (Node fetch stub and Chromium route), 404 error, missing-image error / ignore, abort; Node vs Chromium text + page count identical for all 13 demos.
Mutation-checked (each turns its check red): `<thead>` -> `<tbody>`, QR rows dropped, bar heights scaled by 0.8 (caught by the new "bar top meets its y tick" check; a uniform scale passed the earlier ratio-only check).

**Phase 2a review items**
1. *Oversized break-inside-avoid* (Card default, KeepTogether, Section noWrap, List noWrap, Alert, Table/DataTable noWrap, KeyValue noWrap, Form noWrap, Graph, PdfImage): Takumi splits a block taller than a page instead of losing it. Verified for 60-item Card/KeepTogether/Section/List/Alert/Table/DataTable/KeyValue and a 40-field Form: all lines present, text before/after kept, nothing below the bottom margin, last line of every page inked (not clipped). A 400x1200pt image and a 3000pt chart are **sliced across pages, fully drawn once** (100% / 97% of expected pixel area).
2. `default.css` comment block added (why 12pt / 15pt / 11pt, how to switch to px).
3. Playground sidebar has all components.

**Takumi limits found in 2b**
- `var()` is not resolved in SVG `fill` / `stroke` (attribute, `style`, or `color` on an SVG child): shapes render black. It **is** resolved as `color` / `background-color` on an HTML element. Graph draws one SVG layer per (z-rank, color) inside a wrapper `div` that carries the color (`fill="currentColor"`); QRCode puts its colors on a wrapper div.
- SVG `<text>` is rendered as vector outlines (not selectable, not extractable): chart text is HTML.
- A missing `<img>` source is silently blank in Takumi: `renderPdf` now checks sources itself.
- Narrow columns wrap at hyphens (`DT-QTY` -> `DT-` / `QTY`): fixed-width columns need room for the longest hyphenated word.
- `tr { break-inside: avoid }` is not needed: Takumi never splits a table row (verified with and without the class); `<thead>` repeats by default, `<tfoot>` is drawn once at the end.
- `border-collapse` is not needed: `td` borders (`border-b`, `border-r`, `last:border-r-0`) and `even:` stripes work; rounded table frames need a wrapper (`overflow-hidden`) since `<table>` cannot clip.

**Deliberate differences from pdfcn**
- Graph: y-axis uses "nice" ticks (0/60/120/180/240 for max 210) instead of equal divisions of min..max (56.7/113.4/...); legend lists slices for pie/donut and is omitted for a single unnamed series (pdfcn shows "Series 1"); grid lines are drawn *under* the data.
- Table: header repeats on every page (real `<thead>`); body cell line-height 1.2 as pdfcn.
- Form hint uses 14% color alpha (pdfcn's `opacity: 0.14`, which clips text in Takumi).
- DataTable: Vue `render(value,row)` returns a VNode/string (or use the scoped slot).

**Known gaps**
- Graph text labels are positioned in a fixed 64pt box (longer labels are truncated by the same `truncate()` rules as pdfcn: 8-14 chars).
- `fullWidth` assumes an A4 page with 30pt margins (the E2E/playground default); other page sizes pass `width`.
- Alert/Badge use pdfcn's 2pt borders (Badge) and 4pt bars; same low `muted-foreground` contrast note as 2a.
- `PdfImage` does not support `src: { uri, method, headers, body }` request options (use `options.images` with fetched bytes).
- Remote images are not cached across `renderPdf` calls in Node (the browser HTTP cache covers it there).

## Phase 2b follow-ups (done before 3a)
- Form hint: now `muted-foreground` at 65% (was 14%): 203 px of rgb(194,194,200) in the E2E, lighter than the label (luminance 195 vs 162). Check updated.
- Graph `yLabel`: gets its own 12pt row above the plot (gap to the top tick label 9.5pt, was overlapping); new E2E check (>= 3pt gap).

## Phase 3a: invoice blocks (classic, consultant, corporate, creative, minimal, modern)

**Built** (`src/blocks/Invoice<Name>/Invoice<Name>.vue`, shared pieces in `src/blocks/shared/`, exports in `src/blocks/index.js`)
- Same data shape as pdfcn's `InvoiceXData` (`invoiceNumber, invoiceDate, dueDate, companyName, subtitle, companyAddress, companyEmail, logo?, billTo{name,address,email,phone}, items[{description,quantity,unitPrice}] (consultant: services[{description,hours,rate}] + consultant/client/projectRef), paymentTerms{dueDate,method,gst}, notes?`). Props: `data` (defaults to a neutral Acme sample, exported as `invoiceXSample`), `currency` ("USD"), `locale` ("en-US"), creative also `accent`. Class passthrough on the root (`cn`-merged).
- **Totals are computed from the items** (+ `data.taxRate`, e.g. 0.07), not trusted from `data.summary` as in pdfcn (stale if items change). `data.summary` still works as an explicit override. Money is formatted through `Intl.NumberFormat` (`$12,500.00`, other currencies/locales via props: `4.229,83 €`, `¥3,300`); math is rounded to cents (3 x 0.1 = $0.30). Tax label comes from the rate ("Tax (8.25%)", "Tax" at 0).
- Composed from the phase 2 components: PageHeader (logo-left / logo-right / centered / minimal / branded), Section, Text, KeyValue, DataTable (variants grid, line, bordered, striped, compact, primary-header), Badge, plus `shared/Label`, `shared/Totals` (KeyValue), `shared/Mark` (logo image or monogram), `shared/Footer`. Totals blocks and the details row are `no-wrap` (never split across pages).
- **Footer is a repeating band**: pass `{ footer: InvoiceFooter }` (creative: `InvoiceCreativeFooter`) and `...blockPage` (A4, 56pt margins, bottom reserved by the band) to `renderPdf`; it shows left text (`footerText ?? notes`) and **"Page n of N" on every page** (pdfcn hardcodes "Page 1 of 1"). The footer receives the same props as the block, so pass `{ data }`.
- Playground: sidebar "Blocks" group with the six invoices; a hidden 60-item fixture for the browser check.
- Table component changes made while matching: `<td>` rows got `break-inside-avoid` (fixes a sliver of the next row painted at the bottom of a page), cell padding 5.5pt (matches pdfcn's row pitch), KeyValue line-height 1.35 (pdfcn's rows are tighter than the 1.65 body leading).

**Run**
```
node scripts/e2e-phase3a.mjs     # out/phase3a/*.pdf, compare/invoice-<block>-1.png (ours LEFT, pdfcn reference RIGHT), report.md
```

**Result: 171/171 PASS** per block: renders one A4 page; every section/label/data string present; footer; computed totals match; compare PNG; layout anchors within tolerance of the pdfcn reference PDF. Totals math (x6): edited items -> line totals/subtotal/tax/total with float-safe rounding, no stale sample totals, grand total on its label's line, `summary` override, taxRate 0, EUR/de-DE and JPY. Multi-page (x6, 60 items, 3-4 pages): header repeats on every page with rows, all rows once in order, rows never split, totals whole, math over 60 rows, footer "Page n of N" on every page, nothing clipped or overlapping the footer, no next-row sliver, plus a sweep of 21 invoice lengths (14..34 items) where the totals box must never split. CJK (x6): company/client/items/notes/footer render, Noto embedded, totals right. Class passthrough, default props, neutral data (no "pdfcn" text). Chromium: all 6 blocks + a 3-page invoice have identical text and page count to Node, no console errors.
Mutation-checked: tax multiplier broken -> all six totals checks fail; `no-wrap` removed from classic/modern totals -> the length sweep fails (15-16 / 14-15 items split); `<td>` break-avoid removed -> the sliver check fails.

**Where ours still differs visually from pdfcn (honest list; see the compare PNGs)**
1. **Font**: pdfcn's references use Geist; we render Inter. Glyph widths differ by a few percent, so some strings wrap or end at slightly different x (the creative subtitle had to be shortened in the sample data to stay on one line).
2. **Logo**: pdfcn shows its own favicon; ours is a monogram square from the company name (or your `logo` image). Intentional (no third-party branding).
3. **Money**: pdfcn mixes `$12500`, `$12,500` and `$12500.00` within one invoice; ours is always `$12,500.00`.
4. **Table columns**: pdfcn uses equal-width columns, so descriptions wrap onto two lines; ours uses auto layout, so descriptions stay on one line and rows are shorter. (consultant, corporate, creative, minimal, classic all differ this way; row pitch matches for single-line rows.)
5. **Block palette**: the reference invoices use a darker muted-foreground (about #71717a) and muted fill (#f4f4f5) than the library's default theme; the blocks set those two CSS variables on their root so they match (and have better print contrast).
6. **minimal header**: pdfcn's header sits 36pt lower (a Section margin at the top of the page); ours starts at the page margin like the other five.
7. **Footer**: ours is a real repeating band with a page counter on every page; pdfcn's is a sticky box with a fixed "Page 1 of 1". The creative reference shows only the rule (its centered text never renders there); ours shows the thank-you line and "Page n of N".
8. **Spacing**: matched by measurement to within a few pt (invoice number +-1.6pt, table header +-8pt, totals depend on row wrapping); vertical drift of up to ~25pt remains on invoices where pdfcn's rows wrap (consultant, corporate, creative).
9. **Fields pdfcn does not render**: classic never shows `invoiceDate` or `billTo.phone`; corporate never shows `paymentTerms.gst`; we keep those as-is for drop-in parity.
10. **Consultant callout / creative notes** use slightly different padding than pdfcn (their Text keeps a 14pt paragraph margin inside the callout).

**Regression (all scripts re-run at the end of 3a):** phase 1 headless 22/22 (headed: 4 PASS + 2 INFO), 2a 139/139, 2b 160/160, 3a 171/171.
2b changes: the long-table checks now say "every page that has rows" (the `td` break-avoid change moved the after-table paragraph onto its own last page, which is correct) and the footer check asserts the `tfoot` is drawn once right after the last row.
Not done / next: blocks 3b (report-*, event-*, gift-certificate, lesson-plan, medical-intake-form, meeting-minutes, packing-slip, press-release, shipping-label, work-order). 

## Housekeeping before 3b-1
- `LICENSE` (MIT, "pdfwind contributors"), `THIRD_PARTY_NOTICES.md` (pdfcn, shadcn-labs, MIT; PDFx, akii09, MIT; both licence texts copied verbatim and checked equal to the upstream `LICENSE` files), `README.md` (what it is, dev setup, playground, every E2E script, status, credits).
- Licence finding: **both pdfcn and PDFx are MIT**. pdfwind ports pdfcn's design/props/theme values/chart math (credited); no PDFx code is used (it was read for ideas only), but its notice is included anyway.

## Phase 3b-1: report-financial / marketing / operations / security, event-agenda, event-ticket, gift-certificate

**Built** (`src/blocks/<Name>/<Name>.vue`; samples in `src/blocks/report.js` and `src/blocks/event.js`; shared `shared/ReportLayout.vue`, `shared/ReportFooter.vue`, `EventAgenda/EventAgendaFooter.vue`)
- pdfcn's data shapes: reports take `BaseReportData` (`title, subtitle, generatedAt, period, author, summary[{label,value,trend,tone}], rows[{label,owner,status,progress,risk}], series[{label,value}], highlights[]`), agenda `EventAgendaProps` (days/sessions/tracks/accentColor/wifiInfo/emergencyContact), ticket `EventTicketData`, certificate `GiftCertificateData`; all through a `data` prop with neutral samples (no real names, no "React Summit", no ShadCN). Class passthrough on every root.
- **The four reports are one layout** (`ReportLayout`) with per-block config (graph variant, colors, status badge), as in pdfcn: page 1 header + status + executive summary (2x2 metric cards), page 2 chart (Graph: line, bar, horizontal-bar, donut) + delivery table (DataTable compact, striped, totals row), page 3 highlights checklist + key figures. **Math from props**: Open Risks (rows with risk != Low), On-Track n/m, Avg Progress and the table Totals are computed from `rows`. A report with many rows flows over extra pages with the table header repeating.
- **Every block exports its recommended render options** (`export const renderOptions` in the SFC's plain `<script>`, re-exported from `src/blocks/index.js` as `reportFinancialOptions`, `eventAgendaOptions`, `eventTicketOptions`, `giftCertificateOptions`, ...): page `size`, `margin` and the footer band. `renderPdf(Block, { data }, renderOptions)` is all it takes: the ticket renders at exactly 504 x 252 pt (7in x 3.5in = `size: { width: 672, height: 336 }`, margin 0), the certificate at A4 portrait with 66pt margins (the reference is A4 portrait: the block's own 841x595 size cannot hold its content), reports at A4 with 48pt margins, the agenda at A4 with 32pt margins. **The playground uses these exported options directly** (no per-block code there); the Chromium run produces the same page sizes as the references.
- Footer bands: reports = "Confidential — Internal Use" + "Page n of N" (inset 48pt); agenda = Wi-Fi + organizers desk + "Page n of N". Both repeat on every page.
- Agenda: one page per day, parallel sessions of one time slot side by side, break cards, track colors, accent color; a very long day continues on further pages with correct counters.
- Ticket: QR (our QRCode, decodes to the ticket number), accent stripe + stub, readable ink chosen from the accent's luminance, notches and a dashed perforation drawn as SVG (Takumi draws dashed borders only on all four sides). Certificate: framed card, amount via `Intl.NumberFormat` (`$1,234.50`, `1.234,50 €`, `¥3,000`), accent color drives frame/title/amount/validity.
- Library changes while matching: compact `DataTable` headers are mixed case like pdfcn's (not uppercase); `shared/Footer` got `inset`, `lift` and `variant` props.

**Run**
```
node scripts/e2e-phase3b1.mjs     # out/phase3b1/*.pdf, compare/<block>-N.png (ours LEFT, pdfcn RIGHT), report.md
```

**Result: 122/122 PASS** (per block: renderOptions exported, page size equals the reference PDF, compare PNGs; reports: all sections, content on the right pages, footer + counters on 3 pages, nothing overlapping, math from edited rows, 45-row overflow with repeating header and correct counters, chart pixel evidence, chart reacts to data, CJK, passthrough, defaults; agenda/ticket/certificate: see `out/phase3b1/report.md`). Chart evidence: line (#0F172A, rising), bars (12 in #0EA5E9, height ratio 1.31 = 72/55), horizontal bars (#2563EB, lengths proportional to 66/77/85/91), donut (area shares 32.7 / 39.7 / 18.5 / 9.1 % vs 14/17/8/4 of 43). Ticket QR decodes to `TKT-00142`. Mutation-checked: Avg Progress divisor, QR payload and the agenda's per-day page break each turn their checks red.

**Defect found by the E2E and fixed**: wide letter-spaced caps (>= about 0.1em: "DATE", "SEAT", "EVENT AGENDA", "CERTIFICATE CODE") make text extraction split them into single letters, so they were not searchable/copyable. Tracking is now at most ~0.07em on those labels (the same limit applies to the 3a labels: 0.5-0.6pt).

**Where ours differs visually from pdfcn (see compare PNGs)**
1. Font: Inter instead of Geist; the certificate code is Inter, not Courier (no monospace face bundled).
2. Logos: pdfcn's favicon is replaced by a monogram square (or your image) on the ticket and certificate.
3. Reports: the reference header shows only title + subtitle (its two-column header drops period/"Generated" text); ours shows period and generated date at the right. Chart y-axes use round ticks (0/25/50...) instead of 23.8/47.5; checklist items show a tick in the box (pdfcn's boxes are empty green squares); striped table rows are slightly darker; compact DataTable totals show `78%` (pdfcn `78`).
4. Agenda: pdfcn's reference PDF has 3 pages (day pages overflow so a footer-only page appears); ours is 2 clean pages. Sample speakers are fictional.
5. Certificate: vertical rhythm matched by measurement but the frame is ~5% shorter than pdfcn's (their section margins are 36pt each); title tracking reduced (extraction, above).
6. Ticket: matches closely (size exact, stub, notches, QR). Social handles are on one line.
7. Spacing drift on the reports is within a few pt after two fix rounds.

**Known gaps**: agenda day header/banner is not repeated on a day's continuation pages (the footer is); report page breaks are explicit (a very long highlights list continues on a 4th page); certificate content taller than one A4 page splits (a long message plus long terms needs more than the ~70pt spare); `Courier`/monospace is not available.


## Phase 3b-2: lesson-plan / medical-intake-form / meeting-minutes / packing-slip / press-release / shipping-label / work-order

**Built** (`src/blocks/<Name>/<Name>.vue`, pdfcn props + default data, neutral sample data in `src/blocks/doc.js`; each block exports its recommended `renderOptions`, the playground uses them):
- lesson-plan (2 pages: info + sequence | differentiation..reflection with 8 writing lines), medical-intake-form (2 pages, uses `Form` + `Signature`, section toggles default true), meeting-minutes (2 pages, status Badges), packing-slip, press-release, work-order (A4, 1 page each), shipping-label (4 x 6 in = 288 x 432 pt via `{ size: {width:384,height:576}, margin: 0 }`, QR of the tracking number).
- Footer bands (`src/blocks/footers.js` + 2 block-local footers) repeat on every page with "Page n of N".
- Derived from props: lesson sequence minutes total (vs `duration`), packing slip line totals + "Items Packed x of y", work-order parts/labor/tax/grand total (rounded per step), shipping postage default "PAID".

**Run**
```
node scripts/e2e-phase3b2.mjs     # out/phase3b2/*.pdf, compare/<block>-N.png (ours LEFT, pdfcn RIGHT), report.md
```

**Result: 122/122 PASS.** Per block: renderOptions exported, page size equals the reference PDF (pdfinfo), page count equals reference, all section text, defaults without props (no pdfcn text), class passthrough, CJK (Noto embedded). Plus: lesson total/accent/8 ruled lines/grid columns; medical field underline rules, checkbox outlines, medication grid rules, signature line, toggles; meeting statuses -> distinct badges, all-Complete mutation, optional parts omitted; packing math + EUR/de-DE; press order, accent quote bar, long body flows to page 2; label exact size, QR decodes (jsQR 300dpi), tracking-number mutation, "PAID" default; work-order totals incl. tax 0, 4 priority badge fills differ, signature rules; Chromium text + pages + size parity for all 7 and QR decode; no console errors.
Mutation checks run by hand (not left in the repo): QR value forced to "WRONG" -> 3 shipping-label checks + the Chromium QR check fail; work-order tax computed on parts only -> 2 math checks fail. Both reverted; full run is green again.

Work-order overflow was resolved with explicit column widths and spacing; lesson-plan time/activity columns were also resized.

**Where ours differs visually from pdfcn (see compare PNGs)**
1. Font: Inter instead of Geist.
2. Logos: monogram square (or your image) instead of pdfcn's favicon on packing slip, work order, medical form.
3. Lesson plan: added a "Total" footer row to the sequence table (sum of minutes, matches duration); pdfcn has none. Page 1 is a bit taller than pdfcn's.
4. Footers: ours show "Page n of N" counters (pdfcn's footers are static text) for lesson plan, meeting minutes, packing slip, work order, medical form; press release shows the social platforms on the right instead.
5. Meeting minutes: action-item owner/date columns narrower so names/dates wrap ("Jordan / Lee", "Sep 19, / 2026"); text slightly larger.
6. Press release: neutral de-branded sample copy ("DocKit"); heading line breaks are the same width but wrap one word differently.
7. Shipping label: matches closely; our content block is spaced to fill the 432 pt height. Barcode image slot (`barcodeUrl`) is supported but the sample uses the QR.
8. Work order: `accentColor` is accepted but, like the reference page, nothing is drawn in it (priority/job type badges use theme variants). Vertical rhythm within a few pt (6-18 pt on lower sections).
9. Medical form: footer address wraps to a 2nd line in both (same as reference).

**Known gaps**: letter-spaced caps kept <= 0.07em for text extraction; medical form/lesson plan break explicitly (PageBreak) so very long custom content on a page would overflow onto extra pages rather than re-flow to the same 2-page layout.

## Phase 4a: themes + fonts

**Built**
- `src/themes/<name>.css` for pdfcn's 9 themes (blueprint corporate elegant executive forest minimal modern professional vivid), generated from pdfcn's theme files and then checked against them by the E2E (12 colors, paragraph/component/section gaps, body size + line height, h1-h6 sizes, heading line height, page margins, font names: 9 x 31 values identical). Variables only, our semantic token names; the extensions are `--font-heading` (Heading uses `font-heading`) and `--block-muted` / `--block-muted-foreground` (see below). `default.css` stays the default.
- `src/themes/index.js`: per-theme meta `{ name, description, pdfcn fonts, families (rendered), fonts (files, weight, style), bodySize, h1, page.margin (CSS px) }`, `themeNames`, `getTheme(name)` (unknown -> `Unknown theme "x". Valid themes: default, blueprint, ...`).
- `renderPdf(Comp, props, { theme })` (Node + browser, shared `core.js`); `<PdfPreview :options="{ theme }">` re-renders in place (same node, same two iframes). `themeCss` still layers on top (default -> named theme -> your css). `src/render/themes.js` builds lazy per-theme loaders; the browser entry imports each theme's CSS as a lazy chunk and fonts as URLs only.
- Fonts (`fonts/*.woff2`, latin subset, copied unmodified from fontsource; variable except Lato 400/700): Nunito 39K+italic 42K, Merriweather 98K, Lato 24+23K+italic 24K, Playfair Display 38K, Open Sans 48K+italic 50K, Lora 38K+italic 41K, Source Code Pro 22K+italic 22K, JetBrains Mono 40K. Italic only for body families and only registered when the markup uses italics. OFL texts in `fonts/OFL-<Family>.txt`, credited in THIRD_PARTY_NOTICES.md. No TTFs added.
- Substitutions (documented in `src/themes/index.js`): pdfcn's own preview leaves the base-14 names to the PDF viewer's built-in fonts and loads only the Google families from fontsource. Takumi has none, so Helvetica -> Inter, Times-Roman -> Lora, Courier -> Source Code Pro. Affects: minimal (body Helvetica->Inter, headings Courier->Source Code Pro), modern (all Inter), professional (Inter body, Lora headings). Nunito, Merriweather, Lato, Playfair Display, Open Sans, Lora, Source Code Pro, JetBrains Mono, Inter are the real families.
- Playground: theme picker (fieldset "Theme", 10 native radios, labelled, arrow keys, visible focus ring, `?theme=` deep link) re-renders the current demo; new demo "Theme sampler (every component)".

**Run**
```
node scripts/e2e-phase4a.mjs     # out/phase4a/report.md, pdf/<theme>/<doc>.pdf, themes-invoice-modern.png, themes-report-financial.png, themes-components.png
```

**Result: see the totals pasted in the phase 4a report** (49 checks + 4 info rows when this section was written). Matrix: 10 themes x (20 blocks + sampler) = 210 PDFs.
- Fonts per theme (pdffonts) match the theme meta in all 210; no Inter or other-theme face leaks; heading family present in the sampler; italic embedded for the press-release quote in all 10; CJK fallback and "Noto only when CJK" hold.
- Colors: each theme's primary/muted/border/status/accent/foreground/muted-foreground appear in the rendered sampler (pixel counts); white background.
- Heading ink-height ratios match the h1-h6 sizes of every theme.
- Page counts within +-1 of default for all 210. Exceptions (+1, blueprint's wider 10pt mono): medical-intake-form 2->3, press-release 1->2, work-order 1->2. Ticket/label/certificate stay 1 page; page sizes unchanged.
- No text outside the page, no text drawn over text (sampler's watermark letters excluded), "Page i of N" correct on every page wherever default has it.
- Browser: switching to vivid fetched only `Nunito.woff2`; to executive only `OpenSans.woff2` + `Merriweather.woff2`; files of never-selected themes never requested; no Noto request until CJK text. Switch latency (render ms, median of 5): 39 ms cold-ish, 30 ms warm; the wall time is ~2.1 s per switch because headless Chromium never fires the PDF viewer's `load`, so PdfPreview's 2 s fallback swap runs (existing behaviour, not caused by themes). Node vs Chromium parity (text, pages, font families) for vivid/elegant/blueprint x invoice-modern/report-financial/sampler: 9/9.
- Mutation checks by hand (reverted): vivid `--primary` changed one digit -> the pdfcn-equality check fails; Nunito mapped to Lora.woff2 and Noto filter removed in core -> fonts checks + concurrent-isolation check fail (4 checks).

**Contrast (reported, not tweaked): pdfcn's own values**
- Below 4.5:1 for body-size text: `minimal` and the default theme muted-foreground `#a1a1aa` on white 2.56:1 (on muted 2.46); `executive` and `modern` muted-foreground on muted 4.34:1; `professional` on muted 4.40:1.
- Fine: foreground/background 9.1-17.9 everywhere; primary-foreground/primary 5.02 (forest) to 17.7; `corporate`, `elegant`, `forest`, `vivid`, `blueprint` muted-foreground/background 4.76-7.58.
- Blocks drawn with muted-foreground at 9-10pt (labels) therefore fail AA in `minimal`. The default theme is not affected in blocks, see next point.

**Block muted pair**: since 3a the blocks pin `--muted: #f4f4f5` / `--muted-foreground: #71717a` (the pdfcn reference PDFs were rendered with a darker pair; those are `professional`'s values). That pin overrode every theme. Now blocks take `var(--block-muted-foreground, #71717a)`: the default theme keeps the pinned pair (so phases 3a-3b2 stay matched to the reference), a named theme defines `--block-*` with its own colors (literal values: Takumi does not resolve `--a: var(--b)` chains where `--b` is redefined further down). Consequence: `theme: "minimal"` shows pdfcn's light `#a1a1aa` in blocks, `theme: "default"` shows `#71717a`.

**Where themes deviate from pdfcn and why**
1. Fonts: Helvetica/Times-Roman/Courier replaced as above (Takumi has no built-in fonts). The Google families are the real ones, latin subset (no latin-ext: not needed for the sample data; accents in Latin-1 are covered).
2. `minimal`: pdfcn's heading font is Courier, rendered with Source Code Pro; the default theme (= minimal's palette/spacing) keeps Inter headings because the blocks were matched against that look. So `default` and `minimal` differ in heading font and in the block muted pair.
3. Heading weight: pdfcn's Heading always uses bold (the theme's `fontWeight` 600 for minimal/modern is not used by its Heading), same here.
4. Page margins: kept as meta (`page.margin`, CSS px), not applied automatically; blocks keep their own `renderOptions` margins (as in pdfcn, where blocks pad themselves with `theme.spacing.page`; ours use block-specific values matched to the reference render).
5. Block accent colors that come from data (`accentColor`) or are fixed in a block (e.g. report status colors, certificate gold) are not themed, same as pdfcn.
6. Italic: heading-only families (Merriweather, Playfair Display, JetBrains Mono) have no italic face, so italic headings are slanted by the engine.
7. Blueprint (10pt mono, line-height 1.75) is the widest theme: three blocks grow one page (above).
8. Not done on purpose: latin-ext subsets, a Theme Builder (4b), automatic page-margin application.

**Known gaps**: font payload is 80-190 KB for the Google-family themes but 720-815 KB when Inter is involved (default, forest, minimal, modern, professional: Inter 350K + Inter Italic 385K were already bundled in earlier phases; subsetting them is future work). Only the E2E-measured combinations are guaranteed; custom `themeCss` that changes `font-family` needs its own font passed in `fonts`.

## Phase 4b: Theme Builder

**Open it**: `pnpm exec vite` (root `playground`) then `?view=builder`, or the "Open the Theme Builder" link in the playground sidebar. Deep links: `?view=builder&base=vivid&doc=components-all`.

**Built**
- `src/themes/builder.js` (pure, no DOM; usable in Node): the state shape, `toCss` / `fromCss` (importer with `{ state, issues, applied }`), `baseState(name, css)` (any registry theme as a state, parsed from its CSS file), `toRegistryObject` / `toRegistryJs`, WCAG `contrastPairs`, heading scale presets, ranges for every control.
- Render path (`src/render/core.js`): `themeCss` can now choose fonts: `--font-body` / `--font-heading` in the merged CSS (last wins) select bundled families and their faces load lazily; an unbundled name throws naming the bundled ones (unless a matching `fonts` entry is passed). Family loaders moved to `src/render/themes.js` (`familyResources`); named themes only contribute CSS. The Tailwind compiler cache is an LRU of 12 (the builder makes a new CSS string per edit).
- `playground/Builder.vue` + `playground/builder/{store.js,NumberField.vue,ColorField.vue}`: left panel (start from any of the 10 themes / current state, 12 colors, contrast panel, body/heading font from the 9 bundled families, body size, line heights, heading scale preset + h1-h6, three gaps, four page margins, per-control reset, Reset all), right live `<PdfPreview>` of any visible demo (invoice-modern default, the components sampler, every block). The preview renders from `themeCss: toCss(state)` and `margin`, exactly the production path; no named theme is involved.
- History: live preview on `input`, one entry on `change` (slider release, picker close, hex Enter/blur), bursts of the same control within 600 ms coalesce (arrow-key stepping), limit 30, Cmd/Ctrl+Z, Shift+Z, Ctrl+Y (not inside text/number/textarea, which keep their native undo), clone / reset all / import are undoable steps. Persistence: `localStorage` (versioned JSON: state + document; guarded getter, `setItem` and JSON/shape validation; the page says "storage blocked, not saved" when it cannot).
- Export: generated CSS or the `src/themes/index.js` entry as a JS object, Copy (button turns into "Copied" for 1.6 s, announced) and Download theme.css / theme.js. Import: paste or choose a .css file; every declaration is applied or reported (Rejected = bad value, old value kept; Ignored = unknown / fixed; Note = normalized or derived).
- `PdfPreview`: the hidden back iframe is now `inert` with a distinct title (keyboard users and axe no longer see two identical PDF viewers). `playground/index.html` got `<html lang="en">`. `playground/main.js` loads the builder or the playground by `?view=`.
- Blocks follow the builder's muted colors: the CSS exports `--block-muted` / `--block-muted-foreground` as literal copies (4a limitation), the importer treats them as derived.

**Run**
```
node scripts/e2e-phase4b.mjs     # out/phase4b/report.md, pdf/*.pdf, theme.css, builder-1280.png, builder-360.png, builder-360-preview.png
```
(axe-core is a dev dependency. Screenshots are headless by default; PDFWIND_HEADED=1 opts into visible PDF viewers.)

**Result: 98/98 PASS** (+1 info row). Pure model: all 10 shipped CSS files parse clean, `toCss(fromCss(toCss(x)))` is a fixed point, 200 random states round trip, the importer reports unknown / out-of-range / bad hex / rgb() / fixed-scale / unbundled font / derived values, contrast equals an independent implementation (300 random pairs + textbook values). Browser: hex field and color picker change preview pixels, invalid hex and out-of-range numbers are rejected with linked messages and no state change, font selects embed the family (read from the PDF) and fetch only that family's file, margins shift the text ~48 pt and are reported as not applied for fixed-size documents (shipping-label stays 288x432), clone vivid equals the parsed theme, reset per control and Reset all, a slider drag of ~25 input events is one undo step, Ctrl/Cmd+Z / Shift+Z / Ctrl+Y restore exact text and pixels, limit 30 after 36 edits, reload restores the theme and document, garbage / invalid / blocked / full storage do not crash, export -> import in a fresh browser context is state-equal and pixel-equal (72 and 144 dpi), download and clipboard match the box, messy imports explain every line, contrast panel numbers and Pass/Fail words equal the script's own calculation for 3 states, keyboard-only run (every control kind), Tab visits all N stops in DOM order with a visible ring on each, hit areas >= 40 px at 1280 and 360, no `transition: all` and <= 200 ms ease-out, 0 ms under reduced motion, concentric radii (16 = 8 + 8), layout-shift ~0 and the previous PDF always visible, dark vs light chrome gives identical PDFs, axe-core zero violations in 4 scans (1280 light, with error messages shown, 1280 dark, 360).
Mutation checks by hand (reverted): contrast threshold 4.0 + a wrong sRGB constant -> the model check and the 4 contrast checks fail; history coalescing disabled -> the arrow-key coalescing check fails (the slider-drag check still passes because the drag commits on `change`, as designed).

**Corrections found by the E2E**: two announcements in the same moment overwrote each other (import summary vs contrast warning) -> merged into one polite message; the page re-saved its state on unload, so "clear storage + reload" did not reset (test now uses fresh contexts); two lang/inert accessibility defects (html lang, duplicate PDF viewer iframes).

**Known gaps / honest notes**
- Page margins are a render option, not CSS: the builder applies them to A4 documents (bottom stays automatic for blocks with a footer band) and says so; they are exported as `--page-margin-*` custom properties that `renderPdf` ignores. Fixed-size documents (ticket, label) ignore them.
- Only the 12 colors, 2 fonts, sizes, gaps and margins are editable; the Tailwind-side type scale (`--text-xs..3xl`), radii and `--spacing` are fixed and reported as such if edited in imported CSS. Heading weight/tracking are not themeable (pdfcn's Heading is always bold).
- Hex colors only (#rrggbb; #rgb is expanded with a note, rgb()/hsl()/alpha are rejected with an explanation).
- Fonts are the 9 bundled families (latin subset); a custom font needs the `fonts` option in code, not the builder.
- The undo history is not persisted across reloads (state is); `Ctrl+Z` inside a text field undoes typing, not the theme.
- The preview waits for the PDF viewer's `load` (or PdfPreview's 2 s fallback) before it swaps; in headless Chromium each re-render therefore takes ~2 s wall time (the render itself ~30-50 ms). Real browsers swap sooner.
- The contrast panel checks the four pairs asked for (4.5:1, body text); it does not check border/muted fills or status colors against the background, and shows no large-text (3:1) result.
- No README screenshots added to `docs/images` (`scripts/screenshots.sh` not extended); the E2E writes `out/phase4b/builder-1280.png` and `builder-360.png`.

## Default contrast, color tokens + dark theme, llms.txt, Nuxt example, README showcase (phase 5, minimal slice)

### Part 0: accessible default muted-foreground
- Decision: the default theme's `--muted-foreground` is `#71717a` (pdfcn's `minimal` keeps `#a1a1aa`, 2.56:1 on white, 2.46:1 on muted). Computed on the zinc-400 -> zinc-500 line: the lightest tint reaching 4.5:1 on BOTH the default background (#ffffff) and muted (#fafafa) is `#72727b` (4.76 / 4.56). I took `#71717a` (Tailwind zinc-500, 4.83 / 4.63): one RGB step darker, and the value the blocks already pinned, so the pins became redundant. Deviation from "lightest" is that one step.
- `default` is therefore no longer identical to `minimal` (it differs in muted-foreground, and keeps Inter headings, see 4a). `src/themes/default.css` says so; the registry description says so.
- Pins removed (output unchanged, proven): the blocks no longer pin `--muted-foreground` (`blockVars` only hands through `--block-muted`), and the dead `--block-muted-foreground` was removed from the nine theme files and from the builder's CSS (the importer still accepts it when it matches). The muted *fill* stays pinned: default.css defines `--block-muted: #f4f4f5` (the reference invoices' fill, a touch darker than `--muted`), named themes define it as their muted.
- Proof (one-off, before/after of the 210 4a PDFs rasterized at 72 dpi): 206 identical; changed: default `components-all`, `event-ticket`, `gift-certificate`, `shipping-label` (those use `text-muted-foreground` directly, now `#71717a`). All nine named themes: identical for every block. The six invoices and the medical intake form (Form component) are pixel-identical in the default theme (blocks already showed `#71717a`).
- E2E updated honestly: 4a "default keeps the pinned #71717a" -> "default's muted-foreground is #71717a, >= 4.5:1 on its background and muted, minimal keeps #a1a1aa"; 2a/2b expectations use `#71717a` (Link muted and accent are the same color now, minimal still tells them apart in 4a); 4a gained an audit measuring every word of the 21 documents in the default theme (ink = pixel farthest from the word box's background).
- Still below 4.5:1 in the default theme (measured, reported, not changed): muted-foreground `#71717a` on the blocks' pinned muted fill `#f4f4f5` is **4.40:1** (about 190 words: event-agenda dates/times, medical form consent text, invoice labels on tinted panels, packing-slip returns, meeting-minutes, lesson-plan labels); warning `#a16207` on `#f4f4f5` 4.48:1 (work-order "High", report trend badges); Form placeholders/hints 2.54:1 (`#a2a2a8` on white: pdfcn's 65% mix of muted-foreground; "+1 (555) 000-0000", "DD / MM / YYYY", "percent"); event-agenda track tags 3.7-4.4:1 and its "|" / "–" separators 2.6 / 3.7:1 (the tags now use tokens, they were 1.98:1 with the old hex colors). Watermark is decorative and exempt. A darker block fill or `--block-muted` = `--muted` (#fafafa, 4.63:1) would clear most of these; left for your call.
- Contrast panel wording: unchanged ("Resets go back to <base>"); the default now passes all four pairs, the failing path is still covered by the edited-colors state in 4b.

### Colors are tokens (guard, fixes)
- `scripts/check-tokens.mjs` (also run by e2e-phase5, with a self-test on a temp tree): fails on palette classes, arbitrary hex/rgb color classes, `bg-white/black`, `text-white/black` and raw hex/rgb/hsl literals in `src/**/*.vue|js` and `playground/**/*.vue|js|html`. Allowed without a marker: `src/themes/*` (theme definitions), `playground/chrome.css` (the variable definitions) and the E2E fixture pages (`demos.js`, `assets.js`, `DemoDoc.js`). Allowed with a `token-ok: reason` line: QR modules/plates (QRCode defaults, EventTicket and ShippingLabel QR on a white plate) and ink on a user-supplied hex accent (`onColor`). Result: 87 files, 0 violations, 6 token-ok lines.
- Library changes: `lib/ui.js` got `tint()` and `onColor()`; EventAgenda (agenda badge ink was `text-white`, track colors hex), EventTicket, GiftCertificate and InvoiceCreative accept token names or any CSS color for their accents and default to tokens; Graph slice separators / donut hole use `var(--background)` and the 8-color palette ends in tokens; List's star icon uses `currentColor`; Report blocks' chart colors are tokens (primary / success / info; security: destructive, warning, success, info); samples (`doc.js`, `event.js`) use token names (lesson/medical/meeting/press `info`, packing `success`, work-order `warning`, agenda `destructive`, track tags info/success/warning, ticket `accent`, certificate `primary`). `PdfPreview` colors are CSS system colors with `--pdfwind-preview-*` overrides (no hex). A raw color supplied by the user as data is still honored. E2E 3b1/3b2 pixel checks now look for the tokens' default-theme values.

### Dark theme + painted paper
- `renderPdf` paints the page with the active theme's `--background` (the last literal declaration of the merged theme CSS, passed as takumi's `backgroundColor`; an explicit `backgroundColor` option wins) and sets the default text color from `--foreground` on `:root`. Finding: Takumi ignores `body { color / font-size }` rules (only `:root` styles the root), so the default text color was always black; blocks only looked right because every text had an explicit color class. That is fixed for all themes (and `body{...}` in theme CSS stays inert as before).
- `src/themes/dark.css` (+ registry entry `dark`, a pdfwind addition, not pdfcn): all 12 tokens plus `--block-muted`; foreground/background 14.7:1, muted-foreground/background 8.0:1, /muted 7.2:1, primary-foreground/primary 7.6:1, every status color >= 4.5:1 on both. Type scale, gaps, fonts, margins come from default.
- Matrix (e2e-phase5, "dark"): all 34 component demos + the 20 blocks + the showcase under dark and default, equal page counts; every corner and a 3 px frame of every dark page is the dark paper (the last raster column/row is skipped: poppler leaves the fractional-size edge pixel white), no pixel >= 240 outside images/QR (largest connected light region 0 px except QR plates / images), none of the default theme's light surfaces (#ffffff, #fafafa, #f4f4f5) survives in any dark render outside images/QR, text ink vs background sampled over the blocks, sampler and showcase (min and median ratios in the report; the lowest are Form hints at ~4.0:1). Components/blocks that needed changing for this: none beyond the token fixes above and the `:root` ink fix in core. event-ticket, shipping-label and gift-certificate are exempt from the corner check (accent stripe / frame reach the page edge by design).

### Playground chrome
- One stylesheet `playground/chrome.css` (CSS custom properties with `light-dark()`, `color-scheme: light dark`, `data-scheme="light|dark"` override) used by App.vue, Builder.vue, `<PdfPreview>` chrome parts and the theme picker; a 3-state System / Light / Dark radio group (`ThemeToggle.vue`, in the sidebar and the builder header) stored with try/catch, applied by an inline script in `<head>` before first paint (E2E: the scheme is on `<html>` before `<body>` exists). The PDF keeps its own paper (the chrome never changes the PDF: same text and pixels light vs dark).
- E2E: computed colors differ light vs dark on both pages, the toggle overrides the system, persists across reload, "System" clears it, blocked storage works for the session, axe-core 0 serious/critical on both pages in both schemes (+ the toggle override; 5 scans), 1280px screenshots of both pages in both schemes (`out/phase5/{playground,builder}-{light,dark}-1280.png`, headed).
- Playground default view: **the showcase** (`playground/demos.js` "showcase": a realistic two-page customer report built only from components and tokens). The phase 1 scripts now open `?demo=invoice` explicitly (the old default).

### Part 1: llms.txt
- `scripts/gen-llms.mjs` writes `llms.txt` (index) and `llms-full.txt` (29 components, 20 blocks: props, types, defaults, variants (from comments and from the `variants`/`sizes`/`aligns` maps), slots, emits, class passthrough, all parsed with `vue/compiler-sfc`; block data shapes from the live samples and their pdfcn comments; render options; the `renderPdf` option table parsed from core.js; themes, fonts, Takumi limits from docs/development/PROGRESS.md; 3 runnable examples). Deterministic, `--check` for staleness. Committed at the repository root (generated; regenerate with `node scripts/gen-llms.mjs`).
- E2E (phase5 "llms"): every component/block heading and index entry, every `defineProps` binding (compileScript) appears in its table, spot checks on defaults/variants/slots, byte-identical regeneration, `--check`, and the 3 examples are extracted from llms-full.txt and run through Vite SSR in Node: PDF with the expected text; the custom-theme example embeds Nunito, Lora and Noto.

### Part 2: Nuxt example (`examples/nuxt`)
- Nuxt 4, own `package.json`; `cd examples/nuxt && pnpm install && pnpm dev`. `GET /api/invoice.pdf?theme=&number=&company=&client=&currency=` (validated: 400 with a message naming what to send; unknown theme lists the valid ones) and a client-only `<PdfPreview>` page (`InvoicePreview.client.vue`) with a theme switcher. Details and the honest workaround list are in `examples/nuxt/README.md`: pdfwind is not on npm so `scripts/sync.mjs` copies `src/` + fonts into the example (git-ignored) and the runtime assets into `server/pdfwind-assets`; Nitro needs `@vitejs/plugin-vue` for the SFCs; wasm/fonts/CSS come from Nitro server assets via pdfwind's own `createRenderPdf` (not `render/node.js`, which uses `require.resolve` / `import.meta.url`); the copied library is listed in `nitro.externals.inline` (otherwise `nuxt dev` emits an unresolvable import); `serverAssets.dir` is relative to `server/`. No change to `src/` was needed for Nuxt.
- E2E (phase5 "nuxt"): `pnpm install`, `nuxt build` (3.1 MB output), start on a free port: vivid PDF (valid, Producer takumi-pdf, A4, text from the query, vivid primary pixels, Nunito), default has no vivid color, dark paints the dark paper, EUR formats amounts in euros, bad theme / number / currency / company / client -> 400; Chromium: the preview renders, switching to vivid re-renders, no console errors (production build), then `nuxt dev` (which reports hydration mismatches): no hydration warnings, no console errors, the route also works in dev. Servers are killed at the end.

### Part 3: README showcase
- The components image comes from the purpose-made showcase (default theme), plus the same document in `dark`, the 11-theme contact sheet and the Theme Builder screenshot (with the showcase loaded). `scripts/screenshots.sh` is portable now (plain ImageMagick `+append/-append`, no fonts, no `montage`, no macOS paths) and runs inside the phase5 E2E. Every image was looked at: no magenta, no test labels, no random colors (E2E also checks magenta pixels in every README image and that the showcase's saturated pixels all carry a theme token hue). README has the images, "Use with Vue / Nuxt", llms.txt and "Try it" (no hosted playground; says so), and still says not on npm.

**Run**: `node scripts/e2e-phase5.mjs` (out/phase5/: report.md, pdf/, screenshots, nuxt screenshots).

**Known gaps**: the muted-on-`#f4f4f5` 4.40:1 and Form placeholder 2.54:1 above; dark is one preset (no dark variants of the nine pdfcn themes); `body {}` rules in theme CSS stay inert (Takumi); the Nuxt example needs the sync step until the package is published; the Nuxt dev server takes ~20 s to warm up.

## Playground interface review fixes (phase 5b)

Same probe as the review (Playwright, 320/360 px, Tab walk, computed sizes) against the working tree, then fixed what was still open. CSS variables from `playground/chrome.css`, no hex (the guard stays at 0 violations).

**What changed**
1. **320 px**: no horizontal scroll at 320, 360 and 640 px (= 200% zoom of 1280) in App (showcase and sample invoice) and Builder. Under 48 rem the sidebar becomes a `<details>` disclosure ("Documents, themes and settings", closed, opens with Enter/Space) above the content; the content stacks below with a tall preview; the controls bar wraps; the render stat (`.stat`) is in flow instead of `position: absolute`. At 1280 the layout is the same structure; the sidebar went from 220 to 240 px because the longest theme names ("professional") were clipped in the two-column theme group.
2. **Landmarks**: one `<main id="preview" tabindex="-1">` around controls + preview, a visible "Skip to preview" link first in the tab order (same as Builder), one `<h1>` that describes the current view and follows it ("Showcase: customer report", "Card (wrap vs no wrap)", ...), `<nav aria-label="Components">` kept, and "pdfwind" is a plain brand line in the `<header>`, not a heading. Tab count to reach the preview: Tab (skip link), Enter, Tab = 3 key presses; without the link it is behind ~55 controls.
3. **Selection state and hit areas**: `aria-current="true"` on exactly one demo button (moves on click; the `.on` class and aria-current always agree). Theme radios: the whole label row is the hit area, >= 40 px high (the native radio box stays 13 px); the theme description is visible text under the group (`aria-describedby` on the fieldset, updates with the selection) instead of `title` tooltips. Every tab stop is >= 40 px tall (the old probe found 51 of 59 under 40 px); nothing is under 24 px.
4. **PdfPreview error banner**: plain-language copy by error kind (engine/font did not load: "Check your connection, then press Retry"; no font covers the text; image could not be loaded; generic), a visible **Retry** button that re-renders, the raw exception in a collapsed "Technical details" `<details>`, `role="alert"` kept, an overlay (absolute) so the preview does not shift, system/`--pdfwind-preview-*` colors only. The glyph-error message keeps its own fix text, now also shown in plain words.
5. **Text and motion**: chrome text is in rem and >= 12 px computed (labels were 11 px); the System / Light / Dark segmented control is one row of three 40 px segments with the "Page colors" label above (also in Builder); press feedback (scale 0.96), named properties only, <= 150 ms with the ease-out curve and hover on the Builder link and nav buttons, same as Builder; reduced motion turns all of it off.

**E2E**: `node scripts/e2e-phase5b.mjs` (out/phase5b/): scrollWidth <= innerWidth at 320/360/640 for both views, exactly one `<main>`/`<h1>`, skip link first and focus moves to the preview, aria-current exactly one and moving, radio rows >= 40 px, every chrome text node >= 12 px and no px font-size left, tab stops >= 40 px (showcase, sample invoice, 360 open), toggle on one row at 1280 and 320 in App and Builder, transitions/press/hover/reduced motion, a simulated failed wasm fetch shows the banner with a recovery verb and Retry, the raw error is collapsed, Retry re-renders and the preview box is unchanged, axe-core 0 serious/critical on the MAIN playground (showcase and sample invoice, light and dark, 360 with the disclosure open). Result: 45/45 (+1 info row).

**Known gaps**: the old 1280 px sidebar width changed by 20 px (above); the error copy covers four error kinds, anything else gets the generic text with the raw message under "Technical details"; the 36-button demo list is still one flat list (a search or groups would be the next step).

Found by the existing phase 5 E2E during this round: giving the toggle segments a `scale` press transition made each segment's `<span>` a stacking context that painted above the invisible radio input (real clicks still worked through the label, but Playwright's hit test, and any pointer-events consumer, saw the span). Fixed with `z-index: 1` on `.scheme input`.
