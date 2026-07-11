import { defineConfig } from "vitest/config";

// Node environment, no Obsidian runtime: tests may only import pure-logic
// modules (no `obsidian` import). Keep testable logic Obsidian-free by design
// instead of mocking the API.
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
