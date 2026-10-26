import type { DebugSnippet, PracticalTaskContent } from "../types/content";

// Validated by `npm run validate`; the JSON's inferred types are wider than ours, hence the casts.
const practicalModules = import.meta.glob("../../content/practical/*.json", { eager: true, import: "default" });
const debugModules = import.meta.glob("../../content/mock-extras/debug.json", { eager: true, import: "default" });

export const practicalTasks: ReadonlyMap<string, PracticalTaskContent> = new Map(
  (Object.values(practicalModules) as PracticalTaskContent[]).map((t) => [t.id, t]),
);

export const debugSnippets: readonly DebugSnippet[] = (Object.values(debugModules) as { snippets: DebugSnippet[] }[]).flatMap((f) => f.snippets);
