import React from 'react';
import { Power, Activity } from 'lucide-react';

interface ServiceCardProps {
    name: string;
    version?: string;
    status: 'running' | 'stopped' | 'error' | 'loading';
    description?: string;
    icon?: React.ReactNode;
    onToggle: () => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ name, version, status, description, onToggle, icon }) => {
    const isRunning = status === 'running';
    const isLoading = status === 'loading';

    return (
        <div className="group relative overflow-hidden bg-white dark:bg-[#1a1a1a] rounded-2xl p-6 shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-800 transition-all duration-300 hover:-translate-y-1">
            {/* Background Glow Effect */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br transition-opacity duration-500 opacity-5 dark:opacity-10 rounded-bl-full -mr-8 -mt-8 ${isRunning ? 'from-green-500 to-emerald-500' : 'from-gray-500 to-gray-400'
                }`} />

            <div className="flex justify-between items-start mb-6 relative">
                <div className="flex gap-4">
                    <div className={`p-3.5 rounded-xl transition-colors duration-300 ${isRunning
                            ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                        {icon || <Activity size={24} />}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            {name}
                            {version && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600 dark:group-hover:bg-blue-900/30 dark:group-hover:text-blue-300">
                                    v{version}
                                </span>
                            )}
                        </h3>
                        <div className={`flex items-center gap-1.5 mt-1 text-xs font-medium transition-colors ${status === 'running' ? 'text-green-600 dark:text-green-400' :
                                status === 'loading' ? 'text-yellow-600 dark:text-yellow-400' :
                                    status === 'error' ? 'text-red-500' :
                                        'text-gray-400'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status === 'running' ? 'bg-green-500 animate-pulse' :
                                    status === 'loading' ? 'bg-yellow-500 animate-bounce' :
                                        status === 'error' ? 'bg-red-500' :
                                            'bg-gray-300 dark:bg-gray-600'
                                }`} />
                            <span className="uppercase tracking-wide">{status}</span>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onToggle}
                    disabled={isLoading}
                    className={`
            relative p-3 rounded-xl transition-all duration-200 active:scale-95
            ${isRunning
                            ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30'
                            : 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30'}
            ${isLoading ? 'opacity-50 cursor-wait' : ''}
          `}
                    title={isRunning ? 'Stop Service' : 'Start Service'}
                >
                    <Power size={20} className={isLoading ? 'animate-spin' : ''} />
                </button>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {description}
            </p>
        </div>
    );
};

export default ServiceCard;
