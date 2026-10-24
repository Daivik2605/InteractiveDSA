import Dexie, { type EntityTable } from "dexie";
import type {
  CardState,
  CustomItem,
  DayLog,
  ItemCompletion,
  ItemMove,
  MockSession,
  ProblemAttempt,
  ProblemEntry,
  QuizAnswer,
  RedoTask,
  RestDay,
  Settings,
  WeekExtension,
} from "../types/content";

// Schema versions: NEVER drop or clear user tables in an upgrade. To change the schema, add a
// new `db.version(n+1).stores({...}).upgrade(...)` that migrates rows, and bump EXPORT_SCHEMA_VERSION
// if the exported JSON shape changes.
// v2 added customItems, itemMoves, dayLogs and problemEntries (SPEC 3.13, 3.14); v1 exports still import.
export const EXPORT_SCHEMA_VERSION = 2;

export class DsaDB extends Dexie {
  completions!: EntityTable<ItemCompletion, "itemId">;
  extensions!: EntityTable<WeekExtension, "id">;
  attempts!: EntityTable<ProblemAttempt, "id">;
  redos!: EntityTable<RedoTask, "id">;
  quizAnswers!: EntityTable<QuizAnswer, "id">;
  cards!: EntityTable<CardState, "questionId">;
  restDays!: EntityTable<RestDay, "date">;
  mocks!: EntityTable<MockSession, "id">;
  settings!: EntityTable<Settings, "id">;
  customItems!: EntityTable<CustomItem, "id">;
  itemMoves!: EntityTable<ItemMove, "itemId">;
  dayLogs!: EntityTable<DayLog, "planDayId">;
  problemEntries!: EntityTable<ProblemEntry, "problemId">;

  constructor(name = "InteractiveDSA") {
    super(name);
    this.version(1).stores({
      completions: "itemId, planDayId, completedOn",
      extensions: "++id, week",
      attempts: "++id, problemId, date",
      redos: "++id, problemId, dueOn",
      quizAnswers: "++id, questionId, answeredAt, mode",
      cards: "questionId, dueOn",
      restDays: "date",
      mocks: "++id, date",
      settings: "id",
    });
    // v2 only adds tables; existing rows are untouched, so no upgrade() is needed.
    this.version(2).stores({
      customItems: "id, planDayId, week",
      itemMoves: "itemId, toPlanDayId",
      dayLogs: "planDayId",
      problemEntries: "problemId",
    });
  }
}

export const db = new DsaDB();

export const TABLE_NAMES = [
  "completions",
  "extensions",
  "attempts",
  "redos",
  "quizAnswers",
  "cards",
  "restDays",
  "mocks",
  "settings",
  "customItems",
  "itemMoves",
  "dayLogs",
  "problemEntries",
] as const;
const V1_TABLES: readonly TableName[] = TABLE_NAMES.slice(0, 9);
export type TableName = (typeof TABLE_NAMES)[number];

export type ExportData = { schemaVersion: number } & { [K in TableName]: unknown[] };

export const DEFAULT_THEME: Settings["theme"] = "system";

/** Returns saved settings, creating them from `defaultStartDate` (curriculum.defaultStartDate) on first use. */
export async function getSettings(database: DsaDB, defaultStartDate: string): Promise<Settings> {
  const existing = await database.settings.get("settings");
  if (existing) return existing;
  const created: Settings = { id: "settings", startDate: defaultStartDate, theme: DEFAULT_THEME };
  await database.settings.put(created);
  return created;
}

export async function saveSettings(database: DsaDB, patch: Partial<Omit<Settings, "id">>, defaultStartDate: string) {
  const current = await getSettings(database, defaultStartDate);
  await database.settings.put({ ...current, ...patch });
}

export async function exportAll(database: DsaDB): Promise<ExportData> {
  const out = { schemaVersion: EXPORT_SCHEMA_VERSION } as ExportData;
  for (const name of TABLE_NAMES) out[name] = await database.table(name).toArray();
  return out;
}

/** Validates the shape only; replaces every table in one transaction (all-or-nothing). */
export async function importAll(database: DsaDB, data: unknown): Promise<void> {
  if (typeof data !== "object" || data === null) throw new Error("Import file is not a JSON object.");
  const obj = data as Record<string, unknown>;
  const version = obj.schemaVersion;
  if (version !== 1 && version !== EXPORT_SCHEMA_VERSION) {
    throw new Error(`Unsupported schemaVersion ${String(version)} (expected 1 or ${EXPORT_SCHEMA_VERSION}).`);
  }
  const required = version === 1 ? V1_TABLES : TABLE_NAMES;
  for (const name of required) {
    if (!Array.isArray(obj[name])) throw new Error(`Import file is missing the "${name}" table.`);
  }
  await database.transaction("rw", database.tables, async () => {
    for (const name of TABLE_NAMES) {
      const table = database.table(name);
      await table.clear();
      const rows = Array.isArray(obj[name]) ? (obj[name] as unknown[]) : []; // tables a v1 file lacks come in empty
      await table.bulkAdd(rows);
    }
  });
}

export async function resetAll(database: DsaDB): Promise<void> {
  await database.transaction("rw", database.tables, async () => {
    for (const name of TABLE_NAMES) await database.table(name).clear();
  });
}
