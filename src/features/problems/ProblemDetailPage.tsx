import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Modal } from "../../app/Modal";
import { usePlanContext } from "../../app/PlanContext";
import { addManualRedo, deleteCustomItem, logAttempt, saveProblemEntry } from "../../lib/actions";
import { formatDayMonth } from "../../lib/dates";
import { OUTCOME_LABEL, weekOfProblemId } from "../../lib/problems";
import type { ProblemEntry } from "../../types/content";
import { LogModal } from "../today/LogModal";
import { DIFF_STYLE } from "../today/Row";
import { parseTags } from "./FoundProblemModal";

const field = "mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950";

export function ProblemDetailPage() {
  const { id = "" } = useParams();
  const { plan } = usePlanContext();
  const problem = plan.problemOf(id);
  if (!problem) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Problem not found</h1>
        <p className="mt-2"><Link to="/problems" className="text-indigo-700 underline dark:text-indigo-300">Back to Problems</Link></p>
      </div>
    );
  }
  return <Detail key={id} id={id} />;
}

function Detail({ id }: { id: string }) {
  const { plan, db } = usePlanContext();
  const navigate = useNavigate();
  const problem = plan.problemOf(id)!;
  const custom = plan.customById.get(id);
  const entry = plan.entries.get(id);
  const week = custom?.week ?? weekOfProblemId(id);
  const attempts = plan.snapshot.attempts.filter((a) => a.problemId === id).sort((a, b) => (a.date === b.date ? (b.id ?? 0) - (a.id ?? 0) : a.date < b.date ? 1 : -1));
  const pending = plan.snapshot.redos.filter((r) => r.problemId === id && !r.doneOn && !r.attemptedOn).sort((a, b) => (a.dueOn < b.dueOn ? -1 : 1));

  const [form, setForm] = useState({
    description: entry?.description ?? "",
    approach: entry?.approach ?? "",
    code: entry?.code ?? "",
    timeComplexity: entry?.timeComplexity ?? "",
    spaceComplexity: entry?.spaceComplexity ?? "",
    insight: entry?.insight ?? "",
    comments: entry?.comments ?? "",
    confidence: entry?.confidence ? String(entry.confidence) : "",
    tags: (entry?.tags ?? []).join(", "),
  });
  const [saved, setSaved] = useState(false);
  const [logging, setLogging] = useState(false);
  const [redoDate, setRedoDate] = useState(plan.today);
  const [deleting, setDeleting] = useState(false);
  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  };
  const text = (k: keyof typeof form, label: string, rows = 3, mono = false) => (
    <label className="block">{label}
      <textarea value={form[k]} onChange={(e) => set(k, e.target.value)} rows={rows} className={`${field} ${mono ? "font-mono text-xs" : ""}`} spellCheck={!mono} />
    </label>
  );

  return (
    <div className="max-w-2xl">
      <p className="text-sm"><Link to="/problems" className="text-indigo-700 underline dark:text-indigo-300">← Problems</Link></p>
      <h1 className="mt-1 text-2xl font-semibold">{problem.title}</h1>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
        <span className={`rounded px-1.5 py-0.5 text-xs ${DIFF_STYLE[problem.difficulty]}`}>{problem.difficulty}</span>
        <span>{custom ? (custom.planDayId ? "Added to a day" : "Found") : "Plan"} · Week {week}{custom?.platform ? ` · ${custom.platform}` : ""}</span>
        {problem.url && <a href={problem.url} target="_blank" rel="noopener noreferrer" className="text-indigo-700 underline dark:text-indigo-300">Open problem<span className="sr-only"> (new tab)</span></a>}
      </p>

      <form
        className="mt-6 space-y-3 text-sm"
        aria-label="Journal"
        onSubmit={async (e) => {
          e.preventDefault();
          const c = Number(form.confidence);
          await saveProblemEntry(
            db,
            {
              problemId: id,
              description: form.description,
              approach: form.approach,
              code: form.code,
              timeComplexity: form.timeComplexity,
              spaceComplexity: form.spaceComplexity,
              insight: form.insight,
              comments: form.comments,
              ...(c >= 1 && c <= 5 ? { confidence: c as ProblemEntry["confidence"] } : {}),
              tags: parseTags(form.tags),
            },
            plan.today,
          );
          setSaved(true);
        }}
      >
        <h2 className="text-lg font-semibold">Journal</h2>
        {text("description", "Problem description (markdown)")}
        {text("approach", "My approach (markdown)")}
        {text("code", "My solution (Python)", 8, true)}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">Time complexity<input value={form.timeComplexity} onChange={(e) => set("timeComplexity", e.target.value)} className={field} placeholder="O(n)" /></label>
          <label className="block">Space complexity<input value={form.spaceComplexity} onChange={(e) => set("spaceComplexity", e.target.value)} className={field} placeholder="O(1)" /></label>
        </div>
        {text("insight", "Key insight / what I missed")}
        {text("comments", "Comments")}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">Confidence (could I solve this cold?)
            <select value={form.confidence} onChange={(e) => set("confidence", e.target.value)} className={field}>
              <option value="">Not rated</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} / 5</option>)}
            </select>
          </label>
          <label className="block">Pattern tags<input value={form.tags} onChange={(e) => set("tags", e.target.value)} className={field} placeholder="Prefix Sum, Two Pointers" /></label>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white">Save journal</button>
          {saved && <span role="status" className="text-slate-500">Saved</span>}
          {entry && <span className="text-xs text-slate-500">updated {formatDayMonth(entry.updatedOn)}</span>}
        </div>
      </form>

      <section className="mt-8" aria-label="Attempts">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Attempts</h2>
          <button type="button" onClick={() => setLogging(true)} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700">Log another attempt</button>
        </div>
        {attempts.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No attempts yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-200 text-sm dark:divide-slate-800">
            {attempts.map((a) => (
              <li key={a.id} className="py-1.5">
                {formatDayMonth(a.date)} · {OUTCOME_LABEL[a.outcome]} · {a.minutes} min{a.isRedo ? " · redo" : ""}
                {a.note && <span className="block text-xs text-slate-500">{a.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8" aria-label="Redo">
        <h2 className="text-lg font-semibold">Redo later</h2>
        {pending.length > 0 && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Pending redos: {pending.map((r) => formatDayMonth(r.dueOn)).join(", ")}</p>}
        <form className="mt-2 flex flex-wrap items-end gap-2 text-sm" onSubmit={async (e) => { e.preventDefault(); if (redoDate) await addManualRedo(db, id, redoDate); }}>
          <label className="block">Redo on<input type="date" min={plan.today} value={redoDate} onChange={(e) => setRedoDate(e.target.value)} className={field} /></label>
          <button type="submit" disabled={!redoDate || redoDate < plan.today} className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-40 dark:border-slate-700">Redo later</button>
        </form>
      </section>

      {custom && (
        <section className="mt-8" aria-label="Danger zone">
          <button type="button" onClick={() => setDeleting(true)} className="text-sm text-rose-700 underline dark:text-rose-300">Delete this problem</button>
        </section>
      )}

      {logging && (
        <LogModal
          title="Log another attempt"
          problem={problem}
          dateRange={{ value: plan.today, min: "2000-01-01", max: plan.today }}
          onCancel={() => setLogging(false)}
          onSubmit={async (v) => {
            await logAttempt(db, { problemId: id, date: v.date, outcome: v.outcome, minutes: v.minutes, note: v.note, isRedo: attempts.length > 0, completes: [] });
            setLogging(false);
          }}
        />
      )}
      {deleting && (
        <Modal title="Delete this problem?" onClose={() => setDeleting(false)}>
          <p className="text-sm">This removes it from its day, its tick, its pending redos and its journal entry. Attempt history stays.</p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="rounded-md px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setDeleting(false)}>Cancel</button>
            <button type="button" className="rounded-md bg-rose-600 px-3 py-1.5 font-medium text-white" onClick={async () => { await deleteCustomItem(db, id); navigate("/problems"); }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
