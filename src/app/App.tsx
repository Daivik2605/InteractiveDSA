import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { JournalCalendarPage } from "../features/journal/JournalCalendarPage";
import { JournalHome } from "../features/journal/JournalHome";
import { modeOf } from "../lib/mode";
import { usePlan } from "./PlanContext";
import { CalendarPage } from "../features/calendar/CalendarPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { EditDayPage } from "../features/day/EditDayPage";
import { IncompletePage } from "../features/incomplete/IncompletePage";
import { LogsPage } from "../features/logs/LogsPage";
import { MockPage } from "../features/mock/MockPage";
import { MocksPage } from "../features/mock/MocksPage";
import { ProblemDetailPage } from "../features/problems/ProblemDetailPage";
import { ProblemsPage } from "../features/problems/ProblemsPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { TodayPage } from "../features/today/TodayPage";
import { ContentPage } from "../features/content/ContentPage";
import { Layout } from "./Layout";
import { Page } from "./Page";

/** Picks the page by mode. */
function ByMode({ guided, journal }: { guided: ReactNode; journal: ReactNode }) {
  return modeOf(usePlan().settings) === "journal" ? <>{journal}</> : <>{guided}</>;
}

/** Plan-only pages: in Journal mode they send you to the Journal home. */
function GuidedOnly({ children }: { children: ReactNode }) {
  return modeOf(usePlan().settings) === "journal" ? <Navigate to="/" replace /> : <>{children}</>;
}

/** Router-agnostic: main.tsx wraps this in a HashRouter, tests in a MemoryRouter. */
export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<ByMode guided={<TodayPage />} journal={<JournalHome />} />} />
        <Route path="calendar" element={<ByMode guided={<CalendarPage />} journal={<JournalCalendarPage />} />} />
        <Route path="content" element={<ContentPage />} />
        <Route path="weeks" element={<Navigate to="/content" replace />} />



        <Route path="incomplete" element={<GuidedOnly><IncompletePage /></GuidedOnly>} />
        <Route path="mocks" element={<MocksPage />} />
        <Route path="mock/:number" element={<MockPage />} />
        <Route path="logs" element={<LogsPage />} />
        <Route path="problems" element={<ProblemsPage />} />
        <Route path="problems/:id" element={<ProblemDetailPage />} />
        <Route path="day/:planDayId" element={<GuidedOnly><EditDayPage /></GuidedOnly>} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Page title="Not found" />} />
      </Route>
    </Routes>
  );
}
