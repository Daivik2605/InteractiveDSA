import { useLiveQuery } from "dexie-react-hooks";
import { useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePlanContext } from "../../app/PlanContext";
import { countedMockAnswers, formatMinutes, mockAccuracy, OUTCOMES, problemStats, scoreTrend, studySummary, targetMockPath, WEAK_MIN_ATTEMPTS, weakestSpots, type Accuracy, type TrendPoint } from "../../lib/dashboard";
import { curriculum } from "../../lib/curriculum";
import { buildMockRows } from "../../lib/mock";
import { OUTCOME_LABEL } from "../../lib/problems";
import { bank } from "../../lib/questions";
import { TYPE_LABEL } from "../quiz/QuizRunner";

const INDIGO = "#6366f1";
const OUTCOME_COLOR: Record<(typeof OUTCOMES)[number], string> = { alone: "#10b981", hint: "#f59e0b", solution: "#f97316", failed: "#ef4444" };
const tick = { fill: "currentColor", fontSize: 12 };
const tooltipStyle = { backgroundColor: "var(--tooltip-bg, #fff)", border: "1px solid #cbd5e1", borderRadius: 6, color: "#0f172a", fontSize: 12 };

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="mt-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      {hint && <p className="text-sm text-slate-500">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

const Empty = ({ children }: { children: ReactNode }) => (
  <p role="note" className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700">{children}</p>
);

/** A chart plus a plain table of the same numbers for screen readers. */
function ChartBox({ label, table, children }: { label: string; table: ReactNode; children: ReactNode }) {
  return (
    <figure aria-label={label} className="text-slate-500">
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{label}</caption>
        {table}
      </table>
    </figure>
  );
}

function TrendChart({ points }: { points: TrendPoint[] }) {
  return (
    <ChartBox
      label="Mock score trend"
      table={
        <tbody>
          {points.map((p) => (
            <tr key={p.mockNumber}>
              <th scope="row">Mock {p.mockNumber}{p.baseline ? " (baseline)" : ""}</th>
              <td>{p.correct} / {p.total}</td>
              <td>{p.percent}%</td>
            </tr>
          ))}
        </tbody>
      }
    >
      <LineChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.4} />
        <XAxis dataKey="mockNumber" tick={tick} tickFormatter={(n) => `#${n}`} />
        <YAxis domain={[0, 100]} tick={tick} unit="%" />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(_v, _n, item) => {
            const p = item.payload as TrendPoint;
            return [`${p.correct} / ${p.total} (${p.percent}%)${p.baseline ? " · baseline" : ""}`, "Score"];
          }}
          labelFormatter={(n) => `Mock ${n}`}
        />
        <Line
          type="monotone"
          dataKey="percent"
          stroke={INDIGO}
          strokeWidth={2}
          dot={(props: { cx?: number; cy?: number; payload?: TrendPoint; index?: number }) => {
            const { cx = 0, cy = 0, payload, index } = props;
            return payload?.baseline ? (
              <rect key={`d${index}`} x={cx - 5} y={cy - 5} width={10} height={10} fill="#0ea5e9" />
            ) : (
              <circle key={`d${index}`} cx={cx} cy={cy} r={4} fill={INDIGO} />
            );
          }}
          isAnimationActive={false}
        />
      </LineChart>
    </ChartBox>
  );
}

function AccuracyChart({ label, rows, nameOf, longName }: { label: string; rows: Accuracy[]; nameOf: (key: string) => string; longName: (key: string) => string }) {
  const data = rows.map((r) => ({ name: nameOf(r.key), full: longName(r.key), percent: Math.round(r.accuracy * 100), correct: r.correct, attempts: r.attempts }));
  return (
    <ChartBox
      label={label}
      table={
        <tbody>
          {data.map((d) => (
            <tr key={d.full}>
              <th scope="row">{d.full}</th>
              <td>{d.correct} / {d.attempts}</td>
              <td>{d.percent}%</td>
            </tr>
          ))}
        </tbody>
      }
    >
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.4} vertical={false} />
        <XAxis dataKey="name" tick={tick} />
        <YAxis domain={[0, 100]} tick={tick} unit="%" />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(_v, _n, item) => {
            const d = item.payload as (typeof data)[number];
            return [`${d.correct} / ${d.attempts} (${d.percent}%)`, "Correct"];
          }}
          labelFormatter={(_l, items) => (items?.[0]?.payload as (typeof data)[number] | undefined)?.full ?? ""}
        />
        <Bar dataKey="percent" fill={INDIGO} radius={[3, 3, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ChartBox>
  );
}

export function DashboardPage() {
  const { plan, db } = usePlanContext();
  const answers = useLiveQuery(() => db.quizAnswers.where("mode").equals("mock").toArray(), [db]);
  const sessions = useLiveQuery(() => db.mocks.toArray(), [db]);
  const runs = useLiveQuery(() => db.mockRuns.toArray(), [db]);

  const view = useMemo(() => {
    if (!answers || !sessions || !runs) return null;
    const counted = countedMockAnswers(answers, sessions);
    const accuracy = mockAccuracy(counted, (id) => bank.byId.get(id));
    const themeTitle = (t: number) => curriculum.mockSpec.pythonThemes.find((x) => x.id === t)?.title.split(":")[0] ?? `Theme ${t}`;
    const weak = weakestSpots({ accuracy, themeTitle, typeLabel: (t) => TYPE_LABEL[t] });
    const rows = buildMockRows({ curriculum, sessions, runs, retakes: [], questions: bank.questions });
    return {
      trend: scoreTrend(sessions),
      counted: counted.length,
      accuracy,
      themeTitle,
      weak: weak.map((w) => ({ ...w, to: targetMockPath(w, rows) })),
      problems: problemStats(plan.snapshot.attempts, (id) => plan.problemOf(id)),
      summary: studySummary({ days: plan.days.map((d) => d), streak: plan.streak.current, attempts: plan.snapshot.attempts, sessions }),
    };
  }, [answers, sessions, runs, plan]);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {!view ? (
        <p className="mt-4 text-slate-500">Loading…</p>
      ) : (
        <>
          <section aria-label="Study summary" className="mt-4">
            <h2 className="sr-only">Study summary</h2>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Days done", value: String(view.summary.daysDone), note: view.summary.daysDone !== view.summary.daysDoneOnTime ? `${view.summary.daysDoneOnTime} on time` : "of 90" },
                { label: "Current streak", value: `${view.summary.streak} day${view.summary.streak === 1 ? "" : "s"}`, note: "days done in a row" },
                { label: "Solved alone", value: String(view.summary.solvedAlone), note: "problems" },
                { label: "Study time", value: formatMinutes(view.summary.studyMinutes), note: "logged minutes" },
              ].map((c) => (
                <div key={c.label} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                  <dt className="text-xs uppercase tracking-wide text-slate-500">{c.label}</dt>
                  <dd className="mt-1 text-2xl font-semibold tabular-nums">{c.value}</dd>
                  <dd className="text-xs text-slate-500">{c.note}</dd>
                </div>
              ))}
            </dl>
          </section>

          <Section title="Mock scores" hint="First-attempt MCQ score of each finished mock. Retakes are not included.">
            {view.trend.length === 0 ? (
              <Empty>No mocks finished yet. Your scores appear here after Mock 1, which becomes your baseline.</Empty>
            ) : (
              <>
                <TrendChart points={view.trend} />
                {view.trend.some((p) => p.baseline) && (
                  <p className="mt-1 text-xs text-slate-500"><span className="inline-block h-2.5 w-2.5 bg-sky-500 align-baseline" aria-hidden /> Mock 1 is your baseline. It is shown here only, and left out of the accuracy charts and weak spots below.</p>
                )}
              </>
            )}
          </Section>

          <Section title="Weakest spots" hint={`The lowest-accuracy Python themes and question types in your mocks (at least ${WEAK_MIN_ATTEMPTS} answers each).`}>
            {view.weak.length === 0 ? (
              <Empty>Not enough answers yet. A theme or question type needs at least {WEAK_MIN_ATTEMPTS} answers from finished mocks other than the Mock 1 baseline.</Empty>
            ) : (
              <ol className="space-y-2" aria-label="Weakest spots">
                {view.weak.map((w) => (
                  <li key={`${w.kind}-${w.key}`} className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                    <span className="font-medium">{w.label}</span>
                    <span className="text-sm text-slate-500">{w.correct} / {w.attempts} correct · {Math.round(w.accuracy * 100)}%</span>
                    <Link to={w.to} className="ml-auto rounded-md border border-indigo-600 px-2.5 py-1 text-sm text-indigo-700 hover:bg-indigo-50 dark:border-indigo-400 dark:text-indigo-300 dark:hover:bg-indigo-950">
                      Start targeted mock
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <Section title="Accuracy by Python theme" hint="Python-language questions in finished mocks, excluding the Mock 1 baseline.">
            {view.accuracy.byTheme.length === 0 ? (
              <Empty>Shows after you finish a mock other than Mock 1.</Empty>
            ) : (
              <AccuracyChart label="Accuracy by Python theme" rows={view.accuracy.byTheme} nameOf={(k) => `T${k}`} longName={(k) => `Theme ${k}: ${view.themeTitle(Number(k))}`} />
            )}
          </Section>

          <Section title="Accuracy by question type">
            {view.accuracy.byType.length === 0 ? (
              <Empty>Shows after you finish a mock other than Mock 1.</Empty>
            ) : (
              <AccuracyChart label="Accuracy by question type" rows={view.accuracy.byType} nameOf={(k) => TYPE_LABEL[k as keyof typeof TYPE_LABEL]} longName={(k) => TYPE_LABEL[k as keyof typeof TYPE_LABEL]} />
            )}
          </Section>

          <Section title="Problems" hint="Each problem counts once, by its latest attempt.">
            {view.problems.total === 0 ? (
              <Empty>No problem attempts logged yet.</Empty>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                <ChartBox
                  label="Problems by outcome"
                  table={<tbody>{view.problems.byOutcome.map((o) => <tr key={o.outcome}><th scope="row">{OUTCOME_LABEL[o.outcome]}</th><td>{o.count}</td></tr>)}</tbody>}
                >
                  <BarChart data={view.problems.byOutcome.map((o) => ({ name: OUTCOME_LABEL[o.outcome], count: o.count, outcome: o.outcome }))} margin={{ top: 8, right: 8, bottom: 4, left: -24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.4} vertical={false} />
                    <XAxis dataKey="name" tick={{ ...tick, fontSize: 10 }} interval={0} />
                    <YAxis allowDecimals={false} tick={tick} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" name="Problems" fill={INDIGO} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                  </BarChart>
                </ChartBox>
                <ChartBox
                  label="Problems by difficulty"
                  table={
                    <tbody>
                      {view.problems.byDifficulty.map((d) => (
                        <tr key={d.difficulty}><th scope="row">{d.difficulty}</th><td>{d.total}</td>{OUTCOMES.map((o) => <td key={o}>{OUTCOME_LABEL[o]}: {d[o]}</td>)}</tr>
                      ))}
                    </tbody>
                  }
                >
                  <BarChart data={view.problems.byDifficulty} margin={{ top: 8, right: 8, bottom: 4, left: -24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.4} vertical={false} />
                    <XAxis dataKey="difficulty" tick={tick} />
                    <YAxis allowDecimals={false} tick={tick} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {OUTCOMES.map((o) => (
                      <Bar key={o} dataKey={o} name={OUTCOME_LABEL[o]} stackId="d" fill={OUTCOME_COLOR[o]} isAnimationActive={false} />
                    ))}
                  </BarChart>
                </ChartBox>
              </div>
            )}
            <p className="mt-4 text-sm" aria-label="Average minutes">
              {view.problems.avgMinutes === null ? (
                <span className="text-slate-500">Average minutes per problem shows once you log some minutes.</span>
              ) : (
                <>
                  <strong className="text-lg tabular-nums">{view.problems.avgMinutes}</strong> minutes per attempt on average
                  {view.problems.avgMinutesByDifficulty.filter((d) => d.avgMinutes !== null).map((d) => (
                    <span key={d.difficulty} className="ml-3 text-slate-500">{d.difficulty} {d.avgMinutes}</span>
                  ))}
                </>
              )}
            </p>
          </Section>
        </>
      )}
    </div>
  );
}
