<script setup>
import { ref, watch, computed } from "vue";
import { isHex } from "../../src/themes/builder.js";

// label + native color picker + hex text field for one color token, with a per-control reset to the base theme's color
const props = defineProps({ id: String, label: String, hint: String, modelValue: String, base: String });
const emit = defineEmits(["live", "commit", "reset"]);
const draft = ref(props.modelValue), error = ref("");
watch(() => props.modelValue, (v) => { if (draft.value.toLowerCase() !== v || error.value) { draft.value = v; error.value = ""; } });
const same = computed(() => props.modelValue === props.base);
const onPicker = (e) => { draft.value = e.target.value; error.value = ""; emit("live", e.target.value.toLowerCase()); };
const onHex = (e) => { draft.value = e.target.value.trim(); if (isHex(draft.value)) { error.value = ""; emit("live", draft.value.toLowerCase()); } };
const onHexChange = () => {
  if (isHex(draft.value)) { error.value = ""; draft.value = draft.value.toLowerCase(); emit("commit"); }
  else error.value = `"${draft.value}" is not a color. Use 6 hex digits like #1a2b3c.`;
};
</script>

<template>
  <div class="field color-field" :class="{ invalid: error }">
    <label :for="`${id}-hex`" class="field-label">{{ label }}</label>
    <span v-if="hint" :id="`${id}-hint`" class="hint">{{ hint }}</span>
    <div class="field-controls">
      <input :id="`${id}-pick`" class="swatch" type="color" :value="modelValue" :aria-label="`${label}, pick a color`" @input="onPicker" @change="emit('commit')" />
      <input :id="`${id}-hex`" class="hex" type="text" spellcheck="false" autocomplete="off" maxlength="7" :value="draft" :aria-invalid="error ? 'true' : undefined" :aria-describedby="[hint ? `${id}-hint` : '', error ? `${id}-err` : ''].filter(Boolean).join(' ') || undefined" @input="onHex" @change="onHexChange" />
      <button type="button" class="icon-btn" :disabled="same" :aria-label="`Reset ${label} to ${base}`" :title="`Reset to ${base}`" @click="emit('reset')">
        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10a6 6 0 1 0 2-4.5" /><path d="M4 3.5V7h3.5" /></svg>
      </button>
    </div>
    <p v-if="error" :id="`${id}-err`" class="field-error">{{ error }}</p>
  </div>
</template>
