import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { usePlanContext } from "../../app/PlanContext";
import { curriculum } from "../../lib/curriculum";
import { compareDates } from "../../lib/dates";
import { currentWeek } from "../../lib/plan";
import { bank, questionsOfWeek } from "../../lib/questions";
import { REVIEW_COUNT, selectReviewQuestions } from "../../lib/quiz";
import type { Question } from "../../types/content";
import { QuizSession } from "./QuizSession";

const linkBtn = "rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900";

export function WeeklyQuizPage() {
  const week = Number(useParams().week);
  const title = curriculum.weeks.find((w) => w.week === week)?.title;
  const questions = questionsOfWeek(bank, week);
  return (
    <div>
      <h1 className="text-2xl font-semibold">Weekly quiz{title ? ` · Week ${week}` : ""}</h1>
      {title && <p className="text-slate-600 dark:text-slate-400">{title}</p>}
      {!title ? (
        <p className="mt-4 text-slate-500">That week doesn't exist.</p>
      ) : questions.length === 0 ? (
        <p className="mt-4 text-slate-500">No questions for Week {week} yet.</p>
      ) : (
        <QuizSession key={week} title={`Week ${week} quiz`} kind="weekly-quiz" week={week} mode="weekly" questions={questions} />
      )}
    </div>
  );
}

export function ReviewQuizPage() {
  const { plan, db } = usePlanContext();
  const [questions, setQuestions] = useState<Question[] | null>(null);

  // Chosen once on open: answering must not reshuffle the quiz underneath the learner.
  useEffect(() => {
    let live = true;
    (async () => {
      const [cards, answers] = await Promise.all([db.cards.toArray(), db.quizAnswers.toArray()]);
      const picked = selectReviewQuestions({ questions: bank.questions, currentWeek: currentWeek(plan), cards, answers, today: plan.today, rng: Math.random });
      if (live) setQuestions(picked);
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Review quiz</h1>
      <p className="text-slate-600 dark:text-slate-400">Up to {REVIEW_COUNT} questions, due and weak ones first.</p>
      {questions === null ? (
        <p className="mt-4 text-slate-500">Choosing questions…</p>
      ) : questions.length === 0 ? (
        <p className="mt-4 text-slate-500">No questions to review yet.</p>
      ) : (
        <QuizSession title="Review quiz" kind="review" mode="review" questions={questions} />
      )}
    </div>
  );
}

export function QuizHubPage() {
  const { plan, db } = usePlanContext();
  const dueCount = useLiveQuery(async () => (await db.cards.toArray()).filter((c) => compareDates(c.dueOn, plan.today) <= 0).length, [db, plan.today]);
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Quizzes &amp; drills</h1>
      <section className="mt-6" aria-label="Weekly quizzes">
        <h2 className="text-lg font-semibold">Weekly quizzes</h2>
        <p className="text-sm text-slate-500">Any week's quiz can be taken at any time.</p>
        <ul className="mt-2 space-y-2">
          {curriculum.weeks.map((w) => {
            const count = questionsOfWeek(bank, w.week).length;
            return (
              <li key={w.week} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800">
                <span>
                  Week {w.week} · {w.title}{" "}
                  <span className="text-xs text-slate-500">{count > 0 ? `(${count} questions)` : "(no questions yet)"}</span>
                </span>
                {count > 0 && (
                  <Link to={`/quiz/week/${w.week}`} className={linkBtn}>
                    Start<span className="sr-only"> Week {w.week} quiz</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <section className="mt-6" aria-label="Review quiz">
        <h2 className="text-lg font-semibold">Review quiz</h2>
        <p className="text-sm text-slate-500">{dueCount ?? 0} card{dueCount === 1 ? "" : "s"} due.</p>
        <Link to="/quiz/review" className={`${linkBtn} mt-2 inline-block`}>Start review quiz</Link>
      </section>
      <section className="mt-6" aria-label="Pattern drill">
        <h2 className="text-lg font-semibold">Pattern drill</h2>
        <p className="text-sm text-slate-500">10 prompts, 20 seconds each.</p>
        <Link to="/quiz/drill" className={`${linkBtn} mt-2 inline-block`}>Start pattern drill</Link>
      </section>
    </div>
  );
}
