import React from 'react';
import { motion } from 'motion/react';
import { LayoutDashboard, Download, Settings, Globe, FileText, Database, Moon, Sun } from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate, isDark, onToggleTheme }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Control Center' },
    { id: 'sites', icon: Globe, label: 'Site Manager' },
    { id: 'versions', icon: Download, label: 'Runtimes' },
    { id: 'database', icon: Database, label: 'Databases' },
    { id: 'php-settings', icon: FileText, label: 'PHP Settings' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="w-16 bg-white dark:bg-[#151515] border-r border-gray-100 dark:border-gray-800 flex flex-col items-center h-screen transition-all select-none py-4">
      {/* Logo */}
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xl mb-6 shadow-lg shadow-indigo-500/20">
        L
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center w-full gap-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex justify-center py-3 relative group transition-colors ${
              activeView === item.id
                ? 'text-indigo-600 dark:text-indigo-400'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
            title={item.label}
          >
            {/* Active Indicator Line */}
            {activeView === item.id && (
              <motion.div 
                layoutId="active-nav"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-600 dark:bg-indigo-400 rounded-r-full" 
              />
            )}

            <item.icon size={22} strokeWidth={activeView === item.id ? 2.5 : 2} />

            {/* Tooltip */}
            <span className="absolute left-[80%] ml-4 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-xl whitespace-nowrap z-50">
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      {/* Footer Actions */}
      <div className="flex flex-col items-center gap-4 pb-2">
        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-95"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Status */}
        <div className="relative group">
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse cursor-pointer"></div>
          <span className="absolute left-full ml-4 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-xl whitespace-nowrap z-50">
            All systems normal
          </span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
