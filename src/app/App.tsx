import { Route, Routes } from "react-router-dom";
import { CalendarPage } from "../features/calendar/CalendarPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { ProblemsPage } from "../features/problems/ProblemsPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { TodayPage } from "../features/today/TodayPage";
import { WeeksPage } from "../features/weeks/WeeksPage";
import { Layout } from "./Layout";
import { Page } from "./Page";

/** Router-agnostic: main.tsx wraps this in a HashRouter, tests in a MemoryRouter. */
export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<TodayPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="weeks" element={<WeeksPage />} />
        <Route path="problems" element={<ProblemsPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Page title="Not found" />} />
      </Route>
    </Routes>
  );
}
