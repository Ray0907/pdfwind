import { createApp } from "vue";

// ?view=builder opens the Theme Builder; everything else is the component playground
if (new URLSearchParams(location.search).get("view") === "builder") {
  document.title = "pdfwind Theme Builder";
  createApp((await import("./Builder.vue")).default).mount("#app");
} else {
  const vm = createApp((await import("./App.vue")).default).mount("#app");
  if (import.meta.env.DEV) import("./e2e-hook.js").then((m) => m.install(vm));
}
