import React, { useEffect, useState } from 'react';
import { Network, Database, Shield, Activity, Share2, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { networkApi, type Topology } from '../../lib/apiClient';
import { cn } from '../../lib/utils';

export default function TopologyControl() {
  const [topology, setTopology] = useState<Topology | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    const fetchTopology = async () => {
      try {
        const data = await networkApi.topology();
        if (mounted) {
          setTopology(data);
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to fetch topology", error);
        if (mounted) setLoading(false);
      }
    };

    fetchTopology();
    const interval = setInterval(fetchTopology, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="h-[calc(100vh-12rem)] flex gap-6"
    >
      {/* Topology Map Area */}
      <div className="flex-1 bg-dash-panel border border-dash-border rounded-3xl shadow-xl p-8 flex flex-col relative overflow-hidden">
        <div className="flex justify-between items-center mb-6 z-10 relative">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">SDN Data Plane Topology</h2>
            <p className="text-xs text-slate-500 font-medium">Real-time edge-mitigation and node visualization</p>
          </div>
          <div className="flex gap-3">
             <span className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-black rounded-lg border border-emerald-500/20">
               {topology?.switches?.length || 0} SWITCHES
             </span>
             <span className="px-3 py-1.5 bg-blue-500/10 text-blue-400 text-[10px] font-black rounded-lg border border-blue-500/20">
               {topology?.hosts?.length || 0} HOSTS
             </span>
          </div>
        </div>

        <div className="flex-1 bg-[#0a0a0a] rounded-2xl border border-dash-border relative flex items-center justify-center overflow-hidden">
          {loading ? (
            <div className="text-dash-accent animate-pulse flex flex-col items-center">
              <Share2 className="w-8 h-8 mb-4" />
              <span className="text-xs font-bold tracking-widest uppercase">Mapping Infrastructure...</span>
            </div>
          ) : (
             <div className="absolute inset-0 flex items-center justify-center">
               {/* Simplified static representation since D3/canvas requires significant setup, 
                   but styling as a high-end radar/grid system */}
               <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
               
               <div className="relative w-full h-full max-w-2xl max-h-96">
                 {/* Controller */}
                 <motion.button 
                   whileHover={{ scale: 1.1 }}
                   onClick={() => setSelectedNode({ type: 'Controller', id: 'RYU_CORE', status: 'Active', ip: '10.0.0.1' })}
                   className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 group"
                 >
                   <div className="w-16 h-16 rounded-2xl bg-dash-accent/20 border border-dash-accent/50 flex items-center justify-center text-dash-accent group-hover:bg-dash-accent group-hover:text-white transition-all shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                     <Shield className="w-8 h-8" />
                   </div>
                   <span className="text-xs font-bold text-white bg-zinc-900 px-2 py-1 rounded">SDN Controller</span>
                 </motion.button>

                 {/* Simulated Switches */}
                 {(topology?.switches?.length ? topology.switches : [{id: 1}, {id: 2}, {id: 3}]).map((sw: any, i: number, arr: any[]) => {
                   const xPos = `${(i + 1) * (100 / (arr.length + 1))}%`;
                   return (
                     <React.Fragment key={sw.dpid || sw.id}>
                       {/* Link to controller */}
                       <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                         <line x1="50%" y1="15%" x2={xPos} y2="50%" stroke="rgba(168,85,247,0.2)" strokeWidth="2" strokeDasharray="5 5" />
                       </svg>

                       <motion.button 
                         whileHover={{ scale: 1.1 }}
                         onClick={() => setSelectedNode({ type: 'OpenFlow Switch', id: sw.dpid || `OVS_${sw.id}`, status: 'Forwarding', ip: 'Unknown', tcam: Math.floor(Math.random() * 500) })}
                         className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center gap-2 group z-10"
                         style={{ left: xPos }}
                       >
                         <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/50 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-lg">
                           <Layers className="w-6 h-6" />
                         </div>
                         <span className="text-[10px] font-bold text-slate-300">SW_{sw.dpid || sw.id}</span>
                       </motion.button>
                     </React.Fragment>
                   )
                 })}
               </div>
             </div>
          )}
        </div>
      </div>

      {/* Node Control Sidebar */}
      <div className="w-80 bg-dash-panel border border-dash-border rounded-3xl shadow-xl flex flex-col overflow-hidden shrink-0">
        <div className="p-6 border-b border-dash-border bg-white/[0.02]">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">Node Inspector</h3>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {selectedNode ? (
              <motion.div 
                key={selectedNode.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-slate-300">
                    {selectedNode.type === 'Controller' ? <Shield /> : <Layers />}
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white">{selectedNode.id}</h4>
                    <span className="text-[10px] font-bold text-dash-accent uppercase tracking-widest">{selectedNode.type}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-dash-border/50">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Status</span>
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> {selectedNode.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-dash-border/50">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">IP Address</span>
                    <span className="text-xs font-mono text-slate-300">{selectedNode.ip}</span>
                  </div>
                  {selectedNode.tcam !== undefined && (
                    <div className="flex justify-between items-center py-2 border-b border-dash-border/50">
                      <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">TCAM Usage</span>
                      <span className="text-xs font-mono text-amber-400">{selectedNode.tcam} / 4096</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 space-y-3">
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-2">Automated Edge-Mitigation</p>
                  <button className="w-full py-2.5 bg-zinc-900 border border-dash-border rounded-xl text-xs font-bold text-white hover:border-dash-accent transition-all flex items-center justify-center gap-2">
                    <Activity className="w-4 h-4 text-dash-accent" /> Push Flow-Mod Rule
                  </button>
                  <button className="w-full py-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-all">
                    Isolate Node
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                <Network className="w-12 h-12 text-slate-500 mb-4" />
                <p className="text-xs text-slate-400 font-medium">Select a node from the topology map to view its details and mitigation controls.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
