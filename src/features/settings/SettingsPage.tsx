import { useRef, useState, type ReactNode } from "react";
import { Modal } from "../../app/Modal";
import { usePlanContext } from "../../app/PlanContext";
import { saveExtensions, setStartDate } from "../../lib/actions";
import { curriculum } from "../../lib/curriculum";
import { formatDayMonth } from "../../lib/dates";
import { exportAll, importAll, resetAll, saveSettings, TABLE_NAMES } from "../../lib/db";
import { removeExtension, shortenExtension, type ScheduleContext } from "../../lib/schedule";
import type { Settings } from "../../types/content";

const input = "rounded-md border border-slate-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-950";
const button = "rounded-md border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700";

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function SettingsPage() {
  const { plan, db } = usePlanContext();
  const def = curriculum.defaultStartDate;
  const [start, setStart] = useState(plan.startDate);
  const [startMsg, setStartMsg] = useState<string | null>(null);
  const [extError, setExtError] = useState<string | null>(null);
  const [importState, setImportState] = useState<{ data: unknown; counts: [string, number][] } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [typed, setTyped] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const ctx: ScheduleContext = {
    curriculum,
    startDate: plan.startDate,
    extensions: plan.snapshot.extensions,
    completions: plan.completions,
    today: plan.today,
  };

  async function applyExtensionChange(r: ReturnType<typeof removeExtension>) {
    if (!r.ok) return setExtError(r.reason);
    setExtError(null);
    await saveExtensions(db, r.extensions);
  }

  async function download() {
    const data = await exportAll(db);
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `interactive-dsa-progress-${plan.today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function chooseFile(file: File | undefined) {
    setImportError(null);
    if (!file) return;
    try {
      const data = JSON.parse(await file.text()) as Record<string, unknown>;
      if (typeof data !== "object" || data === null || !Array.isArray(data.completions)) throw new Error("This doesn't look like an InteractiveDSA export.");
      setImportState({ data, counts: TABLE_NAMES.map((t) => [t, Array.isArray(data[t]) ? (data[t] as unknown[]).length : 0]) });
    } catch (e) {
      setImportError((e as Error).message);
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card title="Start date">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await setStartDate(db, start, def);
            setStartMsg(r.ok ? "Saved. All plan dates were recalculated; your ticks are untouched." : r.reason);
          }}
        >
          <label className="text-sm">
            Plan starts on
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={`${input} mt-1 block`} />
          </label>
          <button type="submit" className={button}>Save</button>
          <button type="button" className={button} onClick={() => setStart(def)}>Use default ({formatDayMonth(def)})</button>
        </form>
        {startMsg && <p role="status" className="mt-2 text-sm text-slate-600 dark:text-slate-400">{startMsg}</p>}
      </Card>

      <Card title="Theme">
        <div className="flex gap-4 text-sm" role="radiogroup" aria-label="Theme">
          {(["system", "light", "dark"] as Settings["theme"][]).map((t) => (
            <label key={t} className="flex items-center gap-1.5 capitalize">
              <input type="radio" name="theme" checked={plan.settings.theme === t} onChange={() => saveSettings(db, { theme: t }, def)} />
              {t}
            </label>
          ))}
        </div>
      </Card>

      <Card title="Extensions">
        {plan.snapshot.extensions.length === 0 ? (
          <p className="text-sm text-slate-500">No week extensions.</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {plan.snapshot.extensions.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2">
                <span className="flex-1">
                  <strong>Week {e.week}</strong> +{e.extraDays} day{e.extraDays > 1 ? "s" : ""}
                  {e.reason ? ` — ${e.reason}` : ""} <span className="text-xs text-slate-500">added {formatDayMonth(e.createdOn)}</span>
                </span>
                {e.extraDays > 1 && (
                  <label className="flex items-center gap-1 text-xs">
                    Shorten to
                    <select
                      aria-label={`Shorten week ${e.week} extension`}
                      className={input}
                      value=""
                      onChange={(ev) => ev.target.value && applyExtensionChange(shortenExtension(ctx, e.id!, Number(ev.target.value)))}
                    >
                      <option value="">…</option>
                      {Array.from({ length: e.extraDays - 1 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n} day{n > 1 ? "s" : ""}</option>
                      ))}
                    </select>
                  </label>
                )}
                <button type="button" className={button} onClick={() => applyExtensionChange(removeExtension(ctx, e.id!))}>Remove</button>
              </li>
            ))}
          </ul>
        )}
        {extError && <p role="alert" className="mt-2 text-sm text-rose-700 dark:text-rose-300">{extError}</p>}
        <p className="mt-3 text-xs text-slate-500">Only extension days that haven't arrived yet can be shortened or removed.</p>
      </Card>

      <Card title="Backup">
        <div className="flex flex-wrap gap-3">
          <button type="button" className={button} onClick={download}>Export progress (JSON)</button>
          <label className={`${button} cursor-pointer`}>
            Import progress…
            <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => chooseFile(e.target.files?.[0])} />
          </label>
        </div>
        {importError && <p role="alert" className="mt-2 text-sm text-rose-700 dark:text-rose-300">{importError}</p>}
      </Card>

      <Card title="Reset">
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">Deletes all progress, attempts, extensions and settings on this device. Export first if unsure.</p>
        <button type="button" className={`${button} border-rose-400 text-rose-700 dark:text-rose-300`} onClick={() => { setTyped(""); setResetting(true); }}>Reset progress…</button>
      </Card>

      {importState && (
        <Modal title="Replace all progress?" onClose={() => setImportState(null)}>
          <p className="text-sm">Importing replaces everything on this device with the file's contents:</p>
          <ul className="my-3 grid grid-cols-2 gap-x-4 text-sm text-slate-600 dark:text-slate-400">
            {importState.counts.map(([t, n]) => <li key={t}>{t}: {n}</li>)}
          </ul>
          <div className="flex justify-end gap-2">
            <button type="button" className={button} onClick={() => setImportState(null)}>Cancel</button>
            <button
              type="button"
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white"
              onClick={async () => {
                try {
                  await importAll(db, importState.data);
                  setImportState(null);
                } catch (e) {
                  setImportState(null);
                  setImportError((e as Error).message);
                }
              }}
            >
              Replace my progress
            </button>
          </div>
        </Modal>
      )}

      {resetting && (
        <Modal title="Reset all progress?" onClose={() => setResetting(false)}>
          <p className="text-sm">This cannot be undone. Type <strong>RESET</strong> to confirm.</p>
          <input aria-label="Type RESET to confirm" value={typed} onChange={(e) => setTyped(e.target.value)} className={`${input} mt-3 w-full`} />
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className={button} onClick={() => setResetting(false)}>Cancel</button>
            <button
              type="button"
              disabled={typed !== "RESET"}
              className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
              onClick={async () => {
                await resetAll(db);
                setResetting(false);
              }}
            >
              Delete everything
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
