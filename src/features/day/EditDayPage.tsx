import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { Modal } from "../../app/Modal";
import { usePlanContext } from "../../app/PlanContext";
import {
  addCustomItem,
  deleteCustomItem,
  editCustomItem,
  logAttempt,
  moveItem,
  saveDayLog,
  tickItemOn,
  untickItem,
} from "../../lib/actions";
import { formatShort } from "../../lib/dates";
import { itemLabel } from "../../lib/labels";
import { canMoveItem, parsePlanDayId, type DayItem, type EvaluatedDay } from "../../lib/schedule";
import type { Difficulty } from "../../types/content";
import { AddDayButton } from "../calendar/AddDayButton";
import { STATUS_META } from "../calendar/status";
import { FoundProblemModal } from "../problems/FoundProblemModal";
import { LogModal } from "../today/LogModal";
import { Row, Section } from "../today/Row";

const field = "mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950";
const linkBtn = "text-indigo-700 underline dark:text-indigo-300";

export function EditDayPage() {
  const { planDayId } = useParams();
  const { plan } = usePlanContext();
  const day = plan.days.find((d) => d.day.planDayId === planDayId);
  if (!day) {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Day not found</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">That day is not in the plan (it may have been removed). <Link to="/calendar" className={linkBtn}>Back to the calendar</Link></p>
      </div>
    );
  }
  return <EditDay key={day.day.planDayId} day={day} />;
}

function dayTitle(d: EvaluatedDay["day"]) {
  const { n } = parsePlanDayId(d.planDayId);
  return d.kind === "extension" ? `Week ${d.week} · Extension day ${n}` : `Week ${d.week} · Day ${n}`;
}

function EditDay({ day }: { day: EvaluatedDay }) {
  const { plan, db } = usePlanContext();
  const { planDayId, week, date } = day.day;
  const today = plan.today;
  const started = date <= today;
  const meta = STATUS_META[day.status];
  const [error, setError] = useState<string | null>(null);
  const [tickingLog, setTickingLog] = useState<DayItem | null>(null);
  const [tickingDate, setTickingDate] = useState<DayItem | null>(null);
  const [editing, setEditing] = useState<DayItem | null>(null);
  const [deleting, setDeleting] = useState<DayItem | null>(null);
  const [finding, setFinding] = useState(false);

  const weekDays = plan.schedule.filter((d) => d.week === week);
  const target = (item: DayItem) => ({ itemId: item.itemId, planDayId });
  const slots = day.items.filter((i) => i.kind === "slot");

  return (
    <div className="max-w-2xl">
      <p className="text-sm"><Link to="/calendar" className={linkBtn}>← Calendar</Link></p>
      <h1 className="mt-1 text-2xl font-semibold">Edit day</h1>
      <p className="mt-1 text-slate-600 dark:text-slate-400">
        {dayTitle(day.day)} · {formatShort(date)}
        <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-800">{meta.glyph} {meta.label}</span>
      </p>
      {error && <p role="alert" className="mt-2 text-sm text-rose-700 dark:text-rose-300">{error}</p>}

      <StudyLog day={day} />

      <Section title="Items" hint={started ? "Tick with the date you actually did it. A date on or before the day's date keeps the day “done”, not “done late”." : "This day hasn't arrived yet, so items can't be ticked."}>
        {day.items.filter((i) => i.kind !== "slot").map((item) => {
          const c = plan.completions.get(item.itemId);
          const others = weekDays.filter((d) => d.planDayId !== planDayId && canMoveItem({ schedule: plan.schedule, item, toPlanDayId: d.planDayId, completions: plan.completions }).ok);
          return (
            <Row
              key={item.itemId}
              checked={!!c}
              disabled={!c && !started}
              onToggle={() => {
                setError(null);
                if (c) return void untickItem(db, item.itemId);
                if (item.kind === "problem") setTickingLog(item);
                else setTickingDate(item);
              }}
              label={itemLabel(plan, item)}
              problem={item.problem}
              meta={[
                item.kind === "learn" ? "Learn" : item.kind === "task" ? "Task" : item.custom ? "Added by you" : undefined,
                item.movedFrom ? `moved from ${formatShort(plan.schedule.find((d) => d.planDayId === item.movedFrom)?.date ?? item.movedFrom)}` : undefined,
                c ? `done ${formatShort(c.completedOn)}${c.completedOn > date ? " (late)" : ""}` : undefined,
              ].filter(Boolean).join(" · ")}
              actions={
                <>
                  <MoveControl item={item} options={others} locked={!!c} onMove={(to) => moveItem(db, { itemId: item.itemId, custom: !!item.custom }, to, today)} />
                  {item.kind === "problem" && <Link to={`/problems/${encodeURIComponent(item.itemId)}`} className={linkBtn}>Journal</Link>}
                  {item.custom && <button type="button" className={linkBtn} onClick={() => setEditing(item)}>Edit</button>}
                  {item.custom && (
                    <button type="button" className="text-rose-700 underline dark:text-rose-300" onClick={() => (c ? setDeleting(item) : void deleteCustomItem(db, item.itemId))}>
                      Delete
                    </button>
                  )}
                </>
              }
            />
          );
        })}
        {slots.map((item) => (
          <Row key={item.itemId} checked={!!plan.completions.get(item.itemId)} disabled onToggle={() => undefined} label={itemLabel(plan, item)} meta="Redo slot: filled from your queues on the Today page" />
        ))}
      </Section>

      <AddItemForm day={day} />

      <div className="mt-8 flex flex-wrap items-start gap-4">
        <AddDayButton week={week} />
        <button type="button" className="rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700" onClick={() => setFinding(true)}>Log a problem I found</button>
      </div>

      {tickingLog?.problem && (
        <LogModal
          title="Log problem"
          problem={tickingLog.problem}
          dateRange={{ value: date, min: date, max: today }}
          onCancel={() => setTickingLog(null)}
          onSubmit={async (v) => {
            await logAttempt(db, { problemId: tickingLog.itemId, date: v.date, outcome: v.outcome, minutes: v.minutes, note: v.note, isRedo: false, completes: [target(tickingLog)] });
            setTickingLog(null);
          }}
        />
      )}
      {tickingDate && (
        <TickDateModal
          item={tickingDate}
          label={itemLabel(plan, tickingDate)}
          min={date}
          max={today}
          onCancel={() => setTickingDate(null)}
          onSubmit={async (d) => {
            const r = await tickItemOn(db, target(tickingDate), d, day.day, today);
            if (r.ok) setTickingDate(null);
            else setError(r.reason);
          }}
        />
      )}
      {editing?.custom && <EditCustomModal item={editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <Modal title="Delete this item?" onClose={() => setDeleting(null)}>
          <p className="text-sm">“{itemLabel(plan, deleting)}” is ticked. Deleting it removes the tick. Its attempt history stays.</p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="rounded-md px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => setDeleting(null)}>Cancel</button>
            <button type="button" className="rounded-md bg-rose-600 px-3 py-1.5 font-medium text-white" onClick={async () => { await deleteCustomItem(db, deleting.itemId); setDeleting(null); }}>Delete</button>
          </div>
        </Modal>
      )}
      {finding && <FoundProblemModal defaultPlanDayId={planDayId} onClose={() => setFinding(false)} />}
    </div>
  );
}

function MoveControl({ item, options, locked, onMove }: { item: DayItem; options: { planDayId: string; date: string }[]; locked: boolean; onMove: (to: string) => void }) {
  const [to, setTo] = useState("");
  if (locked) return <span className="text-xs text-slate-500">Untick to move</span>;
  if (options.length === 0) return null;
  return (
    <span className="flex items-center gap-1">
      <select aria-label={`Move ${item.custom?.title ?? item.problem?.title ?? "item"} to`} value={to} onChange={(e) => setTo(e.target.value)} className="rounded border border-slate-300 bg-white px-1 py-0.5 text-sm dark:border-slate-700 dark:bg-slate-950">
        <option value="">Move to…</option>
        {options.map((d) => <option key={d.planDayId} value={d.planDayId}>{formatShort(d.date)}</option>)}
      </select>
      <button type="button" disabled={!to} className={`${linkBtn} disabled:opacity-40 disabled:no-underline`} onClick={() => { onMove(to); setTo(""); }}>Move</button>
    </span>
  );
}

function TickDateModal({ label, min, max, onCancel, onSubmit }: { item: DayItem; label: string; min: string; max: string; onCancel: () => void; onSubmit: (date: string) => void | Promise<void> }) {
  const [date, setDate] = useState(min <= max ? min : max);
  const ok = !!date && date >= min && date <= max;
  return (
    <Modal title="Mark as done" onClose={onCancel}>
      <form className="space-y-4 text-sm" onSubmit={(e) => { e.preventDefault(); if (ok) void onSubmit(date); }}>
        <p className="font-medium">{label}</p>
        <label className="block">Date done<input type="date" value={date} min={min} max={max} onChange={(e) => setDate(e.target.value)} className={field} /></label>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-md px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
          <button type="submit" disabled={!ok} className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white disabled:opacity-40">Save</button>
        </div>
      </form>
    </Modal>
  );
}

function StudyLog({ day }: { day: EvaluatedDay }) {
  const { plan, db } = usePlanContext();
  const { planDayId, date } = day.day;
  const log = plan.dayLogs.get(planDayId);
  const [notes, setNotes] = useState(log?.notes ?? "");
  const [minutes, setMinutes] = useState(String(log?.minutes ?? 0));
  const [links, setLinks] = useState((log?.links ?? []).join("\n"));
  const [saved, setSaved] = useState(false);
  const mins = Number(minutes);
  const valid = Number.isInteger(mins) && mins >= 0 && mins <= 1440;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    await saveDayLog(db, { planDayId, notes, minutes: mins, links: links.split("\n") }, plan.today);
    setSaved(true);
  }
  return (
    <section className="mt-8" aria-label="Study log">
      <h2 className="text-lg font-semibold">What I studied</h2>
      {log && log.updatedOn > date && <p className="text-xs text-slate-500">edited on {formatShort(log.updatedOn)}</p>}
      <form className="mt-3 space-y-3 text-sm" onSubmit={submit}>
        <label className="block">Notes (markdown)<textarea value={notes} onChange={(e) => { setNotes(e.target.value); setSaved(false); }} rows={4} className={field} /></label>
        <label className="block">Minutes studied<input type="number" min={0} max={1440} value={minutes} onChange={(e) => { setMinutes(e.target.value); setSaved(false); }} className={field} /></label>
        <label className="block">Links (one per line)<textarea value={links} onChange={(e) => { setLinks(e.target.value); setSaved(false); }} rows={2} className={field} /></label>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={!valid} className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white disabled:opacity-40">Save log</button>
          {saved && <span role="status" className="text-slate-500">Saved</span>}
        </div>
      </form>
    </section>
  );
}

function AddItemForm({ day }: { day: EvaluatedDay }) {
  const { plan, db } = usePlanContext();
  const [kind, setKind] = useState<"task" | "problem">("task");
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("Medium");
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState("LeetCode");

  return (
    <section className="mt-8" aria-label="Add an item">
      <h2 className="text-lg font-semibold">Add an item to this day</h2>
      <form
        className="mt-3 space-y-3 text-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!title.trim()) return;
          await addCustomItem(
            db,
            {
              planDayId: day.day.planDayId,
              week: day.day.week,
              kind,
              title: title.trim(),
              ...(kind === "problem" ? { difficulty, platform: platform.trim() || undefined, url: url.trim() || undefined } : {}),
            },
            plan.today,
          );
          setTitle("");
          setUrl("");
        }}
      >
        <fieldset className="flex gap-4">
          <legend className="sr-only">Item type</legend>
          <label className="flex items-center gap-2"><input type="radio" name="item-kind" checked={kind === "task"} onChange={() => setKind("task")} /> Task</label>
          <label className="flex items-center gap-2"><input type="radio" name="item-kind" checked={kind === "problem"} onChange={() => setKind("problem")} /> LeetCode problem</label>
        </fieldset>
        <label className="block">Title<input value={title} onChange={(e) => setTitle(e.target.value)} className={field} placeholder={kind === "task" ? "Watch heap video" : "Problem title"} /></label>
        {kind === "problem" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">Difficulty
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} className={field}>
                  {(["Easy", "Medium", "Hard"] as const).map((d) => <option key={d}>{d}</option>)}
                </select>
              </label>
              <label className="block">Platform<input value={platform} onChange={(e) => setPlatform(e.target.value)} className={field} /></label>
            </div>
            <label className="block">URL<input type="url" value={url} onChange={(e) => setUrl(e.target.value)} className={field} /></label>
          </>
        )}
        <button type="submit" disabled={!title.trim()} className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white disabled:opacity-40">Add item</button>
      </form>
    </section>
  );
}

function EditCustomModal({ item, onClose }: { item: DayItem; onClose: () => void }) {
  const { db } = usePlanContext();
  const c = item.custom!;
  const [title, setTitle] = useState(c.title);
  const [difficulty, setDifficulty] = useState<Difficulty>(c.difficulty ?? "Medium");
  const [url, setUrl] = useState(c.url ?? "");
  return (
    <Modal title="Edit item" onClose={onClose}>
      <form
        className="space-y-3 text-sm"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!title.trim()) return;
          await editCustomItem(db, c.id, { title: title.trim(), ...(c.kind === "problem" ? { difficulty, url: url.trim() || undefined } : {}) });
          onClose();
        }}
      >
        <label className="block">Title<input value={title} onChange={(e) => setTitle(e.target.value)} className={field} /></label>
        {c.kind === "problem" && (
          <>
            <label className="block">Difficulty
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} className={field}>
                {(["Easy", "Medium", "Hard"] as const).map((d) => <option key={d}>{d}</option>)}
              </select>
            </label>
            <label className="block">URL<input type="url" value={url} onChange={(e) => setUrl(e.target.value)} className={field} /></label>
          </>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800">Cancel</button>
          <button type="submit" disabled={!title.trim()} className="rounded-md bg-indigo-600 px-3 py-1.5 font-medium text-white disabled:opacity-40">Save</button>
        </div>
      </form>
    </Modal>
  );
}
