import React, { useState, useEffect } from 'react';
import { 
    History, 
    Search, 
    Filter, 
    ArrowLeftRight, 
    User, 
    Clock, 
    Layers,
    Database,
    Shield,
    Activity,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import api from '../lib/api';

interface AuditLog {
    id: string;
    userId: string;
    action: string;
    entityType: string;
    entityId: string;
    description: string;
    createdAt: string;
    ipAddress?: string;
    user: {
        fullName: string;
        email: string;
    }
}

const AuditLogs: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            // Simulated pagination - usually would be handled by backend
            const response = await api.get('/audit-logs'); // We might need to create this route/controller
            setLogs(response.data.logs || response.data);
            setTotal(response.data.total || response.data.length);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [page]);

    const getActionColor = (action: string) => {
        if (action.includes('DELETE')) return 'bg-rose-50 text-rose-600 border-rose-100';
        if (action.includes('CREATE')) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        if (action.includes('UPDATE')) return 'bg-amber-50 text-amber-600 border-amber-100';
        return 'bg-blue-50 text-blue-600 border-blue-100';
    };

    const filteredLogs = logs.filter(log => 
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        <History className="w-8 h-8 text-primary" />
                        System Audit Logs
                    </h1>
                    <p className="text-slate-500 mt-1">Track system activities for compliance and security auditing</p>
                </div>

                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm w-full md:w-80">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search logs, users or actions..."
                        className="border-none focus:ring-0 text-sm w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <Activity className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Events</p>
                        <p className="text-2xl font-black text-slate-800">{total}</p>
                    </div>
                </div>
                {/* Add more stats if needed */}
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Timestamp</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Action</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Context</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4 rounded-full"></div>
                                        <p className="text-slate-400 font-medium">Retrieving audit trails...</p>
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center text-slate-400 italic">
                                        No matching logs found in this period.
                                    </td>
                                </tr>
                            ) : filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                                            <Clock className="w-3.5 h-3.5" />
                                            {new Date(log.createdAt).toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                                                {log.user.fullName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-700">{log.user.fullName}</p>
                                                <p className="text-[10px] text-slate-400 font-mono italic">{log.ipAddress || 'Internal'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest border ${getActionColor(log.action)}`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 max-w-xs">
                                        <p className="text-sm text-slate-600 line-clamp-2">{log.description}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase">
                                            <Database className="w-3 h-3" />
                                            {log.entityType}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Placeholder */}
                <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/30">
                    <p className="text-xs text-slate-400 font-medium italic">Showing records {filteredLogs.length} of {total}</p>
                    <div className="flex gap-2">
                        <button className="p-2 rounded-lg border border-slate-200 hover:bg-white text-slate-400 disabled:opacity-30" disabled>
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button className="p-2 rounded-lg border border-slate-200 hover:bg-white text-slate-400 disabled:opacity-30" disabled>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuditLogs;
