import type { Settings } from "../types/content";

/** "guided": follow the 90-day plan. "journal": log what you solve and learn each day, no plan. */
export type AppMode = "guided" | "journal";

export const MODES: { id: AppMode; label: string; blurb: string }[] = [
  { id: "guided", label: "Guided plan", blurb: "Follow the 90-day plan: a daily checklist, catch-up queue and mocks." },
  { id: "journal", label: "Journal", blurb: "Log what you solve and learn each day, with no plan to keep up with." },
];

/** Settings saved before modes existed have no `mode`: they are Guided plan. */
export const modeOf = (settings: Pick<Settings, "mode">): AppMode => (settings.mode === "journal" ? "journal" : "guided");
