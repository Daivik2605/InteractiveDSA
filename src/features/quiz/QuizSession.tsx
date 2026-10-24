import { useState } from "react";
import { usePlanContext } from "../../app/PlanContext";
import { recordAnswer } from "../../lib/actions";
import type { Question, QuizAnswer } from "../../types/content";
import { QuizRunner } from "./QuizRunner";

/**
 * A quiz with saved answers and "Retry missed" rounds. It no longer ticks a plan item: the v2 plan has no
 * quiz learn items (mocks replace them in Phase B).
 */
export function QuizSession({ title, mode, questions }: { title: string; mode: QuizAnswer["mode"]; questions: Question[] }) {
  const { plan, db } = usePlanContext();
  const [round, setRound] = useState({ id: 0, questions });
  return (
    <QuizRunner
      key={round.id}
      title={round.id === 0 ? title : `${title} (retry)`}
      questions={round.questions}
      onAnswer={(q, correct) => recordAnswer(db, { questionId: q.id, correct, mode }, new Date().toISOString(), plan.today)}
      onFinish={() => undefined}
      onRetry={(missed) => setRound((r) => ({ id: r.id + 1, questions: missed }))}
    />
  );
}
