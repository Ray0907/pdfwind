// Turns the theme registry (src/themes/index.js) into what core.js renders with: css text + lazy font loaders per theme.
import { themes } from "../themes/index.js";
import { ITALIC_WHEN } from "./cjk.js";

/** @param css (name) => string|Promise<string>   @param bytes (file) => () => Promise<Uint8Array>   @returns { [name]: { css, fonts } } for every theme but `default` */
export const themeResources = (css, bytes) => Object.fromEntries(Object.values(themes).filter((t) => t.name !== "default").map((t) => [t.name, {
  css: () => css(t.name),
  // italic faces are only registered when the markup uses italics, like the default theme's
  fonts: t.fonts.map((f) => ({ name: f.family, ...(f.weight && { weight: f.weight }), ...(f.style && { style: f.style, when: ITALIC_WHEN }), data: bytes(f.file) })),
}]));
