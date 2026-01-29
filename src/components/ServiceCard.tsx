import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  Square,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText,
  ExternalLink,
} from 'lucide-react';

interface ServiceCardProps {
  name: string;
  version?: string;
  status: 'running' | 'stopped' | 'error' | 'loading';
  description: string;
  icon: React.ReactNode;
  onToggle: () => void;
  onViewLogs?: () => void;
  onOpen?: () => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  name,
  version,
  status,
  description,
  icon,
  onToggle,
  onViewLogs,
  onOpen,
}) => {
  const isRunning = status === 'running';
  const isError = status === 'error';
  const isLoading = status === 'loading';

  return (
    <motion.div
      whileHover={{
        y: -4,
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      }}
      className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 p-6 flex flex-col h-full transition-shadow group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
              isRunning
                ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-gray-50 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
            }`}
          >
            {icon}
          </div>
          <div>
            <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-500 transition-colors">
              {name}
            </h4>
            {version ? (
              <span className="text-xs font-mono text-gray-400 bg-gray-50 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                v{version}
              </span>
            ) : (
              <span className="text-[10px] text-amber-500 font-medium">Not Installed</span>
            )}
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          disabled={isLoading}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            isRunning
              ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30'
              : 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30'
          } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
          title={isRunning ? 'Stop Service' : 'Start Service'}
        >
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, rotate: -180 }}
                animate={{ opacity: 1, rotate: 0 }}
                exit={{ opacity: 0, rotate: 180 }}
              >
                <Loader2 className="animate-spin" size={20} />
              </motion.div>
            ) : isRunning ? (
              <motion.div
                key="stop"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
              >
                <Square size={18} fill="currentColor" />
              </motion.div>
            ) : (
              <motion.div
                key="start"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
              >
                <Play size={18} fill="currentColor" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400 flex-1 leading-relaxed">
        {description}
      </p>

      <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {isRunning ? (
            <>
              <CheckCircle2 size={14} className="text-green-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-green-500">
                Running
              </span>
            </>
          ) : isError ? (
            <>
              <AlertCircle size={14} className="text-red-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">
                Error
              </span>
            </>
          ) : (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-700" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Stopped
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onOpen && isRunning && (
            <button
              onClick={onOpen}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all"
            >
              <ExternalLink size={14} />
              Open
            </button>
          )}

          {onViewLogs && (
            <button
              onClick={onViewLogs}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
            >
              <FileText size={14} />
              Logs
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ServiceCard;
