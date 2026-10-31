import { useLiveQuery } from "dexie-react-hooks";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Modal } from "../../app/Modal";
import { usePlanContext } from "../../app/PlanContext";
import { addDayNote, deleteBlankNotes, deleteDayNote, updateDayNote } from "../../lib/actions";
import { formatShort, isValidDate } from "../../lib/dates";
import type { DayNote } from "../../types/content";
import { isTyping } from "../quiz/QuizRunner";

interface NotesApi {
  /** Opens the drawer on `date` (default: today). */
  open: (date?: string) => void;
}
const Ctx = createContext<NotesApi>({ open: () => undefined });
export const useNotes = () => useContext(Ctx);

/**
 * The notes drawer, its floating button and the N shortcut, for every page. It lives above the page, so a mock keeps
 * its state while notes are open. `mockNumber` tags notes created while a mock is on screen.
 */
export function NotesProvider({ children, mockNumber }: { children: ReactNode; mockNumber?: number }) {
  const { plan } = usePlanContext();
  const [state, setState] = useState<{ date: string } | null>(null);
  const today = plan.today;
  const open = useCallback((date?: string) => setState({ date: date && isValidDate(date) ? date : today }), [today]);
  const isOpen = state !== null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "n" || e.ctrlKey || e.metaKey || e.altKey || isTyping(e)) return;
      if (document.querySelector('[role="dialog"]')) return;
      e.preventDefault();
      setState({ date: today });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [today]);

  const api = useMemo(() => ({ open }), [open]);
  return (
    <Ctx.Provider value={api}>
      {children}
      {!isOpen && (
        <button
          type="button"
          onClick={() => open()}
          aria-keyshortcuts="n"
          className="fixed bottom-20 right-4 z-30 flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-indigo-500 md:bottom-4"
        >
          Notes <kbd className="rounded bg-indigo-500 px-1.5 text-xs">N</kbd>
        </button>
      )}
      {state && <NotesDrawer date={state.date} onDate={(date) => setState({ date })} onClose={() => setState(null)} mockNumber={mockNumber} />}
    </Ctx.Provider>
  );
}

const nowIso = () => new Date().toISOString();

function NotesDrawer({ date, onDate, onClose, mockNumber }: { date: string; onDate: (d: string) => void; onClose: () => void; mockNumber?: number }) {
  const { db, plan } = usePlanContext();
  const notes = useLiveQuery(() => db.dayNotes.where("date").equals(date).sortBy("createdAt"), [db, date]);
  // Blank notes left from an earlier session (a tab closed right after "Add note") are cleared when a day is opened.
  // A blank note of this session removes itself when its editor goes away (see NoteEditor), after its last save.
  useEffect(() => void deleteBlankNotes(db, date).catch(() => undefined), [db, date]);

  return (
    <Modal title="Notes" side onClose={onClose}>
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="text-xs text-slate-500">Notes for</span>
            <input
              type="date"
              value={date}
              onChange={(e) => isValidDate(e.target.value) && onDate(e.target.value)}
              aria-label="Notes for date"
              className="mt-1 block rounded-md border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
            />
          </label>
          {date !== plan.today && (
            <button type="button" onClick={() => onDate(plan.today)} className="rounded-md border border-slate-300 px-2 py-1 dark:border-slate-700">Today</button>
          )}
        </div>
        <p className="text-xs text-slate-500">{formatShort(date)}{date === plan.today ? " (today)" : ""}. Notes save as you type.</p>

        {notes === undefined ? null : notes.length === 0 ? (
          <p className="text-slate-500">No notes for this day yet.</p>
        ) : (
          <ul className="space-y-3" aria-label="Notes list">
            {notes.map((n) => (
              <NoteEditor key={n.id} note={n} />
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => void addDayNote(db, date, "", nowIso(), mockNumber)}
          className="w-full rounded-md border border-indigo-300 px-3 py-1.5 text-indigo-800 hover:bg-indigo-50 dark:border-indigo-700 dark:text-indigo-200 dark:hover:bg-indigo-950"
        >
          Add note
        </button>
      </div>
    </Modal>
  );
}

function NoteEditor({ note }: { note: DayNote }) {
  const { db } = usePlanContext();
  const [text, setText] = useState(note.text);
  const [saved, setSaved] = useState(true);
  const [sure, setSure] = useState(false);
  const latest = useRef(note.text);
  const dirty = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const id = note.id!;

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    if (!dirty.current) return;
    dirty.current = false;
    void updateDayNote(db, id, latest.current, nowIso()).then(() => setSaved(true)).catch(() => undefined);
  }, [db, id]);
  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
      if (latest.current.trim() === "") void deleteDayNote(db, id).catch(() => undefined); // never typed into: not kept
    };
  }, [flush, db, id]);

  return (
    <li className="rounded-lg border border-slate-200 p-2 dark:border-slate-800" aria-label="Note">
      <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
        {note.mockNumber !== undefined && <span className="rounded bg-sky-100 px-1.5 py-0.5 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200">Mock {note.mockNumber}</span>}
        <span>{new Date(note.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
        <span role="status" className="ml-auto">{saved ? "Saved" : "Saving…"}</span>
      </div>
      <textarea
        aria-label="Note text"
        value={text}
        rows={4}
        onChange={(e) => {
          setText(e.target.value);
          latest.current = e.target.value;
          dirty.current = true;
          setSaved(false);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(flush, 400);
        }}
        onBlur={() => {
          flush();
          if (latest.current.trim() === "") void deleteDayNote(db, id); // a note left empty is not kept
        }}
        className="block w-full whitespace-pre-wrap rounded-md border border-slate-300 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-950"
      />
      <div className="mt-1 flex items-center gap-3 text-xs">
        {sure ? (
          <>
            <span>Delete this note?</span>
            <button type="button" className="text-rose-700 underline dark:text-rose-300" onClick={() => void deleteDayNote(db, id)}>Yes, delete</button>
            <button type="button" className="underline" onClick={() => setSure(false)}>Keep it</button>
          </>
        ) : (
          <button type="button" className="text-rose-700 underline dark:text-rose-300" onClick={() => setSure(true)}>Delete note</button>
        )}
      </div>
    </li>
  );
}
