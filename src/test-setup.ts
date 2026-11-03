import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest globals are off, so Testing Library can't auto-register its cleanup.
afterEach(cleanup);

// Under parallel load the first render (Dexie snapshot behind "Loading…") can exceed the 1s default.
configure({ asyncUtilTimeout: 6000 });
