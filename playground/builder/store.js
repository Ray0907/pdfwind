// Theme Builder state: the live theme state, undo/redo history (limit 30), localStorage persistence.
// Controls update the state live (the preview re-renders on every input) and `commit` records a history entry; a burst of commits with
// the same key inside COALESCE_MS (a slider dragged or stepped with arrow keys) is one entry.
import { reactive, ref, computed } from "vue";
import { cloneState, statesEqual, defaultState, toCss, fromCss, setPath, safeName } from "../../src/themes/builder.js";
import { themeNames } from "../../src/themes/index.js";

export const STORAGE_KEY = "pdfwind-theme-builder";
export const HISTORY_LIMIT = 30;
export const COALESCE_MS = 600;

// localStorage can be missing, blocked, or throw on access (private windows, sandboxed iframes): every touch is guarded
const storage = () => { try { return window.localStorage; } catch { return null; } };

/** Validate a persisted object: it must survive toCss -> fromCss without errors. Returns a clean state or null. */
export const sanitize = (obj) => {
  try {
    if (!obj || obj.v !== 1) return null;
    const merged = { ...defaultState(), ...cloneState(obj) };
    const r = fromCss(toCss(merged), merged);
    if (r.issues.some((i) => i.level === "error")) return null;
    return { ...r.state, base: themeNames.includes(obj.base) ? obj.base : "default", name: safeName(obj.name) ? obj.name : "custom" };
  } catch { return null; }
};

export const loadSaved = () => {
  try {
    const raw = storage()?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw), st = sanitize(o.state);
    return st ? { state: st, doc: typeof o.doc === "string" ? o.doc : null } : null;
  } catch { return null; }
};

export const createStore = (initial) => {
  const state = reactive(cloneState(initial));
  const past = ref([]), future = ref([]), storageOk = ref(true);
  let committed = cloneState(initial), lastKey = null, lastAt = 0, pending = null; // pending: { label }
  const label = ref("");

  const restore = (s) => { Object.assign(state, cloneState(s)); committed = cloneState(s); lastKey = null; };
  /** Change a value without recording history (the preview follows). */
  const live = (path, value, lbl) => { setPath(state, path, value); pending = { label: lbl ?? path }; };
  /** Record the live changes as one history entry. `key` coalesces bursts of the same control. */
  const commit = (key = null, lbl) => {
    if (statesEqual(state, committed)) return false;
    const now = performance.now(), l = lbl ?? pending?.label ?? "change";
    if (!(key && key === lastKey && now - lastAt < COALESCE_MS && past.value.length)) { past.value = [...past.value, { state: committed, label: l }].slice(-HISTORY_LIMIT); }
    else past.value[past.value.length - 1].label = l;
    committed = cloneState(state); future.value = []; lastKey = key; lastAt = now; pending = null;
    return true;
  };
  /** Replace the whole state as one undoable step (clone a theme, reset all, import). */
  const replace = (next, lbl) => { Object.assign(state, cloneState(next)); lastKey = null; return commit(null, lbl); };
  const undo = () => {
    commit(null);
    const e = past.value.at(-1); if (!e) return null;
    past.value = past.value.slice(0, -1); future.value = [...future.value, { state: cloneState(state), label: e.label }]; restore(e.state);
    return e.label;
  };
  const redo = () => {
    const e = future.value.at(-1); if (!e) return null;
    future.value = future.value.slice(0, -1); past.value = [...past.value, { state: cloneState(state), label: e.label }].slice(-HISTORY_LIMIT); restore(e.state);
    return e.label;
  };
  const dirty = () => !statesEqual(state, committed);

  // ---- persistence: debounced; flushed when the page is hidden
  let timer = null, getDoc = () => null;
  const save = () => {
    clearTimeout(timer);
    try { const s = storage(); if (!s) throw new Error("no storage"); s.setItem(STORAGE_KEY, JSON.stringify({ v: 1, state: cloneState(state), doc: getDoc() })); storageOk.value = true; } catch { storageOk.value = false; }
  };
  const scheduleSave = () => { clearTimeout(timer); timer = setTimeout(save, 250); };
  const clearSaved = () => { try { storage()?.removeItem(STORAGE_KEY); } catch { /* blocked: nothing to clear */ } };

  return {
    state, past, future, storageOk, label,
    canUndo: computed(() => past.value.length > 0 || dirty()), canRedo: computed(() => future.value.length > 0),
    live, commit, replace, undo, redo, dirty, save, scheduleSave, clearSaved, setDocGetter: (f) => { getDoc = f; },
  };
};
