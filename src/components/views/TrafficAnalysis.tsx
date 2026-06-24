import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Activity, Database, Cpu, Network, AlertCircle, TrendingUp, TrendingDown, ShieldAlert, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface TrafficAnalysisProps {
  stats: any;
  history: any[];
}

export default function TrafficAnalysis({ stats, history }: TrafficAnalysisProps) {
  // Derive some metrics to align with the academic research
  const entropy = stats?.entropy || 0;
  const cpu = stats?.cpu || 0;
  const pps = stats?.pps || 0;
  
  // Simulated ML Classification breakdown based on current threat level
  const mlConfidence = stats?.isAttackActive ? 94.5 : 12.4;
  const attackType = stats?.isAttackActive ? (entropy > 0.8 ? 'UDP/ICMP Flood' : 'TCP-SYN Flood') : 'Legitimate Traffic';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      {/* Top Overview Cards */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-dash-panel border border-dash-border p-6 rounded-3xl shadow-lg relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-dash-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-2.5 bg-dash-accent/10 rounded-xl text-dash-accent">
              <Activity className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-zinc-900 px-2 py-1 rounded-md">Real-Time</span>
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Shannon Entropy $H(X)$</p>
            <div className="flex items-end gap-3">
              <h3 className="text-3xl font-black text-white tracking-tighter">{entropy.toFixed(3)}</h3>
              <span className={cn("text-xs font-bold pb-1", entropy > 0.7 ? "text-rose-400" : "text-emerald-400")}>
                {entropy > 0.7 ? 'CHAOTIC' : 'STABLE'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-dash-panel border border-dash-border p-6 rounded-3xl shadow-lg relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-500">
              <Network className="w-5 h-5" />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Packet_In Rate</p>
            <div className="flex items-end gap-3">
              <h3 className="text-3xl font-black text-white tracking-tighter">{Math.round(pps * 0.15).toLocaleString()}</h3>
              <span className="text-xs font-bold text-slate-500 pb-1">req/s</span>
            </div>
          </div>
        </div>

        <div className="bg-dash-panel border border-dash-border p-6 rounded-3xl shadow-lg relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Controller Saturation</p>
            <div className="flex items-end gap-3">
              <h3 className="text-3xl font-black text-white tracking-tighter">{cpu.toFixed(1)}%</h3>
              <span className={cn("text-xs font-bold pb-1", cpu > 80 ? "text-rose-400" : "text-emerald-400")}>
                CPU USAGE
              </span>
            </div>
            <div className="h-1.5 w-full bg-zinc-800 rounded-full mt-3 overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-500", cpu > 80 ? "bg-rose-500" : "bg-blue-500")} style={{ width: `${cpu}%` }} />
            </div>
          </div>
        </div>

        <div className={cn(
          "bg-dash-panel border p-6 rounded-3xl shadow-lg relative overflow-hidden transition-colors",
          stats?.isAttackActive ? "border-rose-500/30" : "border-dash-border"
        )}>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className={cn("p-2.5 rounded-xl", stats?.isAttackActive ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400")}>
              {stats?.isAttackActive ? <ShieldAlert className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">ML Classification</p>
            <div className="flex items-end gap-3">
              <h3 className={cn("text-xl font-black tracking-tighter", stats?.isAttackActive ? "text-rose-400" : "text-emerald-400")}>
                {attackType}
              </h3>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-mono">Confidence: {mlConfidence.toFixed(2)}%</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Main Charts Area */}
        <div className="col-span-8 space-y-8">
          
          <div className="bg-dash-panel border border-dash-border rounded-3xl p-8 shadow-xl">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Decoupled ML Anomaly Detection</h2>
                <p className="text-xs text-slate-500 font-medium">Monitoring Shannon Entropy & Controller Saturation in real-time</p>
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorEntropy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" opacity={0.5} />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#52525b' }} hide />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#52525b' }} />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#52525b' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#161616', border: '1px solid #262626', borderRadius: '12px' }} />
                  <Area yAxisId="left" type="monotone" dataKey="entropy" stroke="#ef4444" strokeWidth={2} fill="url(#colorEntropy)" />
                  <Area yAxisId="right" type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2} fill="url(#colorCpu)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Protocol Breakdown */}
        <div className="col-span-4 bg-dash-panel border border-dash-border rounded-3xl p-8 shadow-xl flex flex-col">
          <h2 className="text-lg font-bold text-white tracking-tight mb-2">Protocol Distribution</h2>
          <p className="text-xs text-slate-500 font-medium mb-8">Data plane protocol frequency analysis</p>
          
          <div className="flex-1 space-y-6">
            {[
              { label: 'TCP', val: stats?.isAttackActive && entropy < 0.8 ? 85 : 45, color: 'bg-dash-accent' },
              { label: 'UDP', val: stats?.isAttackActive && entropy > 0.8 ? 92 : 30, color: 'bg-amber-500' },
              { label: 'ICMP', val: 15, color: 'bg-blue-500' },
              { label: 'Other', val: 10, color: 'bg-slate-600' }
            ].map((p, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-white">
                  <span>{p.label}</span>
                  <span>{p.val}%</span>
                </div>
                <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${p.val}%` }}
                    className={cn("h-full rounded-full", p.color)} 
                    transition={{ duration: 1 }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-zinc-900 border border-dash-border rounded-2xl">
             <div className="flex items-center gap-3">
               <Database className="w-4 h-4 text-slate-500" />
               <div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active TCAM Entries</p>
                 <p className="text-white font-mono text-sm mt-1">{stats?.totalFlows || 0} / 4096 <span className="text-[10px] text-slate-500">MAX</span></p>
               </div>
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
