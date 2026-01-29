import { useState, useEffect, lazy, Suspense } from 'react';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Sidebar from './components/Sidebar';

// Lazy load views
const DashboardView = lazy(() => import('./components/views/DashboardView'));
const VersionManagerView = lazy(() => import('./components/views/VersionManagerView'));
const SiteManagerView = lazy(() => import('./components/views/SiteManagerView'));
const SettingsView = lazy(() => import('./components/views/SettingsView'));
const PhpSettingsView = lazy(() => import('./components/views/PhpSettingsView'));
const DatabaseManagerView = lazy(() => import('./components/views/DatabaseManagerView'));

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#111] font-sans selection:bg-indigo-100 selection:text-indigo-900 transition-colors duration-300">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
      />

      <main className="flex-1 overflow-auto relative">
        <Toaster position="bottom-right" theme={isDark ? 'dark' : 'light'} />
        <Suspense
          fallback={
            <div className="h-full w-full flex items-center justify-center">
              <Loader2 className="animate-spin text-indigo-500" size={40} />
            </div>
          }
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.02, filter: 'blur(4px)' }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="h-full"
            >
              {activeView === 'dashboard' && <DashboardView />}
              {activeView === 'versions' && <VersionManagerView />}
              {activeView === 'sites' && <SiteManagerView />}
              {activeView === 'database' && <DatabaseManagerView />}
              {activeView === 'php-settings' && <PhpSettingsView />}
              {activeView === 'settings' && <SettingsView />}
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>
    </div>
  );
}

export default App;
