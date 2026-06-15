import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";
config({ path: ".env.local" });

// Node.js 24 doesn't bundle the CA that Neon uses; use the system cert store instead
process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS ?? ""} --use-system-ca`.trim();

export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
});
