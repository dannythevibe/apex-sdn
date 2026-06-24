import React, { useEffect, useState } from 'react';
import { Database, Filter, Search, Download, ShieldCheck, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { logsApi, type NetworkEvent } from '../../lib/apiClient';
import { cn } from '../../lib/utils';

export default function LogArchive() {
  const [logs, setLogs] = useState<NetworkEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await logsApi.events({ page, limit: 15 });
      setLogs(data.events);
      setTotalPages(data.pages);
    } catch (error) {
      console.error("Failed to fetch logs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // Poll for new logs every 10 seconds
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [page]);

  const handleResolve = async (id: string, currentStatus: boolean) => {
    try {
      await logsApi.resolveEvent(id, !currentStatus);
      fetchLogs(); // refresh
    } catch (error) {
      console.error("Failed to resolve event", error);
    }
  };

  const filteredLogs = logs.filter(l => 
    (l.message || '').toLowerCase().includes(search.toLowerCase()) || 
    (l.type || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center bg-dash-panel border border-dash-border p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-dash-accent/10 rounded-xl text-dash-accent">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Security Log Archive</h2>
            <p className="text-xs text-slate-500 font-medium">Tracking Aggregated & Per-Flow Mitigation Events</p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-zinc-900 border border-dash-border rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:border-dash-accent text-white w-64"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-dash-border rounded-xl text-xs font-bold text-slate-400 hover:text-white transition-colors">
            <Filter className="w-4 h-4" /> Filters
          </button>
          <button 
            onClick={() => logsApi.downloadCsv('events')}
            className="flex items-center gap-2 px-4 py-2 bg-dash-accent text-white rounded-xl text-xs font-bold hover:bg-dash-accent-hover transition-colors"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      <div className="bg-dash-panel border border-dash-border rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto min-h-[500px]">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-dash-border bg-black/20">
                <th className="px-8 py-4">Status / Severity</th>
                <th className="px-8 py-4">Timestamp</th>
                <th className="px-8 py-4">Event Type</th>
                <th className="px-8 py-4">Description / Rule Match</th>
                <th className="px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs font-medium">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-20 text-slate-500">Loading logs...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-20 text-slate-500">No logs found matching criteria.</td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className={cn("border-b border-dash-border/50 transition-colors group", log.resolved ? "opacity-60" : "hover:bg-white/[0.02]")}>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-2">
                        {log.severity === 'CRITICAL' ? (
                          <span className="px-2 py-1 bg-rose-500/10 text-rose-400 text-[9px] font-black rounded flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> CRITICAL
                          </span>
                        ) : log.severity === 'WARNING' ? (
                          <span className="px-2 py-1 bg-amber-500/10 text-amber-500 text-[9px] font-black rounded">WARNING</span>
                        ) : (
                          <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-[9px] font-black rounded">INFO</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-4 text-slate-400 font-mono text-[10px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-8 py-4">
                      <span className="px-2 py-1 bg-zinc-800 rounded-md text-[9px] font-black text-slate-300 uppercase tracking-wider">
                        {log.type}
                      </span>
                    </td>
                    <td className="px-8 py-4">
                      <p className="text-slate-200">{log.message}</p>
                      {log.sourceIp && <p className="text-[10px] text-slate-500 mt-1 font-mono">Source: {log.sourceIp}</p>}
                    </td>
                    <td className="px-8 py-4 text-right">
                      <button 
                        onClick={() => handleResolve(log.id, log.resolved)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ml-auto",
                          log.resolved 
                            ? "border border-dash-border text-slate-500 hover:text-white" 
                            : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                        )}
                      >
                        {log.resolved ? 'Reopen' : <><ShieldCheck className="w-3 h-3" /> Mark Resolved</>}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-dash-border flex justify-between items-center bg-black/10">
          <span className="text-xs text-slate-500 font-medium">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 bg-zinc-900 border border-dash-border rounded-lg text-xs font-bold text-white disabled:opacity-50"
            >
              Prev
            </button>
            <button 
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 bg-zinc-900 border border-dash-border rounded-lg text-xs font-bold text-white disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
