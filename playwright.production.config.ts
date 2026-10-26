import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/production",
  outputDir: "test-results-production",
  timeout: 45000,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://localhost:4000",
    ...devices["Desktop Chrome"],
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
