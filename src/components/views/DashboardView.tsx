import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { motion } from 'motion/react';
import {
  Server,
  Database,
  Globe,
  Zap,
  RotateCcw,
  LayoutGrid,
} from 'lucide-react';
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
            return {
              id,
              ...meta,
              version: installed[0] || '',
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
                icon={
                  service.id === 'nginx' ? (
                    <Globe size={24} />
                  ) : service.id.startsWith('php') ? (
                    <Zap size={24} />
                  ) : (
                    <Database size={24} />
                  )
                }
              />
            </motion.div>
          ))}
        </motion.div>
      </motion.section>
    </motion.div>
  );
}
