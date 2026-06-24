import React, { useState } from 'react';
import { Settings2, ShieldCheck, Activity, Key, Save, Server, Globe } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export default function SystemConfig() {
  const [hybridMode, setHybridMode] = useState(true);
  const [pollingRate, setPollingRate] = useState(2000);
  const [tcamLimit, setTcamLimit] = useState(4096);
  const [controllerIp, setControllerIp] = useState('10.0.0.1');
  const [apiToken, setApiToken] = useState('ryu_core_77x9a_v1');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-5xl space-y-6"
    >
      <div className="flex justify-between items-center bg-dash-panel border border-dash-border p-6 rounded-3xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-dash-accent/10 rounded-xl text-dash-accent">
            <Settings2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">System & Security Configuration</h2>
            <p className="text-xs text-slate-500 font-medium">Decoupled IPS settings and Controller API configurations</p>
          </div>
        </div>
        
        <button className="flex items-center gap-2 px-6 py-2.5 bg-dash-accent text-white rounded-xl text-sm font-bold hover:bg-dash-accent-hover transition-all shadow-lg shadow-purple-500/20">
          <Save className="w-4 h-4" /> Save Configuration
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Detection Engine Settings */}
        <div className="bg-dash-panel border border-dash-border rounded-3xl p-8 shadow-xl space-y-8">
          <div className="flex items-center gap-3 pb-4 border-b border-dash-border">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Detection Engine</h3>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">Hybrid Detection Mode</p>
                <p className="text-xs text-slate-500 mt-1">Combine Entropy Analysis with ML Classification</p>
              </div>
              <button 
                onClick={() => setHybridMode(!hybridMode)}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  hybridMode ? "bg-dash-accent" : "bg-zinc-800"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                  hybridMode ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <p className="text-sm font-bold text-white">Telemetry Polling Rate</p>
                <span className="text-xs font-mono text-dash-accent">{pollingRate} ms</span>
              </div>
              <p className="text-xs text-slate-500 mb-4">Balance detection accuracy with southbound communication overhead.</p>
              <input 
                type="range" 
                min="500" max="10000" step="500"
                value={pollingRate}
                onChange={(e) => setPollingRate(Number(e.target.value))}
                className="w-full accent-dash-accent"
              />
              <div className="flex justify-between text-[10px] text-slate-600 font-bold uppercase mt-2">
                <span>Aggressive (High CPU)</span>
                <span>Optimized</span>
                <span>Conservative (Low CPU)</span>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-white mb-1">TCAM Flow Limit Threshold</p>
              <p className="text-xs text-slate-500 mb-3">Maximum flows before Wildcard Aggregation kicks in.</p>
              <div className="flex items-center gap-4">
                <input 
                  type="number" 
                  value={tcamLimit}
                  onChange={(e) => setTcamLimit(Number(e.target.value))}
                  className="bg-zinc-900 border border-dash-border rounded-lg px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-dash-accent w-32"
                />
                <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">Entries</span>
              </div>
            </div>
          </div>
        </div>

        {/* Controller Connection Settings */}
        <div className="bg-dash-panel border border-dash-border rounded-3xl p-8 shadow-xl space-y-8">
          <div className="flex items-center gap-3 pb-4 border-b border-dash-border">
            <Server className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Controller Integration</h3>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-sm font-bold text-white mb-2">SDN Controller IP (Ryu / ONOS)</p>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  value={controllerIp}
                  onChange={(e) => setControllerIp(e.target.value)}
                  className="w-full bg-zinc-900 border border-dash-border rounded-lg py-2.5 pl-10 pr-4 text-white font-mono text-sm focus:outline-none focus:border-dash-accent transition-colors"
                />
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-white mb-2">Northbound API Token</p>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="password" 
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  className="w-full bg-zinc-900 border border-dash-border rounded-lg py-2.5 pl-10 pr-4 text-white font-mono text-sm focus:outline-none focus:border-dash-accent transition-colors"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-2">Required for pushing asynchronous Flow-Mod rules to the controller.</p>
            </div>

            <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl flex items-start gap-3">
              <Activity className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-blue-100">Connection Status: ACTIVE</p>
                <p className="text-[10px] text-blue-400/70 mt-1 leading-relaxed">
                  The decoupled IPS is currently communicating with the controller via RESTful APIs. Latency is optimal (12ms).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
