# pdfwind implementation plan

Vue 3 + Tailwind v4 PDF component library, rendered by Takumi (`takumi-pdf`). Feature parity target: **pdfcn** (reference checkout at `/private/tmp/pdfcn`, MIT; read `apps/web/registry/bases/takumi/{components,blocks,lib}`, `registry/themes/*`, `apps/web/components/pdf-preview.tsx`). Copy structure, props naming, and layout decisions. Do NOT port the `StyleSheet` / `usePdfcnTheme` layer. Styling is Tailwind classes plus CSS variables.

Second reference: **PDFx** (https://github.com/akii09/pdfx, react-pdf based, pdfcn's ancestor). Read-only clone to `/tmp/pdfx` (`git clone --depth 1`) for component list, theme tokens, block layouts and CLI ideas. Check its LICENSE before copying anything verbatim; when unsure, reimplement from the idea and credit it in `README.md`. Do not add it as a dependency.

## Hard rules

- **Never run `git add` / `git commit` / `git push`.** The reviewer decides. Leave everything uncommitted.
- Tests: E2E only. No unit tests. Extend `stress.mjs`-style checks; each phase ends with a repeatable script that writes a PDF and a checklist report.
- Lean code, no speculative abstractions, no config for values that never change. Mark deliberate shortcuts with a `ponytail:` comment.
- Do not touch `/private/tmp/pdfcn`.
- Report build/test status honestly, with output. Never claim done without running the check.

## Verified facts (do not re-research)

- Takumi HTML input ignores `class` Tailwind. Pipeline: Vue SSR to HTML string, scan `class="..."` of body, header and footer, `compile()` from `tailwindcss` with in-memory `theme.css`, `preflight.css`, `utilities.css`, pass result via `css` option. See `tw-browser.mjs` (browser-safe, no fs).
- `preflight` is required (else `border` draws nothing).
- Header/footer: pass HTML strings as `header` / `footer`; nodes with class `pageNumber` / `totalPages` get counters. Bands hug page edge, so add `px-*`.
- `uncoveredText: "placeholder"` is needed, default throws on uncovered glyphs. `renderPdf` must default to a safe behavior.
- Italic needs a registered italic face. Inter variable fonts work for weights.
- Fonts as **woff2** work (`fonts/Inter.woff2` 342 KB, `fonts/NotoSansTC.woff2` 5.3 MB). Prefer woff2 everywhere. Slicing NotoSansTC by unicode-range is a later optimization.
- Browser chain works (verified in Chromium): `@vue/server-renderer` browser build, `tailwindcss` compile, `takumi-pdf/no-init` + `takumi-pdf/wasm-url`. `init(wasmUrl)` warns about deprecated args; use `init({ module_or_path: wasmUrl })`.
- `break-inside-avoid`, `break-before-page`, table `thead` repeat, links, metadata, outline all work. See `stress.mjs`.

## Target layout

```
src/render/     renderPdf(component, props, opts)  (Node + browser shared), font loading, tailwind compile
src/components/ Vue SFCs (one folder per component)
src/blocks/     document templates
src/themes/     CSS-variable themes
src/index.ts    public exports
playground/     Vite app: live preview, theme switcher, props editor
scripts/        e2e-*.mjs (each writes out/*.pdf + out/report.md)
```

## Phases (each must pass its E2E script before the next starts)

1. **Render core.** `renderPdf()` works in Node and in the browser. Renderer instance and compiled Tailwind reused across calls. Default fonts (Inter woff2 + Noto Sans TC woff2), `uncoveredText` safe default, `AbortSignal`, error messages that name the missing glyph. Vue-friendly: `<PdfPreview :component :props>` that re-renders reactively with debounce and cancels stale renders, shows a blob URL in an iframe/embed.
2. **All 24 components** (pdfcn parity): Stack, Section, Card, Divider, KeepTogether, PageBreak, PageHeader, PageFooter, PageNumber, Watermark, Heading, Text, Link, List, Table, DataTable, KeyValue, Graph, QRCode, Alert, Badge, Form, Signature, PdfImage. Props mirror pdfcn (`variant`, `size`, `label`, ...). Customization via normal Vue `class` passthrough. Each has a demo in the playground.
3. **All 20 blocks**: invoice (classic, consultant, corporate, creative, minimal, modern), report (financial, marketing, operations, security), event-agenda, event-ticket, gift-certificate, lesson-plan, medical-intake-form, meeting-minutes, packing-slip, press-release, shipping-label, work-order. Compare each visually against pdfcn's Takumi render (`/private/tmp/pdfcn/apps/web/app/api/pdf/takumi`).
4. **Themes**: the 9 named themes in `registry/themes/*` (blueprint, corporate, elegant, executive, forest, minimal, modern, professional, vivid) as CSS-variable sets, switchable at runtime; Theme Builder page in the playground.
5. **Playground polish + agent-facing**: docs-like preview pages, `llms.txt`, optional MCP later. Nuxt usage example.

## "Vue renders smoothly" acceptance

- Changing a prop in the playground re-renders within ~300 ms for a 1-page block (measure and print it).
- No flash of unstyled or empty preview; previous PDF stays visible until the new one is ready.
- Rapid prop changes cancel/skip stale renders (no out-of-order results).
- First render lazily loads WASM and fonts once, then cached.
- Same components render identically in Node and in the browser.

## Deliverable per phase

Short note in `PROGRESS.md`: what was built, the E2E command, PASS/FAIL table, known gaps. No commits.
