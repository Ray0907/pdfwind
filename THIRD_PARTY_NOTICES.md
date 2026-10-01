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
Fonts in `fonts/`: Inter and Noto Sans TC (`.woff2` converted from the upstream Google Fonts files), both under the SIL Open Font License 1.1. Full texts: `fonts/OFL-Inter.txt`, `fonts/OFL-NotoSansTC.txt`.
The `pdftotext` / `pdftoppm` tools (poppler) used by the E2E scripts are external programs and are not distributed.
The reference PDFs in `/tmp/pdfcn-ref` used for visual comparison come from pdfcn's public demo and are not part of this repository.
