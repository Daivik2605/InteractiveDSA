import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { usePlanContext } from "../../app/PlanContext";
import { CodeBlock } from "../../components/CodeBlock";
import { Markdown } from "../../components/Markdown";
import { recordAnswer, tickItem } from "../../lib/actions";
import { learnItemToTick } from "../../lib/learn";
import { currentWeek } from "../../lib/plan";
import { bank } from "../../lib/questions";
import { DRILL_SECONDS, patternStats, selectDrill, type DrillItem } from "../../lib/quiz";
import { isTyping } from "../quiz/QuizRunner";

interface DrillResult {
  item: DrillItem;
  correct: boolean;
  timedOut: boolean;
  ms: number;
}

/** SPEC 3.8: describe a problem, pick the pattern from six options within 20 seconds. */
export function DrillPage() {
  const { plan, db } = usePlanContext();
  const [round, setRound] = useState(0);
  const items = useMemo(() => selectDrill({ bank, upToWeek: currentWeek(plan), rng: Math.random }), [round]); // eslint-disable-line react-hooks/exhaustive-deps
  const ticked = useRef(false);
  const [finished, setFinished] = useState<DrillResult[] | null>(null);

  async function onFinish(results: DrillResult[]) {
    setFinished(results);
    if (ticked.current) return;
    ticked.current = true;
    const target = learnItemToTick(plan, "drill");
    if (target) await tickItem(db, target, plan.today);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Pattern drill</h1>
      <p className="text-slate-600 dark:text-slate-400">Name the pattern before the {DRILL_SECONDS} seconds run out.</p>
      {items.length === 0 ? (
        <p className="mt-4 text-slate-500">No drill prompts yet.</p>
      ) : finished ? (
        <DrillResults results={finished} onAgain={() => { setFinished(null); setRound((r) => r + 1); }} />
      ) : (
        <DrillRunner
          key={round}
          items={items}
          onAnswer={(r) => recordAnswer(db, { questionId: r.item.id, correct: r.correct, mode: "drill", ms: r.ms }, new Date().toISOString(), plan.today)}
          onFinish={onFinish}
        />
      )}
    </div>
  );
}

function DrillRunner({ items, onAnswer, onFinish }: { items: DrillItem[]; onAnswer: (r: DrillResult) => void | Promise<void>; onFinish: (results: DrillResult[]) => void }) {
  const [index, setIndex] = useState(0);
  const [outcome, setOutcome] = useState<{ picked: number | null; correct: boolean } | null>(null);
  const [results, setResults] = useState<DrillResult[]>([]);
  const [left, setLeft] = useState(DRILL_SECONDS);
  const startedAt = useRef(Date.now());
  const item = items[index]!;

  const finishItem = (picked: number | null) => {
    if (outcome) return;
    const timedOut = picked === null;
    const ms = timedOut ? DRILL_SECONDS * 1000 : Math.min(DRILL_SECONDS * 1000, Date.now() - startedAt.current);
    const correct = !timedOut && picked === item.answer;
    const result = { item, correct, timedOut, ms };
    setOutcome({ picked, correct });
    setResults((r) => [...r, result]);
    void onAnswer(result);
  };

  // Countdown for the current prompt; running out counts as a wrong answer.
  useEffect(() => {
    if (outcome) return;
    startedAt.current = Date.now();
    setLeft(DRILL_SECONDS);
    const tick = setInterval(() => setLeft(Math.max(0, DRILL_SECONDS - Math.floor((Date.now() - startedAt.current) / 1000))), 250);
    const stop = setTimeout(() => finishItem(null), DRILL_SECONDS * 1000);
    return () => {
      clearInterval(tick);
      clearTimeout(stop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, outcome === null]);

  const next = () => {
    if (!outcome) return;
    if (index + 1 < items.length) {
      setIndex(index + 1);
      setOutcome(null);
    } else onFinish(results);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      const n = Number(e.key);
      if (!outcome && Number.isInteger(n) && n >= 1 && n <= item.options.length) finishItem(n - 1);
      else if (outcome && e.key === "Enter") {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <section aria-label="Drill prompt" className="mt-4">
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>Prompt {index + 1} of {items.length}</span>
        <span role="timer" aria-label="Time left" className={`tabular-nums ${left <= 5 && !outcome ? "font-semibold text-rose-700 dark:text-rose-300" : ""}`}>{outcome ? "" : `${left}s`}</span>
      </div>
      <div className="mt-3 font-medium"><Markdown className="text-base">{item.text}</Markdown></div>
      {item.code && <div className="mt-3"><CodeBlock code={item.code} /></div>}
      <div role="group" aria-label="Pattern options" className="mt-4 grid gap-2 sm:grid-cols-2">
        {item.options.map((opt, i) => {
          const isAnswer = i === item.answer;
          const state = !outcome ? "" : isAnswer ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950" : i === outcome.picked ? "border-rose-500 bg-rose-50 dark:bg-rose-950" : "opacity-60";
          return (
            <button key={i} type="button" disabled={!!outcome} onClick={() => finishItem(i)} className={`flex items-start gap-2 rounded-lg border border-slate-300 p-3 text-left text-sm hover:bg-slate-50 disabled:cursor-default dark:border-slate-700 dark:hover:bg-slate-900 ${state}`}>
              <kbd className="rounded bg-slate-100 px-1.5 text-xs dark:bg-slate-800">{i + 1}</kbd>
              <span className="flex-1">{opt}</span>
              {outcome && isAnswer && <span className="shrink-0 text-emerald-700 dark:text-emerald-300">✓</span>}
              {outcome && !isAnswer && i === outcome.picked && <span className="shrink-0 text-rose-700 dark:text-rose-300">✗</span>}
            </button>
          );
        })}
      </div>
      {outcome && (
        <div role="status" className="mt-4">
          <p className={`font-semibold ${outcome.correct ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
            {outcome.correct ? "✓ Correct" : outcome.picked === null ? "✗ Time's up" : "✗ Incorrect"} — {item.pattern}
          </p>
          <button type="button" onClick={next} className="mt-2 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white">
            {index + 1 < items.length ? "Next" : "See results"} <span className="text-xs opacity-80">(Enter)</span>
          </button>
        </div>
      )}
      <p className="mt-4 text-xs text-slate-500">Keys: 1–{item.options.length} to answer, Enter for next.</p>
    </section>
  );
}

function DrillResults({ results, onAgain }: { results: DrillResult[]; onAgain: () => void }) {
  const correct = results.filter((r) => r.correct).length;
  const avg = results.reduce((s, r) => s + r.ms, 0) / Math.max(1, results.length) / 1000;
  const patternById = new Map(results.map((r) => [r.item.id, r.item.pattern]));
  const stats = patternStats(
    results.map((r) => ({ questionId: r.item.id, correct: r.correct, answeredAt: "", mode: "drill" as const, ms: r.ms })),
    (id) => patternById.get(id),
  );
  return (
    <section aria-label="Results" className="mt-4">
      <h2 className="text-xl font-semibold">Drill: {correct} / {results.length}</h2>
      <p className="text-sm text-slate-500">{Math.round((correct / Math.max(1, results.length)) * 100)}% accuracy · average {avg.toFixed(1)}s per prompt</p>
      <table className="mt-3 w-full text-sm">
        <caption className="sr-only">Accuracy and average time per pattern</caption>
        <thead><tr className="text-left text-xs text-slate-500"><th className="py-1 font-medium">Pattern</th><th className="py-1 font-medium">Correct</th><th className="py-1 font-medium">Avg time</th></tr></thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.pattern} className="border-t border-slate-200 dark:border-slate-800">
              <td className="py-1">{s.pattern}</td>
              <td className="py-1 tabular-nums">{s.correct} / {s.attempts}</td>
              <td className="py-1 tabular-nums">{s.avgMs === null ? "—" : `${(s.avgMs / 1000).toFixed(1)}s`}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex gap-3">
        <button type="button" onClick={onAgain} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white">Drill again</button>
        <Link to="/quiz" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700">Back to quizzes</Link>
      </div>
    </section>
  );
}
