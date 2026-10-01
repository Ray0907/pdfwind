<script setup>
import { ref, watch, computed } from "vue";
import { round2 } from "../../src/themes/builder.js";

// label + slider + number input for one numeric theme value, with a per-control reset to the base theme's value
const props = defineProps({ id: String, label: String, modelValue: Number, base: Number, min: Number, max: Number, step: { type: Number, default: 1 }, unit: { type: String, default: "" }, hint: String });
const emit = defineEmits(["live", "commit", "reset"]);
const draft = ref(String(props.modelValue)), error = ref("");
watch(() => props.modelValue, (v) => { if (Number(draft.value) !== v || error.value) { draft.value = String(v); error.value = ""; } });
const valid = (s) => s !== "" && Number.isFinite(Number(s)) && Number(s) >= props.min && Number(s) <= props.max;
const same = computed(() => props.modelValue === props.base);
const unitText = computed(() => (props.unit ? ` ${props.unit}` : ""));
const onSlider = (e) => { draft.value = e.target.value; error.value = ""; emit("live", round2(Number(e.target.value))); };
const onNumber = (e) => { draft.value = e.target.value; if (valid(e.target.value)) { error.value = ""; emit("live", round2(Number(e.target.value))); } };
const onNumberChange = () => {
  if (valid(draft.value)) { error.value = ""; emit("commit"); }
  else error.value = `${props.label} must be a number from ${props.min} to ${props.max}${unitText.value}.`;
};
</script>

<template>
  <div class="field" :class="{ invalid: error }">
    <label :id="`${id}-label`" :for="`${id}-n`" class="field-label">{{ label }}</label>
    <span v-if="hint" :id="`${id}-hint`" class="hint">{{ hint }}</span>
    <div class="field-controls">
      <input :id="`${id}-r`" class="slider" type="range" :min="min" :max="max" :step="step" :value="modelValue" :aria-labelledby="`${id}-label`" :aria-valuetext="`${modelValue}${unitText}`" tabindex="0" @input="onSlider" @change="emit('commit')" />
      <input :id="`${id}-n`" class="num" type="number" inputmode="decimal" :min="min" :max="max" :step="step" :value="draft" :aria-invalid="error ? 'true' : undefined" :aria-describedby="[hint ? `${id}-hint` : '', error ? `${id}-err` : ''].filter(Boolean).join(' ') || undefined" @input="onNumber" @change="onNumberChange" />
      <span class="unit" aria-hidden="true">{{ unit }}</span>
      <button type="button" class="icon-btn" :disabled="same" :aria-label="`Reset ${label} to ${base}${unitText}`" :title="`Reset to ${base}${unitText}`" @click="emit('reset')">
        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10a6 6 0 1 0 2-4.5" /><path d="M4 3.5V7h3.5" /></svg>
      </button>
    </div>
    <p v-if="error" :id="`${id}-err`" class="field-error">{{ error }}</p>
  </div>
</template>
