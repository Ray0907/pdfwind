import { createApp } from "vue";
import App from "./App.vue";

const vm = createApp(App).mount("#app");
if (import.meta.env.DEV) import("./e2e-hook.js").then((m) => m.install(vm));
