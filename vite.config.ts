import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5174, strictPort: true },
  test: {
    environment: "jsdom",
    maxWorkers: 8, // one per core; uncapped Vitest spawned a jsdom worker per test file (27) and starved the UI tests
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    testTimeout: 15_000, // UI tests drive IndexedDB and spawn python; generous so a busy machine does not flake them
  },
});
