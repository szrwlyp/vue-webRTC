import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

// https://vite.dev/config/
export default defineConfig({
  base: "./",
  plugins: [vue()],
  resolve: {
    // src 别名配置
    alias: {
      "@": resolve(__dirname, "src"),
    },
    // 使用路径别名时想要省略的后缀名，可以自己增减
    extensions: [".js", ".json", ".ts"],
  },
  server: {
    port: 9000,
  },
});
