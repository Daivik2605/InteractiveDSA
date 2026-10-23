import { useState } from "react";
import { Modal } from "../../app/Modal";
import type { Problem, ProblemAttempt } from "../../types/content";

export interface LogValues {
  problemId: string;
  outcome: ProblemAttempt["outcome"];
  minutes: number;
  note: string;
}

const OUTCOMES: { value: ProblemAttempt["outcome"]; label: string }[] = [
  { value: "alone", label: "Solved alone" },
  { value: "hint", label: "Needed hint" },
  { value: "solution", label: "Needed solution" },
];

/** Quick problem log (SPEC 3.1). With `choices`, the learner picks which problem they redid. */
export function LogModal({
  title,
  problem,
  choices,
  onCancel,
  onSubmit,
}: {
  title: string;
  problem?: Problem;
  choices?: Problem[];
  onCancel: () => void;
  onSubmit: (v: LogValues) => void | Promise<void>;
}) {
  const [problemId, setProblemId] = useState(problem?.id ?? choices?.[0]?.id ?? "");
  const [outcome, setOutcome] = useState<ProblemAttempt["outcome"]>("alone");
  const [minutes, setMinutes] = useState("30");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const mins = Number(minutes);
  const valid = !!problemId && Number.isInteger(mins) && mins >= 0 && mins <= 600;
  const field = "mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950";

  return (
    <Modal title={title} onClose={onCancel}>
      <form
        className="space-y-4 text-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valid || busy) return;
          setBusy(true);
          await onSubmit({ problemId, outcome, minutes: mins, note: note.trim() });
        }}
      >
        {problem ? (
          <p className="font-medium">{problem.title}</p>
        ) : (
          <label className="block">
            Which problem did you redo?
            <select value={problemId} onChange={(e) => setProblemId(e.target.value)} className={field}>
              {choices?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.difficulty})
                </option>
              ))}
            </select>
          </label>
        )}
        <fieldset>
          <legend className="mb-1">How did it go?</legend>
          <div className="space-y-1">
            {OUTCOMES.map((o) => (
              <label key={o.value} className="flex items-center gap-2">
                <input type="radio" name="outcome" value={o.value} checked={outcome === o.value} onChange={() => setOutcome(o.value)} />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block">
          Minutes taken
          <input type="number" min={0} max={600} value={minutes} onChange={(e) => setMinutes(e.target.value)} className={field} />
        </label>
        <label className="block">
          Note (optional)
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={field} />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-md px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">
            Cancel
          </button>
          <button type="submit" disabled={!valid || busy} className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white disabled:opacity-40">
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
