import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";
import HomePage from "./pages/HomePage";
import PapersPage from "./pages/PapersPage";
import BriefsPage from "./pages/BriefsPage";
import SettingsPage from "./pages/SettingsPage";
import BriefPage from "./pages/BriefPage";
import NewModularBriefPage from "./pages/NewModularBriefPage";
import NotFoundPage from "./pages/NotFoundPage";
import ErrorBoundary from "./components/ErrorBoundary";
import { Toaster } from "./components/ui/toaster";
import { useLLMInitializer } from "./hooks/useLLMInitializer";
import "./styles/globals.css";

export function App() {
  // Initialize LLM providers with settings from the database
  useLLMInitializer();
  
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            
            {/* Brief creation and editing (unified flow) */}
            <Route path="brief/new" element={<NewModularBriefPage isNew={true} />} />
            <Route path="brief/:briefId/edit" element={<NewModularBriefPage />} />
            
            {/* Other app routes */}
            <Route path="brief/:id" element={<BriefPage />} />
            <Route path="briefs" element={<BriefsPage />} />
            <Route path="papers" element={<PapersPage />} />
            <Route path="settings" element={<SettingsPage />} />
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
