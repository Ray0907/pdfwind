# pdfwind progress

## Phase 1: render core (after review round 1)

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
- Nothing committed.

## Phase 2a: 14 layout / text components

**Built** (`src/components/<Name>/<Name>.vue`, exported from `src/index.js`)
Stack, Section, Card, Divider (+ private `DividerLine.vue`), KeepTogether, PageBreak, PageHeader, PageFooter, PageNumber, Watermark, Heading, Text, Link, List. Props, variants, sizes and defaults follow pdfcn's Takumi components (read each one first). PdfX (`/tmp/pdfx`, MIT) was cloned and skimmed for ideas; nothing copied.
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
- pdfcn's Takumi renders could not be compared: `/private/tmp/pdfcn` has no installed deps or pre-rendered images and must not be touched. Taste was judged from its source values (sizes, gaps, radii) and my own PNGs, not side by side.
- `muted-foreground` (#a1a1aa on white, from pdfcn's minimal theme) is about 2.5:1 contrast: footer text, labels and page numbers are below WCAG AA for small text. Left as the parity default; a theme can darken it.
- `tailwind-merge` only knows the theme names listed in `src/lib/ui.js`; a user-added `--text-*` name needs adding there.
- Default `--spacing: 4pt` / `--text-*` replace Tailwind's scales: user classes like `p-4`, `text-sm` mean 16pt / 12pt, not 16px / 14px.
- Not built (next phases): Table, DataTable, KeyValue, Graph, QRCode, Alert, Badge, Form, Signature, PdfImage; blocks; named themes (only `minimal` as default.css); `src/index.js` is not yet a published package (SFCs need Vite).
- Nothing committed.

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
- Nothing committed.

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
Not done / next: blocks 3b (report-*, event-*, gift-certificate, lesson-plan, medical-intake-form, meeting-minutes, packing-slip, press-release, shipping-label, work-order). Nothing committed.

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

**Self-fix rounds**: 2 used (work-order overflow: explicit column widths + spacing; lesson-plan time/activity widths).

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
(axe-core is a new dev dependency; screenshots use a headed Chromium window because headless shows an empty PDF viewer.)

**Result: 98/98 PASS** (+1 info row). Pure model: all 10 shipped CSS files parse clean, `toCss(fromCss(toCss(x)))` is a fixed point, 200 random states round trip, the importer reports unknown / out-of-range / bad hex / rgb() / fixed-scale / unbundled font / derived values, contrast equals an independent implementation (300 random pairs + textbook values). Browser: hex field and color picker change preview pixels, invalid hex and out-of-range numbers are rejected with linked messages and no state change, font selects embed the family (read from the PDF) and fetch only that family's file, margins shift the text ~48 pt and are reported as not applied for fixed-size documents (shipping-label stays 288x432), clone vivid equals the parsed theme, reset per control and Reset all, a slider drag of ~25 input events is one undo step, Ctrl/Cmd+Z / Shift+Z / Ctrl+Y restore exact text and pixels, limit 30 after 36 edits, reload restores the theme and document, garbage / invalid / blocked / full storage do not crash, export -> import in a fresh browser context is state-equal and pixel-equal (72 and 144 dpi), download and clipboard match the box, messy imports explain every line, contrast panel numbers and Pass/Fail words equal the script's own calculation for 3 states, keyboard-only run (every control kind), Tab visits all N stops in DOM order with a visible ring on each, hit areas >= 40 px at 1280 and 360, no `transition: all` and <= 200 ms ease-out, 0 ms under reduced motion, concentric radii (16 = 8 + 8), layout-shift ~0 and the previous PDF always visible, dark vs light chrome gives identical PDFs, axe-core zero violations in 4 scans (1280 light, with error messages shown, 1280 dark, 360).
Mutation checks by hand (reverted): contrast threshold 4.0 + a wrong sRGB constant -> the model check and the 4 contrast checks fail; history coalescing disabled -> the arrow-key coalescing check fails (the slider-drag check still passes because the drag commits on `change`, as designed).

**Self-fixes found by the E2E**: two announcements in the same moment overwrote each other (import summary vs contrast warning) -> merged into one polite message; the page re-saved its state on unload, so "clear storage + reload" did not reset (test now uses fresh contexts); two lang/inert accessibility defects (html lang, duplicate PDF viewer iframes).

**Known gaps / honest notes**
- Page margins are a render option, not CSS: the builder applies them to A4 documents (bottom stays automatic for blocks with a footer band) and says so; they are exported as `--page-margin-*` custom properties that `renderPdf` ignores. Fixed-size documents (ticket, label) ignore them.
- Only the 12 colors, 2 fonts, sizes, gaps and margins are editable; the Tailwind-side type scale (`--text-xs..3xl`), radii and `--spacing` are fixed and reported as such if edited in imported CSS. Heading weight/tracking are not themeable (pdfcn's Heading is always bold).
- Hex colors only (#rrggbb; #rgb is expanded with a note, rgb()/hsl()/alpha are rejected with an explanation).
- Fonts are the 9 bundled families (latin subset); a custom font needs the `fonts` option in code, not the builder.
- The undo history is not persisted across reloads (state is); `Ctrl+Z` inside a text field undoes typing, not the theme.
- The preview waits for the PDF viewer's `load` (or PdfPreview's 2 s fallback) before it swaps; in headless Chromium each re-render therefore takes ~2 s wall time (the render itself ~30-50 ms). Real browsers swap sooner.
- The contrast panel checks the four pairs asked for (4.5:1, body text); it does not check border/muted fills or status colors against the background, and shows no large-text (3:1) result.
- No README screenshots added to `docs/images` (`scripts/screenshots.sh` not extended); the E2E writes `out/phase4b/builder-1280.png` and `builder-360.png`.
