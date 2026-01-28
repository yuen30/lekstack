import { useState } from 'react';
import { Toaster } from 'sonner';
import Sidebar from './components/Sidebar';
import DashboardView from './components/views/DashboardView';
import VersionManagerView from './components/views/VersionManagerView';
import SiteManagerView from './components/views/SiteManagerView';
import SettingsView from './components/views/SettingsView';
import PhpSettingsView from './components/views/PhpSettingsView';
import DatabaseManagerView from './components/views/DatabaseManagerView';

function App() {
  const [activeView, setActiveView] = useState('dashboard');

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#111] font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />

      <main className="flex-1 overflow-auto">
        <Toaster position="bottom-right" theme="system" />
        {activeView === 'dashboard' && <DashboardView />}
        {activeView === 'versions' && <VersionManagerView />}
        {activeView === 'sites' && <SiteManagerView />}
        {activeView === 'database' && <DatabaseManagerView />}
        {activeView === 'php-settings' && <PhpSettingsView />}
        {activeView === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}

export default App;
