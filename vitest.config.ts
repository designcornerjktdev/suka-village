import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    fileParallelism: false,
    env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://suka:suka@localhost:5433/suka_test" },
  },
});
