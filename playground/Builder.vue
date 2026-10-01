<script setup>
import { ref, reactive, computed, watch, nextTick, onMounted, onBeforeUnmount } from "vue";
import PdfPreview from "../src/components/PdfPreview/PdfPreview.vue";
import { renderPdf } from "../src/render/browser.js";
import { demos } from "./demos.js";
import { themeNames, themes } from "../src/themes/index.js";
import { COLOR_FIELDS, RANGES, AA, bundledFamilies, baseState, cloneState, fromCss, toCss, toRegistryJs, getPath, safeName, contrastPairs, SCALES, scaleSizes, matchScale } from "../src/themes/builder.js";
import { createStore, loadSaved, HISTORY_LIMIT } from "./builder/store.js";
import NumberField from "./builder/NumberField.vue";
import ColorField from "./builder/ColorField.vue";
import ThemeToggle from "./ThemeToggle.vue";

// ---- base themes: every registry theme as a state, parsed from its CSS file
const cssFiles = import.meta.glob("../src/themes/*.css", { query: "?raw", import: "default", eager: true });
const bases = Object.fromEntries(themeNames.map((n) => [n, baseState(n, cssFiles[`../src/themes/${n}.css`]).state]));
const params = new URLSearchParams(location.search);
const saved = loadSaved();
const startBase = themeNames.includes(params.get("base")) ? params.get("base") : "default";
const fresh = cloneState(bases[startBase]);
fresh.name = startBase === "default" ? "custom" : `${startBase}-custom`; // a name of your own, not the registry's
const store = createStore(saved?.state ?? fresh);
const { state } = store;
const base = computed(() => bases[state.base]);

// ---- document to preview
const visible = Object.entries(demos).filter(([, d]) => !d.hidden);
const docGroups = [["Start here", ["invoice-modern", "components-all"]], ...["Blocks", "Components"].map((g) => [g, visible.filter(([k, d]) => (d.group ?? "Components") === g && !["invoice-modern", "components-all"].includes(k)).map(([k]) => k)])];
const docKey = params.get("doc") ?? saved?.doc;
const doc = ref(docKey && demos[docKey] && !demos[docKey].hidden ? docKey : "invoice-modern");
store.setDocGetter(() => doc.value);

// ---- preview options: the theme goes in as themeCss, exactly like production; margins as the render option
const px = (pt) => Math.round(pt * 400 / 3) / 100;
const preview = computed(() => {
  const d = demos[doc.value], o = { ...(d.options ?? {}) }, fixed = o.size !== undefined && o.size !== "a4";
  let margin = o.margin ?? (doc.value === "components-all" ? 40 : undefined);
  if (!fixed) margin = { top: px(state.margin.top), right: px(state.margin.right), left: px(state.margin.left), bottom: typeof o.margin === "object" && o.margin.bottom === "auto" ? "auto" : px(state.margin.bottom) };
  const options = { ...o, ...(margin !== undefined && { margin }), themeCss: toCss(state) };
  return { d, options, fixed, auto: !fixed && typeof o.margin === "object" && o.margin.bottom === "auto", key: `${doc.value}|${options.themeCss}|${JSON.stringify(margin ?? null)}` };
});

// ---- announcements: one stable polite region, text replaced on each message
// messages raised in the same moment (an import and the contrast warning it causes) are read together, in order
const status = ref(""); let statusTimer, queue = [];
const announce = (msg) => {
  clearTimeout(statusTimer); queue.push(msg); status.value = "";
  statusTimer = setTimeout(() => { status.value = queue.join(" "); queue = []; statusTimer = setTimeout(() => { status.value = ""; }, 6000); }, 40);
};

// ---- editing
const rowId = (path) => `f-${path.replace(/\./g, "-")}`;
const setLive = (path, v, label) => store.live(path, v, label);
const commit = (path, label) => store.commit(path, label);
const reset = (path, label) => { store.live(path, getPath(base.value, path), label); store.commit(null, `Reset ${label}`); announce(`${label} reset to ${getPath(base.value, path)}`); };
const range = (path) => ({ ...RANGES[path], id: rowId(path), label: RANGES[path].label, base: getPath(base.value, path), modelValue: getPath(state, path) });
const colors = computed(() => COLOR_FIELDS.map((c) => ({ ...c, id: `f-color-${c.key}`, value: state.colors[c.key], base: base.value.colors[c.key] })));
const fonts = [...bundledFamilies].sort();
const setFont = (role, e) => { store.live(`fonts.${role}`, e.target.value, `${role} font`); store.commit(`font.${role}`, `${role} font`); };
const scale = computed(() => matchScale(state));
const setScale = (e) => {
  const v = e.target.value; if (v === "custom") return;
  state.type.h = v === "base" ? { ...base.value.type.h } : scaleSizes(state.type.bodySize, SCALES[v]);
  store.commit(null, "Heading scale"); announce(`Heading sizes ${Object.values(state.type.h).join(", ")} pt`);
};
const nameError = ref("");
const setName = (e) => { const v = e.target.value.trim(); if (!safeName(v)) { nameError.value = "Use lowercase letters, numbers and dashes, starting with a letter (max 31)."; return; } nameError.value = ""; store.live("name", v, "Theme name"); store.commit("name", "Theme name"); };
const cloneFrom = ref(startBase);
const clone = () => { const b = cloneFrom.value, next = cloneState(bases[b]); next.name = b === "default" ? "custom" : `${b}-custom`; store.replace(next, `Clone ${b}`); nameError.value = ""; announce(`Started from the ${b} theme`); };
const resetAll = () => { const next = cloneState(base.value); next.name = state.name; store.replace(next, "Reset all"); announce(`Everything reset to the ${state.base} theme`); };
const doUndo = () => { const l = store.undo(); announce(l ? `Undid ${l}` : "Nothing to undo"); };
const doRedo = () => { const l = store.redo(); announce(l ? `Redid ${l}` : "Nothing to redo"); };
const onKey = (e) => {
  if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
  const k = e.key.toLowerCase(), t = e.target;
  // text fields keep their native undo (typing); everything else, including sliders, color pickers and buttons, undoes the theme
  if (t?.tagName === "TEXTAREA" || (t?.tagName === "INPUT" && ["text", "number"].includes(t.type))) return;
  if (k === "z") { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); } else if (k === "y") { e.preventDefault(); doRedo(); }
};
const changed = computed(() => themeNames.includes(state.base) && JSON.stringify({ ...state, name: "", base: "" }) !== JSON.stringify({ ...base.value, name: "", base: "" }));

// ---- contrast
const pairs = computed(() => contrastPairs(state));
const failing = computed(() => pairs.value.filter((p) => !p.pass).length);
watch(failing, (n) => announce(n ? `${n} of ${pairs.value.length} contrast pairs are below ${AA}:1` : `All ${pairs.value.length} contrast pairs reach ${AA}:1`));

// ---- export / import
const format = ref("css");
const out = computed(() => (format.value === "css" ? toCss(state) : toRegistryJs(state)));
const copied = ref(false); let copyTimer;
const copy = async () => {
  const what = format.value === "css" ? "theme CSS" : "theme JS object";
  let ok = false;
  try { await navigator.clipboard.writeText(out.value); ok = true; } catch {
    try { const ta = document.createElement("textarea"); ta.value = out.value; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;opacity:0"; document.body.append(ta); ta.select(); ok = document.execCommand("copy"); ta.remove(); } catch { ok = false; }
  }
  clearTimeout(copyTimer);
  if (ok) { copied.value = true; copyTimer = setTimeout(() => { copied.value = false; }, 1600); announce(`Copied the ${what}`); } else announce(`Could not copy; select the text in the box and copy it yourself`);
};
const download = () => {
  const name = format.value === "css" ? "theme.css" : "theme.js", url = URL.createObjectURL(new Blob([out.value], { type: format.value === "css" ? "text/css" : "text/javascript" }));
  const a = document.createElement("a"); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  announce(`Downloaded ${name}`);
};
const importText = ref(""), result = ref(null), fileInput = ref(null);
const applyImport = (text, source) => {
  const r = fromCss(text, state), errors = r.issues.filter((i) => i.level === "error").length, warnings = r.issues.filter((i) => i.level === "warning").length, notes = r.issues.filter((i) => i.level === "note").length;
  if (!r.applied && !errors) { result.value = { ok: false, summary: `No theme variables found in ${source}. Nothing was changed.`, issues: r.issues }; announce(result.value.summary); return; }
  store.replace(r.state, "Import");
  const parts = [errors && `${errors} rejected`, warnings && `${warnings} ignored`, notes && `${notes} note${notes > 1 ? "s" : ""}`].filter(Boolean);
  result.value = { ok: !errors, summary: `Imported ${r.applied} values from ${source}${parts.length ? `: ${parts.join(", ")}` : ""}.`, issues: r.issues };
  announce(result.value.summary);
};
const onFile = async (e) => { const f = e.target.files?.[0]; if (!f) return; try { applyImport(await f.text(), f.name); } catch { result.value = { ok: false, summary: `Could not read ${f.name}.`, issues: [] }; announce(result.value.summary); } e.target.value = ""; };

// ---- preview plumbing + dev hook for the E2E
const keys = new WeakMap(), renders = [];
const render = async (c, p, o) => { const pdf = await renderPdf(c, p, o); keys.set(pdf, `${doc.value}|${o.themeCss}|${JSON.stringify(o.margin ?? null)}`); return pdf; };
const onRendered = (r) => { renders.push({ id: r.id, ms: r.ms, key: keys.get(r.pdf), bytes: r.pdf }); if (renders.length > 60) renders.shift(); };
const renderError = ref("");
watch(() => [JSON.stringify(state), doc.value], () => store.scheduleSave(), { deep: false });
const onHide = () => store.save();
onMounted(() => {
  window.addEventListener("keydown", onKey); window.addEventListener("pagehide", onHide);
  if (!store.storageOk.value) announce("Browser storage is blocked: your theme is kept only until you leave this page.");
  if (import.meta.env.DEV) window.__builder = { renders, key: () => preview.value.key, state: () => cloneState(state), doc: () => doc.value, historyLength: () => store.past.value.length, storageOk: () => store.storageOk.value, setDoc: (d) => { doc.value = d; } };
  store.save(); // first save also reveals blocked storage
  if (!store.storageOk.value) announce("Browser storage is blocked: your theme is kept only until you leave this page.");
});
onBeforeUnmount(() => { window.removeEventListener("keydown", onKey); window.removeEventListener("pagehide", onHide); store.save(); });
const levelWord = { error: "Rejected", warning: "Ignored", note: "Note" };
</script>

<template>
  <div class="builder">
    <a class="skip" href="#preview">Skip to preview</a>
    <main class="shell">
      <section class="panel" aria-labelledby="builder-title">
        <header class="bar">
          <div class="bar-title">
            <h1 id="builder-title">Theme Builder</h1>
            <a class="link" href="./">Back to the playground</a>
          </div>
          <div class="bar-actions" role="toolbar" aria-label="History">
            <button type="button" class="btn" :disabled="!store.canUndo.value" aria-keyshortcuts="Control+Z Meta+Z" @click="doUndo">
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.5 5 3.5 9l4 4" /><path d="M4 9h8a4 4 0 0 1 0 8H8" /></svg>Undo
            </button>
            <button type="button" class="btn" :disabled="!store.canRedo.value" aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y" @click="doRedo">
              Redo<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12.5 5 4 4-4 4" /><path d="M16 9H8a4 4 0 0 0 0 8h4" /></svg>
            </button>
            <button type="button" class="btn" :disabled="!changed" @click="resetAll">Reset all</button>
          </div>
          <ThemeToggle />
          <p class="status" role="status" aria-live="polite" aria-atomic="true" data-testid="status">{{ status }}</p>
          <p class="meta">{{ store.past.value.length }} of {{ HISTORY_LIMIT }} undo steps<span v-if="!store.storageOk.value"> · storage blocked, not saved</span><span v-else> · saved in this browser</span></p>
        </header>

        <section class="card" aria-labelledby="h-start">
          <h2 id="h-start">Start from</h2>
          <div class="row2">
            <div class="field">
              <label for="clone-from" class="field-label">Base theme</label>
              <div class="field-controls">
                <select id="clone-from" v-model="cloneFrom" class="select">
                  <option v-for="t in themeNames" :key="t" :value="t">{{ t }}</option>
                </select>
                <button type="button" class="btn" @click="clone">Clone theme</button>
              </div>
              <span class="hint" id="clone-hint">{{ themes[cloneFrom].description }}</span>
            </div>
            <div class="field" :class="{ invalid: nameError }">
              <label for="theme-name" class="field-label">Your theme's name</label>
              <div class="field-controls"><input id="theme-name" class="text" type="text" spellcheck="false" autocomplete="off" :value="state.name" :aria-invalid="nameError ? 'true' : undefined" :aria-describedby="nameError ? 'name-err' : undefined" @input="(e) => { if (safeName(e.target.value.trim())) { nameError = ''; store.live('name', e.target.value.trim(), 'Theme name'); } }" @change="setName" /></div>
              <p v-if="nameError" id="name-err" class="field-error">{{ nameError }}</p>
              <span class="hint">Resets go back to <b>{{ state.base }}</b>.</span>
            </div>
          </div>
        </section>

        <section class="card" aria-labelledby="h-colors">
          <h2 id="h-colors">Colors</h2>
          <section class="contrast" aria-labelledby="h-contrast">
            <h3 id="h-contrast">Contrast <span class="sub">WCAG AA: {{ AA }}:1 for body-size text</span></h3>
            <p class="summary" :class="failing ? 'is-fail' : 'is-pass'" data-testid="contrast-summary">
              <svg v-if="failing" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M10 6v5M10 14h.01" /><path d="M10 2.5 18 16.5H2z" stroke-linejoin="round" /></svg>
              <svg v-else viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4.5 10.5 3.5 3.5 7.5-8" /></svg>
              {{ failing ? `${failing} of ${pairs.length} pairs are below ${AA}:1. The preview still renders; consider darker text colors.` : `All ${pairs.length} pairs reach ${AA}:1.` }}
            </p>
            <table class="ratios" data-testid="contrast-table">
              <caption class="sr-only">Contrast ratio of the four text and background pairs</caption>
              <thead><tr><th scope="col">Pair</th><th scope="col">Ratio</th><th scope="col">Result</th></tr></thead>
              <tbody>
                <tr v-for="p in pairs" :key="p.id" :data-pair="p.id">
                  <th scope="row"><span class="sample" :style="{ color: p.fgHex, background: p.bgHex }" aria-hidden="true" /> {{ p.label }}</th>
                  <td class="ratio">{{ p.ratio.toFixed(2) }}:1</td>
                  <td>
                    <span class="badge" :class="p.pass ? 'pass' : 'fail'">
                      <svg v-if="p.pass" viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4.5 10.5 3.5 3.5 7.5-8" /></svg>
                      <svg v-else viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg>
                      {{ p.pass ? "Pass" : "Fail" }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
          <ColorField v-for="c in colors" :key="c.key" :id="c.id" :label="c.label" :hint="c.hint" :model-value="c.value" :base="c.base"
            @live="(v) => setLive(`colors.${c.key}`, v, `${c.label} color`)" @commit="commit(`colors.${c.key}`, `${c.label} color`)" @reset="reset(`colors.${c.key}`, `${c.label} color`)" />
        </section>

        <section class="card" aria-labelledby="h-type">
          <h2 id="h-type">Typography</h2>
          <div class="field">
            <label for="font-body" class="field-label">Body font</label>
            <div class="field-controls"><select id="font-body" class="select" :value="state.fonts.body" @change="(e) => setFont('body', e)"><option v-for="f in fonts" :key="f" :value="f">{{ f }}</option></select>
              <button type="button" class="icon-btn" :disabled="state.fonts.body === base.fonts.body" :aria-label="`Reset Body font to ${base.fonts.body}`" :title="`Reset to ${base.fonts.body}`" @click="reset('fonts.body', 'Body font')"><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10a6 6 0 1 0 2-4.5" /><path d="M4 3.5V7h3.5" /></svg></button></div>
          </div>
          <div class="field">
            <label for="font-heading" class="field-label">Heading font</label>
            <div class="field-controls"><select id="font-heading" class="select" :value="state.fonts.heading" @change="(e) => setFont('heading', e)"><option v-for="f in fonts" :key="f" :value="f">{{ f }}</option></select>
              <button type="button" class="icon-btn" :disabled="state.fonts.heading === base.fonts.heading" :aria-label="`Reset Heading font to ${base.fonts.heading}`" :title="`Reset to ${base.fonts.heading}`" @click="reset('fonts.heading', 'Heading font')"><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10a6 6 0 1 0 2-4.5" /><path d="M4 3.5V7h3.5" /></svg></button></div>
            <span class="hint">Only the fonts bundled with pdfwind; each one loads when you pick it.</span>
          </div>
          <NumberField v-bind="range('type.bodySize')" @live="(v) => setLive('type.bodySize', v, 'Body size')" @commit="commit('type.bodySize', 'Body size')" @reset="reset('type.bodySize', 'Body size')" />
          <NumberField v-bind="range('type.lineHeight')" @live="(v) => setLive('type.lineHeight', v, 'Body line height')" @commit="commit('type.lineHeight', 'Body line height')" @reset="reset('type.lineHeight', 'Body line height')" />
          <NumberField v-bind="range('type.headingLineHeight')" @live="(v) => setLive('type.headingLineHeight', v, 'Heading line height')" @commit="commit('type.headingLineHeight', 'Heading line height')" @reset="reset('type.headingLineHeight', 'Heading line height')" />
          <div class="field">
            <label for="scale" class="field-label">Heading scale</label>
            <div class="field-controls">
              <select id="scale" class="select" :value="scale" @change="setScale">
                <option v-if="scale === 'custom'" value="custom">Custom</option>
                <option value="base">Sizes of {{ state.base }}</option>
                <option v-for="(r, k) in SCALES" :key="k" :value="k">{{ k.replace("-", " ") }} (x{{ r }} from the body size)</option>
              </select>
            </div>
          </div>
          <NumberField v-for="i in 6" :key="i" v-bind="range(`type.h.h${i}`)" @live="(v) => setLive(`type.h.h${i}`, v, `H${i} size`)" @commit="commit(`type.h.h${i}`, `H${i} size`)" @reset="reset(`type.h.h${i}`, `H${i} size`)" />
        </section>

        <section class="card" aria-labelledby="h-space">
          <h2 id="h-space">Spacing</h2>
          <NumberField v-for="k in ['paragraph', 'component', 'section']" :key="k" v-bind="range(`gaps.${k}`)" @live="(v) => setLive(`gaps.${k}`, v, `${RANGES[`gaps.${k}`].label}`)" @commit="commit(`gaps.${k}`, RANGES[`gaps.${k}`].label)" @reset="reset(`gaps.${k}`, RANGES[`gaps.${k}`].label)" />
        </section>

        <section class="card" aria-labelledby="h-margin">
          <h2 id="h-margin">Page margins</h2>
          <p class="hint" data-testid="margin-note">{{ preview.fixed ? "This document has its own fixed page size, so margins are not applied to it." : preview.auto ? "Applies to this document. Its bottom margin is automatic because it has a footer band." : "Applies to this document." }}</p>
          <NumberField v-for="k in ['top', 'right', 'bottom', 'left']" :key="k" v-bind="range(`margin.${k}`)" @live="(v) => setLive(`margin.${k}`, v, RANGES[`margin.${k}`].label)" @commit="commit(`margin.${k}`, RANGES[`margin.${k}`].label)" @reset="reset(`margin.${k}`, RANGES[`margin.${k}`].label)" />
        </section>

        <section class="card" aria-labelledby="h-export">
          <h2 id="h-export">Export</h2>
          <fieldset class="seg">
            <legend>Format</legend>
            <label><input v-model="format" type="radio" name="fmt" value="css" /><span>CSS</span></label>
            <label><input v-model="format" type="radio" name="fmt" value="js" /><span>JS object</span></label>
          </fieldset>
          <div class="field">
            <label for="out" class="field-label">{{ format === "css" ? "Generated theme.css" : "Registry entry (src/themes/index.js shape)" }}</label>
            <textarea id="out" class="code" readonly rows="12" spellcheck="false" :value="out" data-testid="export" />
          </div>
          <div class="actions">
            <button type="button" class="btn primary" @click="copy">
              <svg v-if="copied" viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4.5 10.5 3.5 3.5 7.5-8" /></svg>
              <svg v-else viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="7" width="9" height="9" rx="2" /><path d="M13 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /></svg>
              {{ copied ? "Copied" : format === "css" ? "Copy CSS" : "Copy object" }}
            </button>
            <button type="button" class="btn" @click="download">
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 3v10M6 9.5l4 4 4-4M4 16.5h12" /></svg>
              Download {{ format === "css" ? "theme.css" : "theme.js" }}
            </button>
          </div>
        </section>

        <section class="card" aria-labelledby="h-import">
          <h2 id="h-import">Import</h2>
          <div class="field">
            <label for="import-css" class="field-label">Paste theme CSS</label>
            <textarea id="import-css" v-model="importText" class="code" rows="6" spellcheck="false" placeholder="@theme { --text-h1: 30pt; } :root { --primary: #rrggbb; }" />
          </div>
          <div class="actions">
            <button type="button" class="btn primary" :disabled="!importText.trim()" @click="applyImport(importText, 'the pasted CSS')">Apply pasted CSS</button>
            <label class="btn file" for="import-file">Choose a .css file<input id="import-file" ref="fileInput" type="file" accept=".css,text/css" @change="onFile" /></label>
          </div>
          <div v-if="result" class="result" :class="result.ok ? 'ok' : 'bad'" data-testid="import-result">
            <p class="result-summary">{{ result.summary }}</p>
            <ul v-if="result.issues.length" class="issues" aria-label="Import details">
              <li v-for="(i, n) in result.issues" :key="n" :class="i.level"><b>{{ levelWord[i.level] }}</b> <code>{{ i.variable }}</code> {{ i.message }}</li>
            </ul>
          </div>
        </section>
      </section>

      <section id="preview" class="stage" aria-label="Live preview" tabindex="-1">
        <div class="stage-bar">
          <label for="doc" class="field-label">Preview document</label>
          <select id="doc" v-model="doc" class="select">
            <optgroup v-for="[g, ks] in docGroups" :key="g" :label="g"><option v-for="k in ks" :key="k" :value="k">{{ demos[k].title }}</option></optgroup>
          </select>
        </div>
        <div class="frame">
          <PdfPreview :component="preview.d.component" :props="{}" :options="preview.options" :render="render" @rendered="onRendered" @error="(e) => { renderError = e.message; }" />
        </div>
      </section>
    </main>
  </div>
</template>

<style>
.builder { --hit: 40px; background: var(--bg); color: var(--fg); font: 14px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; min-height: 100dvh; }
.builder *, .builder *::before, .builder *::after { box-sizing: border-box; }
.builder h1, .builder h2, .builder h3, .builder p { margin: 0; }
.builder :focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
.builder .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.builder .skip { position: absolute; left: 8px; top: -48px; z-index: 10; padding: 10px 14px; border-radius: 8px; background: var(--surface); border: 1px solid var(--line2); color: var(--fg); }
.builder .skip:focus { top: 8px; }

.shell { display: grid; grid-template-columns: minmax(0, 1fr); gap: 0; }
.panel { padding: 16px; display: grid; gap: 12px; align-content: start; min-width: 0; }
.stage { padding: 0 16px 16px; display: flex; flex-direction: column; gap: 8px; min-width: 0; min-height: 85vh; }
.stage:focus { outline: none; }
@media (min-width: 960px) {
  .builder { height: 100dvh; overflow: hidden; }
  .shell { grid-template-columns: 460px minmax(0, 1fr); height: 100dvh; }
  .panel { overflow-y: auto; height: 100dvh; overscroll-behavior: contain; }
  .stage { height: 100dvh; padding: 16px 16px 16px 0; min-height: 0; }
}

.bar { display: grid; gap: 8px; }
.bar-title { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.builder h1 { font-size: 20px; line-height: 1.2; font-weight: 650; }
.link { color: var(--accent); text-underline-offset: 3px; display: inline-flex; align-items: center; min-height: var(--hit); }
.bar-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.status { min-height: 20px; color: var(--fg); font-weight: 500; }
.meta { color: var(--fg2); font-size: 12px; }

.card { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 8px; display: grid; gap: 4px; }
.card > h2 { font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--fg2); font-weight: 650; padding: 8px 8px 4px; }
.row2 { display: grid; gap: 4px; }

.field { display: grid; gap: 4px; padding: 6px 8px; border-radius: 8px; }
.field-label { font-weight: 550; font-size: 13px; }
.field-controls { display: flex; align-items: center; gap: 8px; min-width: 0; }
.hint { color: var(--fg2); font-size: 12px; }
.field-error { color: var(--bad); font-size: 12px; font-weight: 500; }
.field.invalid .hex, .field.invalid .num { border-color: var(--bad); }

.btn, .icon-btn, .select, .text, .num, .hex { min-height: var(--hit); border-radius: 8px; border: 1px solid var(--line2); background: var(--btn); color: var(--fg); font: inherit; }
.btn { padding: 0 14px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; white-space: nowrap; transition-property: background-color, border-color, scale; transition-duration: 150ms; transition-timing-function: var(--ease); }
.btn.primary { background: var(--accent); border-color: var(--accent); color: var(--accent-fg); font-weight: 550; }
.btn:active:not(:disabled), .icon-btn:active:not(:disabled) { scale: 0.96; }
.btn:disabled, .icon-btn:disabled { opacity: 0.45; cursor: not-allowed; }
@media (hover: hover) { .btn:hover:not(:disabled), .icon-btn:hover:not(:disabled) { background: var(--btn-hover); } .btn.primary:hover:not(:disabled) { background: var(--accent); filter: brightness(1.08); } }
.icon-btn { width: var(--hit); padding: 0; display: inline-grid; place-items: center; cursor: pointer; flex: none; transition-property: background-color, scale; transition-duration: 150ms; transition-timing-function: var(--ease); }
.select, .text { padding: 0 10px; min-width: 0; flex: 1; }
.num { width: 76px; padding: 0 8px; flex: none; font-variant-numeric: tabular-nums; }
.unit { width: 18px; color: var(--fg2); font-size: 12px; flex: none; }
.hex { width: 112px; padding: 0 10px; font-family: ui-monospace, "SF Mono", Menlo, monospace; flex: none; }
.swatch { width: var(--hit); height: var(--hit); padding: 3px; border-radius: 8px; border: 1px solid var(--line2); background: var(--btn); cursor: pointer; flex: none; }
.swatch::-webkit-color-swatch-wrapper { padding: 0; } .swatch::-webkit-color-swatch { border: 1px solid var(--line); border-radius: 5px; }
.slider { flex: 1; min-width: 80px; height: var(--hit); margin: 0; accent-color: var(--accent); cursor: pointer; }
.color-field .field-controls { flex-wrap: nowrap; }
.file { position: relative; cursor: pointer; }
.file input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
.file:focus-within { outline: 2px solid var(--ring); outline-offset: 2px; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; padding: 4px 8px 8px; }
.code { width: 100%; min-height: 96px; resize: vertical; border-radius: 8px; border: 1px solid var(--line2); background: var(--btn); color: var(--fg); padding: 10px; font: 12px/1.5 ui-monospace, "SF Mono", Menlo, monospace; }

.seg { border: 0; margin: 0; padding: 4px 8px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.seg legend { float: left; padding: 0; margin-right: 8px; font-weight: 550; font-size: 13px; line-height: var(--hit); }
.seg label { position: relative; display: inline-flex; }
.seg input { position: absolute; opacity: 0; inset: 0; margin: 0; cursor: pointer; }
.seg span { min-height: var(--hit); padding: 0 14px; display: inline-flex; align-items: center; border: 1px solid var(--line2); border-radius: 8px; background: var(--btn); cursor: pointer; transition-property: background-color, border-color; transition-duration: 150ms; transition-timing-function: var(--ease); }
.seg input:checked + span { background: var(--accent); border-color: var(--accent); color: var(--accent-fg); font-weight: 550; }
.seg input:focus-visible + span { outline: 2px solid var(--ring); outline-offset: 2px; }

.contrast { padding: 4px 8px 8px; display: grid; gap: 8px; border-radius: 8px; }
.contrast h3 { font-size: 14px; font-weight: 650; }
.contrast .sub { font-weight: 400; color: var(--fg2); font-size: 12px; margin-left: 6px; }
.summary { display: flex; align-items: flex-start; gap: 8px; padding: 8px 10px; border-radius: 8px; font-weight: 550; }
.summary svg { flex: none; margin-top: 2px; }
.summary.is-pass { background: var(--ok-bg); color: var(--ok); } .summary.is-fail { background: var(--bad-bg); color: var(--bad); }
.ratios { width: 100%; border-collapse: collapse; font-size: 13px; }
.ratios th, .ratios td { text-align: left; padding: 6px 4px; border-top: 1px solid var(--line); font-weight: 400; vertical-align: middle; }
.ratios thead th { border-top: 0; color: var(--fg2); font-size: 12px; font-weight: 550; }
.ratios tbody th { display: flex; align-items: center; gap: 8px; }
.ratio { font-variant-numeric: tabular-nums; white-space: nowrap; }
.sample { flex: none; width: 28px; height: 28px; border-radius: 6px; border: 1px solid var(--line2); display: inline-grid; place-items: center; font-weight: 700; font-size: 13px; }
.sample::before { content: "Aa"; }
.badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 999px; font-weight: 600; font-size: 12px; }
.badge.pass { background: var(--ok-bg); color: var(--ok); } .badge.fail { background: var(--bad-bg); color: var(--bad); }

.result { margin: 0 8px 8px; padding: 8px 10px; border-radius: 8px; display: grid; gap: 6px; }
.result.ok { background: var(--ok-bg); color: var(--ok); } .result.bad { background: var(--bad-bg); color: var(--bad); }
.result-summary { font-weight: 600; }
.issues { margin: 0; padding: 0; list-style: none; display: grid; gap: 4px; font-size: 12px; color: var(--fg); }
.issues li { padding: 4px 8px; border-radius: 6px; background: var(--surface); border: 1px solid var(--line); overflow-wrap: anywhere; }
.issues code { font-family: ui-monospace, "SF Mono", Menlo, monospace; }

.stage-bar { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding-top: 16px; }
@media (min-width: 960px) { .stage-bar { padding-top: 0; } }
.stage-bar .select { max-width: 360px; }
.frame { flex: 1; min-height: 70vh; border-radius: 16px; overflow: hidden; border: 1px solid var(--line); background: var(--surface); position: relative; }
.frame > * { position: absolute; inset: 0; }
@media (prefers-reduced-motion: reduce) { .builder *, .builder *::before, .builder *::after { transition: none !important; } .builder .btn:active, .builder .icon-btn:active { scale: 1 !important; } }
</style>
