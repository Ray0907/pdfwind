import { compile } from "tailwindcss";

// Vue SSR HTML-escapes attributes; Tailwind candidates like [&>p]:mt-2 or before:content-['x'] must be scanned decoded.
export const unescapeHtml = (s) => s.replace(/&(lt|gt|quot|#39|amp);/g, (_, e) => ({ lt: "<", gt: ">", quot: '"', "#39": "'", amp: "&" })[e]);

/** @returns build(...htmlFragments) -> css for every class used. Sources are CSS strings (no fs), so this runs in the browser. */
export const makeTailwind = async ({ theme, utilities, preflight }, extra = "") => {
  const c = await compile(
    `@import "tailwindcss/theme.css" layer(theme); @import "tailwindcss/preflight.css" layer(base); @import "tailwindcss/utilities.css" layer(utilities); ${extra}`,
    { loadStylesheet: async (id, base) => ({ path: id, base, content: id.endsWith("theme.css") ? theme : id.endsWith("preflight.css") ? preflight : id.endsWith("utilities.css") ? utilities : "" }) },
  );
  return (...fragments) => c.build([...new Set(fragments.flatMap((f) => [...f.matchAll(/class="([^"]+)"/g)].flatMap((m) => unescapeHtml(m[1]).split(/\s+/))))]);
};
