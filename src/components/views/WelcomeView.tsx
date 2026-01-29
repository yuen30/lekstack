import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppContext } from '../../context/AppContext';
import { toast } from 'sonner';

export default function WelcomeView() {
  const { checkInit } = useAppContext();
  const [initializing, setInitializing] = useState(false);

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      await invoke('init_environment');
      toast.success('Environment initialized successfully!');
      await checkInit(); // Re-check to update state
    } catch (error) {
      console.error(error);
      toast.error(`Initialization failed: ${error}`);
    } finally {
      setInitializing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center border border-gray-100 dark:border-gray-700">
        <div className="mb-6 flex justify-center">
          <div className="h-20 w-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600 dark:text-blue-400"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-3 tracking-tight">Welcome to LekStack</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
          Your local PHP development environment stack. We need to set up some configuration folders to get started.
        </p>

        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-8 text-left text-sm border border-gray-200 dark:border-gray-700">
          <p className="font-medium mb-2 text-gray-700 dark:text-gray-300">This will create:</p>
          <ul className="list-disc pl-5 space-y-1 text-gray-500 dark:text-gray-400">
            <li>~/.lekstack/config</li>
            <li>~/.lekstack/versions</li>
            <li>~/.lekstack/logs</li>
            <li>~/.lekstack/data</li>
          </ul>
        </div>

        <button
          onClick={handleInitialize}
          disabled={initializing}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {initializing ? (
            <>
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
              Setting up...
            </>
          ) : (
            'Initialize Environment'
          )}
        </button>
      </div>
    </div>
  );
}
