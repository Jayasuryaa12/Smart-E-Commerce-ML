import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/formatters';
import { useTheme } from '@/contexts/ThemeContext';
import { CommandPalette } from './CommandPalette';
import {
  LayoutDashboard,
  Target,
  BarChart2,
  Users,
  Brain,
  FileText,
  Lightbulb,
  GitBranch,
  Info,
  Menu,
  X,
  Sun,
  Moon,
  Search,
  Sparkles,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
  { path: '/predict', label: 'Purchase Intent Prediction', icon: Target, badge: 'HERO' },
  { path: '/models', label: 'Model Leaderboard', icon: BarChart2 },
  { path: '/segments', label: 'Visitor Segmentation', icon: Users },
  { path: '/explain', label: 'SHAP Explainability', icon: Brain },
  { path: '/explore', label: 'Data Explorer & EDA', icon: FileText },
  { path: '/insights', label: 'Strategic Insights', icon: Lightbulb },
  { path: '/pipeline', label: 'ML Pipeline Architecture', icon: GitBranch },
  { path: '/about', label: 'Methodology & Stack', icon: Info },
];

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();
  const { theme, resolvedTheme, setTheme } = useTheme();

  // Health ping query with auto-poll during cold-start
  const { data: health, isLoading: isHealthLoading, isError: isHealthError, refetch: retryHealth } = useQuery({
    queryKey: ['backend-health'],
    queryFn: api.getHealth,
    refetchInterval: (query) => (query.state.status === 'error' ? 5000 : 30000),
    retry: 2,
  });

  const { data: summary } = useQuery({
    queryKey: ['dataset-summary'],
    queryFn: api.getDatasetSummary,
  });

  // Global keyboard shortcut for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const currentPage = navItems.find((item) => item.path === location.pathname);

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#090D16] text-slate-900 dark:text-slate-100 antialiased">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed md:sticky top-0 z-40 h-screen w-64 shrink-0 flex flex-col border-r border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-[#0C101C]/95 backdrop-blur-md transition-transform duration-200 ease-in-out md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200/80 dark:border-slate-800/80">
          <Link to="/" className="flex items-center gap-2.5 font-bold tracking-tight text-slate-900 dark:text-slate-50">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm font-extrabold tracking-tight">Smart E-Commerce</span>
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mt-0.5">
                Customer Intelligence
              </span>
            </div>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Platform Modules
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider uppercase rounded bg-blue-600 text-white shadow-xs">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer Metadata Card */}
        <div className="p-3 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Dataset</span>
              <span className="text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300">UCI Shoppers</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Records</span>
              <span className="text-[11px] font-mono font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                {summary?.data?.total_records ? formatNumber(summary.data.total_records) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Champion Model</span>
              <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400">
                {health?.active_model_name || 'CatBoost'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Cold Start Banner if backend waking up */}
        {isHealthError && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 animate-pulse" />
              <span>
                <b>Waking up analytics engine...</b> Free-tier server spin-up in progress.
              </span>
            </div>
            <button
              onClick={() => retryHealth()}
              className="flex items-center gap-1 font-semibold underline hover:opacity-80 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {/* Top Bar */}
        <header className="h-16 shrink-0 flex items-center justify-between px-4 sm:px-8 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-[#090D16]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Open navigation sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb Trail */}
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Link to="/dashboard" className="hover:text-slate-900 dark:hover:text-slate-200">
                Home
              </Link>
              {currentPage && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {currentPage.label}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Command Palette Trigger Button */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-xs text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-2xs"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Quick jump...</span>
              <kbd className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 ml-1">
                ⌘K
              </kbd>
            </button>

            {/* Backend Health Status Pill */}
            <div
              className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                health?.dataset_loaded && health?.model_loaded
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800'
                  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  health?.dataset_loaded && health?.model_loaded
                    ? 'bg-emerald-500 shadow-[0_0_8px_#10B981]'
                    : 'bg-amber-500 animate-ping'
                }`}
              />
              <span className="hidden sm:inline">
                {health?.active_model_name || 'CatBoost'} Active
              </span>
            </div>

            {/* Theme Switcher Toggle */}
            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors"
              title="Toggle theme appearance"
              aria-label="Toggle theme appearance"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
          </div>
        </header>

        {/* Page Content Container */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Command Palette Modal */}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
};
