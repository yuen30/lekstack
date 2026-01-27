import { useState } from "react";
import Sidebar from "./components/Sidebar";
import DashboardView from "./components/views/DashboardView";
import VersionManagerView from "./components/views/VersionManagerView";
import "./App.css";

function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'versions' | 'logs' | 'settings'>('dashboard');

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'versions':
        return <VersionManagerView />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
            <p>Module {currentView} is under construction 🚧</p>
          </div>
        );
    }
  };

  return (
    <div className="flex bg-white dark:bg-[#0f0f0f] text-gray-900 dark:text-gray-100 font-sans selection:bg-indigo-500/20">
      <Sidebar activeView={currentView} onNavigate={setCurrentView} />
      <main className="flex-1 h-screen overflow-y-auto bg-gray-50/50 dark:bg-[#121212]">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
