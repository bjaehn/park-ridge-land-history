import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: [
      "**/node_modules/**",
      "**/.pytest-tmp/**",
      "**/.pytest-artifacts/**",
      "**/tests/**",
      "**/data/**",
      "**/public/**",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
