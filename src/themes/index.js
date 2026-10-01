// Theme registry (platform neutral: data only). The CSS lives next to this file (`<name>.css`, loaded by the Node/browser entries),
// the font files in `fonts/`. `renderPdf(Comp, props, { theme: "vivid" })` looks a theme up here.
//
// Font substitutions. pdfcn's own preview does not map its PDF base-14 names (Helvetica / Times-Roman / Courier): it leaves them to the
// PDF viewer's built-in fonts, and only the Google families (Nunito, Merriweather, Lato, Playfair Display, Open Sans, Lora, Source Code Pro,
// JetBrains Mono, Inter) are loaded from fontsource (apps/web/lib/theme-builder/preview-fonts.ts). Takumi has no built-in fonts, so:
//   Helvetica -> Inter (already bundled, the closest neutral grotesque)
//   Times-Roman -> Lora (a text serif that is not too heavy; shared with the `elegant` theme, so no extra file)
//   Courier -> Source Code Pro (the lightest bundled mono; shared with `blueprint`)
// Fonts are variable WOFF2 (latin subset, from fontsource; Lato is static 400/700), one normal face and, for body families, one italic face
// that is only registered when the markup uses italics. Heading families get no italic: a heading in italic falls back to a slanted upright.
// Margins are CSS px (pdfcn's pt x 4/3), as `renderPdf` margins are; `page.margin` is advice, blocks keep their own `renderOptions`.
export const themes = {
  default: {
    name: "default",
    description: "pdfwind's default: pdfcn's minimal palette and spacing with Inter throughout (the look the blocks were matched against).",
    pdfcn: { body: "Helvetica", heading: "Helvetica" },
    families: { body: "Inter", heading: "Inter" },
    fonts: [{ family: "Inter", file: "Inter.woff2" }, { family: "Inter", file: "Inter-Italic.woff2", style: "italic" }],
    bodySize: 11, h1: 24,
    page: { margin: { top: 96, right: 74.67, bottom: 96, left: 74.67 } },
  },
  blueprint: {
    name: "blueprint",
    description: "Dark slate palette with cyan accent, JetBrains Mono headings, Source Code Pro body — a technical, precision-first aesthetic. Ideal for API docs, engineering specs, and developer-focused reports.",
    pdfcn: { body: "Source Code Pro", heading: "JetBrains Mono" },
    families: { body: "Source Code Pro", heading: "JetBrains Mono" },
    fonts: [{ family: "Source Code Pro", file: "SourceCodePro.woff2" }, { family: "Source Code Pro", file: "SourceCodePro-Italic.woff2", style: "italic" }, { family: "JetBrains Mono", file: "JetBrainsMono.woff2" }],
    bodySize: 10, h1: 28,
    page: { margin: { top: 69.33, right: 64, bottom: 69.33, left: 64 } },
  },
  corporate: {
    name: "corporate",
    description: "Blue-gray palette, Lato sans-serif throughout, structured and dependable. Sky-blue accent adds clarity without distraction. Ideal for business proposals, project plans, and client-facing reports.",
    pdfcn: { body: "Lato", heading: "Lato" },
    families: { body: "Lato", heading: "Lato" },
    fonts: [{ family: "Lato", file: "Lato-400.woff2", weight: 400 }, { family: "Lato", file: "Lato-700.woff2", weight: 700 }, { family: "Lato", file: "Lato-400-Italic.woff2", weight: 400, style: "italic" }],
    bodySize: 11, h1: 30,
    page: { margin: { top: 69.33, right: 58.67, bottom: 69.33, left: 58.67 } },
  },
  elegant: {
    name: "elegant",
    description: "Warm cream-adjacent whites, amber/gold accent, Playfair Display headings paired with Lora body — a classic editorial combination. Ideal for design portfolios, luxury brands, and high-end editorial PDFs.",
    pdfcn: { body: "Lora", heading: "Playfair Display" },
    families: { body: "Lora", heading: "Playfair Display" },
    fonts: [{ family: "Lora", file: "Lora.woff2" }, { family: "Lora", file: "Lora-Italic.woff2", style: "italic" }, { family: "Playfair Display", file: "PlayfairDisplay.woff2" }],
    bodySize: 11, h1: 36,
    page: { margin: { top: 80, right: 69.33, bottom: 80, left: 69.33 } },
  },
  executive: {
    name: "executive",
    description: "Deep navy palette, Merriweather serif headings, Open Sans body. Generous margins, high contrast, premium boardroom aesthetic. Ideal for board reports, executive briefs, and investor documents.",
    pdfcn: { body: "Open Sans", heading: "Merriweather" },
    families: { body: "Open Sans", heading: "Merriweather" },
    fonts: [{ family: "Open Sans", file: "OpenSans.woff2" }, { family: "Open Sans", file: "OpenSans-Italic.woff2", style: "italic" }, { family: "Merriweather", file: "Merriweather.woff2" }],
    bodySize: 11, h1: 34,
    page: { margin: { top: 85.33, right: 74.67, bottom: 85.33, left: 74.67 } },
  },
  forest: {
    name: "forest",
    description: "Natural deep greens, Merriweather headings for gravitas, Inter body for readability. Earthy and trustworthy. Ideal for sustainability reports, environmental docs, and wellness brands.",
    pdfcn: { body: "Inter", heading: "Merriweather" },
    families: { body: "Inter", heading: "Merriweather" },
    fonts: [{ family: "Inter", file: "Inter.woff2" }, { family: "Inter", file: "Inter-Italic.woff2", style: "italic" }, { family: "Merriweather", file: "Merriweather.woff2" }],
    bodySize: 11, h1: 32,
    page: { margin: { top: 74.67, right: 64, bottom: 74.67, left: 64 } },
  },
  minimal: {
    name: "minimal",
    description: "Courier headings, zinc neutrals, maximum whitespace. shadcn-inspired restrained palette. Ideal for clean documentation, technical specs, and literary manuscripts.",
    pdfcn: { body: "Helvetica", heading: "Courier" },
    families: { body: "Inter", heading: "Source Code Pro" },
    fonts: [{ family: "Inter", file: "Inter.woff2" }, { family: "Inter", file: "Inter-Italic.woff2", style: "italic" }, { family: "Source Code Pro", file: "SourceCodePro.woff2" }, { family: "Source Code Pro", file: "SourceCodePro-Italic.woff2", style: "italic" }],
    bodySize: 11, h1: 24,
    page: { margin: { top: 96, right: 74.67, bottom: 96, left: 74.67 } },
  },
  modern: {
    name: "modern",
    description: "All-Helvetica, slate-cool neutrals with subtle violet accent, clean spacing. shadcn-inspired contemporary feel. Ideal for startups, tech companies, and design-forward documents.",
    pdfcn: { body: "Helvetica", heading: "Helvetica" },
    families: { body: "Inter", heading: "Inter" },
    fonts: [{ family: "Inter", file: "Inter.woff2" }, { family: "Inter", file: "Inter-Italic.woff2", style: "italic" }],
    bodySize: 11, h1: 28,
    page: { margin: { top: 53.33, right: 53.33, bottom: 53.33, left: 53.33 } },
  },
  professional: {
    name: "professional",
    description: "Serif headings (Times-Roman), refined zinc/slate palette, generous margins, formal document feel. shadcn-inspired minimal aesthetic. Ideal for business documents, reports, and official correspondence.",
    pdfcn: { body: "Helvetica", heading: "Times-Roman" },
    families: { body: "Inter", heading: "Lora" },
    fonts: [{ family: "Inter", file: "Inter.woff2" }, { family: "Inter", file: "Inter-Italic.woff2", style: "italic" }, { family: "Lora", file: "Lora.woff2" }, { family: "Lora", file: "Lora-Italic.woff2", style: "italic" }],
    bodySize: 11, h1: 32,
    page: { margin: { top: 74.67, right: 64, bottom: 74.67, left: 64 } },
  },
  vivid: {
    name: "vivid",
    description: "Deep violet/purple palette, Nunito rounded sans-serif, playful but still professional. High-energy creative accent. Ideal for creative agencies, startups, marketing decks, and pitch docs.",
    pdfcn: { body: "Nunito", heading: "Nunito" },
    families: { body: "Nunito", heading: "Nunito" },
    fonts: [{ family: "Nunito", file: "Nunito.woff2" }, { family: "Nunito", file: "Nunito-Italic.woff2", style: "italic" }],
    bodySize: 11, h1: 32,
    page: { margin: { top: 64, right: 58.67, bottom: 64, left: 58.67 } },
  },
};

export const themeNames = Object.keys(themes);

/** Meta of a theme; unknown names throw an error that lists the valid ones. */
export const getTheme = (name) => {
  if (!Object.hasOwn(themes, name)) throw new Error(`Unknown theme "${name}". Valid themes: ${themeNames.join(", ")}. (To use your own colors/fonts pass themeCss.)`);
  return themes[name];
};
