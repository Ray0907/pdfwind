// Turns the theme registry (src/themes/index.js) into what core.js renders with: css per named theme and lazy font loaders per family.
import { themes, familyFiles } from "../themes/index.js";
import { ITALIC_WHEN } from "./cjk.js";

/** @param css (name) => string|Promise<string>   @returns { [name]: { css } } for every theme but `default` */
export const themeResources = (css) => Object.fromEntries(Object.values(themes).filter((t) => t.name !== "default").map((t) => [t.name, { css: () => css(t.name) }]));

/** @param bytes (file) => () => Promise<Uint8Array>   @returns { [family]: [FontLoader] }; italic faces register only when the markup uses italics */
export const familyResources = (bytes) => Object.fromEntries(Object.entries(familyFiles).map(([family, files]) => [family, files.map((f) => ({ name: family, ...(f.weight && { weight: f.weight }), ...(f.style && { style: f.style, when: ITALIC_WHEN }), data: bytes(f.file) }))]));
