import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AppShell } from '@/components/layout/AppShell';

import { LandingPage } from '@/pages/LandingPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { PredictPage } from '@/pages/PredictPage';
import { ModelsPage } from '@/pages/ModelsPage';
import { SegmentsPage } from '@/pages/SegmentsPage';
import { ExplainPage } from '@/pages/ExplainPage';
import { ExplorePage } from '@/pages/ExplorePage';
import { InsightsPage } from '@/pages/InsightsPage';
import { PipelinePage } from '@/pages/PipelinePage';
import { AboutPage } from '@/pages/AboutPage';

// Configure TanStack Query Client with caching & sane retry defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes cache
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <AppShell>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/predict" element={<PredictPage />} />
              <Route path="/models" element={<ModelsPage />} />
              <Route path="/segments" element={<SegmentsPage />} />
              <Route path="/explain" element={<ExplainPage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/insights" element={<InsightsPage />} />
              <Route path="/pipeline" element={<PipelinePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
