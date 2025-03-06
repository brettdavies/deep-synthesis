import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import HomePage from "./pages/HomePage";
import PapersPage from "./pages/PapersPage";
import ReportsPage from "./pages/ReportsPage";
import SettingsPage from "./pages/SettingsPage";
import ReportPage from "./pages/ReportPage";
import NewReportPage from "./pages/NewReportPage";
import NotFoundPage from "./pages/NotFoundPage";
import ErrorBoundary from "./components/ErrorBoundary";
import { Toaster } from "./components/ui/toaster";
import "../styles/globals.css";

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="new-report" element={<NewReportPage />} />
            <Route path="papers" element={<PapersPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="report/:id" element={<ReportPage />} />
            <Route path="404" element={<NotFoundPage />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Route>
        </Routes>
        <Toaster />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
