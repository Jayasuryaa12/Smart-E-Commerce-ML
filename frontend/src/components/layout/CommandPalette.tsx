import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Search,
  LayoutDashboard,
  Target,
  BarChart2,
  Users,
  Brain,
  FileText,
  Lightbulb,
  GitBranch,
  Info,
  Sun,
  Moon,
  Laptop,
  ArrowRight,
} from 'lucide-react';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { setTheme } = useTheme();

  const items = [
    { label: 'Executive Dashboard', path: '/dashboard', icon: LayoutDashboard, category: 'Pages' },
    { label: 'Live Intent Prediction', path: '/predict', icon: Target, category: 'Pages' },
    { label: 'Model Comparison & Leaderboard', path: '/models', icon: BarChart2, category: 'Pages' },
    { label: 'Customer Segmentation & PCA', path: '/segments', icon: Users, category: 'Pages' },
    { label: 'Explainability & SHAP', path: '/explain', icon: Brain, category: 'Pages' },
    { label: 'Data Explorer & EDA', path: '/explore', icon: FileText, category: 'Pages' },
    { label: 'Business Insights & Strategy', path: '/insights', icon: Lightbulb, category: 'Pages' },
    { label: 'Preprocessing Pipeline', path: '/pipeline', icon: GitBranch, category: 'Pages' },
    { label: 'Methodology & Tech Stack', path: '/about', icon: Info, category: 'Pages' },
    { label: 'Landing Page', path: '/', icon: ArrowRight, category: 'Pages' },
    { label: 'Switch to Light Theme', action: () => setTheme('light'), icon: Sun, category: 'Appearance' },
    { label: 'Switch to Dark Theme', action: () => setTheme('dark'), icon: Moon, category: 'Appearance' },
    { label: 'Use System Theme', action: () => setTheme('system'), icon: Laptop, category: 'Appearance' },
  ];

  const filteredItems = items.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === 0 ? (filteredItems.length || 1) - 1 : prev - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredItems[selectedIndex];
        if (selected) {
          if (selected.path) {
            navigate(selected.path);
          } else if (selected.action) {
            selected.action();
          }
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, selectedIndex, filteredItems, navigate, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0">
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center px-4 border-b border-slate-200 dark:border-slate-800">
          <Search className="w-4 h-4 text-slate-400 mr-2" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search pages... (ESC to exit)"
            className="w-full h-12 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
            ESC
          </kbd>
        </div>

        <div className="max-h-72 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/40">
          {filteredItems.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No matching commands or pages found.
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.label}
                  onClick={() => {
                    if (item.path) navigate(item.path);
                    else if (item.action) item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {item.category}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
