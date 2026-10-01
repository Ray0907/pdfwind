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
