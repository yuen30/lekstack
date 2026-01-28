import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FolderPlus, Trash2, ExternalLink, Globe, Folder, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';

interface Site {
  name: string;
  path: string;
  url: string;
  secured: boolean;
  php_version: string;
}

export default function SiteManagerView() {
  const [parkedPaths, setParkedPaths] = useState<string[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [newPath, setNewPath] = useState('');

  const fetchData = useCallback(async () => {
    try {
      await invoke('refresh_routes');
      const paths = await invoke<string[]>('get_parked_paths');
      setParkedPaths(paths);

      const detectedSites = await invoke<Site[]>('scan_sites');
      setSites(detectedSites);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load sites');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line
    fetchData();
  }, [fetchData]);

  const handleAddPath = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPath) return;

    try {
      await invoke('add_parked_path', { path: newPath });
      toast.success('Parked path added');
      setNewPath('');
      fetchData();
    } catch (error) {
      toast.error(`Failed to add path: ${error}`);
    }
  };

  const handleRemovePath = async (path: string) => {
    try {
      await invoke('remove_parked_path', { path });
      toast.success('Parked path removed');
      fetchData();
    } catch (error) {
      toast.error(`Failed to remove path: ${error}`);
    }
  };

  const changePhpVersion = async (path: string, version: string) => {
    try {
      await invoke('isolate_site', { path, version });
      toast.success(`Switched to PHP ${version}`);
      fetchData();
    } catch (error) {
      toast.error(`Failed to switch PHP: ${error}`);
    }
  };

  const phpVersions = ['7.4', '8.0', '8.1', '8.2', '8.3', '8.4', '8.5'];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Globe className="text-indigo-500" size={24} />
          Site Manager
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage your local sites and parked paths
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Parked Paths Section */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-2xl border border-gray-100 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Folder size={18} /> Parked Paths
            </h3>

            <form onSubmit={handleAddPath} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                placeholder="/home/user/code"
                className="flex-1 px-3 py-2 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                <FolderPlus size={18} />
              </button>
            </form>

            <div className="space-y-2">
              {parkedPaths.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No parked paths yet.</p>
              )}
              {parkedPaths.map((path) => (
                <div
                  key={path}
                  className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#111] rounded-lg group"
                >
                  <span className="text-sm text-gray-600 dark:text-gray-300 truncate" title={path}>
                    {path}
                  </span>
                  <button
                    onClick={() => handleRemovePath(path)}
                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sites List Section */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900 dark:text-white">Detected Sites</h3>
              <div className="text-sm text-gray-500">{sites.length} sites found</div>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[600px] overflow-y-auto">
              {sites.length === 0 && (
                <div className="p-8 text-center text-gray-400">
                  No sites found. Add a parked path to get started.
                </div>
              )}
              {sites.map((site) => (
                <div
                  key={site.path}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-[#222] transition-colors flex items-center justify-between group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      {site.name}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        .test
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 truncate mt-0.5">{site.path}</div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Unlink Button (if linked) */}
                    {site.path.includes('/valet/') && (
                      <button
                        onClick={async () => {
                          try {
                            await invoke('unlink_site', { name: site.name });
                            toast.success('Site unlinked');
                            fetchData();
                          } catch (e) {
                            toast.error(`Failed to unlink: ${e}`);
                          }
                        }}
                        className="text-red-400 hover:text-red-500 transition-colors"
                        title="Unlink Site"
                      >
                        <div className="flex items-center gap-1 text-xs font-medium">
                          <Trash2 size={14} /> Unlink
                        </div>
                      </button>
                    )}

                    {/* PHP Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-medium">PHP</span>
                      <select
                        value={site.php_version}
                        onChange={(e) => changePhpVersion(site.path, e.target.value)}
                        className="bg-gray-100 dark:bg-[#333] border-none text-xs font-medium rounded-md py-1 pl-2 pr-6 cursor-pointer focus:ring-2 focus:ring-indigo-500"
                      >
                        {phpVersions.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={site.secured ? site.url.replace('http:', 'https:') : site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20 rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <ExternalLink size={14} /> Open
                      </a>

                      <button
                        onClick={async () => {
                          const toastId = toast.loading(
                            site.secured ? 'Unsecuring site...' : 'Securing site...'
                          );
                          try {
                            if (site.secured) {
                              await invoke('unsecure_site', { name: site.name });
                              toast.success('Site unsecured', { id: toastId });
                            } else {
                              await invoke('secure_site', { name: site.name });
                              toast.success('Site secured', { id: toastId });
                            }
                            fetchData();
                          } catch (e) {
                            toast.error(`Failed: ${e}`, { id: toastId });
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title={site.secured ? 'Unsecure Site' : 'Secure Site (HTTPS)'}
                      >
                        {site.secured ? (
                          <Lock size={16} className="text-green-600 dark:text-green-500" />
                        ) : (
                          <Unlock size={16} className="text-gray-400 dark:text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
