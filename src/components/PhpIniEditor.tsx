import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { X, Save, RotateCcw, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface PhpIniEditorProps {
  version: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function PhpIniEditor({ version, isOpen, onClose }: PhpIniEditorProps) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen, version]);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const config = await invoke<string>('get_php_ini', { version });
      setContent(config);
    } catch (error) {
      console.error('Failed to load php.ini:', error);
      toast.error(`Failed to load php.ini for PHP ${version}: ${error}`);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await invoke('update_php_ini', { version, content });
      toast.success(`php.ini updated for PHP ${version}`);
      onClose();
    } catch (error) {
      console.error('Failed to save php.ini:', error);
      toast.error(`Failed to save php.ini: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-12 lg:p-24 bg-black/60 backdrop-blur-sm overflow-hidden">
      <div className="bg-white dark:bg-[#1a1a1a] w-full max-w-4xl max-h-full rounded-3xl border border-gray-100 dark:border-gray-800 shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-xl">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                PHP Configuration (php.ini)
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Editing configuration for PHP {version}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Editor Content */}
        <div className="flex-1 p-4 bg-gray-50 dark:bg-[#1a1a1a]/50">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
                <div className="w-5 h-5 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin"></div>
                Loading php.ini...
              </div>
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-96 font-mono text-sm bg-white dark:bg-[#202020] border border-gray-200 dark:border-gray-700 rounded-xl p-4 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              spellCheck="false"
            />
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a1a1a]/50 flex justify-between items-center">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Changes require service restart to take effect
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadConfig}
              disabled={isLoading || isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <RotateCcw size={16} />
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              {isSaving ? <RotateCcw size={16} className="animate-spin" /> : <Save size={16} />}
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}