import vue from "@vitejs/plugin-vue";
export default {
  root: "playground",
  base: "./",
  plugins: [vue()],
  optimizeDeps: { exclude: ["takumi-pdf"] },
  build: { outDir: "../dist-playground", emptyOutDir: true },
};
