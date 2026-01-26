import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Server, Database, Globe, Command, List } from 'lucide-react';
import ServiceCard from './ServiceCard';

// Mock data types
type ServiceStatus = 'running' | 'stopped' | 'error' | 'loading';

interface Service {
    id: string;
    name: string;
    version: string;
    description: string;
    status: ServiceStatus;
}

export default function Dashboard() {
    const [services, setServices] = useState<Service[]>([
        {
            id: 'nginx',
            name: 'Nginx',
            version: '1.24.0',
            description: 'Main web server handling HTTP traffic.',
            status: 'stopped'
        },
        {
            id: 'php-8.2',
            name: 'PHP-FPM',
            version: '8.2',
            description: 'PHP FastCGI backend for processing .php files.',
            status: 'stopped'
        }
    ]);

    useEffect(() => {
        // Check status on mount
        services.forEach(async (service) => {
            try {
                const status = await invoke<string>('get_service_status', { name: service.id });
                console.log(`Service ${service.id} status: ${status}`);
                // In a real implementation, we would setStatus here based on the response
                // For now, the mock backend always returns "stopped"
            } catch (e) {
                console.error(e);
            }
        });
    }, []);

    const toggleService = async (serviceId: string) => {
        // Find current service
        const service = services.find(s => s.id === serviceId);
        if (!service) return;

        // Optimistic update to loading
        setServices(prev => prev.map(s =>
            s.id === serviceId ? { ...s, status: 'loading' } : s
        ));

        try {
            const command = service.status === 'running' ? 'stop_service' : 'start_service';
            await invoke(command, { name: serviceId });

            // Simulate/Verify improved status update
            setTimeout(() => {
                setServices(prev => prev.map(s => {
                    if (s.id === serviceId) {
                        return { ...s, status: s.status === 'running' ? 'stopped' : 'running' };
                    }
                    return s;
                }));
            }, 500); // Small delay to feel the interaction

        } catch (error) {
            console.error('Failed to toggle service:', error);
            setServices(prev => prev.map(s =>
                s.id === serviceId ? { ...s, status: 'error' } : s
            ));
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#121212] text-gray-900 dark:text-gray-100 font-sans selection:bg-blue-500/30">
            {/* Navigation Sidebar (Placeholder for now) */}

            <main className="max-w-7xl mx-auto px-6 py-10">
                {/* Header Area */}
                <div className="flex justify-between items-end mb-10">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600 dark:from-blue-400 dark:to-violet-400">
                            Hello, Developer
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-lg">
                            Your localhost stack is ready.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        {/* Tool buttons could go here */}
                        <button className="p-2 rounded-lg bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
                            <Command size={20} />
                        </button>
                        <button className="p-2 rounded-lg bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition-colors">
                            <List size={20} />
                        </button>
                    </div>
                </div>

                {/* Quick Stats Row (Placeholder) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                    <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"><Globe size={24} /></div>
                        <div>
                            <div className="text-sm text-gray-400 font-medium">Active Sites</div>
                            <div className="text-2xl font-bold">0</div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"><Server size={24} /></div>
                        <div>
                            <div className="text-sm text-gray-400 font-medium">Stack Status</div>
                            <div className="text-2xl font-bold text-green-500">Ready</div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-[#1a1a1a] p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400"><Database size={24} /></div>
                        <div>
                            <div className="text-sm text-gray-400 font-medium">Databases</div>
                            <div className="text-2xl font-bold">0</div>
                        </div>
                    </div>
                </div>

                {/* Main Services Grid */}
                <section>
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800 dark:text-white">
                        Core Services
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {services.map(service => (
                            <ServiceCard
                                key={service.id}
                                name={service.name}
                                version={service.version}
                                description={service.description}
                                status={service.status}
                                onToggle={() => toggleService(service.id)}
                                icon={service.id.includes('nginx')
                                    ? <Globe size={24} />
                                    : <Server size={24} />
                                }
                            />
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}
