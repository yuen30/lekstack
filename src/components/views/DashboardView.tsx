import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { motion, AnimatePresence } from 'motion/react';
import { Server, Database, Globe, Zap, RotateCcw, LayoutGrid, X, Terminal } from 'lucide-react';
import ServiceCard from '../ServiceCard';
import { toast } from 'sonner';

type ServiceStatus = 'running' | 'stopped' | 'error' | 'loading' | 'not_installed';

interface Service {
  id: string;
  name: string;
  version: string;
  description: string;
  status: ServiceStatus;
}

interface Site {
  name: string;
  path: string;
  url: string;
  secured: boolean;
  php_version: string;
}

const SERVICE_MAP: Record<string, { name: string; description: string }> = {
  nginx: {
    name: 'Nginx',
    description: 'Main web server handling HTTP traffic.',
  },
  'php-8.2': {
    name: 'PHP-FPM',
    description: 'PHP FastCGI backend for processing .php files.',
  },
  node: {
    name: 'Node.js',
    description: 'JavaScript runtime for building scalable network applications.',
  },
  bun: {
    name: 'Bun',
    description: 'Fast all-in-one JavaScript runtime.',
  },
  mariadb: {
    name: 'MariaDB',
    description: 'Open source relational database (MySQL compatible).',
  },
  postgresql: {
    name: 'PostgreSQL',
    description: 'Advanced open source relational database.',
  },
  redis: {
    name: 'Redis',
    description: 'In-memory data store for caching and messaging.',
  },
};

export default function DashboardView() {
  const [services, setServices] = useState<Service[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [siteCount, setSiteCount] = useState(0);
  const [dbCount, setDbCount] = useState(0);
  const [isRestartingAll, setIsRestartingAll] = useState(false);

  // Log Viewer State
  const [showLogs, setShowLogs] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [logs, setLogs] = useState('');
  const [logLoading, setLogLoading] = useState(false);
  const logContainerRef = useRef<HTMLPreElement>(null);

  const fetchLogs = useCallback(async (serviceId: string) => {
    try {
      setLogLoading(true);
      const data = await invoke<string>('get_service_logs', { name: serviceId, lines: 100 });
      setLogs(data);
    } catch (e) {
      setLogs(`Error fetching logs: ${e}`);
    } finally {
      setLogLoading(false);
    }
  }, []);

  useEffect(() => {
    let interval: number;
    if (showLogs && selectedService) {
      fetchLogs(selectedService.id);
      interval = setInterval(() => fetchLogs(selectedService.id), 3000) as unknown as number;
    }
    return () => clearInterval(interval);
  }, [showLogs, selectedService, fetchLogs]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const checkAllStatus = useCallback(async () => {
    try {
      // 1. Check Service Statuses dynamically from Metadata Keys
      const serviceIds = Object.keys(SERVICE_MAP);
      const updatedServices = await Promise.all(
        serviceIds.map(async (id) => {
          const meta = SERVICE_MAP[id];
          try {
            const runtimeName = id.startsWith('php') ? 'php' : id;
            const installed = await invoke<string[]>('list_installed_versions', {
              runtime: runtimeName,
            });

            if (installed.length === 0) {
              return {
                id,
                ...meta,
                version: '',
                status: 'not_installed' as const,
              };
            }

            const status = await invoke<string>('get_service_status', { name: id });
            const activeVersion = await invoke<string>('get_active_version', {
              runtime: runtimeName,
            });

            // For PHP cards that have specific version in ID (like php-8.2)
            // if it's the active version, we show it. Otherwise we show the ID version.
            let displayVersion = activeVersion || installed[0] || '';
            if (id.startsWith('php-') && id !== `php-${activeVersion}`) {
              // If this is a specific PHP card but not the active one,
              // show its own version from ID
              displayVersion = id.replace('php-', '');
            }

            return {
              id,
              ...meta,
              version: displayVersion,
              status: status as ServiceStatus,
            };
          } catch {
            return {
              id,
              ...meta,
              version: '',
              status: 'error' as const,
            };
          }
        })
      );
      setServices(updatedServices);
      setIsInitialLoad(false);

      // 2. Check Sites Count
      const sites = await invoke<Site[]>('scan_sites');
      setSiteCount(sites.length);

      // 3. Database count
      const dbServices = ['mariadb', 'postgresql', 'redis'];
      let count = 0;
      for (const db of dbServices) {
        const installed = await invoke<string[]>('list_installed_versions', { runtime: db });
        if (installed.length > 0) count++;
      }
      setDbCount(count);
    } catch (e) {
      console.error('Failed to refresh dashboard:', e);
      setIsInitialLoad(false);
    }
  }, []);

  useEffect(() => {
    checkAllStatus();
    const interval = setInterval(checkAllStatus, 10000);
    return () => clearInterval(interval);
  }, [checkAllStatus]);

  const toggleService = async (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service || service.status === 'not_installed') return;

    setServices((prev) => prev.map((s) => (s.id === serviceId ? { ...s, status: 'loading' } : s)));

    const isStarting = service.status !== 'running';
    const toastId = toast.loading(`${isStarting ? 'Starting' : 'Stopping'} ${service.name}...`);

    try {
      const command = service.status === 'running' ? 'stop_service' : 'start_service';
      await invoke(command, { name: serviceId });

      // Smart Polling
      const targetStatus = service.status === 'running' ? 'stopped' : 'running';
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        const s = await invoke<string>('get_service_status', { name: serviceId });
        if (s === targetStatus || attempts > 20) {
          clearInterval(poll);
          setServices((prev) =>
            prev.map((it) => (it.id === serviceId ? { ...it, status: s as ServiceStatus } : it))
          );
          if (s === targetStatus) {
            toast.success(`${service.name} ${isStarting ? 'Started' : 'Stopped'}`, { id: toastId });
          } else {
            toast.error(`${service.name} timed out`, { id: toastId });
          }
        }
      }, 500);
    } catch {
      toast.error(`Failed to handle ${serviceId}`, { id: toastId });
      setServices((prev) => prev.map((s) => (s.id === serviceId ? { ...s, status: 'error' } : s)));
    }
  };

  const handleRestartAll = async () => {
    setIsRestartingAll(true);
    const tid = toast.loading('Restarting all services...');
    try {
      await invoke('restart_all_services');
      toast.success('All services restarted', { id: tid });
      checkAllStatus();
    } catch (e) {
      toast.error(`Restart failed: ${e}`, { id: tid });
    } finally {
      setIsRestartingAll(false);
    }
  };

  const openLogs = (service: Service) => {
    setSelectedService(service);
    setShowLogs(true);
    setLogs('Loading logs...');
  };

  const openBrowser = async (serviceId: string) => {
    if (serviceId === 'nginx') {
      try {
        const port = await invoke<number>('get_service_port', { name: 'nginx' });
        // Standard Nginx default in LekStack is 8080 if not specified
        const url = `http://localhost:${port || 8080}`;
        await openUrl(url);
      } catch (e) {
        console.error('Failed to open browser:', e);
        await openUrl('http://localhost:8080');
      }
    } else if (serviceId === 'node' || serviceId === 'bun') {
      try {
        const port = await invoke<number>('get_service_port', { name: serviceId });
        const url = `http://localhost:${port || (serviceId === 'node' ? 3000 : 3001)}`;
        await openUrl(url);
      } catch (e) {
        console.error('Failed to open browser:', e);
        const defaultPort = serviceId === 'node' ? 3000 : 3001;
        await openUrl(`http://localhost:${defaultPort}`);
      }
    }
  };

  if (isInitialLoad) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-500">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <Zap className="absolute inset-0 m-auto text-indigo-500 animate-pulse" size={24} />
        </div>
        <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">
          Scanning system services...
        </p>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="p-8 max-w-full mx-auto space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="text-yellow-500 fill-yellow-500" size={24} />
            Control Center
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage core stack services</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleRestartAll}
            disabled={isRestartingAll}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50"
          >
            <RotateCcw size={16} className={isRestartingAll ? 'animate-spin' : ''} />
            Restart All
          </button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center gap-5 transition-all hover:shadow-md">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 flex items-center justify-center">
            <Globe size={28} />
          </div>
          <div>
            <div className="text-sm text-gray-400 font-medium">Active Sites</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{siteCount}</div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center gap-5 transition-all hover:shadow-md">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 flex items-center justify-center">
            <Server size={28} />
          </div>
          <div>
            <div className="text-sm text-gray-400 font-medium">Stack Health</div>
            <div
              className={`text-2xl font-bold ${services.every((s) => s.status === 'running') ? 'text-green-500' : 'text-gray-900 dark:text-white'}`}
            >
              {services.filter((s) => s.status === 'running').length}/{services.length} Services
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center gap-5 transition-all hover:shadow-md">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400 flex items-center justify-center">
            <Database size={28} />
          </div>
          <div>
            <div className="text-sm text-gray-400 font-medium">Databases</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{dbCount}</div>
          </div>
        </div>
      </motion.div>

      {/* Services Grid */}
      <motion.section variants={itemVariants} className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <LayoutGrid size={20} className="text-indigo-500" />
            Core Stack
          </h3>
          <div className="flex gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> Running
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gray-300"></span> Stopped
            </div>
          </div>
        </div>

        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {services.map((service) => (
            <motion.div key={service.id} variants={itemVariants}>
              <ServiceCard
                name={service.name}
                version={service.status === 'not_installed' ? undefined : service.version}
                description={service.description}
                status={
                  service.status === 'not_installed'
                    ? 'stopped'
                    : (service.status as 'running' | 'stopped' | 'error' | 'loading')
                }
                onToggle={() => toggleService(service.id)}
                onViewLogs={() => openLogs(service)}
                onOpen={
                  service.id === 'nginx'
                    ? () => openBrowser(service.id)
                    : service.id === 'node' || service.id === 'bun'
                      ? () => openBrowser(service.id)
                      : undefined
                }
                icon={
                  service.id === 'nginx' ? (
                    <Globe size={24} />
                  ) : service.id.startsWith('php') ? (
                    <Zap size={24} />
                  ) : service.id === 'node' ? (
                    <div className="w-6 h-6 rounded bg-green-500 flex items-center justify-center text-white text-xs font-bold">
                      JS
                    </div>
                  ) : service.id === 'bun' ? (
                    <div className="w-6 h-6 rounded bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
                      B
                    </div>
                  ) : (
                    <Database size={24} />
                  )
                }
              />
            </motion.div>
          ))}
        </motion.div>
      </motion.section>

      {/* Log Viewer Modal */}
      <AnimatePresence>
        {showLogs && selectedService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-12 lg:p-24 bg-black/60 backdrop-blur-sm overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#1a1a1a] w-full max-w-4xl max-h-full rounded-3xl border border-gray-100 dark:border-gray-800 shadow-2xl flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-xl">
                    <Terminal size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {selectedService.name} Logs
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Viewing last 100 lines • Updates every 3s
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLogs(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              {/* Log Content */}
              <div className="flex-1 bg-gray-950 p-4 font-mono text-sm overflow-hidden flex flex-col group">
                <pre
                  ref={logContainerRef}
                  className="flex-1 overflow-auto text-gray-300 custom-scrollbar whitespace-pre-wrap break-all"
                >
                  {logs || 'Waiting for logs...'}
                  {logLoading && (
                    <span className="inline-block ml-2 animate-pulse text-indigo-400">_</span>
                  )}
                </pre>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-[#1a1a1a]/50 flex justify-between items-center">
                <div className="text-[10px] text-gray-400 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Live Feed Active
                </div>
                <button
                  onClick={() => fetchLogs(selectedService.id)}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors shadow-lg shadow-indigo-600/20"
                >
                  Refresh Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
