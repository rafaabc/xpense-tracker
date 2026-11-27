import { defineConfig } from "vitest/config";
import path from "path";

// Real-dependency tests: they write to the database in DATABASE_URL, so
// .env.local must point to a non-production Neon branch.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/real/**/*.test.ts"],
    pool: "threads",
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
