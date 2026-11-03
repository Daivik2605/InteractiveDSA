// The Logs page: everything the learner did or added, as one list of dated entries. Pure (no Dexie, no clock).

import type {
  ConceptCheck,
  CustomItem,
  DayLog,
  DayNote,
  ItemCompletion,
  MissedReason,
  MockRetake,
  MockSession,
  ProblemAttempt,
  ProblemEntry,
  RestDay,
  TopicCheck,
  WeekExtension,
} from "../types/content";
import type { LogRemoval } from "./actions";

export type LogKind = "problem" | "tick" | "mock" | "note" | "reading" | "plan";

export const LOG_KINDS: { id: LogKind; label: string }[] = [
  { id: "problem", label: "Problems" },
  { id: "tick", label: "Ticks" },
  { id: "mock", label: "Mocks" },
  { id: "note", label: "Notes" },
  { id: "reading", label: "Reading" },
  { id: "plan", label: "Plan & journal" },
];

export interface LogEntry {
  /** Unique and stable, e.g. "attempt:12". */
  key: string;
  kind: LogKind;
  date: string; // YYYY-MM-DD the entry belongs to
  /** ISO moment it was recorded; absent for rows saved before the Logs page existed. */
  at?: string;
  title: string;
  detail?: string;
  /** What deleting it removes; absent = it cannot be deleted here (see `note`). */
  removal?: LogRemoval;
  note?: string;
}

export interface LogData {
  attempts: readonly ProblemAttempt[];
  completions: readonly ItemCompletion[];
  mocks: readonly MockSession[];
  retakes: readonly MockRetake[];
  dayNotes: readonly DayNote[];
  dayLogs: readonly DayLog[];
  topicChecks: readonly TopicCheck[];
  conceptChecks: readonly ConceptCheck[];
  restDays: readonly RestDay[];
  missedReasons: readonly MissedReason[];
  customItems: readonly CustomItem[];
  journal: readonly ProblemEntry[];
  extensions: readonly WeekExtension[];
}

export interface LogNames {
  problem: (id: string) => string; // title, or the id when unknown
  topic: (id: string) => string | undefined;
  concept: (id: string) => string | undefined;
  custom: (id: string) => CustomItem | undefined;
  planDay: (planDayId: string) => string; // "Week 3 · Day 2"
}

const OUTCOME_TITLE: Record<ProblemAttempt["outcome"], string> = {
  alone: "Solved alone",
  hint: "Solved with a hint",
  solution: "Solved after seeing the solution",
  failed: "Attempted",
};

const excerpt = (text: string, n = 140) => {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > n ? `${flat.slice(0, n - 1)}…` : flat;
};

export function buildLogs(d: LogData, names: LogNames): LogEntry[] {
  const out: LogEntry[] = [];

  for (const a of d.attempts) {
    const mock = a.source === "mock";
    out.push({
      key: `attempt:${a.id}`,
      kind: mock ? "mock" : "problem",
      date: a.date,
      ...(a.at ? { at: a.at } : {}),
      title: `${mock ? "Mock problem · " : ""}${OUTCOME_TITLE[a.outcome]}: ${names.problem(a.problemId)}`,
      detail: [`${a.minutes} min`, a.isRedo ? "redo" : "", a.note ? excerpt(a.note, 80) : ""].filter(Boolean).join(" · "),
      removal: { type: "attempt", id: a.id! },
    });
  }

  for (const c of d.completions) {
    if (c.attemptId !== undefined) continue; // covered by its attempt
    const custom = names.custom(c.itemId);
    const title = c.itemId.endsWith(":learn")
      ? "Learned a topic"
      : c.itemId.endsWith(":wrapup")
        ? "Wrap-up done"
        : custom
          ? `Done: ${custom.title}`
          : `Ticked: ${names.problem(c.itemId)}`;
    out.push({
      key: `tick:${c.itemId}`,
      kind: "tick",
      date: c.completedOn,
      ...(c.at ? { at: c.at } : {}),
      title,
      detail: names.planDay(c.planDayId),
      removal: { type: "completion", itemId: c.itemId },
    });
  }

  for (const m of d.mocks) {
    out.push({
      key: `mock:${m.id}`,
      kind: "mock",
      date: m.date,
      ...(m.savedAt ? { at: m.savedAt } : {}),
      title: `Mock ${m.mockNumber} finished`,
      detail: `MCQ ${m.mcq.correct}/${m.mcq.total}${m.diagnostic ? " · baseline" : ""} · rated ${m.rating}/5`,
      removal: { type: "mock", id: m.id!, mockNumber: m.mockNumber },
    });
  }
  for (const r of d.retakes) {
    out.push({
      key: `retake:${r.id}`,
      kind: "mock",
      date: r.date,
      ...(r.savedAt ? { at: r.savedAt } : {}),
      title: `Mock ${r.mockNumber} retake ${r.retakeNumber}`,
      detail: `MCQ ${r.mcq.correct}/${r.mcq.total}${r.missedOnly ? " · missed questions only" : ""}`,
      removal: { type: "retake", id: r.id! },
    });
  }

  for (const n of d.dayNotes) {
    out.push({
      key: `note:${n.id}`,
      kind: "note",
      date: n.date,
      at: n.createdAt,
      title: n.mockNumber !== undefined ? `Note during Mock ${n.mockNumber}` : "Note",
      detail: n.text.trim() ? excerpt(n.text) : "(blank note)",
      removal: { type: "dayNote", id: n.id! },
    });
  }
  for (const l of d.dayLogs) {
    out.push({
      key: `daylog:${l.planDayId}`,
      kind: "note",
      date: l.updatedOn,
      ...(l.updatedAt ? { at: l.updatedAt } : {}),
      title: `Study notes · ${names.planDay(l.planDayId)}`,
      detail: [l.notes ? excerpt(l.notes) : "", l.minutes ? `${l.minutes} min` : "", l.links.length ? `${l.links.length} link${l.links.length === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · "),
      removal: { type: "dayLog", planDayId: l.planDayId },
    });
  }

  for (const t of d.topicChecks) {
    out.push({ key: `topic:${t.topicId}`, kind: "reading", date: t.checkedOn, ...(t.at ? { at: t.at } : {}), title: `Read: ${names.topic(t.topicId) ?? t.topicId}`, removal: { type: "topicCheck", id: t.topicId } });
  }
  for (const c of d.conceptChecks) {
    out.push({ key: `concept:${c.conceptId}`, kind: "reading", date: c.checkedOn, ...(c.at ? { at: c.at } : {}), title: `Read concept: ${names.concept(c.conceptId) ?? c.conceptId}`, removal: { type: "conceptCheck", id: c.conceptId } });
  }

  for (const r of d.restDays) {
    out.push({ key: `rest:${r.date}`, kind: "plan", date: r.date, ...(r.at ? { at: r.at } : {}), title: "Rest day", removal: { type: "restDay", date: r.date } });
  }
  for (const m of d.missedReasons) {
    out.push({
      key: `missed:${m.planDayId}`,
      kind: "plan",
      date: m.loggedOn,
      ...(m.loggedAt ? { at: m.loggedAt } : {}),
      title: `Reason for a missed day · ${names.planDay(m.planDayId)}`,
      detail: excerpt(m.reason),
      removal: { type: "missedReason", planDayId: m.planDayId },
    });
  }
  for (const c of d.customItems) {
    out.push({
      key: `custom:${c.id}`,
      kind: "plan",
      date: c.createdOn,
      ...(c.createdAt ? { at: c.createdAt } : {}),
      title: `Added ${c.kind === "task" ? "task" : "problem"}: ${c.title}`,
      detail: c.planDayId ? names.planDay(c.planDayId) : "journal only",
      removal: { type: "customItem", id: c.id },
    });
  }
  for (const e of d.journal) {
    out.push({ key: `journal:${e.problemId}`, kind: "plan", date: e.updatedOn, ...(e.updatedAt ? { at: e.updatedAt } : {}), title: `Journal: ${names.problem(e.problemId)}`, removal: { type: "journal", id: e.problemId } });
  }
  for (const x of d.extensions) {
    out.push({
      key: `extension:${x.id}`,
      kind: "plan",
      date: x.createdOn,
      title: `Added ${x.extraDays} day${x.extraDays === 1 ? "" : "s"} to Week ${x.week}`,
      ...(x.reason ? { detail: x.reason } : {}),
      note: "Manage extensions in Settings",
    });
  }
  return out;
}

/** Newest date first; within a day, newest recorded time first, and entries with no recorded time after those. */
export function groupByDate(entries: readonly LogEntry[]): { date: string; entries: LogEntry[] }[] {
  const byDate = new Map<string, LogEntry[]>();
  for (const e of entries) byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([date, list]) => ({
      date,
      entries: list.sort((a, b) => {
        if (a.at && b.at) return a.at < b.at ? 1 : a.at > b.at ? -1 : a.key < b.key ? -1 : 1;
        if (a.at) return -1;
        if (b.at) return 1;
        return a.key < b.key ? -1 : 1;
      }),
    }));
}

/** What deleting this entry does, in plain words (shown in the confirmation). */
export function describeRemoval(r: LogRemoval): string {
  switch (r.type) {
    case "attempt":
      return "This removes the attempt, any plan tick it produced, and the redo reminders it created. Redos it closed are reopened.";
    case "completion":
      return "This unticks the item.";
    case "mock":
      return `This removes the saved result of Mock ${r.mockNumber}, its retakes and its recorded answers, so the mock can be taken again. Problems you logged inside the mock stay as their own entries.`;
    case "retake":
      return "This removes the retake. The official mock result is not affected.";
    case "dayNote":
      return "This deletes the note.";
    case "dayLog":
      return "This clears that day's study notes, minutes and links.";
    case "topicCheck":
    case "conceptCheck":
      return "This marks it as not read again.";
    case "restDay":
      return "This turns the rest day off; its unticked items return to that day.";
    case "missedReason":
      return "This deletes the reason you wrote for that day.";
    case "customItem":
      return "This removes the problem or task you added, its tick, its pending redos and its journal entry. Attempts you logged stay in the log.";
    case "journal":
      return "This clears the journal entry for the problem. Attempts stay.";
  }
}
