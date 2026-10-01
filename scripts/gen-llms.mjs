// Generates llms.txt (index) and llms-full.txt (reference) at the repo root.
// Components and blocks are read from the SFC sources with vue/compiler-sfc (props, types, defaults, variants, slots, emits) and from the
// live modules (samples, render options, themes); nothing in those sections is copied by hand. Output is deterministic (no dates, no absolute paths).
// Usage: node scripts/gen-llms.mjs            (writes llms.txt and llms-full.txt)
//        node scripts/gen-llms.mjs --check    (exit 1 if the committed files are stale)
import { readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { createServer } from "vite";
import { parse, compileScript } from "vue/compiler-sfc";

const ROOT = new URL("../", import.meta.url).pathname;
const read = (p) => readFileSync(ROOT + p, "utf8");
const pkg = JSON.parse(read("package.json"));

// ---------------------------------------------------------------- SFC parsing
const text = (src, n) => src.slice(n.start, n.end);
const propName = (k) => k.name ?? k.value;
const typeOf = (src, v) => {
  if (v.type === "Identifier") return v.name;
  if (v.type === "ArrayExpression") return v.elements.map((e) => text(src, e)).join(" | ");
  if (v.type === "ObjectExpression") { const t = v.properties.find((p) => propName(p.key) === "type"); return t ? typeOf(src, t.value) : "any"; }
  return "any";
};
const parseSfc = (file) => {
  const source = read(file), { descriptor } = parse(source, { filename: file });
  const out = { file, props: [], emits: [], slots: [], inheritAttrs: !/inheritAttrs:\s*false/.test(source), comment: "", renderOptions: /export const renderOptions/.test(source) };
  if (!descriptor.scriptSetup) return out;
  const ss = descriptor.scriptSetup.content, res = compileScript(descriptor, { id: file }), ast = res.scriptSetupAst ?? [];
  // leading comment block of <script setup> (what the component is for), if any
  const lead = ss.trimStart().split("\n").filter((l, i, a) => a.slice(0, i + 1).every((x) => /^\s*\/\//.test(x))).map((l) => l.replace(/^\s*\/\/\s?/, ""));
  out.comment = lead.join(" ").trim();
  const calls = [];
  const walk = (n) => { if (!n || typeof n !== "object") return; if (n.type === "CallExpression" && n.callee?.name) calls.push(n); for (const k of Object.keys(n)) if (k !== "loc") { const v = n[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object" && v.type) walk(v); } };
  ast.forEach(walk);
  const dp = calls.find((c) => c.callee.name === "defineProps");
  if (dp?.arguments[0]?.type === "ObjectExpression") {
    // objects in the setup block named like the prop ("aligns" for align, "variants" for variant) hold the allowed values
    const maps = {};
    for (const n of ast) if (n.type === "VariableDeclaration") for (const d of n.declarations) if (d.id?.name && d.init?.type === "ObjectExpression") maps[d.id.name] = d.init.properties.filter((p) => p.key).map((p) => propName(p.key));
    for (const p of dp.arguments[0].properties) {
      const name = propName(p.key), v = p.value, lineEnd = ss.indexOf("\n", p.end), tail = ss.slice(p.end, lineEnd < 0 ? undefined : lineEnd), cm = tail.match(/\/\/\s*(.*)$/);
      const o = v.type === "ObjectExpression" ? Object.fromEntries(v.properties.filter((x) => x.key).map((x) => [propName(x.key), x.value])) : {};
      const cand = [`${name}s`, `${name}es`, name === "variant" ? "variants" : "", `${name}Classes`, `${name}Map`].find((c) => c && maps[c]);
      out.props.push({ name, type: typeOf(ss, v), required: o.required?.value === true, default: o.default ? text(ss, o.default) : undefined, note: cm?.[1]?.trim() ?? "", values: cand ? maps[cand] : undefined });
    }
  } else if (dp?.arguments[0]?.type === "ArrayExpression") out.props = dp.arguments[0].elements.map((e) => ({ name: e.value, type: "any", required: false, note: "" }));
  const de = calls.find((c) => c.callee.name === "defineEmits");
  if (de?.arguments[0]?.type === "ArrayExpression") out.emits = de.arguments[0].elements.map((e) => e.value);
  if (descriptor.template?.ast) {
    const slots = new Set(), visit = (n) => { if (!n) return; if (n.tag === "slot") { const a = (n.props ?? []).find((p) => p.name === "name"); slots.add(a?.value?.content ?? "default"); } (n.children ?? []).forEach((c) => typeof c === "object" && visit(c)); };
    visit(descriptor.template.ast); out.slots = [...slots];
  }
  return out;
};

// ---------------------------------------------------------------- what is exported
const exportsOf = (file, re) => [...read(file).matchAll(re)];
const components = exportsOf("src/index.js", /export \{ default as (\w+) \} from "\.\/([^"]+)"/g).map(([, name, path]) => ({ name, file: `src/${path}` }));
const blocks = exportsOf("src/blocks/index.js", /export \{ default as (\w+)(?:, renderOptions as (\w+))? \} from "\.\/([^"]+)"/g).map(([, name, options, path]) => ({ name, options, file: `src/blocks/${path}` }));
const camel = (s) => s[0].toLowerCase() + s.slice(1);

// ---------------------------------------------------------------- runtime values (samples, options, themes)
const vite = await createServer({ configFile: ROOT + "vite.config.js", root: ROOT, server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true } });
const B = await vite.ssrLoadModule("/src/blocks/index.js"), TH = await vite.ssrLoadModule("/src/themes/index.js"), BU = await vite.ssrLoadModule("/src/themes/builder.js");
await vite.close();
const shape = (v, depth = 0) => {
  if (Array.isArray(v)) return v.length ? `[${shape(v[0], depth + 1)}]` : "[]";
  if (v && typeof v === "object") return depth >= 3 ? "{…}" : `{ ${Object.entries(v).map(([k, x]) => `${k}: ${shape(x, depth + 1)}`).join(", ")} }`;
  return v === null ? "null" : typeof v;
};
const sampleComment = (name) => { // the // block above `export const <name>Sample` in doc.js / invoice.js / event.js / report.js
  for (const f of ["src/blocks/doc.js", "src/blocks/invoice.js", "src/blocks/event.js", "src/blocks/report.js"]) {
    const lines = read(f).split("\n"), i = lines.findIndex((l) => l.startsWith(`export const ${name}Sample`));
    if (i < 0) continue; const out = []; for (let j = i - 1; j >= 0 && /^\/\//.test(lines[j]); j--) out.unshift(lines[j].replace(/^\/\/\s?/, "")); return out.join(" ").trim();
  }
  return "";
};

// ---------------------------------------------------------------- Markdown helpers
const fmtProps = (props) => props.length
  ? ["| prop | type | default | notes |", "|---|---|---|---|", ...props.map((p) => `| \`${p.name}\` | ${p.type.replace(/\|/g, "\\|")}${p.required ? " (required)" : ""} | ${p.default !== undefined ? `\`${p.default.replace(/\s+/g, " ").replace(/\|/g, "\\|")}\`` : ""} | ${[p.note.replace(/\|/g, "\\|"), p.values && !p.values.every((v) => p.note.includes(v)) ? `values: ${p.values.map((v) => `\`${v}\``).join(", ")}` : ""].filter(Boolean).join("; ")} |`)].join("\n")
  : "No props.";
const component = (c) => {
  const s = parseSfc(c.file);
  return `### ${c.name}\n\nSource: \`${c.file}\`${s.comment ? `\n\n${s.comment}` : ""}\n\n${fmtProps(s.props)}\n\nSlots: ${s.slots.length ? s.slots.map((x) => `\`${x}\``).join(", ") : "none"}${s.emits.length ? `. Emits: ${s.emits.map((x) => `\`${x}\``).join(", ")}` : ""}. Class passthrough: ${s.inheritAttrs ? "default attrs" : "`class` and other attrs go to the root element (merged with tailwind-merge: yours win)"}.`;
};
const block = (b) => {
  const s = parseSfc(b.file), sample = B[`${camel(b.name)}Sample`], opts = b.options ? B[b.options] : B.blockPage;
  const o = opts ? `size ${JSON.stringify(opts.size)}, margin ${JSON.stringify(opts.margin)}${opts.footer ? ", repeating footer band (pass `footer`)" : ""}` : "";
  return `### ${b.name}\n\nSource: \`${b.file}\`${b.options ? `, recommended options: \`${b.options}\`` : ", options: `blockPage` + `InvoiceFooter` (or the block's own footer)"}\n\n${fmtProps(s.props)}\n\n${sample ? `Data shape (from \`${camel(b.name)}Sample\`): \`${shape(sample)}\`${sampleComment(camel(b.name)) ? `\n\npdfcn shape: ${sampleComment(camel(b.name))}` : ""}\n\n` : ""}${o ? `Render options: ${o}.\n` : ""}`;
};

// ---------------------------------------------------------------- core option table (parsed from src/render/core.js)
const core = read("src/render/core.js");
const sig = core.match(/return async function renderPdf\(component, props = \{\}, \{([^}]*)\} = \{\}\)/)[1].split(",").map((x) => x.trim()).filter(Boolean).map((x) => x.startsWith("...") ? { name: "…rest", def: "any takumi-pdf render option (size, margin, metadata, ...)" } : { name: x.split("=")[0].trim(), def: x.includes("=") ? x.split("=").slice(1).join("=").trim() : "" });
const jsdoc = core.match(/\/\*\*\n \* @param loadResources[\s\S]*?\*\//)[0].split("\n").map((l) => l.replace(/^ \* ?/, "").replace(/^\/\*\*|\*\/$/g, "")).filter((l) => l.trim()).join("\n");

// ---------------------------------------------------------------- Takumi limits (from PROGRESS.md)
const progress = read("PROGRESS.md").split("\n");
const bullets = (startRe, stopRe = /^(\*\*|##)/) => { const i = progress.findIndex((l) => startRe.test(l)); if (i < 0) return []; const out = []; for (let j = i + 1; j < progress.length; j++) { if (stopRe.test(progress[j])) break; if (/^(\d+\.|-)\s/.test(progress[j])) out.push(progress[j].replace(/^\d+\.\s*/, "- ").replace(/^- /, "- ")); } return out; };
const limits = [...bullets(/^\*\*Takumi CSS limitations hit/), ...bullets(/^\*\*Takumi limits found in 2b/)];

// ---------------------------------------------------------------- examples (runnable: each is a module with `main()` returning PDF bytes; see "Running examples")
const EXAMPLES = [
  { id: "hello", title: "A document from components", expect: ["Quarterly report", "Revenue", "$2.48M", "Page 1 of 1"], code: `// example: hello
import { h } from "vue";
import { renderPdf } from "/src/render/node.js";
import { Heading, Text, Badge, DataTable, KeyValue, PageFooter, PageNumber } from "/src/index.js";

const Doc = {
  render: () => h("div", [
    h(Heading, { level: 1 }, () => "Quarterly report"),
    h(Text, {}, () => ["Status: ", h(Badge, { variant: "success", label: "On track" })]),
    h(DataTable, { variant: "grid", columns: [{ key: "metric", header: "Metric" }, { key: "value", header: "Value", align: "right", width: 100 }], data: [{ metric: "Revenue", value: "$2.48M" }, { metric: "Gross margin", value: "61.8%" }] }),
    h(KeyValue, { items: [{ key: "Prepared by", value: "Finance Ops" }] }),
  ]),
};
const Footer = { render: () => h(PageFooter, { leftText: "Acme Corp" }, { right: () => h(PageNumber, { format: "Page {page} of {total}", align: "right" }) }) };

export async function main() {
  return renderPdf(Doc, {}, { size: "a4", margin: { top: 56, left: 56, right: 56, bottom: "auto" }, footer: Footer });
}
` },
  { id: "block-theme", title: "A block with a named theme", expect: ["INV-2026-002", "Total Due", "Page 1 of 1"], code: `// example: block-theme
import { renderPdf } from "/src/render/node.js";
import { InvoiceModern, InvoiceFooter, blockPage, invoiceModernSample } from "/src/blocks/index.js";

export async function main() {
  // theme: "default" | "blueprint" | "corporate" | "elegant" | "executive" | "forest" | "minimal" | "modern" | "professional" | "vivid"
  return renderPdf(InvoiceModern, { data: invoiceModernSample }, { ...blockPage, footer: InvoiceFooter, theme: "vivid" });
}
` },
  { id: "custom-theme", title: "A custom theme from the Theme Builder model, with CJK text", expect: ["發票 2026-001", "Nunito"], code: `// example: custom-theme
import { h } from "vue";
import { renderPdf } from "/src/render/node.js";
import { Heading, Text } from "/src/index.js";
import { defaultState, toCss } from "/src/themes/builder.js";

export async function main() {
  const theme = defaultState();
  theme.colors.primary = "#0f4c81";
  theme.fonts = { body: "Nunito", heading: "Lora" };       // bundled families only; their faces load on demand
  theme.type.h.h1 = 30;
  const Doc = { render: () => h("div", [h(Heading, { level: 1 }, () => "發票 2026-001"), h(Text, {}, () => "Nunito body text. 繁體中文 falls back to Noto Sans TC.")]) };
  const pdf = await renderPdf(Doc, {}, { size: "a4", margin: 48, themeCss: toCss(theme) });
  return pdf;
}
` },
];

// ---------------------------------------------------------------- llms-full.txt
const themeRows = TH.themeNames.map((n) => { const t = TH.themes[n]; return `| \`${n}\` | ${t.families.body} / ${t.families.heading} | ${t.bodySize} | ${t.h1} | ${t.description.replace(/\|/g, "\\|")} |`; });
const fontRows = TH.bundledFamilies.map((f) => `| ${f} | ${TH.familyFiles[f].map((x) => `\`${x.file}\` (${(statSync(ROOT + "fonts/" + x.file).size / 1024).toFixed(0)} KB)`).join(", ")} |`);
const full = `# pdfwind: full reference

> Vue 3 + Tailwind v4 components and document blocks that render to PDF with Takumi (\`takumi-pdf\`, no headless browser). The same code runs in Node and in the browser. Feature target: pdfcn (props, variants and defaults follow it). Not published to npm: clone the repository.

This file is generated by \`scripts/gen-llms.mjs\` from the source; do not edit it by hand. Index: \`llms.txt\`.

## Install and use

Requires Node 20+ and Vite (components are .vue single-file components). In the repository: \`pnpm install\`. Dependencies: ${Object.keys(pkg.dependencies).map((d) => `\`${d}\``).join(", ")}.

\`\`\`js
import { renderPdf } from "./src/render/node.js";      // browser: ./src/render/browser.js (needs Vite for ?raw / ?url imports)
const pdfBytes = await renderPdf(Component, props, options);   // Uint8Array
\`\`\`

\`renderPdf(component, props, options)\` renders a Vue component (or an HTML string) to PDF bytes. Components use Tailwind classes plus semantic tokens (\`bg-primary\`, \`text-muted-foreground\`, \`border-border\`; see Themes). Sizes are in pt: \`text-sm\` = 12pt, \`text-body\` = 11pt, \`p-4\` = 16pt.

## Running examples

SFC files need Vite, so Node scripts load modules through Vite's SSR loader (the same as the E2E scripts):

\`\`\`js
import { createServer } from "vite";
const vite = await createServer({ root: process.cwd(), server: { middlewareMode: true }, appType: "custom", logLevel: "error", optimizeDeps: { noDiscovery: true } });
const { main } = await vite.ssrLoadModule("/path/to/example.js");   // imports below use root-relative "/src/..." paths
const pdf = await main();                                          // Uint8Array starting with %PDF
await vite.close();
\`\`\`

## renderPdf

Signature: \`renderPdf(component, props = {}, { ${sig.map((s) => (s.def && s.name !== "…rest" ? `${s.name} = ${s.def}` : s.name)).join(", ")} })\`

| option | default | meaning |
|---|---|---|
${sig.map((s) => `| \`${s.name}\` | ${s.name === "…rest" ? "" : s.def ? `\`${s.def}\`` : ""} | ${{ signal: "AbortSignal; an aborted render rejects", theme: `name of a theme (${TH.themeNames.join(", ")}); unknown names throw an error listing the valid ones`, header: "component or HTML string drawn at the top of every page (receives the same props)", footer: "component or HTML string drawn at the bottom of every page (receives the same props); \`.pageNumber\` / \`.totalPages\` nodes (PageNumber) are filled in", themeCss: "Tailwind \`@theme\` / \`:root\` CSS layered after the theme; \`--font-body\` / \`--font-heading\` choose bundled font families", css: "extra CSS applied last", fonts: "extra takumi font loaders [{ name, data, weight?, style? }]", uncoveredText: "what to draw for glyphs no registered font covers: \`\"placeholder\"\` (default) | \`\"blank\"\` | \`\"error\"\`", images: "pre-fetched images [{ src, data }]; http(s) \`<img>\` URLs are fetched automatically, data: URIs need nothing", missingImages: "\`\"error\"\` (default) throws for an image that cannot be loaded; \`\"ignore\"\` leaves a blank space", "…rest": "any takumi-pdf render option: \`size\` (\`\"a4\"\`, \`\"letter\"\`, \`{ width, height }\` in CSS px), \`margin\` (CSS px, number or { top, right, bottom, left }; \`bottom: \"auto\"\` fits a footer band), \`metadata\`, ..." }[s.name] ?? ""} |`).join("\n")}

Notes: sizes passed in \`size\`/\`margin\` are CSS px (1pt = 1.333px); the browser entry fetches fonts lazily (only the active theme's faces; the 5.3 MB Noto Sans TC only when the text has CJK).

Docstring of the core:

\`\`\`
${jsdoc}
\`\`\`

## Themes

Switch at run time: \`renderPdf(C, props, { theme: "vivid" })\` or \`<PdfPreview :component="C" :options="{ theme }" />\`. A theme is a CSS file of variables (colors, gaps, type scale, \`--font-heading\`) layered over \`src/themes/default.css\`; \`themeCss\` adds your own. The default theme is pdfcn's minimal with a darker muted-foreground (#71717a, 4.8:1 on white).

| theme | body / heading font | body pt | h1 pt | character |
|---|---|---|---|---|
${themeRows.join("\n")}

Semantic color tokens: ${BU.COLOR_KEYS.map((k) => `\`${k}\``).join(", ")}. Registry: \`src/themes/index.js\` (\`themes\`, \`themeNames\`, \`getTheme\`). Theme Builder model (pure, usable in Node): \`src/themes/builder.js\` (\`defaultState\`, \`toCss\`, \`fromCss\`, \`contrastPairs\`, \`toRegistryJs\`); UI: playground \`?view=builder\`.

## Fonts

Bundled, latin subset WOFF2 in \`fonts/\` (SIL OFL, \`fonts/OFL-*.txt\`). Only the faces of the active theme load. CJK falls back to Noto Sans TC. pdfcn's base-14 names map to Helvetica -> Inter, Times-Roman -> Lora, Courier -> Source Code Pro.

| family | files |
|---|---|
${fontRows.join("\n")}

## Images and text coverage

\`<img src>\` takes data: URIs, http(s) URLs (fetched for you in Node and the browser) or entries of \`options.images\`; \`PdfImage\` wraps it with variants and captions. Glyphs not covered by any registered font follow \`uncoveredText\`.

## Takumi CSS limits that shaped the components

${limits.join("\n") || "(see PROGRESS.md)"}

## Components (${components.length})

All are exported from \`src/index.js\`: \`import { ${components.slice(0, 4).map((c) => c.name).join(", ")}, ... } from "./src/index.js"\`.

${components.map(component).join("\n\n")}

## Blocks (${blocks.length})

All are exported from \`src/blocks/index.js\` with their sample data (\`<name>Sample\`) and, for most, recommended render options (\`<name>Options\`: page size, margins, footer band). Each takes a \`data\` prop in pdfcn's shape; with no props it renders its neutral sample.

${blocks.map(block).join("\n\n")}

## Examples

${EXAMPLES.map((e) => `### ${e.title}\n\n\`\`\`js\n${e.code}\`\`\`\n\nExpected text in the PDF: ${e.expect.map((x) => `"${x}"`).join(", ")}.`).join("\n\n")}
`;

// ---------------------------------------------------------------- llms.txt (index)
const index = `# pdfwind

> Vue 3 + Tailwind v4 components and document blocks (invoices, reports, forms, tickets, labels) that render to PDF with Takumi. Same code in Node and in the browser, no headless browser. Feature target: pdfcn. Not published to npm: clone the repository.

pdfwind has ${components.length} components, ${blocks.length} blocks, ${TH.themeNames.length} runtime-switchable themes (default + pdfcn's nine) with bundled fonts, and a Theme Builder in the playground.
Call \`renderPdf(Component, props, { theme, header, footer, themeCss, size, margin })\` from \`src/render/node.js\` (Node) or \`src/render/browser.js\` (browser, Vite); it returns PDF bytes.

## Docs

- [Full reference](./llms-full.txt): every component and block with props, types, defaults, variants and slots; renderPdf options; themes; fonts; Takumi limits; runnable examples
- [README](./README.md): overview, screenshots, how to run the playground
- [PROGRESS](./PROGRESS.md): per-phase notes, test results, known gaps

## Components

${components.map((c) => `- [${c.name}](./llms-full.txt#${c.name.toLowerCase()}): \`${c.file}\``).join("\n")}

## Blocks

${blocks.map((b) => `- [${b.name}](./llms-full.txt#${b.name.toLowerCase()}): \`${b.file}\``).join("\n")}

## Optional

- [Theme registry](./src/themes/index.js): the ten themes with fonts and page margins
- [Theme Builder model](./src/themes/builder.js): toCss / fromCss / contrast, pure JS
- [Nuxt example](./examples/nuxt/README.md): a server route that streams a PDF and a client-only preview
- [E2E scripts](./scripts): every behavior above is exercised by an \`e2e-phase*.mjs\` script
`;

if (process.argv.includes("--check")) {
  const stale = [["llms.txt", index], ["llms-full.txt", full]].filter(([f, c]) => !existsSync(ROOT + f) || readFileSync(ROOT + f, "utf8") !== c).map(([f]) => f);
  if (stale.length) { console.error(`stale: ${stale.join(", ")} (run node scripts/gen-llms.mjs)`); process.exit(1); }
  console.log("llms.txt and llms-full.txt are up to date");
} else {
  writeFileSync(ROOT + "llms.txt", index); writeFileSync(ROOT + "llms-full.txt", full);
  console.log(`llms.txt ${index.length} chars, llms-full.txt ${full.length} chars (${components.length} components, ${blocks.length} blocks)`);
}
