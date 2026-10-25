import { defineConfig, devices } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: BASE_URL,
    // Hướng dẫn sử dụng cho thiết bị mới sẽ phủ trang chủ; các test coi như đã xem (tour.spec.ts tự bỏ dấu này).
    storageState: {
      cookies: [],
      origins: [{ origin: BASE_URL, localStorage: [{ name: "tour:v1:done", value: "1" }] }],
    },
  },
  webServer: { command: "pnpm dev", url: BASE_URL, reuseExistingServer: !process.env.CI },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
});
