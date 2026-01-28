import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Server, Database, Globe, Zap, Cpu, Settings as SettingsIcon } from 'lucide-react';
import ServiceCard from '../ServiceCard';

// Mock data types
type ServiceStatus = 'running' | 'stopped' | 'error' | 'loading';

interface Service {
  id: string;
  name: string;
  version: string;
  description: string;
  status: ServiceStatus;
}

export default function DashboardView() {
  const [services, setServices] = useState<Service[]>([
    {
      id: 'nginx',
      name: 'Nginx',
      version: '1.29.4',
      description: 'Main web server handling HTTP traffic.',
      status: 'stopped',
    },
    {
      id: 'php-8.2',
      name: 'PHP-FPM',
      version: '8.2',
      description: 'PHP FastCGI backend for processing .php files.',
      status: 'stopped',
    },
  ]);

  useEffect(() => {
    services.forEach(async (service) => {
      try {
        const status = await invoke<string>('get_service_status', { name: service.id });
        console.log(`Service ${service.id} status: ${status}`);
      } catch (e) {
        console.error(e);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleService = async (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (!service) return;

    setServices((prev) => prev.map((s) => (s.id === serviceId ? { ...s, status: 'loading' } : s)));

    try {
      const command = service.status === 'running' ? 'stop_service' : 'start_service';
      await invoke(command, { name: serviceId });

      setTimeout(() => {
        setServices((prev) =>
          prev.map((s) => {
            if (s.id === serviceId) {
              return { ...s, status: s.status === 'running' ? 'stopped' : 'running' };
            }
            return s;
          })
        );
      }, 500);
    } catch (error) {
      console.error('Failed to toggle service:', error);
      setServices((prev) => prev.map((s) => (s.id === serviceId ? { ...s, status: 'error' } : s)));
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="text-yellow-500 fill-yellow-500" size={24} />
            Control Center
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage core stack services</p>
        </div>

        <div className="flex gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 text-xs font-medium text-gray-500 flex items-center gap-2">
            <Cpu size={14} />
            <span>CPU: 2%</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-gray-800 text-xs font-medium text-gray-500 flex items-center gap-2">
            <Database size={14} />
            <span>RAM: 140MB</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center gap-4 transition-all">
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 flex items-center justify-center">
            <Globe size={24} />
          </div>
          <div>
            <div className="text-sm text-gray-400 font-medium">Active Sites</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">0</div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center gap-4 transition-all">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 flex items-center justify-center">
            <Server size={24} />
          </div>
          <div>
            <div className="text-sm text-gray-400 font-medium">Stack Status</div>
            <div
              className={`text-2xl font-bold ${services.every((s) => s.status === 'running') ? 'text-green-500' : 'text-gray-900 dark:text-white'}`}
            >
              {services.filter((s) => s.status === 'running').length}/{services.length} Running
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center gap-4 transition-all">
          <div className="w-12 h-12 rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400 flex items-center justify-center">
            <Database size={24} />
          </div>
          <div>
            <div className="text-sm text-gray-400 font-medium">Databases</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">0</div>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Active Services</h3>
          <button className="text-sm text-gray-400 hover:text-indigo-500 flex items-center gap-1 transition-colors">
            <SettingsIcon size={14} /> Configure Defaults
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              name={service.name}
              version={service.version}
              description={service.description}
              status={service.status}
              onToggle={() => toggleService(service.id)}
              icon={service.id.includes('nginx') ? <Globe size={24} /> : <Server size={24} />}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
