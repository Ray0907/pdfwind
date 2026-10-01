<script setup>
import { computed } from "vue";
import { cn, rest } from "../../lib/ui.js";

defineOptions({ inheritAttrs: false });
const props = defineProps({
  src: { type: [String, Object], required: true }, // data: URI, http(s) URL, or a name registered in renderPdf `images`; { uri } also accepted
  variant: { type: String, default: "default" }, // default | full-width | thumbnail | avatar | cover | bordered | rounded
  width: [Number, String], // number = pt
  height: [Number, String],
  fit: String, // cover | contain | fill | none
  position: { type: String, default: "50% 50%" },
  caption: String,
  aspectRatio: Number, // width / height, used when only a numeric width is given
  borderRadius: Number, // pt
  noWrap: { type: Boolean, default: true },
});

const variants = {
  default: { fit: "contain" },
  "full-width": { fit: "cover", width: "100%" },
  thumbnail: { fit: "cover", width: 80, height: 80 },
  avatar: { fit: "cover", width: 48, height: 48, radius: 999 },
  cover: { fit: "cover", width: "100%", height: 160 },
  bordered: { fit: "contain", width: "100%" },
  rounded: { fit: "contain", width: 200, radius: 8 },
};
const css = (v) => (typeof v === "number" ? `${v}pt` : v);
const style = computed(() => {
  const d = variants[props.variant], width = props.width ?? d.width;
  const height = props.height ?? d.height ?? (props.aspectRatio && typeof width === "number" ? width / props.aspectRatio : undefined);
  const radius = props.borderRadius ?? d.radius;
  return { width: css(width), height: css(height), objectFit: props.fit ?? d.fit, objectPosition: props.position, borderRadius: radius !== undefined ? `${radius}pt` : undefined };
});
const uri = computed(() => (typeof props.src === "string" ? props.src : props.src.uri));
</script>

<template>
  <div v-bind="rest($attrs)" :class="cn('flex flex-col', noWrap && 'break-inside-avoid', $attrs.class)">
    <img :src="uri" :alt="caption ?? ''" :class="variant === 'bordered' && 'border-[1pt] border-border'" :style="style" />
    <div v-if="caption" class="mt-1 text-center text-xs text-muted-foreground">{{ caption }}</div>
  </div>
</template>
