import { useEffect, useRef, type ReactNode } from "react";

/** Minimal accessible modal: Escape and backdrop click close it; focus moves inside on open. */
export function Modal({ title, onClose, children, side = false }: { title: string; onClose: () => void; children: ReactNode; side?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose); // keep the effect from re-running (and stealing focus) on every render
  closeRef.current = onClose;
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex bg-black/40 ${side ? "justify-end" : "items-center justify-center p-4"}`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`overflow-y-auto bg-white p-5 shadow-xl outline-none dark:bg-slate-900 ${
          side ? "h-full w-80 max-w-full" : "max-h-full w-full max-w-md rounded-xl"
        }`}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded px-2 text-xl leading-none text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
