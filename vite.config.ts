import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Tauri 期望前端开发服务器固定在 1420 端口
const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  // Tauri 相关:固定端口、避免清屏吞掉 Rust 错误
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 不监听 Rust 源码,交给 cargo
      ignored: ["**/src-tauri/**"],
    },
  },
  // 测试配置(vitest)
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
