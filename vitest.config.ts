import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./", import.meta.url)) } },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    fileParallelism: false,
    include: ["tests/**/*.test.{ts,tsx}"],
    env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? "mysql://suka:suka@localhost:3307/suka_test" },
  },
});
