import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Đọc alias `@/*` từ tsconfig gần nhất của từng app.
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["{apps,packages}/*/src/**/*.test.{ts,tsx}"],
    css: false,
  },
});
