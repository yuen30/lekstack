import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Save, RefreshCw, FileText } from 'lucide-react';
import { toast } from 'sonner';

export default function PhpSettingsView() {
  const [installedVersions, setInstalledVersions] = useState<string[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [iniContent, setIniContent] = useState('');
  const [loading, setLoading] = useState(false);

  const loadVersions = useCallback(async () => {
    try {
      const versions = await invoke<string[]>('list_installed_versions', { runtime: 'php' });
      setInstalledVersions(versions);
      if (versions.length > 0) {
        setSelectedVersion(versions[0]);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  const loadIni = useCallback(async () => {
    setLoading(true);
    try {
      const content = await invoke<string>('get_php_ini', { version: selectedVersion });
      setIniContent(content);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load php.ini');
    } finally {
      setLoading(false);
    }
  }, [selectedVersion]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  useEffect(() => {
    if (selectedVersion) {
      loadIni();
    }
  }, [selectedVersion, loadIni]);

  const handleSave = async () => {
    try {
      await invoke('update_php_ini', { version: selectedVersion, content: iniContent });
      toast.success('php.ini saved successfully');
    } catch (error) {
      toast.error(`Failed to save: ${error}`);
    }
  };

  const handleRestart = async () => {
    const toastId = toast.loading('Restarting services...');
    try {
      await invoke('restart_all_services');
      toast.success('Services restarted', { id: toastId });
    } catch (error) {
      toast.error(`Failed to restart: ${error}`, { id: toastId });
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-500 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="text-blue-500" size={24} />
            PHP Settings
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Configure php.ini and manage services
          </p>
        </div>
        <button
          onClick={handleRestart}
          className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg transition-colors"
        >
          <RefreshCw size={18} />
          Restart All Services
        </button>
      </div>

      <div className="flex gap-4 items-center bg-white dark:bg-[#1a1a1a] p-4 rounded-xl border border-gray-100 dark:border-gray-800">
        <span className="font-medium text-gray-700 dark:text-gray-300">PHP Version:</span>
        <select
          value={selectedVersion}
          onChange={(e) => setSelectedVersion(e.target.value)}
          className="bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
        >
          {installedVersions.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1 min-h-0 bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-[#222]">
          <span className="text-sm font-mono text-gray-500">php.ini</span>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
          >
            <Save size={16} /> Save Changes
          </button>
        </div>
        <textarea
          value={iniContent}
          onChange={(e) => setIniContent(e.target.value)}
          disabled={loading}
          className="flex-1 p-4 font-mono text-sm resize-none focus:outline-none dark:bg-[#1a1a1a] dark:text-gray-300"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
