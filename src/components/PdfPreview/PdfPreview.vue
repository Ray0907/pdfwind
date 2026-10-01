<script setup>
import { ref, computed, watch, onBeforeUnmount } from "vue";
import { renderPdf as defaultRender } from "../../render/browser.js";

const props = defineProps({
  component: { required: true },
  props: { type: Object, default: () => ({}) },
  options: { type: Object, default: () => ({}) }, // header, footer, themeCss, size, ...
  debounce: { type: Number, default: 100 }, // applies to changes after the first render
  render: { type: Function, default: defaultRender },
});
const emit = defineEmits(["rendered", "error"]);

// Two stacked iframes: the new PDF loads into the hidden one and is swapped in on its `load`,
// so the viewer never shows a blank reload of the visible one.
const urls = ref(["", ""]);
const front = ref(0);
const error = ref(null);
const busy = ref(false);
let timer, ctrl, seq = 0, pending = null, fallback, started = false;

const revoke = (u) => u && URL.revokeObjectURL(u);

const swap = (slot) => {
  if (!pending || pending.slot !== slot) return;
  clearTimeout(fallback);
  const old = urls.value[front.value];
  front.value = slot;
  revoke(old);
  urls.value[1 - slot] = ""; // drop the old blob from the now-hidden iframe
  const { id, pdf, ms } = pending;
  pending = null;
  emit("rendered", { pdf, id, ms, url: urls.value[slot] });
};

// `load` fires before the viewer has painted the PDF; swapping at once shows one empty-viewer frame.
// ponytail: fixed settle delay, no paint signal exists for the native viewer; pdf.js canvas would give a real one
const SETTLE_MS = 100;
const settle = (slot) => setTimeout(() => swap(slot), SETTLE_MS);

const run = async () => {
  ctrl?.abort(); // stale render: its result is discarded
  const mine = (ctrl = new AbortController());
  const id = ++seq;
  busy.value = true;
  const t0 = performance.now();
  try {
    const pdf = await props.render(props.component, props.props, { ...props.options, signal: mine.signal });
    if (mine.signal.aborted) return;
    error.value = null;
    if (pending) { revoke(urls.value[pending.slot]); pending = null; } // previous result never got its load event
    const slot = 1 - front.value;
    urls.value[slot] = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
    pending = { slot, id, pdf, ms: Math.round(performance.now() - t0) };
    // ponytail: if the viewer never fires `load`, swap anyway after 2s
    clearTimeout(fallback);
    fallback = setTimeout(() => swap(slot), 2000);
  } catch (e) {
    if (mine.signal.aborted) return;
    error.value = e;
    emit("error", e);
  } finally {
    if (id === seq) busy.value = false;
  }
};

// what to tell the reader: what failed and what to try. The raw exception stays available under "Technical details".
const help = computed(() => {
  const m = error.value?.message ?? "";
  if (/No registered font covers/.test(m)) return { what: "Some characters in this document have no font.", fix: "Choose a font that covers them, or set uncoveredText to \"placeholder\", then press Retry." };
  if (/Image .* could not be loaded/.test(m)) return { what: "An image in this document could not be loaded.", fix: "Check the image address, or set missingImages to \"ignore\", then press Retry." };
  if (/fetch|network|Failed to|font|wasm|load|NetworkError/i.test(m)) return { what: "A file the preview needs (the PDF engine or a font) did not load.", fix: "Check your connection, then press Retry." };
  return { what: "This document could not be drawn.", fix: "Press Retry. If it keeps failing, change an option or pick another document and it will render again." };
});
const retry = () => { clearTimeout(timer); run(); };

// deep: mutating `props.props` in place must re-render too
watch(() => [props.component, props.props, props.options], () => {
  clearTimeout(timer);
  if (!started) { started = true; run(); return; }
  timer = setTimeout(run, props.debounce);
}, { deep: true, immediate: true });
onBeforeUnmount(() => { clearTimeout(timer); clearTimeout(fallback); ctrl?.abort(); urls.value.forEach(revoke); });
</script>

<template>
  <div class="pdf-preview" :data-busy="busy">
    <iframe v-for="i in [0, 1]" :key="i" :src="urls[i] || undefined" :class="{ back: front !== i }" :inert="front !== i ? '' : undefined" :title="front === i ? 'PDF preview' : 'PDF preview (loading)'" @load="urls[i] && settle(i)" />
    <div v-if="!urls[front] && busy" class="pdf-preview-skeleton" role="status">Rendering PDF…</div>
    <div class="pdf-preview-bar" :class="{ on: busy && urls[front] }" aria-hidden="true" />
    <div v-if="error" class="pdf-preview-error" role="alert">
      <p class="pdf-preview-error-what"><strong>{{ help.what }}</strong> {{ help.fix }}</p>
      <button type="button" class="pdf-preview-retry" @click="retry">Retry</button>
      <details class="pdf-preview-error-details"><summary>Technical details</summary><pre>{{ error.message }}</pre></details>
    </div>
  </div>
</template>

<style scoped>
.pdf-preview { position: relative; width: 100%; height: 100%; }
.pdf-preview iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: var(--pdfwind-preview-bg, Canvas); z-index: 1; }
/* the new PDF loads fully painted *behind* the visible one (opacity:0 / display:none make the viewer skip painting, which flashes an empty viewer on swap) */
.pdf-preview iframe.back { z-index: 0; pointer-events: none; }
/* colors: CSS system colors by default (they follow color-scheme); a page can override --pdfwind-preview-bg / -muted / -accent / -error / -error-bg */
.pdf-preview-skeleton { position: absolute; inset: 0; display: grid; place-items: center; color: var(--pdfwind-preview-muted, GrayText); font: 0.875rem system-ui; background: var(--pdfwind-preview-bg, Canvas); }
.pdf-preview-bar { position: absolute; inset: 0 0 auto 0; height: 2px; background: var(--pdfwind-preview-accent, Highlight); opacity: 0; pointer-events: none; transition: opacity 150ms ease-out; z-index: 2; }
.pdf-preview-bar.on { opacity: 1; }
.pdf-preview-error { position: absolute; z-index: 3; inset: auto 0 0 0; max-height: 60%; overflow: auto; box-sizing: border-box; padding: 0.75rem 1rem; display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1rem; background: var(--pdfwind-preview-error-bg, Canvas); color: var(--pdfwind-preview-error, CanvasText); border-top: 2px solid var(--pdfwind-preview-error, CanvasText); font: 0.875rem/1.45 system-ui; }
.pdf-preview-error-what { margin: 0; flex: 1 1 16rem; }
.pdf-preview-retry { min-height: 2.5rem; min-width: 5rem; padding: 0 1rem; border-radius: 0.5rem; border: 1px solid currentColor; background: var(--pdfwind-preview-bg, Canvas); color: inherit; font: inherit; font-weight: 600; cursor: pointer; transition-property: scale; transition-duration: 150ms; transition-timing-function: cubic-bezier(0.23, 1, 0.32, 1); }
.pdf-preview-retry:active { scale: 0.96; }
.pdf-preview-retry:focus-visible, .pdf-preview-error-details summary:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.pdf-preview-error-details { flex: 1 1 100%; font-size: 0.75rem; }
.pdf-preview-error-details summary { cursor: pointer; min-height: 1.5rem; }
.pdf-preview-error-details pre { margin: 0.25rem 0 0; white-space: pre-wrap; overflow-wrap: anywhere; font: 0.75rem/1.4 ui-monospace, monospace; }
@media (prefers-reduced-motion: reduce) { .pdf-preview-bar, .pdf-preview-retry { transition: none; } .pdf-preview-retry:active { scale: 1; } }
</style>
