import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "../../app/Modal";
import { usePlanContext } from "../../app/PlanContext";
import { logFoundProblem } from "../../lib/actions";
import { curriculum } from "../../lib/curriculum";
import { formatShort } from "../../lib/dates";
import { currentWeek } from "../../lib/plan";
import { parsePlanDayId } from "../../lib/schedule";
import type { Difficulty, ProblemAttempt } from "../../types/content";
import { OUTCOMES } from "../today/LogModal";

export const parseTags = (text: string): string[] => [...new Set(text.split(",").map((t) => t.trim()).filter(Boolean))];

const field = "mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950";

/** "Log a problem I found" (SPEC 3.14). Journal-only unless attached to a day. */
export function FoundProblemModal({ defaultPlanDayId, onClose }: { defaultPlanDayId?: string; onClose: () => void }) {
  const { plan, db } = usePlanContext();
  const navigate = useNavigate();
  const defaultWeek = defaultPlanDayId ? parsePlanDayId(defaultPlanDayId).week : currentWeek(plan);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("LeetCode");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [week, setWeek] = useState(defaultWeek);
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");
  const [planDayId, setPlanDayId] = useState(defaultPlanDayId ?? "");
  const [attempted, setAttempted] = useState(false);
  const [outcome, setOutcome] = useState<ProblemAttempt["outcome"]>("alone");
  const [minutes, setMinutes] = useState("30");
  const [date, setDate] = useState(plan.today);
  const [busy, setBusy] = useState(false);

  const weekDays = plan.schedule.filter((d) => d.week === week);
  const dayId = weekDays.some((d) => d.planDayId === planDayId) ? planDayId : "";
  const mins = Number(minutes);
  const attemptOk = !attempted || (Number.isInteger(mins) && mins >= 0 && mins <= 600 && !!date && date <= plan.today);
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
              ...(dayId ? { planDayId: dayId } : {}),
              ...(description.trim() ? { description: description.trim() } : {}),
              tags: parseTags(tags),
              ...(attempted ? { firstAttempt: { outcome, minutes: mins, date } } : {}),
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
        <label className="block">Attach to a day (optional)
          <select value={dayId} onChange={(e) => setPlanDayId(e.target.value)} className={field}>
            <option value="">Don't attach (journal only)</option>
            {weekDays.map((d) => (
              <option key={d.planDayId} value={d.planDayId}>{formatShort(d.date)} · {d.kind === "extension" ? `extension ${parsePlanDayId(d.planDayId).n}` : `Day ${parsePlanDayId(d.planDayId).n}`}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={attempted} onChange={(e) => setAttempted(e.target.checked)} /> I've already attempted it</label>
        {attempted && (
          <fieldset className="space-y-2 rounded-md border border-slate-200 p-3 dark:border-slate-800">
            <legend className="px-1">First attempt</legend>
            <div className="space-y-1">
              {OUTCOMES.map((o) => (
                <label key={o.value} className="flex items-center gap-2">
                  <input type="radio" name="found-outcome" checked={outcome === o.value} onChange={() => setOutcome(o.value)} /> {o.label}
                </label>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">Minutes<input type="number" min={0} max={600} value={minutes} onChange={(e) => setMinutes(e.target.value)} className={field} /></label>
              <label className="block">Date<input type="date" max={plan.today} value={date} onChange={(e) => setDate(e.target.value)} className={field} /></label>
            </div>
          </fieldset>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
          <button type="submit" disabled={!valid || busy} className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white disabled:opacity-40">Save problem</button>
        </div>
      </form>
    </Modal>
  );
}
