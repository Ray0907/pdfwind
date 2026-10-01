// Platform-neutral render core. Node and browser entries only differ in how they load `resources`.
import { createSSRApp, h } from "vue";
import { renderToString } from "@vue/server-renderer";
import { makeTailwind, unescapeHtml } from "./tailwind.js";
import init, { PdfRenderer } from "takumi-pdf/no-init";

const FAMILIES = ["Inter", "Noto Sans TC"];

// Vue component (+ props) or ready-made HTML string -> HTML string
// Vue's SSR fragment markers (<!--[--> ... <!--]-->) make Takumi drop the text next to them, so comments are stripped
const toHtml = async (input, props) => {
  const html = typeof input === "string" ? input : await renderToString(createSSRApp({ render: () => h(input, props) }));
  return html.replace(/<!--[\s\S]*?-->/g, "");
};

// <img src> values in the markup that Takumi cannot resolve itself: http(s) URLs are fetched here (Node and browser),
// data: URIs need nothing, anything else must come from options.images ([{ src, data }] or { sources }).
// ponytail: no cross-call cache for fetched images; the browser's HTTP cache covers repeat renders there
const resolveImages = async (markup, images, mode, signal) => {
  const given = Array.isArray(images) ? images : (images?.sources ?? []);
  const have = new Set(given.map((s) => s.src));
  const wanted = [...new Set([...markup.matchAll(/<img\b[^>]*?\ssrc="([^"]*)"/g)].map((m) => unescapeHtml(m[1])))].filter((src) => src && !src.startsWith("data:") && !have.has(src));
  const fetched = await Promise.all(wanted.map(async (src) => {
    try {
      if (!/^https?:\/\//.test(src)) throw new Error(`it is not a data: URI or http(s) URL and was not passed in options.images ([{ src, data }])`);
      const res = await fetch(src, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { src, data: new Uint8Array(await res.arrayBuffer()) };
    } catch (e) {
      if (signal?.aborted) throw e;
      if (mode === "ignore") return null;
      throw new Error(`Image "${src.slice(0, 80)}" could not be loaded: ${e.message}. Use missingImages: "ignore" to leave a blank space instead.`, { cause: e });
    }
  }));
  return [...given, ...fetched.filter(Boolean)];
};

/**
 * @param loadResources async () => { wasm, tailwind: {theme, utilities, preflight}, themeCss (default theme), fonts: [{name, data, style?}] }
 *   Called once, lazily, on the first render (retried if it rejects). `fonts` may be lazy FontLoaders: { name, ranges, data: () => bytes }; `when: RegExp` registers a face only if the markup matches.
 * @returns renderPdf(component, props?, opts?) -> Promise<Uint8Array>
 *   opts: signal, header/footer (component or HTML string), themeCss (Tailwind @theme / :root CSS),
 *   css, fonts (extra), uncoveredText ("placeholder" default), images ([{src,data}]; http(s) <img> URLs are fetched automatically), missingImages ("error" default | "ignore"), plus any takumi-pdf render option (size, margin, metadata, ...).
 */
export const createRenderPdf = (loadResources) => {
  let ready; // renderer + resources, created once
  // a rejected load must not stick: clear the cache so the next render retries
  const boot = () => (ready ??= loadResources().then(async (res) => {
    await init({ module_or_path: res.wasm });
    return { res, renderer: new PdfRenderer(), tw: new Map() };
  }).catch((e) => { ready = undefined; throw e; }));

  return async function renderPdf(component, props = {}, { signal, header, footer, themeCss = "", css, fonts = [], uncoveredText = "placeholder", images, missingImages = "error", ...rest } = {}) {
    signal?.throwIfAborted();
    const { res, renderer, tw } = await boot();
    const [body, head, foot] = await Promise.all([toHtml(component, props), header ? toHtml(header, props) : "", footer ? toHtml(footer, props) : ""]);
    // ponytail: compiler cached per themeCss string; grows if callers pass unbounded distinct themes
    themeCss = `${res.themeCss ?? ""}\n${themeCss}`; // default theme first, caller's overrides after
    if (!tw.has(themeCss)) tw.set(themeCss, makeTailwind(res.tailwind, themeCss).catch((e) => { tw.delete(themeCss); throw e; }));
    const twCss = (await tw.get(themeCss))(body, head, foot);
    const markup = body + head + foot;
    signal?.throwIfAborted();
    const sources = await resolveImages(markup, images, missingImages, signal);
    let pdf;
    try {
      pdf = await renderer.render(body, {
        size: "a4", fontFamilies: FAMILIES, ...rest, uncoveredText,
        // `when`: a face (italic) is only registered when the markup can use it
        fonts: [...res.fonts.filter((f) => !f.when || f.when.test(markup)).map(({ when, ...f }) => f), ...fonts],
        ...(sources.length && { images: { sources } }),
        css: [twCss, `body{font-family:Inter,"Noto Sans TC"}`, ...(css ? [css] : [])],
        ...(head && { header: head }), ...(foot && { footer: foot }),
      });
    } catch (e) {
      if (/No registered font covers/.test(e?.message)) e.message += ` (pass fonts: [...] with a covering face, or uncoveredText: "placeholder"|"blank")`;
      throw e;
    }
    // ponytail: takumi render is not cancellable; abort discards the result rather than stopping the work
    signal?.throwIfAborted();
    return pdf;
  };
};
