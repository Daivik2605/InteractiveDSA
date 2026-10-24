import { useRef, useState } from "react";
import { usePlanContext } from "../../app/PlanContext";
import { recordAnswer, tickItem } from "../../lib/actions";
import { learnItemToTick, type LearnKind } from "../../lib/learn";
import type { Question, QuizAnswer } from "../../types/content";
import { QuizRunner } from "./QuizRunner";

/**
 * A quiz with saved answers, "Retry missed" rounds, and the learn item auto-ticked the first
 * time the quiz is finished (retries never tick anything else).
 */
export function QuizSession({ title, kind, week, mode, questions }: { title: string; kind: LearnKind; week?: number; mode: QuizAnswer["mode"]; questions: Question[] }) {
  const { plan, db } = usePlanContext();
  const [round, setRound] = useState({ id: 0, questions });
  const ticked = useRef(false);
  return (
    <QuizRunner
      key={round.id}
      title={round.id === 0 ? title : `${title} (retry)`}
      questions={round.questions}
      onAnswer={(q, correct) => recordAnswer(db, { questionId: q.id, correct, mode }, new Date().toISOString(), plan.today)}
      onFinish={async () => {
        if (ticked.current) return;
        ticked.current = true;
        const target = learnItemToTick(plan, kind, week);
        if (target) await tickItem(db, target, plan.today);
      }}
      onRetry={(missed) => setRound((r) => ({ id: r.id + 1, questions: missed }))}
    />
  );
}
