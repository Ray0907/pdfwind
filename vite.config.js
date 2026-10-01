import vue from "@vitejs/plugin-vue";
export default { root: "playground", plugins: [vue()], optimizeDeps: { exclude: ["takumi-pdf"] } };
