import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "../../app/Modal";
import { usePlanContext } from "../../app/PlanContext";
import { logFoundProblem } from "../../lib/actions";
import { curriculum } from "../../lib/curriculum";
import { currentWeek } from "../../lib/plan";
import type { Difficulty } from "../../types/content";

export const parseTags = (text: string): string[] => [...new Set(text.split(",").map((t) => t.trim()).filter(Boolean))];

const field = "mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950";

/** "Log a problem I found" (SPEC 3.14). Journal-only unless attached to a day. */
export function FoundProblemModal({ defaultPlanDayId, onClose }: { defaultPlanDayId?: string; onClose: () => void }) {
  const { plan, db } = usePlanContext();
  const navigate = useNavigate();
  const defaultWeek = plan.schedule.find((d) => d.planDayId === defaultPlanDayId)?.week ?? currentWeek(plan);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("LeetCode");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [week, setWeek] = useState(defaultWeek);
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<"solved" | "failed">("solved");
  const [minutes, setMinutes] = useState("30");
  const [date, setDate] = useState(plan.today);
  const [busy, setBusy] = useState(false);

  const mins = Number(minutes);
  const attemptOk = Number.isInteger(mins) && mins >= 0 && mins <= 600 && !!date && date <= plan.today;
  const valid = title.trim().length > 0 && attemptOk;

  return (
    <Modal title="Log a problem I found" onClose={onClose}>
      <form
        className="space-y-3 text-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!valid || busy) return;
          setBusy(true);
          const id = await logFoundProblem(
            db,
            {
              week,
              title: title.trim(),
              difficulty,
              ...(url.trim() ? { url: url.trim() } : {}),
              ...(platform.trim() ? { platform: platform.trim() } : {}),
              ...(description.trim() ? { description: description.trim() } : {}),
              tags: parseTags(tags),
              firstAttempt: { outcome: result === "solved" ? ("alone" as const) : ("failed" as const), minutes: mins, date },
            },
            plan.today,
          );
          onClose();
          navigate(`/problems/${encodeURIComponent(id)}`);
        }}
      >
        <label className="block">Link (URL)<input type="url" value={url} onChange={(e) => setUrl(e.target.value)} className={field} placeholder="https://leetcode.com/problems/…" /></label>
        <label className="block">Title<input value={title} onChange={(e) => setTitle(e.target.value)} className={field} required /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">Platform<input value={platform} onChange={(e) => setPlatform(e.target.value)} className={field} /></label>
          <label className="block">Difficulty
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} className={field}>
              {(["Easy", "Medium", "Hard"] as const).map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">Topic week
            <select value={week} onChange={(e) => setWeek(Number(e.target.value))} className={field}>
              {curriculum.weeks.map((w) => <option key={w.week} value={w.week}>Week {w.week} · {w.title}</option>)}
            </select>
          </label>
          <label className="block">Pattern tags
            <input value={tags} onChange={(e) => setTags(e.target.value)} className={field} placeholder="Prefix Sum, Two Pointers" />
          </label>
        </div>
        <label className="block">Problem description (markdown)<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={field} /></label>
        <fieldset className="space-y-2 rounded-md border border-slate-200 p-3 dark:border-slate-800">
          <legend className="px-1">Result</legend>
          <div className="flex gap-4">
            <label className="flex items-center gap-2"><input type="radio" name="found-result" checked={result === "solved"} onChange={() => setResult("solved")} /> Solved</label>
            <label className="flex items-center gap-2"><input type="radio" name="found-result" checked={result === "failed"} onChange={() => setResult("failed")} /> Failed</label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">Minutes<input type="number" min={0} max={600} value={minutes} onChange={(e) => setMinutes(e.target.value)} className={field} /></label>
            <label className="block">Date<input type="date" max={plan.today} value={date} onChange={(e) => setDate(e.target.value)} className={field} /></label>
          </div>
        </fieldset>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
          <button type="submit" disabled={!valid || busy} className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white disabled:opacity-40">Save problem</button>
        </div>
      </form>
    </Modal>
  );
}
