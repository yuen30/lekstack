import { useState } from 'react';
import { Download, RefreshCw, Check, Trash2, Server, Search } from 'lucide-react';
import nvmLogoColor from '../../assets/nvm-logo-color.svg';
import nvmLogoWhite from '../../assets/nvm-logo-white.svg';
import bunLogo from '../../assets/bun-logo.svg';

interface Version {
    version: string;
    status: 'installed' | 'not_installed' | 'installing' | 'active';
    releaseDate?: string;
    tags?: string[];
}

const PHP_VERSIONS: Version[] = [
    { version: '8.5', status: 'not_installed', releaseDate: 'Nov 2025', tags: ['Latest', 'Stable'] },
    { version: '8.4', status: 'not_installed', releaseDate: 'Nov 2024', tags: ['Stable'] },
    { version: '8.3', status: 'not_installed', releaseDate: 'Nov 2023', tags: ['Old Stable'] },
    { version: '8.2', status: 'active', releaseDate: 'Dec 2022', tags: ['LTS', 'Default'] },
    { version: '8.1', status: 'installed', releaseDate: 'Nov 2021', tags: ['LTS'] },
    { version: '8.0', status: 'not_installed', releaseDate: 'Nov 2020', tags: ['EOL'] },
];

const NODE_VERSIONS: Version[] = [
    { version: '25', status: 'not_installed', releaseDate: 'Oct 2025', tags: ['Current'] },
    { version: '24', status: 'active', releaseDate: 'May 2025', tags: ['Active LTS'] },
    { version: '22', status: 'installed', releaseDate: 'Apr 2024', tags: ['Maintenance LTS'] },
    { version: '20', status: 'not_installed', releaseDate: 'Apr 2023', tags: ['Maintenance LTS'] },
];

const BUN_VERSIONS: Version[] = [
    { version: '1.3.6', status: 'active', releaseDate: 'Jan 2026', tags: ['Latest', 'Stable'] },
    { version: '1.3.0', status: 'installed', releaseDate: 'Dec 2025', tags: ['Stable'] },
    { version: 'Canary', status: 'not_installed', releaseDate: 'Daily', tags: ['Experimental'] },
];

const NvmIcon = ({ size = 24, className }: { size?: number, className?: string }) => (
    <picture>
        <source media="(prefers-color-scheme: dark)" srcSet={nvmLogoWhite} />
        <img src={nvmLogoColor} alt="NVM" style={{ width: size, height: size }} className={className} />
    </picture>
);

const BunIcon = ({ size = 24, className }: { size?: number, className?: string }) => (
    <img src={bunLogo} alt="Bun" style={{ width: size, height: size }} className={className} />
);

export default function VersionManagerView() {
    const [activeTab, setActiveTab] = useState<'php' | 'node' | 'bun'>('php');
    const [phpVersions, setPhpVersions] = useState(PHP_VERSIONS);
    const [nodeVersions, setNodeVersions] = useState(NODE_VERSIONS);
    const [bunVersions, setBunVersions] = useState(BUN_VERSIONS);

    const installVersion = (version: string, type: 'php' | 'node' | 'bun') => {
        const setter = type === 'php' ? setPhpVersions : type === 'node' ? setNodeVersions : setBunVersions;

        setter(prev => prev.map(v =>
            v.version === version ? { ...v, status: 'installing' } : v
        ));

        setTimeout(() => {
            setter(prev => prev.map(v =>
                v.version === version ? { ...v, status: 'installed' } : v
            ));
        }, 1500);
    };

    const currentList = activeTab === 'php' ? phpVersions : activeTab === 'node' ? nodeVersions : bunVersions;
    const ActiveIcon = activeTab === 'php' ? Server : activeTab === 'node' ? NvmIcon : BunIcon;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ActiveIcon className={activeTab === 'php' ? "text-indigo-500" : "text-green-500"} size={26} />
                        Runtime Manager
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Install and switch between language versions</p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex justify-between items-center bg-white dark:bg-[#1a1a1a] p-2 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="flex gap-1">
                    <button
                        onClick={() => setActiveTab('php')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'php'
                            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                    >
                        <Server size={18} /> PHP
                    </button>
                    <button
                        onClick={() => setActiveTab('node')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'node'
                            ? 'bg-green-50 text-green-600 dark:bg-green-500/20 dark:text-green-400'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                    >
                        <NvmIcon size={18} /> Node.js
                    </button>
                    <button
                        onClick={() => setActiveTab('bun')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${activeTab === 'bun'
                            ? 'bg-orange-50 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                            }`}
                    >
                        <BunIcon size={18} /> Bun
                    </button>
                </div>

                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        placeholder="Search versions..."
                        className="pl-9 pr-4 py-1.5 text-sm bg-gray-50 dark:bg-[#202020] border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-gray-700 dark:text-gray-200 w-48 transition-all focus:w-64"
                    />
                </div>
            </div>

            {/* Versions Table */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50/50 dark:bg-[#202020]/50 border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400">
                        <tr>
                            <th className="px-6 py-4 font-medium">Version</th>
                            <th className="px-6 py-4 font-medium">Release Date</th>
                            <th className="px-6 py-4 font-medium">Tags</th>
                            <th className="px-6 py-4 font-medium text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                        {currentList.map((ver) => (
                            <tr key={ver.version} className="hover:bg-gray-50/50 dark:hover:bg-[#202020]/30 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${ver.status === 'active'
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                                            }`}>
                                            {ver.status === 'active' ? <Check size={14} strokeWidth={3} /> : ver.version.split('.')[0]}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                                                v{ver.version}
                                            </div>
                                            {ver.status === 'active' && <div className="text-[10px] text-green-600 dark:text-green-400 font-medium">Currently Active</div>}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                                    {ver.releaseDate}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-2">
                                        {ver.tags?.map(tag => (
                                            <span key={tag} className={`px-2 py-0.5 rounded text-[10px] font-medium border ${tag.includes('LTS') ? 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800' :
                                                tag.includes('Beta') ? 'bg-yellow-50 text-yellow-700 border-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800' :
                                                    'bg-gray-50 text-gray-600 border-gray-100 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                                                }`}>
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {ver.status === 'installing' ? (
                                        <span className="inline-flex items-center gap-2 text-blue-500 bg-blue-50 dark:bg-blue-900/10 px-3 py-1.5 rounded-lg text-xs font-medium">
                                            <RefreshCw size={12} className="animate-spin" /> Installing...
                                        </span>
                                    ) : ver.status === 'not_installed' ? (
                                        <button
                                            onClick={() => installVersion(ver.version, activeTab)}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 font-medium text-xs hover:opacity-90 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Download size={14} /> Install
                                        </button>
                                    ) : (
                                        <div className="flex items-center justify-end gap-2">
                                            {ver.status !== 'active' && (
                                                <button className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100" title="Uninstall">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                            <button className="px-3 py-1.5 text-xs font-medium bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-lg cursor-not-allowed">
                                                Installed
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
