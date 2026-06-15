import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    exclude: ["node_modules", ".next", "tests/e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: [
        "node_modules",
        ".next",
        "drizzle",
        "tests",
        "lib/schema.ts",
        "lib/db.ts",
        "lib/auth.ts",
        "*.config.*",
        "proxy.ts",
        "app/layout.tsx",
        "app/page.tsx",
        "app/api/auth/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
