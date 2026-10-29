import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { usePlanContext } from "../../app/PlanContext";
import { appendMockAnswer, discardMockRun, logMockProgram, recordAnswer, saveMockRetake, saveMockSession, startMockRun, updateMockRun } from "../../lib/actions";
import { curriculum } from "../../lib/curriculum";
import {
  addTimerMinutes,
  breakdown,
  EXTRA_TIME_STEP,
  freshTimer,
  pauseTimer,
  resumeTimer,
  timerElapsed,
  buildMockRun,
  EXTRA_LABEL,
  mockContentStatus,
  filterKey,
  findMock,
  mcqOfAnswers,
  nextPhase,
  PART_MINUTES,
  phasesOf,
  sectionOfIndex,
  SECTION_LABEL,
  type Bucket,
  type KeyFilter,
  type MockLocation,
  type MockPhase,
} from "../../lib/mock";
import { debugSnippets, practicalTasks } from "../../lib/mockContent";
import { bank } from "../../lib/questions";
import { OUTCOME_LABEL } from "../../lib/problems";
import { shuffle } from "../../lib/quiz";
import { CodeBlock } from "../../components/CodeBlock";
import { Markdown } from "../../components/Markdown";
import type { MockAnswer, MockProgram, MockRun, MockSection, MockSession, MockTimer, ProblemAttempt, Problem, Question } from "../../types/content";
import { DIFF_STYLE } from "../today/Row";
import { QuizRunner, TYPE_LABEL } from "../quiz/QuizRunner";

const field = "rounded-md border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-900";
const primary = "rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50";
const secondary = "rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900";

/** Program 2 id used when no practical task is unlocked and you do an Interview Preparation Kit problem instead. */
export const FREE_PROGRAM2_ID = "ipk-free";

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
      practicalIds: new Set(practicalTasks.keys()),
      today: plan.today,
      rng: Math.random,
    });
    if (run) await startMockRun(db, run);
    setBusy(false);
  }

  const parts = phasesOf(loc.slot.program2);
  const content = mockContentStatus(loc.slot, loc.week, bank.questions);
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
        <button type="button" className={primary} onClick={start} disabled={busy || !content.ready}>Start mock</button>
        <Link to="/mocks" className={secondary}>All mocks</Link>
      </div>
      {!content.ready && <p role="note" className="mt-3 text-sm text-amber-700 dark:text-amber-300">Content not ready: {content.reason}.</p>}
    </section>
  );
}

// ── a mock in progress ───────────────────────────────────────────────────────

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Advisory only: nothing locks at zero. State lives in the mockRun, so reloads and leaving the page keep it. */
function AdvisoryTimer({ run, phase, minutes }: { run: MockRun; phase: MockTimer["phase"]; minutes: number }) {
  const { db } = usePlanContext();
  const [now, setNow] = useState(() => Date.now());
  const saved = run.timer?.phase === phase ? run.timer : undefined;
  const timer = saved ?? freshTimer(phase, now);
  const paused = timer.runningSince === null;

  useEffect(() => {
    if (!saved) void updateMockRun(db, run.mockNumber, { timer: freshTimer(phase, Date.now()) });
  }, [db, run.mockNumber, phase, saved]);
  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [paused]);

  const change = (next: MockTimer) => void updateMockRun(db, run.mockNumber, { timer: next });
  const seconds = timerElapsed(timer, now);
  const total = minutes + timer.addedMinutes;
  const over = seconds > total * 60;
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className={`tabular-nums ${over ? "text-amber-700 dark:text-amber-300" : "text-slate-500"}`} aria-label="Timer">
        {mmss(seconds)} of {total}:00 <span className="text-xs">({timer.addedMinutes > 0 ? `${minutes} + ${timer.addedMinutes} added, ` : ""}a guide only)</span>
        {paused && <strong className="ml-1 text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">Paused</strong>}
      </span>
      <button type="button" className="text-indigo-700 underline dark:text-indigo-300" onClick={() => change(paused ? resumeTimer(timer, Date.now()) : pauseTimer(timer, Date.now()))}>{paused ? "Resume" : "Pause"}</button>
      <button type="button" className="text-indigo-700 underline dark:text-indigo-300" onClick={() => change(addTimerMinutes(timer))}>+{EXTRA_TIME_STEP} min</button>
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
          <AdvisoryTimer key={phase} run={run} phase={phase} minutes={minutes} />
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

  return (
    <>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>Your progress is saved. You can leave and come back from the Mocks page.</span>
        <DiscardRun mockNumber={run.mockNumber} />
      </div>
      {run.phase === "A" && <PartA run={run} advance={() => advance("A")} />}
      {run.phase === "B" && <PartB run={run} advance={(programs) => advance("B", { programs: [...run.programs, ...programs] })} />}
      {run.phase === "C" && <PartC run={run} advance={(programs) => advance("C", { programs: [...run.programs, ...programs] })} />}
      {run.phase === "D" && <PartD run={run} advance={(done) => advance("D", { extraDone: done })} />}
      {run.phase === "end" && <EndScreen run={run} loc={loc} />}
    </>
  );
}

/** Two clicks to throw the attempt away; answers and the Program 1 attempt already logged stay in your history. */
function DiscardRun({ mockNumber }: { mockNumber: number }) {
  const { db } = usePlanContext();
  const [sure, setSure] = useState(false);
  return sure ? (
    <span className="flex items-center gap-2">
      Discard this attempt and start over?
      <button type="button" className="text-rose-700 underline dark:text-rose-300" onClick={() => void discardMockRun(db, mockNumber)}>Yes, discard</button>
      <button type="button" className="underline" onClick={() => setSure(false)}>Keep it</button>
    </span>
  ) : (
    <button type="button" className="underline" onClick={() => setSure(true)}>Discard attempt</button>
  );
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
          onAnswer={async (q, correct, picked) => {
            await recordAnswer(db, { questionId: q.id, correct, mode: "mock", mockNumber: run.mockNumber }, new Date().toISOString(), plan.today);
            await appendMockAnswer(db, run.mockNumber, correct, picked);
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

export const IPK_URL = "https://www.hackerrank.com/interview/interview-preparation-kit";

function Program2Form({ levelsDone, withLevels, onSave, busy }: { levelsDone: number; withLevels: boolean; onSave: (v: { outcome: ProblemAttempt["outcome"]; minutes: number; levels: number; notes: string }) => void; busy: boolean }) {
  const [outcome, setOutcome] = useState<ProblemAttempt["outcome"]>(levelsDone >= 3 ? "alone" : "hint");
  const [minutes, setMinutes] = useState("30");
  const [levels, setLevels] = useState(String(levelsDone));
  const [notes, setNotes] = useState("");
  return (
    <form className="mt-4 space-y-3" aria-label="Log Program 2" onSubmit={(e) => { e.preventDefault(); onSave({ outcome, minutes: Math.max(0, Math.round(Number(minutes) || 0)), levels: Number(levels), notes: notes.trim() }); }}>
      <label className="block text-sm">Outcome
        <select className={`${field} ml-2`} value={outcome} onChange={(e) => setOutcome(e.target.value as ProblemAttempt["outcome"])}>
          {(["alone", "hint", "solution", "failed"] as const).map((o) => <option key={o} value={o}>{OUTCOME_LABEL[o]}</option>)}
        </select>
      </label>
      <label className="block text-sm">Minutes
        <input className={`${field} ml-2 w-20`} type="number" min={0} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
      </label>
      {withLevels && (
        <label className="block text-sm">Levels completed
          <select className={`${field} ml-2`} value={levels} onChange={(e) => setLevels(e.target.value)}>
            {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n} of 3</option>)}
          </select>
        </label>
      )}
      <label className="block text-sm">How far did you get? (optional)
        <textarea className={`${field} mt-1 block w-full`} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <button type="submit" className={primary} disabled={busy}>Save and continue</button>
    </form>
  );
}

function PartC({ run, advance }: { run: MockRun; advance: (programs: MockProgram[]) => void }) {
  const { db } = usePlanContext();
  const taskId = run.program2?.taskId ?? null;
  const task = taskId ? practicalTasks.get(taskId) : undefined;
  const levelsDone = run.program2?.levelsDone ?? 0;
  const [stopped, setStopped] = useState(false); // "I am out of time": go to the form with the levels so far
  const [busy, setBusy] = useState(false);
  const skip = () => advance([{ part: 2, problemId: taskId ?? FREE_PROGRAM2_ID, outcome: "failed", minutes: 0, skipped: true }]);

  if (!task) {
    return (
      <PartShell run={run} phase="C" minutes={PART_MINUTES.C} onSkip={skip}>
        <p className="mt-3 text-sm">No practical task is unlocked for this week yet (they start in Week 2). Do one implementation problem from the{" "}
          <a href={IPK_URL} target="_blank" rel="noopener noreferrer" className="text-indigo-700 underline dark:text-indigo-300">HackerRank Interview Preparation Kit<span className="sr-only"> (opens in a new tab)</span></a>, then log it.</p>
        <Program2Form levelsDone={0} withLevels={false} busy={busy} onSave={(v) => { setBusy(true); advance([{ part: 2, problemId: FREE_PROGRAM2_ID, outcome: v.outcome, minutes: v.minutes, ...(v.notes ? { notes: v.notes } : {}) }]); }} />
      </PartShell>
    );
  }

  const showForm = stopped || levelsDone >= 3;
  const current = task.levels[Math.min(levelsDone, 2)]!;
  const finishLevel = () => updateMockRun(db, run.mockNumber, { program2: { taskId: task.id, levelsDone: levelsDone + 1 } });

  return (
    <PartShell run={run} phase="C" minutes={PART_MINUTES.C} onSkip={skip}>
      <h2 className="mt-3 text-lg font-semibold">{task.title}</h2>
      {levelsDone === 0 && !showForm && (
        <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          <p>{task.intro}</p>
          <ul className="mt-1 list-disc pl-5">{task.rules.map((r) => <li key={r}>{r}</li>)}</ul>
        </div>
      )}
      {levelsDone > 0 && (
        <ul className="mt-2 text-sm text-slate-600 dark:text-slate-400" aria-label="Finished levels">
          {task.levels.slice(0, levelsDone).map((l) => <li key={l.level}>✓ Level {l.level}: {l.title}</li>)}
        </ul>
      )}
      {showForm ? (
        <>
          <p className="mt-3 text-sm">{levelsDone >= 3 ? "All three levels done." : `You finished ${levelsDone} of 3 levels.`} Log how it went.</p>
          <Program2Form
            levelsDone={levelsDone}
            withLevels
            busy={busy}
            onSave={(v) => {
              setBusy(true);
              advance([{ part: 2, problemId: task.id, outcome: v.outcome, minutes: v.minutes, levelsDone: v.levels, ...(v.notes ? { notes: v.notes } : {}) }]);
            }}
          />
        </>
      ) : (
        <section aria-label={`Level ${current.level}`} className="mt-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
          <h3 className="font-semibold">Level {current.level} of 3: {current.title}</h3>
          <div className="mt-1 text-sm"><Markdown>{current.prompt}</Markdown></div>
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">Signature</p>
          <CodeBlock code={current.signature} label="Signature" />
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">Sample input</p>
          <CodeBlock code={current.sampleInput} label="Sample input" />
          <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">Expected output</p>
          <pre role="region" aria-label="Expected output" className="overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900"><code className="font-mono">{current.expectedOutput}</code></pre>
          {current.edgeCases.length > 0 && (
            <>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">Edge cases</p>
              <ul className="list-disc pl-5 text-sm">{current.edgeCases.map((e) => <li key={e}>{e}</li>)}</ul>
            </>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className={primary} onClick={() => void finishLevel()}>{current.level < 3 ? `Level ${current.level} done, next level` : "Level 3 done"}</button>
            <button type="button" className={secondary} onClick={() => setStopped(true)}>Stop here and log it</button>
          </div>
        </section>
      )}
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

// ── results ──────────────────────────────────────────────────────────────────

const typeOf = (id: string) => bank.byId.get(id)?.type;

function Bar({ correct, total }: { correct: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((correct / total) * 100);
  return (
    <div className="h-2 w-full min-w-24 rounded bg-slate-200 dark:bg-slate-800" role="img" aria-label={`${pct}% correct`}>
      <div className="h-2 rounded bg-indigo-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

function BucketTable({ caption, rows, label }: { caption: string; rows: Bucket[]; label: (key: string) => string }) {
  return (
    <table className="mt-3 w-full text-sm">
      <caption className="mb-1 text-left text-xs font-medium uppercase tracking-wide text-slate-500">{caption}</caption>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key} className="border-t border-slate-200 dark:border-slate-800">
            <td className="w-40 py-1 pr-2">{label(r.key)}</td>
            <td className="w-16 py-1 pr-2 tabular-nums">{r.correct} / {r.total}</td>
            <td className="py-1"><Bar correct={r.correct} total={r.total} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Total score, then the same score by question type and by section. Old sessions without answers get only the by-type split. */
function ScoreBreakdown({ mcq, answers, baseline }: { mcq: MockSession["mcq"]; answers: MockAnswer[] | null; baseline?: boolean }) {
  const b = answers ? breakdown(answers, typeOf) : null;
  const pct = mcq.total === 0 ? 0 : Math.round((mcq.correct / mcq.total) * 100);
  const byType: Bucket[] = b ? b.byType : Object.entries(mcq.byType).map(([key, v]) => ({ key, ...v }));
  return (
    <div>
      <h2 className="text-xl font-semibold" aria-label="Score">MCQs: {mcq.correct} / {mcq.total} ({pct}%){baseline ? " · baseline" : ""}</h2>
      {byType.length > 0 && <BucketTable caption="By question type" rows={byType} label={(k) => TYPE_LABEL[k as Question["type"]] ?? k} />}
      {b && b.bySection.length > 0 && <BucketTable caption="By section" rows={b.bySection} label={(k) => SECTION_LABEL[k as MockSection]} />}
    </div>
  );
}

function ProgramsSummary({ programs, extra, titles }: { programs: MockProgram[]; extra: MockSession["extra"]; titles: (p: MockProgram) => string }) {
  return (
    <ul className="mt-4 space-y-1 text-sm" aria-label="Programs and extra">
      {programs.map((p, i) => (
        <li key={i}>
          Program {p.part}: {titles(p)} · {p.skipped ? "skipped" : `${OUTCOME_LABEL[p.outcome]}, ${p.minutes} min${p.levelsDone !== undefined ? `, ${p.levelsDone} of 3 levels` : ""}`}{p.notes ? ` · ${p.notes}` : ""}
        </li>
      ))}
      <li>Extra ({EXTRA_LABEL[extra.kind].toLowerCase()}): {extra.done ? "done" : "skipped"}</li>
    </ul>
  );
}

function useTitles() {
  const { plan } = usePlanContext();
  return (p: MockProgram) => (p.part === 2 ? (p.problemId === FREE_PROGRAM2_ID ? "Interview Preparation Kit problem" : (practicalTasks.get(p.problemId)?.title ?? p.problemId)) : (plan.problemOf(p.problemId)?.title ?? (p.problemId || "no problem")));
}

const FILTER_LABEL: Record<KeyFilter, string> = { all: "All", wrong: "Wrong only", right: "Right only" };

/** Every question in the order asked, with the options, your pick, the right answer and the explanation. */
function AnswerKey({ questionIds, answers }: { questionIds: string[]; answers: MockAnswer[] | null }) {
  const [filter, setFilter] = useState<KeyFilter>("all");
  const items = questionIds.map((id, i) => ({ id, n: i + 1, answer: answers?.[i] ?? null, correct: answers?.[i]?.correct ?? true }));
  const shown = answers ? filterKey(items, filter) : items;
  return (
    <section aria-label="Answer key" className="mt-8">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">Answer key</h2>
        {answers && (
          <div role="group" aria-label="Filter questions" className="ml-auto flex gap-1">
            {(Object.keys(FILTER_LABEL) as KeyFilter[]).map((f) => (
              <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={`rounded-md border px-2 py-1 text-xs ${filter === f ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 dark:border-slate-700"}`}>
                {FILTER_LABEL[f]}
              </button>
            ))}
          </div>
        )}
      </div>
      {!answers && <p className="mt-1 text-sm text-slate-500">This mock was saved before your answers were recorded, so only the right answers can be shown.</p>}
      {shown.length === 0 && <p className="mt-3 text-sm text-slate-500">No questions match this filter.</p>}
      <ol className="mt-3 space-y-4">
        {shown.map(({ id, n, answer }) => {
          const q = bank.byId.get(id);
          return (
            <li key={id} aria-label={`Question ${n}`} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold">Question {n}</span>
                {q && <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">{TYPE_LABEL[q.type]}</span>}
                {answer?.section && <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">{SECTION_LABEL[answer.section]}</span>}
                {answer && <span className={answer.correct ? "font-semibold text-emerald-700 dark:text-emerald-300" : "font-semibold text-rose-700 dark:text-rose-300"}>{answer.correct ? "✓ Right" : "✗ Wrong"}</span>}
              </p>
              {!q ? (
                <p className="mt-2 text-sm text-slate-500">This question is no longer in the bank.</p>
              ) : (
                <>
                  <div className="mt-2 font-medium"><Markdown className="text-base">{q.prompt}</Markdown></div>
                  {q.code && <div className="mt-2"><CodeBlock code={q.code} /></div>}
                  <ul className="mt-3 space-y-1.5">
                    {q.options.map((opt, oi) => {
                      const isRight = oi === q.answer;
                      const isPick = answer !== null && answer.picked === oi;
                      const tone = isRight ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950" : isPick ? "border-rose-500 bg-rose-50 dark:bg-rose-950" : "border-slate-200 dark:border-slate-800";
                      return (
                        <li key={oi} className={`flex items-start gap-2 rounded-md border p-2 text-sm ${tone}`}>
                          <span className="flex-1">{opt}</span>
                          {isPick && <span className="shrink-0 text-xs font-semibold">Your answer</span>}
                          {isRight && <span className="shrink-0 text-xs font-semibold text-emerald-700 dark:text-emerald-300">✓ Correct answer</span>}
                        </li>
                      );
                    })}
                  </ul>
                  {answer && answer.picked < 0 && <p className="mt-1 text-xs text-slate-500">Your pick was not recorded for this question.</p>}
                  <div className="mt-2 text-sm"><Markdown>{q.explanation}</Markdown></div>
                  {q.complexity && <p className="mt-1 text-xs text-slate-500">Time {q.complexity.time} · Space {q.complexity.space}</p>}
                </>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

// ── end screen (before saving) ───────────────────────────────────────────────

function EndScreen({ run, loc }: { run: MockRun; loc: MockLocation }) {
  const { db, plan } = usePlanContext();
  const titles = useTitles();
  const [rating, setRating] = useState<MockSession["rating"] | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const answers: MockAnswer[] = run.answers.flatMap((correct, i) => {
    const id = run.questionIds[i];
    return id && bank.byId.has(id) ? [{ questionId: id, picked: run.picks?.[i] ?? -1, correct, section: sectionOfIndex(i, run.groups) }] : [];
  });
  const mcq = mcqOfAnswers(answers, typeOf);
  const extra = { kind: run.extra.kind, done: run.extraDone };

  async function save() {
    if (!rating) return;
    setBusy(true);
    const item = plan.days.flatMap((d) => d.items).find((i) => i.itemId === loc.itemId);
    const session: MockSession = {
      mockNumber: run.mockNumber,
      date: plan.today,
      diagnostic: loc.slot.diagnostic,
      mcq,
      questionIds: answers.map((a) => a.questionId),
      answers,
      groups: run.groups,
      programs: run.programs,
      extra: { ...extra, ...(run.extra.snippetId ? { snippetId: run.extra.snippetId } : {}) },
      rating,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };
    await saveMockSession(db, session, { itemId: loc.itemId, planDayId: item?.planDayId ?? loc.homeDayId });
  }

  return (
    <section aria-label="Mock results" className="mt-4">
      <ScoreBreakdown mcq={mcq} answers={answers} baseline={loc.slot.diagnostic} />
      <ProgramsSummary programs={run.programs} extra={extra} titles={titles} />
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

// ── a saved mock: result, answer key, retakes ────────────────────────────────

function SavedMock({ session, loc }: { session: MockSession; loc: MockLocation }) {
  const { db } = usePlanContext();
  const titles = useTitles();
  const retakes = useLiveQuery(() => db.mockRetakes.where("mockNumber").equals(session.mockNumber).sortBy("retakeNumber"), [db, session.mockNumber]) ?? [];
  const [viewing, setViewing] = useState<number | "first">("first"); // a retake's id, or the first attempt
  const [retaking, setRetaking] = useState(false);

  const retake = viewing === "first" ? undefined : retakes.find((r) => r.id === viewing);
  const answers = retake ? retake.answers : (session.answers ?? null);
  const mcq = retake ? retake.mcq : session.mcq;
  const sectionOf = new Map((session.answers ?? []).map((a) => [a.questionId, a.section]));

  if (retaking) {
    return (
      <RetakeRunner
        session={session}
        sectionOf={sectionOf}
        onCancel={() => setRetaking(false)}
        onSaved={(id) => {
          setViewing(id);
          setRetaking(false);
        }}
      />
    );
  }

  const questionIds = retake ? retake.answers.map((a) => a.questionId) : session.questionIds;
  const attemptRows = [
    { key: "first" as const, label: "First attempt", date: session.date, mcq: session.mcq },
    ...retakes.map((r) => ({ key: r.id!, label: `Retake ${r.retakeNumber}`, date: r.date, mcq: r.mcq })),
  ];

  return (
    <section aria-label="Saved mock" className="mt-4">
      <p className="text-sm text-slate-500">
        Saved on {session.date} · self-rating {session.rating} of 5 · Mock row ticked{loc.slot.diagnostic ? " · this is your baseline" : ""}
      </p>

      <ul aria-label="Attempts" className="mt-3 flex flex-wrap gap-2">
        {attemptRows.map((a) => (
          <li key={String(a.key)}>
            <button type="button" aria-pressed={viewing === a.key} onClick={() => setViewing(a.key)} className={`rounded-md border px-2 py-1 text-sm ${viewing === a.key ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950" : "border-slate-300 dark:border-slate-700"}`}>
              {a.label} · {a.mcq.correct}/{a.mcq.total} · {a.date}
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-4">
        {retake && (
          <p role="note" className="mb-2 rounded-lg bg-slate-50 p-2 text-sm dark:bg-slate-900">
            First attempt {session.mcq.correct}/{session.mcq.total}, this retake {retake.mcq.correct}/{retake.mcq.total}. The official score above stays the first attempt.
          </p>
        )}
        <ScoreBreakdown mcq={mcq} answers={answers} baseline={!retake && loc.slot.diagnostic} />
      </div>

      {!retake && <ProgramsSummary programs={session.programs} extra={session.extra} titles={titles} />}
      {!retake && session.notes && <p className="mt-3 text-sm"><strong>Notes:</strong> {session.notes}</p>}

      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className={primary} onClick={() => setRetaking(true)} disabled={session.questionIds.length === 0}>Retake MCQs</button>
        <Link to="/" className={secondary}>Back to Today</Link>
      </div>
      <p className="mt-1 text-xs text-slate-500">A retake repeats only the MCQs, in a new order. It never changes your score, the tick or your review schedule.</p>

      <AnswerKey key={String(viewing)} questionIds={questionIds} answers={answers} />
    </section>
  );
}

function RetakeRunner({ session, sectionOf, onCancel, onSaved }: { session: MockSession; sectionOf: Map<string, MockSection | undefined>; onCancel: () => void; onSaved: (id: number) => void }) {
  const { db, plan } = usePlanContext();
  const questions = useMemo(
    () => shuffle(session.questionIds, Math.random).map((id) => bank.byId.get(id)).filter((q): q is Question => !!q),
    [session.questionIds],
  );
  const collected = useRef<MockAnswer[]>([]);

  async function finish() {
    const answers = collected.current;
    const id = await saveMockRetake(db, { mockNumber: session.mockNumber, date: plan.today, mcq: mcqOfAnswers(answers, typeOf), answers });
    onSaved(id);
  }

  return (
    <section aria-label="Retake" className="mt-4">
      <div className="flex items-center gap-3 text-sm">
        <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">Retake: does not change your score or review schedule</span>
        <button type="button" className="ml-auto text-indigo-700 underline dark:text-indigo-300" onClick={onCancel}>Cancel retake</button>
      </div>
      <QuizRunner
        title={`Mock ${session.mockNumber} retake`}
        questions={questions}
        hideResults
        onAnswer={(q, correct, picked) => void collected.current.push({ questionId: q.id, picked, correct, ...(sectionOf.get(q.id) ? { section: sectionOf.get(q.id)! } : {}) })}
        onFinish={finish}
        onRetry={() => undefined}
      />
    </section>
  );
}
