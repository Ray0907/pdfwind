import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge must know our theme's custom names, or `text-h1 text-primary` would be read as two colors
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["body", "h1", "h2", "h3", "h4", "h5", "h6"],
      spacing: ["paragraph", "component", "section"],
      leading: ["body", "heading"],
    },
  },
});

/** Merge class strings; later ones win on conflicts, so a user's `class="p-2"` really overrides a default `p-4`. */
export const cn = (...classes) => twMerge(classes);

/** $attrs minus `class`: components pass the merged class themselves (v-bind="rest($attrs)" :class="cn(base, $attrs.class)"). */
export const rest = ({ class: _class, ...attrs }) => attrs;

const TOKENS = ["foreground", "background", "muted", "muted-foreground", "primary", "primary-foreground", "border", "accent", "destructive", "success", "warning", "info"];

/** Theme token (kebab or camel, as in pdfcn) -> css var; any other value is a raw CSS color. */
export const color = (value) => {
  const key = value?.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  return TOKENS.includes(key) ? `var(--${key})` : value;
};

/** A translucent tint of a theme token or CSS color (`pct` percent of it over transparent). */
export const tint = (value, pct = 10) => `color-mix(in srgb, ${color(value)} ${pct}%, transparent)`;

/** Readable text color on `value` (a theme token or a CSS color). Primary has its own foreground token; the other tokens (status colors, accent)
 *  take the page background, which stays readable on them in light and dark themes. A user-supplied hex color gets black or white by luminance. */
export const onColor = (value) => {
  const key = value?.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
  if (TOKENS.includes(key)) return key === "primary" ? "var(--primary-foreground)" : "var(--background)";
  const m = /^#?([0-9a-f]{6})$/i.exec(value ?? "");
  if (!m) return "var(--primary-foreground)";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  // token-ok: ink on a color the user supplied must not depend on the theme
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.55 ? "#18181b" : "#ffffff";
};
