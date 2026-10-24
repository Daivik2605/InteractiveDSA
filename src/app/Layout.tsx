import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { ExtensionDialog } from "../features/calendar/ExtensionDialog";
import { Sidebar, sidebarSummary } from "../features/calendar/Sidebar";
import { Modal } from "./Modal";
import { usePlanContext } from "./PlanContext";

export const NAV_ITEMS = [
  { to: "/", label: "Today", end: true },
  { to: "/calendar", label: "Calendar" },
  { to: "/weeks", label: "Weeks" },
  { to: "/quiz", label: "Quizzes" },
  { to: "/problems", label: "Problems" },
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

export function Layout() {
  const { plan, extensionPrefill } = usePlanContext();
  const [drawer, setDrawer] = useState(false);
  return (
    <div className="min-h-screen bg-white text-slate-900 md:grid md:grid-cols-[13rem_minmax(0,1fr)] lg:grid-cols-[13rem_minmax(0,1fr)_20rem] dark:bg-slate-950 dark:text-slate-100">
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
        <button
          type="button"
          onClick={() => setDrawer(true)}
          aria-label="Open calendar sidebar"
          className="-mt-1 mb-4 flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm dark:border-slate-800 lg:hidden"
        >
          <span className="font-medium">{sidebarSummary(plan)}</span>
          <span aria-hidden>▾</span>
        </button>
        <Outlet />
      </main>

      {/* Calendar sidebar (SPEC 3.12) on every page from lg up. */}
      <aside
        id="calendar-sidebar-slot"
        data-testid="calendar-sidebar-slot"
        aria-label="Calendar sidebar"
        className="hidden border-l border-slate-200 p-4 dark:border-slate-800 lg:sticky lg:top-0 lg:block lg:h-screen lg:self-start lg:overflow-y-auto"
      >
        <Sidebar />
      </aside>

      {drawer && (
        <Modal title="Calendar" side onClose={() => setDrawer(false)}>
          <Sidebar />
        </Modal>
      )}
      {extensionPrefill && <ExtensionDialog />}
    </div>
  );
}
