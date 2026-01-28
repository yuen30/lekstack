import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  Database,
  Play,
  Square,
  Loader2,
  Download,
  Users,
  X,
  Trash2,
  Plus,
  Pencil,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

export default function DatabaseManagerView() {
  const [status, setStatus] = useState<'running' | 'stopped' | 'not_installed' | 'loading'>(
    'loading'
  );
  const [pgStatus, setPgStatus] = useState<'running' | 'stopped' | 'not_installed' | 'loading'>(
    'loading'
  );
  const [redisStatus, setRedisStatus] = useState<
    'running' | 'stopped' | 'not_installed' | 'loading'
  >('loading');

  // Track which service is installing/loading
  const [installing, setInstalling] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [mariaPort, setMariaPort] = useState(3306);
  const [postgresPort, setPostgresPort] = useState(5432);
  const [redisPort, setRedisPort] = useState(6379);

  // User Management State
  const [showUserModal, setShowUserModal] = useState<string | null>(null); // 'mariadb' | 'postgresql' | null
  const [dbUsers, setDbUsers] = useState<{ username: string; host: string }[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Add User Form State
  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('');
  const [isAddingUser, setIsAddingUser] = useState(false);

  // Edit Port State
  const [editingPort, setEditingPort] = useState<string | null>(null); // serviceId
  const [tempPort, setTempPort] = useState<string>('');

  const [downloadProgress, setDownloadProgress] = useState(0);

  const checkStatus = useCallback(async () => {
    try {
      // MariaDB Status
      const mariadbInstalled = await invoke<string[]>('list_installed_versions', {
        runtime: 'mariadb',
      });
      if (mariadbInstalled.length === 0) {
        setStatus('not_installed');
      } else {
        const s = await invoke<string>('get_service_status', { name: 'mariadb' });
        setStatus(s as any);
      }

      // PostgreSQL Status
      const pgInstalled = await invoke<string[]>('list_installed_versions', {
        runtime: 'postgresql',
      });
      if (pgInstalled.length === 0) {
        setPgStatus('not_installed');
      } else {
        const s = await invoke<string>('get_service_status', { name: 'postgresql' });
        setPgStatus(s as any);
      }

      // Redis Status
      const redisInstalled = await invoke<string[]>('list_installed_versions', {
        runtime: 'redis',
      });
      if (redisInstalled.length === 0) {
        setRedisStatus('not_installed');
      } else {
        const s = await invoke<string>('get_service_status', { name: 'redis' });
        setRedisStatus(s as any);
      }

      // Load current ports
      const mPort = await invoke<number>('get_service_port', { name: 'mariadb' });
      setMariaPort(mPort);
      const pPort = await invoke<number>('get_service_port', { name: 'postgresql' });
      setPostgresPort(pPort);
      const rPort = await invoke<number>('get_service_port', { name: 'redis' });
      setRedisPort(rPort);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);

    // Listen for download progress
    const unlisten = listen('download_progress', (event: any) => {
      const { percent } = event.payload;
      setDownloadProgress(percent);
    });

    return () => {
      clearInterval(interval);
      unlisten.then((f) => f());
    };
  }, [checkStatus]);

  const handleInstall = async (runtime: string, version: string) => {
    setInstalling(runtime);
    setDownloadProgress(0);
    const toastId = toast.loading(`Starting download for ${runtime}...`);

    try {
      await invoke('install_runtime', { runtime, version });
      toast.success(`${runtime} Installed successfully`, { id: toastId });
      setDownloadProgress(0);
      checkStatus();
    } catch (error) {
      toast.error(`Install failed: ${error}`, { id: toastId });
    } finally {
      setInstalling(null);
      setDownloadProgress(0);
    }
  };

  const toggleService = async (name: string, currentStatus: string) => {
    setActionLoading(name);
    try {
      const command = currentStatus === 'running' ? 'stop_service' : 'start_service';
      await invoke(command, { name });

      // Smart Polling: Wait until status CHANGES from what it was
      const targetStatus = currentStatus === 'running' ? 'stopped' : 'running';
      let attempts = 0;
      const maxAttempts = 60; // 15 seconds (250ms * 60)

      const poll = setInterval(async () => {
        attempts++;

        // Check status directly
        const s = await invoke<string>('get_service_status', { name });

        // Update specific state to reflect reality immediately
        if (name === 'mariadb') setStatus(s as any);
        if (name === 'postgresql') setPgStatus(s as any);
        if (name === 'redis') setRedisStatus(s as any);

        // If status matches target (or at least changed from original), stop.
        if (s === targetStatus || s !== currentStatus || attempts >= maxAttempts) {
          clearInterval(poll);
          setActionLoading(null);
          // Final sync
          checkStatus();
        }
      }, 250);
    } catch (error) {
      toast.error(`Operation failed: ${error}`);
      setActionLoading(null);
    }
  };

  // Service Configurations
  const services = [
    {
      id: 'mariadb',
      name: 'MariaDB',
      version: '11.4 LTS',
      fullVersion: '11.4.4',
      desc: 'Open source relational database. Compatible with MySQL.',
      status: status,
      setStatus: setStatus, // Not used directly in rendering but for ref
      port: mariaPort,
      user: 'root',
      pass: '(empty)',
      iconLetter: 'M',
      color: 'blue',
      socket: '~/.lekstack/pids/mysql.sock',
    },
    {
      id: 'postgresql',
      name: 'PostgreSQL',
      version: '16.2',
      fullVersion: '16.2.0',
      desc: 'Advanced open source relational database.',
      status: pgStatus,
      port: postgresPort,
      user: 'postgres',
      pass: '(trust)',
      iconLetter: 'PG',
      color: 'blue',
      socket: null,
    },
    {
      id: 'redis',
      name: 'Redis',
      version: '7.4',
      fullVersion: '7.4.1',
      desc: 'In-memory data store, used as a database, cache, and message broker.',
      status: redisStatus,
      port: redisPort,
      user: null,
      pass: null,
      iconLetter: 'Re',
      color: 'red',
      socket: null,
    },
  ];

  const openUserModal = async (runtime: string) => {
    setShowUserModal(runtime);
    setLoadingUsers(true);
    try {
      const users = await invoke<{ username: string; host: string }[]>('get_db_users', { runtime });
      setDbUsers(users);
    } catch (e) {
      toast.error(`Failed to load users: ${e}`);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAddUser = async () => {
    if (!showUserModal || !newUser || !newPass) return;
    setIsAddingUser(true);
    try {
      await invoke('create_db_user', { runtime: showUserModal, username: newUser, pass: newPass });
      toast.success('User created');
      setNewUser('');
      setNewPass('');
      // Reload
      const users = await invoke<{ username: string; host: string }[]>('get_db_users', {
        runtime: showUserModal,
      });
      setDbUsers(users);
    } catch (e) {
      toast.error(`Failed: ${e}`);
    } finally {
      setIsAddingUser(false);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (!confirm(`Delete user ${username}?`)) return;
    try {
      await invoke('delete_db_user', { runtime: showUserModal, username });
      toast.success('User deleted');
      const users = await invoke<{ username: string; host: string }[]>('get_db_users', {
        runtime: showUserModal,
      });
      setDbUsers(users);
    } catch (e) {
      toast.error(`Failed: ${e}`);
    }
  };

  return (
    <div className="p-8 max-w-full mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500 relative">
      {/* User Management Modal */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Users size={20} className="text-indigo-500" />
                Manage {showUserModal === 'mariadb' ? 'MariaDB' : 'PostgreSQL'} Users
              </h3>
              <button
                onClick={() => setShowUserModal(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Add User Form */}
              <div className="flex gap-3 items-end bg-gray-50 dark:bg-[#111] p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-medium text-gray-500 ml-1">Username</label>
                  <input
                    value={newUser}
                    onChange={(e) => setNewUser(e.target.value)}
                    placeholder="new_user"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-black focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs font-medium text-gray-500 ml-1">Password</label>
                  <input
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    type="password"
                    placeholder="••••••"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-black focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <button
                  onClick={handleAddUser}
                  disabled={isAddingUser || !newUser || !newPass}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 h-[42px]"
                >
                  {isAddingUser ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <Plus size={18} />
                  )}
                  Add
                </button>
              </div>

              {/* User List */}
              {loadingUsers ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="animate-spin text-indigo-500" size={32} />
                </div>
              ) : (
                <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 font-medium">
                      <tr>
                        <th className="px-4 py-3">Username</th>
                        <th className="px-4 py-3">Host</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {dbUsers.map((u, i) => (
                        <tr
                          key={i}
                          className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium">{u.username}</td>
                          <td className="px-4 py-3 text-gray-500">{u.host}</td>
                          <td className="px-4 py-3 flex justify-end gap-2">
                            {/* Change Pass Button - Simplified for now, could be another modal */}
                            {/* <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Change Password"><Key size={16} /></button> */}

                            {['root', 'postgres'].includes(u.username) ? (
                              <span className="text-xs text-gray-400 px-2 py-1">System</span>
                            ) : (
                              <button
                                onClick={() => handleDeleteUser(u.username)}
                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Delete User"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {dbUsers.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-gray-500">
                            No users found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Database className="text-blue-500" size={26} />
          Database Services
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage local database servers for your applications.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {services.map((svc) => (
          <div
            key={svc.id}
            className="flex flex-col bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-300"
          >
            {/* Card Header & Status */}
            <div className="p-6 pb-4 flex items-start justify-between">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold
                bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                style={{
                  backgroundColor:
                    svc.color === 'blue'
                      ? 'var(--blue-50)'
                      : svc.color === 'red'
                        ? 'var(--red-50)'
                        : undefined,
                  color:
                    svc.color === 'blue'
                      ? 'var(--blue-600)'
                      : svc.color === 'red'
                        ? 'var(--red-600)'
                        : undefined,
                }}
              >
                {/* Tailwind classes for colors don't support dynamic values easily without safelist, using explicit classes logic below */}
                <span
                  className={`${svc.color === 'blue' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}
                >
                  {svc.iconLetter}
                </span>
              </div>

              <div className="flex flex-col items-end">
                {svc.status === 'running' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>Running
                  </span>
                )}
                {svc.status === 'stopped' && (
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 text-xs font-medium">
                    Stopped
                  </span>
                )}
                {svc.status === 'not_installed' && (
                  <span className="px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs font-medium">
                    Not Installed
                  </span>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="px-6 flex-1">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                {svc.name} {svc.version}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 min-h-[40px]">
                {svc.desc}
              </p>
            </div>

            {/* Connection Details (Collapsible/Fixed) */}
            <div className="px-6 py-4">
              {svc.status !== 'not_installed' && (
                <div className="bg-gray-50 dark:bg-[#111] rounded-xl p-3 text-sm space-y-2 border border-dashed border-gray-200 dark:border-gray-800">
                  <div className="flex justify-between items-center h-8">
                    <span className="text-gray-500">Port</span>
                    {editingPort === svc.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          className="w-20 h-7 px-2 border rounded bg-white dark:bg-black text-gray-900 dark:text-gray-100 font-mono text-center outline-none focus:ring-2 focus:ring-indigo-500"
                          value={tempPort}
                          onChange={(e) => setTempPort(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                        <button
                          onClick={async () => {
                            try {
                              const p = parseInt(tempPort);
                              if (isNaN(p) || p < 1 || p > 65535)
                                return toast.error('Invalid Port');
                              await invoke('update_service_port', { name: svc.id, port: p });
                              toast.success('Port updated. Please restart service.');
                              setEditingPort(null);
                              checkStatus();
                            } catch (e) {
                              toast.error(e as string);
                            }
                          }}
                          className="p-1 hover:bg-green-100 text-green-600 rounded"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setEditingPort(null)}
                          className="p-1 hover:bg-gray-200 text-gray-500 rounded"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
                          {svc.port}
                        </span>
                        {svc.status === 'stopped' && (
                          <button
                            onClick={() => {
                              setEditingPort(svc.id);
                              setTempPort(svc.port.toString());
                            }}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 rounded transition-colors"
                            title="Edit Port"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {svc.user && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">User</span>
                      <span className="font-mono font-medium text-gray-700 dark:text-gray-300">
                        {svc.user}
                      </span>
                    </div>
                  )}
                  {svc.pass && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Pass</span>
                      <span className="font-mono font-medium text-gray-400 italic">{svc.pass}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="p-6 pt-2 mt-auto border-t border-gray-50 dark:border-gray-800/50">
              {svc.status === 'not_installed' ? (
                <div className="space-y-3">
                  <button
                    onClick={() => handleInstall(svc.id, svc.fullVersion)}
                    disabled={installing === svc.id}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-all font-medium shadow-lg shadow-indigo-500/20 active:scale-95"
                  >
                    {installing === svc.id ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <Download size={18} />
                    )}
                    {installing === svc.id ? 'Installing...' : 'Install Service'}
                  </button>
                  {installing === svc.id && (
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${downloadProgress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => toggleService(svc.id, svc.status as string)}
                    disabled={actionLoading === svc.id}
                    className={`col-span-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl transition-all font-medium border active:scale-95
                            ${
                              svc.status === 'running'
                                ? 'bg-white border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:bg-transparent dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20'
                                : 'col-span-2 bg-green-600 border-transparent text-white hover:bg-green-700 shadow-lg shadow-green-600/20 dark:bg-green-600'
                            }`}
                  >
                    {actionLoading === svc.id ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : svc.status === 'running' ? (
                      <>
                        <Square size={18} className="fill-current" /> Stop
                      </>
                    ) : (
                      <>
                        <Play size={18} className="fill-current" /> Start Service
                      </>
                    )}
                  </button>

                  {svc.status === 'running' && ['mariadb', 'postgresql'].includes(svc.id) && (
                    <button
                      onClick={() => openUserModal(svc.id)}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-all font-medium active:scale-95"
                    >
                      <Users size={18} /> Users
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
