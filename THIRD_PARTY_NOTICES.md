# Third-party notices

pdfwind is MIT licensed (see `LICENSE`). It builds on the work below.

## pdfcn (code and design ported)

- Project: https://github.com/shadcn-labs/pdfcn (MIT, shadcn-labs)
- What pdfwind takes from it: the component and block structure, prop names, variants and defaults, theme values
  (the `minimal` theme tokens in `src/themes/default.css`), the default data shapes of the blocks, and the chart math
  (margins, arc and smooth-path geometry) ported to `src/components/Graph/graph.js`. The QR code uses the same `qrcode`
  package pdfcn uses. Layouts were re-implemented as Vue + Tailwind; no React code is included.

```
MIT License

Copyright (c) 2026 Shadcn Labs

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## PDFx (inspiration only)

- Project: https://github.com/akii09/pdfx (MIT, Akash Pise)
- pdfwind reads PDFx for ideas (component list, theme tokens, block layouts). **No PDFx source code is copied.** Its licence
  is MIT, so it is reproduced here out of courtesy and in case any idea-level overlap is ever judged derivative.

```
MIT License

Copyright (c) 2026 Akash Pise

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Other dependencies and assets

Runtime: `vue`, `@vue/server-renderer`, `tailwindcss`, `tailwind-merge`, `qrcode` (MIT); `takumi-pdf` (MIT OR Apache-2.0).
Dev only: `vite`, `@vitejs/plugin-vue`, `playwright-core`, `jsqr` (their own licences; not shipped).
Fonts in `fonts/` (all under the SIL Open Font License 1.1, full texts in `fonts/OFL-<Family>.txt`): Inter and Noto Sans TC (`.woff2` converted from the upstream Google Fonts files), and the theme fonts Nunito, Merriweather, Lato, Playfair Display, Open Sans, Lora, Source Code Pro and JetBrains Mono (latin-subset `.woff2` copied unmodified from the fontsource packages `@fontsource-variable/*` and `@fontsource/lato`, which redistribute the Google Fonts releases). Copyright holders are named in each licence file (Nunito Project Authors; Merriweather Project Authors; tyPoland Lukasz Dziedzic for Lato; The Playfair Display, Open Sans, Lora, Source Code Pro (Adobe) and JetBrains Mono (JetBrains) Project Authors). The Reserved Font Names are kept: the files are unmodified subsets, not derivative fonts.
The `pdftotext` / `pdftoppm` tools (poppler) used by the E2E scripts are external programs and are not distributed.
The reference PDFs cached in `.cache/pdfcn-ref/` for optional visual comparison come from pdfcn's public demo and are not distributed. `scripts/fixtures/pdfcn-themes.json` vendors the nine upstream themes' values (colors, gaps, typography/font names and margins), extracted by `scripts/vendor-pdfcn-themes.mjs` from a read-only pdfcn checkout. These values are covered by the pdfcn MIT notice above; no upstream TypeScript code is included in the fixture.
