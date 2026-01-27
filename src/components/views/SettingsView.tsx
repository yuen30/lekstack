import { useState, useEffect } from 'react';
import { Folder, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

export default function SettingsView() {
    const [installPath, setInstallPath] = useState('~/.lekstack');
    const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        // Fetch current path from backend
        invoke<string>('get_install_path')
            .then(path => setInstallPath(path))
            .catch(err => console.error('Failed to get path:', err));
    }, []);

    const handleSave = async () => {
        setStatus('saving');
        setMessage('Initializing environment...');
        try {
            // Initialize environment (create directories)
            await invoke('init_environment');
            setStatus('success');
            setMessage('Environment initialized successfully!');

            setTimeout(() => setStatus('idle'), 3000);
        } catch (error) {
            console.error('Failed to save settings:', error);
            setStatus('error');
            setMessage(String(error));
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    Settings
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Configure LekStack environment and paths</p>
            </div>

            {/* General Settings Card */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Folder className="text-indigo-500" size={20} />
                        Installation Path
                    </h3>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        This is where LekStack stores binaries (PHP, Nginx, Node) and configuration files.
                        By default, this is set to <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-800 dark:text-gray-200">~/.lekstack</code>.
                    </p>

                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={installPath}
                            readOnly // Read-only for now until we fully support custom path changes
                            className="flex-1 px-4 py-2 rounded-xl bg-gray-50 dark:bg-[#202020] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-sm cursor-not-allowed opacity-75"
                        />
                        <button
                            onClick={handleSave}
                            disabled={status === 'saving'}
                            className={`px-6 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 ${status === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' :
                                    status === 'error' ? 'bg-red-600 hover:bg-red-700 text-white' :
                                        'bg-indigo-600 hover:bg-indigo-700 text-white'
                                }`}
                        >
                            {status === 'saving' ? <span className="animate-spin">⏳</span> :
                                status === 'success' ? <CheckCircle size={18} /> :
                                    status === 'error' ? <AlertCircle size={18} /> :
                                        <Save size={18} />}
                            {status === 'success' ? 'Saved' : 'Initialize & Save'}
                        </button>
                    </div>

                    {message && (
                        <div className={`text-sm flex items-center gap-2 px-3 py-2 rounded-lg ${status === 'success' ? 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20' :
                                status === 'error' ? 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20' : 'text-gray-500 bg-gray-50 dark:text-gray-400 dark:bg-gray-800'
                            }`}>
                            {message}
                        </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg border border-amber-100 dark:border-amber-900/30">
                        <span>⚠️ Changing this path will require re-installing runtimes.</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
