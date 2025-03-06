import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import HomePage from "./pages/HomePage";
import PapersPage from "./pages/PapersPage";
import BriefsPage from "./pages/BriefsPage";
import SettingsPage from "./pages/SettingsPage";
import BriefPage from "./pages/BriefPage";
import NewBriefPage from "./pages/NewBriefPage";
import NotFoundPage from "./pages/NotFoundPage";
import ErrorBoundary from "./components/ErrorBoundary";
import { Toaster } from "./components/ui/toaster";
import "./styles/globals.css";

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="new-brief" element={<NewBriefPage />} />
            <Route path="papers" element={<PapersPage />} />
            <Route path="briefs" element={<BriefsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="brief/:id" element={<BriefPage />} />
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
