// Theme Builder model (pure: no DOM, no fs). The builder edits a `state`, compiles it to the theme CSS that `renderPdf` takes as `themeCss`,
// and imports CSS back into a state. Everything the builder can edit is a CSS variable (`--primary`, `--text-h1`, `--font-body`, ...), so
// export -> import is lossless and a theme file can be edited by hand. Units stay in pt in the state and the CSS; px appear only in the registry object.
import { themes, familyFiles, bundledFamilies } from "./index.js";

export const STATE_VERSION = 1;

/** The 12 color tokens in the order the builder shows them. */
export const COLOR_FIELDS = [
  { key: "foreground", label: "Foreground", hint: "Body text" },
  { key: "background", label: "Background", hint: "Page" },
  { key: "primary", label: "Primary", hint: "Brand fills, table headers" },
  { key: "primary-foreground", label: "Primary foreground", hint: "Text on primary" },
  { key: "muted", label: "Muted", hint: "Quiet fills, zebra rows" },
  { key: "muted-foreground", label: "Muted foreground", hint: "Captions, labels" },
  { key: "accent", label: "Accent", hint: "Links, highlights" },
  { key: "border", label: "Border", hint: "Rules, table lines" },
  { key: "destructive", label: "Destructive", hint: "Errors" },
  { key: "success", label: "Success", hint: "Success states" },
  { key: "warning", label: "Warning", hint: "Warnings" },
  { key: "info", label: "Info", hint: "Info states" },
];
export const COLOR_KEYS = COLOR_FIELDS.map((c) => c.key);

/** Numeric controls: path in the state -> range (pt unless unit says otherwise). */
export const RANGES = {
  "type.bodySize": { label: "Body size", min: 6, max: 24, step: 0.5, unit: "pt" },
  "type.lineHeight": { label: "Body line height", min: 1, max: 3, step: 0.05, unit: "" },
  "type.headingLineHeight": { label: "Heading line height", min: 1, max: 2, step: 0.05, unit: "" },
  ...Object.fromEntries([1, 2, 3, 4, 5, 6].map((i) => [`type.h.h${i}`, { label: `H${i} size`, min: 6, max: 96, step: 0.5, unit: "pt" }])),
  "gaps.paragraph": { label: "Paragraph gap", min: 0, max: 60, step: 1, unit: "pt" },
  "gaps.component": { label: "Component gap", min: 0, max: 80, step: 1, unit: "pt" },
  "gaps.section": { label: "Section gap", min: 0, max: 120, step: 1, unit: "pt" },
  "margin.top": { label: "Top margin", min: 0, max: 200, step: 1, unit: "pt" },
  "margin.right": { label: "Right margin", min: 0, max: 200, step: 1, unit: "pt" },
  "margin.bottom": { label: "Bottom margin", min: 0, max: 200, step: 1, unit: "pt" },
  "margin.left": { label: "Left margin", min: 0, max: 200, step: 1, unit: "pt" },
};

/** The default theme (src/themes/default.css) as a state; the E2E checks that parsing default.css gives exactly this. */
export const defaultState = () => ({
  v: STATE_VERSION, name: "default", base: "default",
  colors: { background: "#ffffff", foreground: "#18181b", muted: "#fafafa", "muted-foreground": "#71717a", primary: "#18181b", "primary-foreground": "#ffffff", border: "#e4e4e7", accent: "#71717a", destructive: "#b91c1c", success: "#15803d", warning: "#a16207", info: "#0369a1" },
  fonts: { body: "Inter", heading: "Inter" },
  type: { bodySize: 11, lineHeight: 1.65, headingLineHeight: 1.25, h: { h1: 24, h2: 20, h3: 16, h4: 14, h5: 12, h6: 10 } },
  gaps: { paragraph: 14, component: 18, section: 36 },
  margin: { top: 72, right: 56, bottom: 72, left: 56 },
});

export const cloneState = (s) => JSON.parse(JSON.stringify(s));
export const statesEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const getPath = (o, path) => path.split(".").reduce((x, k) => x?.[k], o);
export const setPath = (o, path, v) => { const ks = path.split("."), last = ks.pop(); ks.reduce((x, k) => x[k], o)[last] = v; return o; };
/** Page margins of a registry theme in pt (registry stores CSS px). */
export const marginPt = (name) => Object.fromEntries(Object.entries(themes[name].page.margin).map(([k, px]) => [k, Math.round(px * 0.75 * 100) / 100]));

export const isHex = (v) => /^#[0-9a-f]{6}$/i.test(v);
export const round2 = (n) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------- CSS out
const q = (family) => `"${family}", "Noto Sans TC"`;
export const safeName = (n) => /^[a-z][a-z0-9-]{0,30}$/.test(n);

/** State -> theme CSS: `@theme` (spacing, type scale, heading font) + `:root` (colors, body font, page margins) + `body`. */
export const toCss = (st) => `/* pdfwind theme "${st.name}": made with the pdfwind Theme Builder (based on ${st.base}). Pass it as themeCss, or import it back into the builder. */
@theme {
  --spacing-paragraph: ${st.gaps.paragraph}pt;
  --spacing-component: ${st.gaps.component}pt;
  --spacing-section: ${st.gaps.section}pt;
${["xs", "sm", "base", "lg", "xl", "2xl", "3xl"].map((k) => `  --text-${k}--line-height: ${st.type.lineHeight};`).join("\n")}
  --text-body: ${st.type.bodySize}pt;
${[1, 2, 3, 4, 5, 6].map((i) => `  --text-h${i}: ${st.type.h[`h${i}`]}pt;`).join("\n")}
  --leading-body: ${st.type.lineHeight};
  --leading-heading: ${st.type.headingLineHeight};
  --font-heading: ${q(st.fonts.heading)};
}

:root {
${COLOR_KEYS.map((k) => `  --${k}: ${st.colors[k]};`).join("\n")}
  /* blocks read this (a literal copy of muted) instead of their pinned #f4f4f5 */
  --block-muted: ${st.colors.muted};
  --font-body: ${q(st.fonts.body)};
  /* page margins are a render option, not Tailwind: apply them with renderPdf's margin (CSS px = pt x 4/3) */
  --page-margin-top: ${st.margin.top}pt;
  --page-margin-right: ${st.margin.right}pt;
  --page-margin-bottom: ${st.margin.bottom}pt;
  --page-margin-left: ${st.margin.left}pt;
}

body {
  font-family: var(--font-body);
  font-size: ${st.type.bodySize}pt;
  line-height: ${st.type.lineHeight};
}
`;

// ---------------------------------------------------------------- CSS in
// Variables of default.css that are part of the fixed Tailwind-side scale: accepted silently when unchanged, reported when edited.
const FIXED = { "--spacing": "4pt", "--text-xs": "10pt", "--text-sm": "12pt", "--text-base": "15pt", "--text-lg": "18pt", "--text-xl": "22pt", "--text-2xl": "28pt", "--text-3xl": "36pt", "--radius-sm": "2pt", "--radius-md": "4pt", "--radius-lg": "8pt" };
const SIZES = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl"];
const PT = /^(-?\d*\.?\d+)pt$/, NUM = /^-?\d*\.?\d+$/;

/**
 * CSS -> state. Starts from `fallback` (a state), applies every supported variable it finds and reports the rest; nothing is dropped silently.
 * @returns { state, issues: [{ level: "error"|"warning"|"note", variable, message }], applied }  errors = value rejected (current value kept),
 *   warnings = variable ignored (unknown / fixed), notes = value normalized or derived.
 */
export const fromCss = (css, fallback = defaultState()) => {
  const st = cloneState(fallback), issues = [], seen = new Set();
  const add = (level, variable, message) => issues.push({ level, variable, message });
  const text = String(css ?? "");
  const nameM = text.match(/\/\*\s*pdfwind theme "([^"]+)"/);
  const body = text.replace(/\/\*[\s\S]*?\*\//g, "");
  const decl = new Map(); // last one wins
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+?)\s*(?=;|\})/g)) decl.set(m[1], m[2].trim());
  const num = (v, path, name) => {
    const r = RANGES[path], pt = r.unit === "pt";
    if (!(pt ? PT : NUM).test(v)) return add("error", name, `"${v}" is not a number${pt ? " in pt (for example 12pt)" : ""}; kept ${getPath(st, path)}${r.unit}`);
    const n = parseFloat(v);
    if (n < r.min || n > r.max) return add("error", name, `${v} is outside ${r.min}-${r.max}${r.unit}; kept ${getPath(st, path)}${r.unit}`);
    setPath(st, path, n); seen.add(name);
  };
  const lh = [];
  for (const [name, v] of decl) {
    let m;
    if (COLOR_KEYS.includes(name.slice(2))) {
      const k = name.slice(2);
      if (isHex(v)) { st.colors[k] = v.toLowerCase(); seen.add(name); if (v !== v.toLowerCase()) add("note", name, `${v} normalized to ${v.toLowerCase()}`); }
      else if (/^#[0-9a-f]{3}$/i.test(v)) { st.colors[k] = `#${[...v.slice(1)].map((c) => c + c).join("").toLowerCase()}`; seen.add(name); add("note", name, `${v} expanded to ${st.colors[k]}`); }
      else add("error", name, `"${v}" is not a 6-digit hex color (#rrggbb); kept ${st.colors[k]}`);
    } else if ((m = name.match(/^--color-(.+)$/)) && COLOR_KEYS.includes(m[1])) {
      if (v !== `var(--${m[1]})`) add("warning", name, `ignored: the Tailwind color mapping is fixed (var(--${m[1]}))`);
    } else if (name === "--block-muted" || name === "--block-muted-foreground") {
      // --block-muted-foreground was exported by earlier builder versions; blocks no longer read it, so it is accepted when it matches and reported when not
      const k = name === "--block-muted" ? "muted" : "muted-foreground";
      if (v.toLowerCase() !== st.colors[k]) add(name === "--block-muted" ? "note" : "warning", name, `${name === "--block-muted" ? "normalized: the builder keeps it equal to --muted" : "ignored: it is no longer used (blocks follow --muted-foreground)"} (${v} differs from ${st.colors[k]})`);
      else seen.add(name);
    } else if ((m = name.match(/^--spacing-(paragraph|component|section)$/))) num(v, `gaps.${m[1]}`, name);
    else if (name === "--text-body") num(v, "type.bodySize", name);
    else if ((m = name.match(/^--text-h([1-6])$/))) num(v, `type.h.h${m[1]}`, name);
    else if (name === "--leading-body") num(v, "type.lineHeight", name);
    else if (name === "--leading-heading") num(v, "type.headingLineHeight", name);
    else if ((m = name.match(/^--text-(xs|sm|base|lg|xl|2xl|3xl)--line-height$/))) { lh.push([name, v]); }
    else if ((m = name.match(/^--page-margin-(top|right|bottom|left)$/))) num(v, `margin.${m[1]}`, name);
    else if (name === "--font-body" || name === "--font-heading") {
      const f = v.split(",")[0].trim().replace(/^["']|["']$/g, ""), role = name === "--font-body" ? "body" : "heading";
      if (bundledFamilies.includes(f)) { st.fonts[role] = f; seen.add(name); }
      else add("error", name, `font "${f}" is not bundled (${bundledFamilies.join(", ")}); kept ${st.fonts[role]}`);
    } else if (name in FIXED) {
      if (v !== FIXED[name]) add("warning", name, `ignored: ${name} is fixed by pdfwind (${FIXED[name]}); ${v} is not editable here`);
    } else add("warning", name, `unknown variable, ignored (${v})`);
  }
  // derived values must agree with their source
  const bad = lh.filter(([, v]) => !NUM.test(v) || parseFloat(v) !== st.type.lineHeight);
  for (const [name, v] of lh) if (!bad.some(([n]) => n === name)) seen.add(name);
  if (bad.length) add("note", bad.map(([n]) => n).join(", "), `normalized to the body line height ${st.type.lineHeight} (they follow --leading-body)`);
  const b = body.match(/(?:^|[}\s])body\s*\{([^}]*)\}/);
  if (b) {
    const fs = b[1].match(/font-size:\s*([^;]+)/)?.[1].trim(), l = b[1].match(/line-height:\s*([^;]+)/)?.[1].trim();
    if (fs && fs !== `${st.type.bodySize}pt`) add("note", "body { font-size }", `${fs} normalized to ${st.type.bodySize}pt (follows --text-body)`);
    if (l && parseFloat(l) !== st.type.lineHeight) add("note", "body { line-height }", `${l} normalized to ${st.type.lineHeight} (follows --leading-body)`);
  }
  if (nameM) { if (safeName(nameM[1])) st.name = nameM[1]; else add("note", "name", `"${nameM[1]}" is not a valid theme name (a-z, 0-9, -); kept ${st.name}`); }
  const wanted = [...COLOR_KEYS.map((k) => `--${k}`), "--spacing-paragraph", "--spacing-component", "--spacing-section", "--text-body", ...[1, 2, 3, 4, 5, 6].map((i) => `--text-h${i}`), "--leading-body", "--leading-heading", "--font-body", "--font-heading", ...["top", "right", "bottom", "left"].map((s) => `--page-margin-${s}`)];
  const missing = wanted.filter((n) => !decl.has(n));
  if (missing.length) add("note", missing.join(", "), `not set in this CSS: ${missing.length} value${missing.length > 1 ? "s" : ""} keep their current value`);
  return { state: st, issues, applied: wanted.filter((n) => seen.has(n)).length };
};

/** A registry theme as a state: its CSS file (text), its font families and page margins from the registry meta. */
export const baseState = (name, cssText) => {
  const d = defaultState(), t = themes[name];
  return fromCss(cssText, { ...d, name, base: name, fonts: { ...t.families }, margin: marginPt(name) });
};

// ---------------------------------------------------------------- registry object
const px = (pt) => Math.round(pt * 400 / 3) / 100;
/** State -> the entry shape of src/themes/index.js (page margins in CSS px there). */
export const toRegistryObject = (st) => {
  const fams = [...new Set([st.fonts.body, st.fonts.heading])];
  return {
    name: st.name,
    description: "Custom theme made with the pdfwind Theme Builder.",
    pdfcn: { body: st.fonts.body, heading: st.fonts.heading },
    families: { body: st.fonts.body, heading: st.fonts.heading },
    fonts: fams.flatMap((family) => familyFiles[family].map((f) => ({ family, ...f }))),
    bodySize: st.type.bodySize, h1: st.type.h.h1,
    page: { margin: { top: px(st.margin.top), right: px(st.margin.right), bottom: px(st.margin.bottom), left: px(st.margin.left) } },
  };
};
export const toRegistryJs = (st) => `// src/themes/index.js entry: add it to \`themes\`, and save the CSS as src/themes/${st.name}.css\n${JSON.stringify(toRegistryObject(st), null, 2)}\n`;

// ---------------------------------------------------------------- contrast
const chan = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
export const luminance = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b); };
export const contrastRatio = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
export const PAIRS = [
  { id: "fg-bg", label: "Foreground on background", fg: "foreground", bg: "background" },
  { id: "mfg-bg", label: "Muted foreground on background", fg: "muted-foreground", bg: "background" },
  { id: "mfg-muted", label: "Muted foreground on muted", fg: "muted-foreground", bg: "muted" },
  { id: "pfg-primary", label: "Primary foreground on primary", fg: "primary-foreground", bg: "primary" },
];
export const AA = 4.5;
/** The four pairs the panel shows: { id, label, fg, bg, ratio, pass } (pass = at least 4.5:1, body-size text). */
export const contrastPairs = (st) => PAIRS.map((p) => { const ratio = contrastRatio(st.colors[p.fg], st.colors[p.bg]); return { ...p, fgHex: st.colors[p.fg], bgHex: st.colors[p.bg], ratio, pass: ratio >= AA }; });

// ---------------------------------------------------------------- heading scale presets
export const SCALES = { "major-second": 1.125, "minor-third": 1.2, "major-third": 1.25, "perfect-fourth": 1.333 };
/** h6 = body size, each level up multiplies by the ratio (rounded to 0.5pt). */
export const scaleSizes = (bodySize, ratio) => Object.fromEntries([1, 2, 3, 4, 5, 6].map((i) => [`h${i}`, Math.round(bodySize * ratio ** (6 - i) * 2) / 2]));
export const matchScale = (st) => Object.entries(SCALES).find(([, r]) => JSON.stringify(scaleSizes(st.type.bodySize, r)) === JSON.stringify(st.type.h))?.[0] ?? "custom";

export { bundledFamilies };
