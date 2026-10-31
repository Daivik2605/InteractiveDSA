import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CodeBlock } from "../../components/CodeBlock";
import { Markdown } from "../../components/Markdown";
import { present, scoreByType, type QuizResult } from "../../lib/quiz";
import type { Question } from "../../types/content";
import { QuestionVisual } from "../visuals/registry";

export const TYPE_LABEL: Record<Question["type"], string> = {
  pattern: "Pattern",
  complexity: "Complexity",
  output: "Output",
  bug: "Bug",
  approach: "Approach",
  concept: "Concept",
};

/** True when a key press should be left to a form field. */
export const isTyping = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
};

/**
 * One question at a time (SPEC 3.6): shuffled options, keys 1–4 to answer, Enter for next,
 * explanation after answering, then a results screen with "Retry missed".
 */
export function QuizRunner({
  title,
  questions,
  onAnswer,
  onFinish,
  onRetry,
  backTo = "/",
  startIndex = 0,
  hideResults = false,
}: {
  title: string;
  questions: Question[];
  /** `picked` is the index into `question.options` (the unshuffled order). */
  onAnswer: (question: Question, correct: boolean, picked: number) => void | Promise<void>;
  onFinish: (results: QuizResult[]) => void | Promise<void>;
  onRetry: (missed: Question[]) => void;
  backTo?: string;
  /** Resume: skip the first `startIndex` questions (they were answered in an earlier visit). */
  startIndex?: number;
  /** Mocks show their own end screen: the last "Next" calls `onFinish` and renders nothing more. */
  hideResults?: boolean;
}) {
  const presented = useMemo(() => questions.map((q) => present(q, Math.random)), [questions]);
  const [index, setIndex] = useState(startIndex);
  const [picked, setPicked] = useState<number | null>(null);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [done, setDone] = useState(false);
  const finished = useRef(false);

  const current = presented[index];

  function choose(i: number) {
    if (!current || picked !== null) return;
    const correct = i === current.answer;
    setPicked(i);
    setResults((r) => [...r, { question: current.question, correct }]);
    void onAnswer(current.question, correct, current.question.options.indexOf(current.options[i]!));
  }

  function next() {
    if (picked === null) return;
    if (index + 1 < presented.length) {
      setIndex(index + 1);
      setPicked(null);
    } else {
      setDone(true);
    }
  }

  useEffect(() => {
    if (done && !finished.current) {
      finished.current = true;
      void onFinish(results);
    }
  }, [done, onFinish, results]);

  useEffect(() => {
    if (done || !current) return;
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (document.querySelector('[role="dialog"]')) return; // a drawer or dialog (e.g. Notes) is open: its keys are not answers
      if (picked === null && /^[1-4]$/.test(e.key)) choose(Number(e.key) - 1);
      else if (picked !== null && e.key === "Enter") {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (presented.length === 0) return <p className="mt-4 text-slate-500">There are no questions here yet.</p>;
  if (done && hideResults) return null;
  if (done) return <Results title={title} results={results} onRetry={onRetry} backTo={backTo} />;
  const q = current!.question;
  const wasCorrect = picked !== null && picked === current!.answer;

  return (
    <section aria-label="Question" className="mt-4 max-w-2xl">
      <p className="text-sm text-slate-500">
        {title} · Question {index + 1} of {presented.length} · {TYPE_LABEL[q.type]}
      </p>
      <div className="mt-3 font-medium">
        <Markdown className="text-base">{q.prompt}</Markdown>
      </div>
      {q.code && <div className="mt-3"><CodeBlock code={q.code} /></div>}
      <QuestionVisual visual={q.visual} />
      <div role="group" aria-label="Answer options" className="mt-4 space-y-2">
        {current!.options.map((opt, i) => {
          const isAnswer = i === current!.answer;
          const state =
            picked === null ? "" : isAnswer ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950" : i === picked ? "border-rose-500 bg-rose-50 dark:bg-rose-950" : "opacity-60";
          return (
            <button
              key={i}
              type="button"
              disabled={picked !== null}
              onClick={() => choose(i)}
              className={`flex w-full items-start gap-3 rounded-lg border border-slate-300 p-3 text-left text-sm hover:bg-slate-50 disabled:cursor-default dark:border-slate-700 dark:hover:bg-slate-900 ${state}`}
            >
              <kbd className="mt-0.5 rounded bg-slate-100 px-1.5 text-xs dark:bg-slate-800">{i + 1}</kbd>
              <span className="flex-1">{opt}</span>
              {picked !== null && isAnswer && <span className="shrink-0 text-emerald-700 dark:text-emerald-300">✓ Correct answer</span>}
              {picked !== null && !isAnswer && i === picked && <span className="shrink-0 text-rose-700 dark:text-rose-300">✗ Your answer</span>}
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <div role="status" className="mt-4 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <p className={`font-semibold ${wasCorrect ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
            {wasCorrect ? "✓ Correct" : "✗ Incorrect"}
          </p>
          <Markdown className="mt-1">{q.explanation}</Markdown>
          {q.complexity && (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Time {q.complexity.time} · Space {q.complexity.space}
            </p>
          )}
          <button type="button" onClick={next} className="mt-3 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white">
            {index + 1 < presented.length ? "Next" : hideResults ? "Continue" : "See results"} <span className="text-xs opacity-80">(Enter)</span>
          </button>
        </div>
      )}
      <p className="mt-4 text-xs text-slate-500">Keys: 1–4 to answer, Enter for next.</p>
    </section>
  );
}

function Results({ title, results, onRetry, backTo }: { title: string; results: QuizResult[]; onRetry: (missed: Question[]) => void; backTo: string }) {
  const score = scoreByType(results);
  const missed = results.filter((r) => !r.correct).map((r) => r.question);
  return (
    <section aria-label="Results" className="mt-4 max-w-2xl">
      <h2 className="text-xl font-semibold">{title}: {score.correct} / {score.total}</h2>
      <p className="text-sm text-slate-500">{Math.round((score.correct / Math.max(1, score.total)) * 100)}% correct</p>
      <table className="mt-3 w-full text-sm">
        <caption className="sr-only">Score by question type</caption>
        <thead><tr className="text-left text-xs text-slate-500"><th className="py-1 font-medium">Type</th><th className="py-1 font-medium">Correct</th></tr></thead>
        <tbody>
          {[...score.byType.entries()].map(([type, s]) => (
            <tr key={type} className="border-t border-slate-200 dark:border-slate-800"><td className="py-1">{TYPE_LABEL[type]}</td><td className="py-1 tabular-nums">{s.correct} / {s.total}</td></tr>
          ))}
        </tbody>
      </table>
      {missed.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold">Missed questions</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {missed.map((q) => (
              <li key={q.id} className="rounded-lg border border-slate-200 p-2 dark:border-slate-800">
                <Markdown>{q.prompt}</Markdown>
                <p className="mt-1 text-slate-600 dark:text-slate-400">Answer: {q.options[q.answer]}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        {missed.length > 0 && (
          <button type="button" onClick={() => onRetry(missed)} className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white">
            Retry missed ({missed.length})
          </button>
        )}
        <Link to={backTo} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700">Back to Today</Link>
      </div>
    </section>
  );
}
