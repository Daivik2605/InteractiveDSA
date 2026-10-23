import { useLiveQuery } from "dexie-react-hooks";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { curriculum } from "../lib/curriculum";
import { db as defaultDb, type DsaDB } from "../lib/db";
import { todayLocal } from "../lib/dates";
import { derivePlan, type Plan, type Snapshot } from "../lib/plan";
import { applyTheme } from "../lib/theme";

interface PlanContextValue {
  plan: Plan;
  db: DsaDB;
  /** Open the "Need more time?" dialog, optionally prefilled. */
  openExtension: (prefill?: { week?: number; untilDate?: string }) => void;
  extensionPrefill: { week?: number; untilDate?: string } | null;
  closeExtension: () => void;
}

const Ctx = createContext<PlanContextValue | null>(null);

export function usePlanContext(): PlanContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePlanContext must be used inside <PlanProvider>");
  return v;
}
export const usePlan = () => usePlanContext().plan;

function useToday(override?: string): string {
  const [today, setToday] = useState(() => override ?? todayLocal());
  useEffect(() => {
    if (override) return setToday(override);
    // Re-check shortly after local midnight (and whenever the tab becomes visible again).
    const tick = () => setToday(todayLocal());
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    const timer = setTimeout(tick, next.getTime() - now.getTime());
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [override, today]);
  return today;
}

async function loadSnapshot(db: DsaDB): Promise<Snapshot> {
  const [settings, completions, extensions, restDays, redos, attempts] = await Promise.all([
    db.settings.get("settings"),
    db.completions.toArray(),
    db.extensions.toArray(),
    db.restDays.toArray(),
    db.redos.toArray(),
    db.attempts.toArray(),
  ]);
  return {
    // Not written here (live queries are read-only); saved on the first change in Settings.
    settings: settings ?? { id: "settings", startDate: curriculum.defaultStartDate, theme: "system" },
    completions,
    extensions,
    restDays,
    redos,
    attempts,
  };
}

/** Loads progress live from IndexedDB, derives the plan, and applies the saved theme. */
export function PlanProvider({ children, db = defaultDb, today: todayOverride }: { children: ReactNode; db?: DsaDB; today?: string }) {
  const snapshot = useLiveQuery(() => loadSnapshot(db), [db]);
  const today = useToday(todayOverride);
  const [extensionPrefill, setExtensionPrefill] = useState<PlanContextValue["extensionPrefill"]>(null);

  const theme = snapshot?.settings.theme;
  useEffect(() => (theme ? applyTheme(theme) : undefined), [theme]);

  const plan = useMemo(() => (snapshot ? derivePlan(curriculum, snapshot, today) : null), [snapshot, today]);
  const value = useMemo<PlanContextValue | null>(
    () =>
      plan && {
        plan,
        db,
        extensionPrefill,
        openExtension: (prefill = {}) => setExtensionPrefill(prefill),
        closeExtension: () => setExtensionPrefill(null),
      },
    [plan, db, extensionPrefill],
  );

  if (!value) return <p className="p-6 text-slate-500">Loading…</p>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
