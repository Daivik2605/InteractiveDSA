import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { usePlanContext } from "../../app/PlanContext";
import { appendMockAnswer, logMockProgram, recordAnswer, saveMockSession, startMockRun, updateMockRun } from "../../lib/actions";
import { curriculum } from "../../lib/curriculum";
import { buildMockRun, EXTRA_LABEL, findMock, mcqSummary, nextPhase, PART_MINUTES, phasesOf, type MockLocation, type MockPhase } from "../../lib/mock";
import { debugSnippets, practicalTasks } from "../../lib/mockContent";
import { bank } from "../../lib/questions";
import { OUTCOME_LABEL } from "../../lib/problems";
import type { QuizResult } from "../../lib/quiz";
import type { MockProgram, MockRun, MockSession, ProblemAttempt, Problem, Question } from "../../types/content";
import { DIFF_STYLE } from "../today/Row";
import { QuizRunner, TYPE_LABEL } from "../quiz/QuizRunner";

const field = "rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900";
const primary = "rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50";
const secondary = "rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900";

const PART_NAME: Record<Exclude<MockPhase, "end">, string> = { A: "MCQs", B: "Program 1", C: "Program 2", D: "Extra" };

export function MockPage() {
  const number = Number(useParams().number);
  const { db } = usePlanContext();
  const loc = useMemo(() => findMock(curriculum, number), [number]);
  const run = useLiveQuery(() => db.mockRuns.get(number).then((r) => r ?? null), [db, number]);
  const saved = useLiveQuery(() => db.mocks.where("mockNumber").equals(number).last().then((r) => r ?? null), [db, number]);

  if (!loc) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Mock {Number.isFinite(number) ? number : ""}</h1>
        <p className="mt-4 text-slate-500">There is no such mock. The plan has Mocks 1 to 45.</p>
        <Link to="/" className="mt-2 inline-block text-indigo-700 underline dark:text-indigo-300">Back to Today</Link>
      </div>
    );
  }
  if (run === undefined || saved === undefined) return <p className="mt-4 text-slate-500">Loading…</p>;
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">
        Mock {number}
        {loc.slot.diagnostic ? <span className="ml-2 rounded bg-sky-100 px-2 py-0.5 text-xs font-normal text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">Diagnostic</span> : null}
        {loc.slot.final ? <span className="ml-2 rounded bg-violet-100 px-2 py-0.5 text-xs font-normal text-violet-800 dark:bg-violet-900/50 dark:text-violet-200">Final</span> : null}
      </h1>
      {run ? <Running run={run} loc={loc} /> : saved ? <SavedMock session={saved} loc={loc} /> : <Intro loc={loc} number={number} />}
    </div>
  );
}

// ── before starting ──────────────────────────────────────────────────────────

function Intro({ loc, number }: { loc: MockLocation; number: number }) {
  const { db, plan } = usePlanContext();
  const [busy, setBusy] = useState(false);
  const theme = curriculum.mockSpec.pythonThemes.find((t) => t.id === loc.slot.pythonTheme)?.title;

  async function start() {
    setBusy(true);
    const [cards, answers, attempts, sessions] = await Promise.all([db.cards.toArray(), db.quizAnswers.toArray(), db.attempts.toArray(), db.mocks.toArray()]);
    const run = buildMockRun(number, {
      curriculum,
      questions: bank.questions,
      debugSnippets,
      cards,
      answers,
      attempts,
      sessions,
      today: plan.today,
      rng: Math.random,
    });
    if (run) await startMockRun(db, run);
    setBusy(false);
  }

  const parts = phasesOf(loc.slot.program2);
  return (
    <section className="mt-4" aria-label="About this mock">
      {loc.slot.diagnostic && <p className="rounded-lg bg-sky-50 p-3 text-sm dark:bg-sky-950">This is a diagnostic. Your score becomes your baseline and does not count against you.</p>}
      <p className="mt-3 text-slate-600 dark:text-slate-400">Do it in one sitting, about {parts.reduce((n, p) => n + PART_MINUTES[p], 0)} minutes. Timers are only a guide, and every part can be skipped.</p>
      <ol className="mt-3 space-y-2 text-sm">
        <li><strong>A · MCQs</strong> ({PART_MINUTES.A} min): {loc.slot.mcqCount} questions. Python language first{theme ? ` (${theme})` : ""}, then this and last week, then review.</li>
        <li><strong>B · Program 1</strong> ({PART_MINUTES.B} min): one problem with no topic label. You solve it on its own site, then log it here.</li>
        {loc.slot.program2 && <li><strong>C · Program 2</strong> ({PART_MINUTES.C} min): a practical multi-part program, one level at a time.</li>}
        <li><strong>D · Extra</strong> ({PART_MINUTES.D} min): {EXTRA_LABEL[loc.slot.extra].toLowerCase()}.</li>
      </ol>
      <div className="mt-5 flex gap-3">
        <button type="button" className={primary} onClick={start} disabled={busy}>Start mock</button>
        <Link to="/" className={secondary}>Back to Today</Link>
      </div>
    </section>
  );
}

// ── a mock in progress ───────────────────────────────────────────────────────

function AdvisoryTimer({ minutes }: { minutes: number }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  const over = seconds > minutes * 60;
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  return (
    <span className={`tabular-nums ${over ? "text-amber-700 dark:text-amber-300" : "text-slate-500"}`} aria-label="Timer">
      {mmss(seconds)} of {minutes}:00 <span className="text-xs">(a guide only)</span>
    </span>
  );
}

function PartShell({ run, phase, minutes, onSkip, children }: { run: MockRun; phase: Exclude<MockPhase, "end">; minutes: number; onSkip: () => void; children: ReactNode }) {
  const order = phasesOf(run.program2 !== null);
  return (
    <section aria-label={`Part ${phase}`} className="mt-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {order.map((p) => (
          <span key={p} className={`rounded px-2 py-0.5 ${p === phase ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
            {p} · {PART_NAME[p]}
          </span>
        ))}
        <span className="ml-auto flex items-center gap-3">
          <AdvisoryTimer key={phase} minutes={minutes} />
          <button type="button" className="text-indigo-700 underline dark:text-indigo-300" onClick={onSkip}>Skip this part</button>
        </span>
      </div>
      {children}
    </section>
  );
}

function Running({ run, loc }: { run: MockRun; loc: MockLocation }) {
  const { db } = usePlanContext();
  const hasP2 = run.program2 !== null;
  const advance = (from: MockPhase, patch: Partial<Omit<MockRun, "mockNumber">> = {}) => updateMockRun(db, run.mockNumber, { ...patch, phase: nextPhase(hasP2, from) });

  if (run.phase === "A") return <PartA run={run} advance={() => advance("A")} />;
  if (run.phase === "B") return <PartB run={run} advance={(programs) => advance("B", { programs: [...run.programs, ...programs] })} />;
  if (run.phase === "C") return <PartC run={run} advance={(programs) => advance("C", { programs: [...run.programs, ...programs] })} />;
  if (run.phase === "D") return <PartD run={run} advance={(done) => advance("D", { extraDone: done })} />;
  return <EndScreen run={run} loc={loc} />;
}

// Part A ----------------------------------------------------------------------

function PartA({ run, advance }: { run: MockRun; advance: () => void }) {
  const { db, plan } = usePlanContext();
  const key = run.questionIds.join(",");
  // Stable across answers: a new array would reshuffle the options under the learner.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const questions = useMemo(() => run.questionIds.map((id) => bank.byId.get(id)).filter((q): q is Question => !!q), [key]);
  const startIndex = useMemo(() => run.answers.length, []); // eslint-disable-line react-hooks/exhaustive-deps
  const allAnswered = startIndex >= questions.length; // true only when returning after the last answer
  const g = run.groups;

  return (
    <PartShell run={run} phase="A" minutes={PART_MINUTES.A} onSkip={advance}>
      <p className="mt-2 text-xs text-slate-500">
        {g.theme} Python language · {g.current} this and last week{g.review > 0 ? ` · ${g.review} review` : ""}
      </p>
      {allAnswered ? (
        <button type="button" className={`${primary} mt-4`} onClick={advance}>Continue to Program 1</button>
      ) : (
        <QuizRunner
          title={`Mock ${run.mockNumber}`}
          questions={questions}
          startIndex={startIndex}
          hideResults
          onAnswer={async (q, correct) => {
            await recordAnswer(db, { questionId: q.id, correct, mode: "mock", mockNumber: run.mockNumber }, new Date().toISOString(), plan.today);
            await appendMockAnswer(db, run.mockNumber, correct);
          }}
          onFinish={advance}
          onRetry={() => undefined}
        />
      )}
    </PartShell>
  );
}

// Part B ----------------------------------------------------------------------

function ProblemCard({ problem, platform }: { problem: Problem; platform: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex flex-wrap items-center gap-2">
        <a href={problem.url} target="_blank" rel="noopener noreferrer" className="font-medium text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-300">
          {problem.title}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        <span className={`rounded px-1.5 py-0.5 text-xs ${DIFF_STYLE[problem.difficulty]}`}>{problem.difficulty}</span>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">{platform}</span>
      </div>
    </div>
  );
}

function PartB({ run, advance }: { run: MockRun; advance: (programs: MockProgram[]) => void }) {
  const { db, plan } = usePlanContext();
  const problem = run.program1.problemId ? plan.problemOf(run.program1.problemId) : undefined;
  const [outcome, setOutcome] = useState<ProblemAttempt["outcome"]>("alone");
  const [minutes, setMinutes] = useState("25");
  const [approach, setApproach] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const skip = () => advance([{ part: 1, problemId: run.program1.problemId ?? "", outcome: "failed", minutes: 0, skipped: true }]);

  async function save() {
    if (!problem) return;
    setBusy(true);
    const mins = Math.max(0, Math.round(Number(minutes) || 0));
    await logMockProgram(db, { problemId: problem.id, date: plan.today, outcome, minutes: mins, approach: approach.trim(), code: code.trim() });
    advance([{ part: 1, problemId: problem.id, outcome, minutes: mins }]);
  }

  return (
    <PartShell run={run} phase="B" minutes={PART_MINUTES.B} onSkip={skip}>
      {run.program1.note && <p role="note" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm dark:bg-amber-950">{run.program1.note}</p>}
      {!problem ? (
        <p className="mt-4 text-slate-500">There is no problem for this part.</p>
      ) : (
        <>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Solve this on its own site, with no hints. Then log how it went.</p>
          <div className="mt-2"><ProblemCard problem={problem} platform={problem.platform} /></div>
          <form className="mt-4 space-y-3" onSubmit={(e) => { e.preventDefault(); void save(); }}>
            <label className="block text-sm">Outcome
              <select className={`${field} ml-2`} value={outcome} onChange={(e) => setOutcome(e.target.value as ProblemAttempt["outcome"])}>
                {(["alone", "hint", "solution", "failed"] as const).map((o) => <option key={o} value={o}>{OUTCOME_LABEL[o]}</option>)}
              </select>
            </label>
            <label className="block text-sm">Minutes
              <input className={`${field} ml-2 w-20`} type="number" min={0} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
            </label>
            <label className="block text-sm">Approach (a few lines)
              <textarea className={`${field} mt-1 block w-full`} rows={3} value={approach} onChange={(e) => setApproach(e.target.value)} />
            </label>
            <label className="block text-sm">Code (optional)
              <textarea className={`${field} mt-1 block w-full font-mono text-xs`} rows={5} value={code} onChange={(e) => setCode(e.target.value)} />
            </label>
            <button type="submit" className={primary} disabled={busy}>Save and continue</button>
          </form>
        </>
      )}
      {!problem && <button type="button" className={`${primary} mt-4`} onClick={skip}>Continue</button>}
    </PartShell>
  );
}

// Part C ----------------------------------------------------------------------

function PartC({ run, advance }: { run: MockRun; advance: (programs: MockProgram[]) => void }) {
  const skip = () => advance([{ part: 2, problemId: run.program2?.taskId ?? "", outcome: "failed", minutes: 0, skipped: true }]);
  return (
    <PartShell run={run} phase="C" minutes={PART_MINUTES.C} onSkip={skip}>
      <p className="mt-4 text-slate-500">Program 2 is not built yet. Skip it for now.</p>
      <button type="button" className={`${primary} mt-4`} onClick={skip}>Continue</button>
    </PartShell>
  );
}

// Part D ----------------------------------------------------------------------

function DebugExtra({ run }: { run: MockRun }) {
  const snippet = debugSnippets.find((s) => s.id === run.extra.snippetId);
  const [guess, setGuess] = useState("");
  const [revealed, setRevealed] = useState(false);
  if (!snippet) return <p className="mt-4 text-slate-500">There is no debug snippet to show.</p>;
  const lines = snippet.code.split("\n");
  const g = Number(guess);
  return (
    <div className="mt-3">
      <p className="text-sm text-slate-600 dark:text-slate-400">This function has one bug. Find the line, say what is wrong and how to fix it.</p>
      <pre role="region" aria-label="Buggy code" className="mt-2 overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed dark:border-slate-800 dark:bg-slate-900">
        {lines.map((l, i) => (
          <div key={i} className={revealed && i + 1 === snippet.bugLine ? "bg-rose-100 dark:bg-rose-950" : ""}>
            <span className="mr-3 inline-block w-5 select-none text-right text-slate-400">{i + 1}</span>
            <code className="font-mono">{l}</code>
          </div>
        ))}
      </pre>
      {!revealed ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <label>Buggy line <input className={`${field} w-16`} type="number" min={1} max={lines.length} value={guess} onChange={(e) => setGuess(e.target.value)} /></label>
          <button type="button" className={secondary} onClick={() => setRevealed(true)}>Show the answer</button>
        </div>
      ) : (
        <div role="status" className="mt-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-800">
          {guess !== "" && <p className={g === snippet.bugLine ? "font-semibold text-emerald-700 dark:text-emerald-300" : "font-semibold text-rose-700 dark:text-rose-300"}>{g === snippet.bugLine ? "✓ You found the line" : `✗ The bug is on line ${snippet.bugLine}`}</p>}
          {guess === "" && <p className="font-semibold">The bug is on line {snippet.bugLine}.</p>}
          <p className="mt-1">{snippet.bug}</p>
          <p className="mt-1"><strong>Fix:</strong> <code className="font-mono">{snippet.fix}</code></p>
          <p className="mt-1">It printed <code className="font-mono">{snippet.actual}</code>; it should print <code className="font-mono">{snippet.expected}</code>.</p>
          <p className="mt-1 text-slate-600 dark:text-slate-400">{snippet.explanation}</p>
        </div>
      )}
    </div>
  );
}

function PartD({ run, advance }: { run: MockRun; advance: (done: boolean) => void }) {
  const { plan } = usePlanContext();
  const kind = run.extra.kind;
  const p1 = run.program1.problemId ? plan.problemOf(run.program1.problemId) : undefined;
  return (
    <PartShell run={run} phase="D" minutes={kind === "explain-aloud" ? 3 : PART_MINUTES.D} onSkip={() => advance(false)}>
      <h2 className="mt-3 text-lg font-semibold">{EXTRA_LABEL[kind]}</h2>
      {kind === "debug" && <DebugExtra run={run} />}
      {kind === "explain-aloud" && (
        <div className="mt-2 text-sm">
          <p>Out loud, in 3 minutes: say the brute force, then the optimal approach, then its time and space.</p>
          {p1 ? <div className="mt-2"><ProblemCard problem={p1} platform={p1.platform} /></div> : <p className="mt-2 text-slate-500">Use the problem from Program 1, or any problem you know.</p>}
        </div>
      )}
      {kind === "complexity-check" && (
        <div className="mt-2 text-sm">
          <p>About your Program 1 solution{p1 ? `, ${p1.title}` : ""}:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>What is its time and space complexity, and why?</li>
            <li>Which input makes it slowest?</li>
            <li>Name one edge case you tested, and one you did not.</li>
          </ul>
        </div>
      )}
      <button type="button" className={`${primary} mt-4`} onClick={() => advance(true)}>Done</button>
    </PartShell>
  );
}

// ── summary, end screen, saved view ──────────────────────────────────────────

function Summary({ session, titles }: { session: Pick<MockSession, "mcq" | "programs" | "extra" | "diagnostic">; titles: (p: MockProgram) => string }) {
  const { mcq } = session;
  return (
    <div>
      <h2 className="text-xl font-semibold" aria-label="Score">MCQs: {mcq.correct} / {mcq.total}{session.diagnostic ? " · baseline" : ""}</h2>
      {mcq.total > 0 && (
        <table className="mt-2 w-full max-w-sm text-sm">
          <caption className="sr-only">Score by question type</caption>
          <tbody>
            {Object.entries(mcq.byType).map(([type, v]) => (
              <tr key={type} className="border-t border-slate-200 dark:border-slate-800">
                <td className="py-1">{TYPE_LABEL[type as Question["type"]] ?? type}</td>
                <td className="py-1 tabular-nums">{v.correct} / {v.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <ul className="mt-3 space-y-1 text-sm">
        {session.programs.map((p, i) => (
          <li key={i}>
            Program {p.part}: {titles(p)} · {p.skipped ? "skipped" : `${OUTCOME_LABEL[p.outcome]}, ${p.minutes} min${p.levelsDone !== undefined ? `, ${p.levelsDone} of 3 levels` : ""}`}
          </li>
        ))}
        <li>Extra ({EXTRA_LABEL[session.extra.kind].toLowerCase()}): {session.extra.done ? "done" : "skipped"}</li>
      </ul>
    </div>
  );
}

function useTitles() {
  const { plan } = usePlanContext();
  return (p: MockProgram) => (p.part === 2 ? (practicalTasks.get(p.problemId)?.title ?? p.problemId) : (plan.problemOf(p.problemId)?.title ?? (p.problemId || "no problem")));
}

function EndScreen({ run, loc }: { run: MockRun; loc: MockLocation }) {
  const { db, plan } = usePlanContext();
  const titles = useTitles();
  const [rating, setRating] = useState<MockSession["rating"] | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const results: QuizResult[] = run.answers.flatMap((correct, i) => {
    const question = bank.byId.get(run.questionIds[i] ?? "");
    return question ? [{ question, correct }] : [];
  });
  const mcq = mcqSummary(results);
  const draft = { mcq, programs: run.programs, extra: { kind: run.extra.kind, done: run.extraDone }, diagnostic: loc.slot.diagnostic };

  async function save() {
    if (!rating) return;
    setBusy(true);
    const item = plan.days.flatMap((d) => d.items).find((i) => i.itemId === loc.itemId);
    const session: MockSession = {
      mockNumber: run.mockNumber,
      date: plan.today,
      diagnostic: loc.slot.diagnostic,
      mcq,
      questionIds: results.map((r) => r.question.id),
      programs: run.programs,
      extra: { kind: run.extra.kind, done: run.extraDone, ...(run.extra.snippetId ? { snippetId: run.extra.snippetId } : {}) },
      rating,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    await saveMockSession(db, session, { itemId: loc.itemId, planDayId: item?.planDayId ?? loc.homeDayId });
  }

  return (
    <section aria-label="Mock results" className="mt-4">
      <Summary session={draft} titles={titles} />
      <fieldset className="mt-4">
        <legend className="text-sm font-medium">How did it feel? (1 = rough, 5 = great)</legend>
        <div className="mt-1 flex gap-3">
          {([1, 2, 3, 4, 5] as const).map((n) => (
            <label key={n} className="flex items-center gap-1 text-sm">
              <input type="radio" name="rating" checked={rating === n} onChange={() => setRating(n)} /> {n}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-3 block text-sm">Notes (optional)
        <textarea className={`${field} mt-1 block w-full`} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <button type="button" className={`${primary} mt-4`} disabled={!rating || busy} onClick={save}>Save mock and tick it off</button>
    </section>
  );
}

function SavedMock({ session, loc }: { session: MockSession; loc: MockLocation }) {
  const titles = useTitles();
  return (
    <section aria-label="Saved mock" className="mt-4">
      <p className="text-sm text-slate-500">Saved on {session.date} · self-rating {session.rating} of 5 · Mock row ticked{loc.slot.diagnostic ? " · this is your baseline" : ""}</p>
      <div className="mt-3"><Summary session={session} titles={titles} /></div>
      {session.notes && <p className="mt-3 text-sm"><strong>Notes:</strong> {session.notes}</p>}
      <Link to="/" className={`${secondary} mt-4 inline-block`}>Back to Today</Link>
    </section>
  );
}
