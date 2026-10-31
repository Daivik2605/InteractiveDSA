import { useEffect, useState } from "react";
import { NavLink, Outlet, useMatch, useOutletContext } from "react-router-dom";
import { ExtensionDialog } from "../features/calendar/ExtensionDialog";
import { Sidebar, sidebarSummary } from "../features/calendar/Sidebar";
import { NotesProvider } from "../features/notes/Notes";
import { Modal } from "./Modal";
import { usePlanContext } from "./PlanContext";

export const NAV_ITEMS = [
  { to: "/", label: "Today", end: true },
  { to: "/calendar", label: "Calendar" },
  { to: "/weeks", label: "Weeks" },
  { to: "/problems", label: "Problems" },
  { to: "/mocks", label: "Mocks" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/settings", label: "Settings" },
] as const;

const linkClass = ({ isActive }: { isActive: boolean }) =>
  [
    "flex flex-1 items-center justify-center rounded-md px-1 py-3 text-xs font-medium md:flex-none md:justify-start md:px-3 md:py-2 md:text-sm",
    isActive
      ? "bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200"
      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900",
  ].join(" ");

/** What a page can ask of the layout. */
export interface LayoutContext {
  /** true while a page needs the whole width (a live mock or retake): the calendar sidebar and its summary bar go away. */
  setFocus: (on: boolean) => void;
  focus: boolean;
}

/** Whether the layout is in focus mode (no calendar sidebar), so a page can use the width it gets. */
export function useIsFocus(): boolean {
  return useOutletContext<LayoutContext | null>()?.focus ?? false;
}

/** A page calls this with true while it is in focus mode; it is switched off again when the page changes or unmounts. */
export function useFocusMode(on: boolean) {
  const ctx = useOutletContext<LayoutContext | null>();
  const setFocus = ctx?.setFocus;
  useEffect(() => {
    setFocus?.(on);
    return () => setFocus?.(false);
  }, [on, setFocus]);
}

export function Layout() {
  const { plan, extensionPrefill } = usePlanContext();
  const [drawer, setDrawer] = useState(false);
  const [focus, setFocus] = useState(false);
  const mockRoute = useMatch("/mock/:number");
  const mockNumber = focus && mockRoute ? Number(mockRoute.params.number) : undefined; // notes written during a mock get its tag
  return (
    <NotesProvider mockNumber={mockNumber}>
    <div className={`min-h-screen bg-white text-slate-900 md:grid md:grid-cols-[13rem_minmax(0,1fr)] ${focus ? "" : "lg:grid-cols-[13rem_minmax(0,1fr)_20rem]"} dark:bg-slate-950 dark:text-slate-100`}>
      {/* Bottom tab bar below md, left rail from md up. */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-10 flex border-t border-slate-200 bg-white px-1 dark:border-slate-800 dark:bg-slate-950 md:sticky md:top-0 md:h-screen md:flex-col md:gap-1 md:self-start md:border-t-0 md:border-r md:p-4"
      >
        <span className="hidden px-3 pb-3 text-base font-semibold md:block">InteractiveDSA</span>
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={"end" in item ? item.end : false} className={linkClass}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <main className="min-w-0 p-4 pb-20 md:p-8">
        {/* Below lg the sidebar collapses into this bar and opens as a drawer. */}
        {!focus && <button
          type="button"
          onClick={() => setDrawer(true)}
          aria-label="Open calendar sidebar"
          className="-mt-1 mb-4 flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm dark:border-slate-800 lg:hidden"
        >
          <span className="font-medium">{sidebarSummary(plan)}</span>
          <span aria-hidden>▾</span>
        </button>}
        <Outlet context={{ setFocus, focus } satisfies LayoutContext} />
      </main>

      {/* Calendar sidebar (SPEC 3.12) on every page from lg up. */}
      {!focus && <aside
        id="calendar-sidebar-slot"
        data-testid="calendar-sidebar-slot"
        aria-label="Calendar sidebar"
        className="hidden border-l border-slate-200 p-4 dark:border-slate-800 lg:sticky lg:top-0 lg:block lg:h-screen lg:self-start lg:overflow-y-auto"
      >
        <Sidebar />
      </aside>}

      {drawer && !focus && (
        <Modal title="Calendar" side onClose={() => setDrawer(false)}>
          <Sidebar />
        </Modal>
      )}
      {extensionPrefill && <ExtensionDialog />}
    </div>
    </NotesProvider>
  );
}
