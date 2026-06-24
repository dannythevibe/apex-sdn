import React, { useEffect, useState, useRef, useCallback } from 'react'
import { authApi, networkApi, setAccessToken, type User as ApiUser, type NetworkStats } from './lib/apiClient';
import { simulator } from './lib/simulator';
import { 
  Shield, 
  ShieldAlert, 
  Activity, 
  Cpu, 
  Network, 
  Lock, 
  Unlock, 
  Terminal,
  ChevronRight,
  Database,
  Info,
  CheckCircle2,
  AlertCircle,
  LayoutDashboard,
  BarChart2,
  Settings,
  Bell,
  Search,
  MoreHorizontal,
  Circle,
  Download,
  Filter,
  ArrowRight,
  Zap,
  User,
  Mail,
  Key,
  Globe,
  PlayCircle,
  StopCircle
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';

// Import Views
import TrafficAnalysis from './components/views/TrafficAnalysis';
import TopologyControl from './components/views/TopologyControl';
import LogArchive from './components/views/LogArchive';
import SystemConfig from './components/views/SystemConfig';

// --- Shared Components ---

const TerminalText = ({ words, className }: { words: string[]; className?: string }) => {
  const [displayText, setDisplayText] = useState('');
  const stateRef = useRef({ wordIdx: 0, charIdx: 0, deleting: false });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const tick = () => {
      const s = stateRef.current;
      const word = words[s.wordIdx];
      if (!s.deleting) {
        setDisplayText(word.slice(0, s.charIdx));
        s.charIdx++;
        if (s.charIdx > word.length) {
          s.deleting = true;
          timerRef.current = setTimeout(tick, 1600);
        } else {
          timerRef.current = setTimeout(tick, 110);
        }
      } else {
        s.charIdx--;
        setDisplayText(word.slice(0, s.charIdx));
        if (s.charIdx <= 0) {
          s.deleting = false;
          s.wordIdx = (s.wordIdx + 1) % words.length;
          timerRef.current = setTimeout(tick, 300);
        } else {
          timerRef.current = setTimeout(tick, 65);
        }
      }
    };
    timerRef.current = setTimeout(tick, 500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [words]);

  return (
    <span className={cn('font-mono', className)}>
      {displayText}
      <span className="inline-block w-[8px] h-[0.85em] bg-dash-accent ml-1.5 animate-terminal-cursor align-middle" />
    </span>
  );
};

const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
      active 
        ? "bg-dash-accent text-white shadow-lg shadow-purple-500/20" 
        : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
    )}
  >
    <Icon className="w-5 h-5" />
    <span className="text-sm font-medium">{label}</span>
  </button>
);

const SummaryCard = ({ title, value, subValue, icon: Icon, gradient, percent }: any) => (
  <div className={cn(
    "relative flex-1 p-6 rounded-2xl border border-dash-border bg-dash-panel overflow-hidden",
    gradient && "gradient-card border-purple-500/30"
  )}>
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-2 rounded-lg bg-zinc-800/50", gradient && "bg-white/10")}>
        <Icon className="w-5 h-5 text-slate-300" />
      </div>
      <button className="text-slate-600 hover:text-slate-400">
        <MoreHorizontal className="w-4 h-4" />
      </button>
    </div>
    
    <div className="space-y-1">
      <p className={cn("text-xs font-semibold text-slate-500 uppercase tracking-wider", gradient && "text-slate-300")}>{title}</p>
      <div className="flex items-baseline gap-2">
        <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
        {percent && (
          <span className={cn(
            "text-[10px] font-bold px-1.5 py-0.5 rounded",
            percent.startsWith('+') ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10"
          )}>
            {percent}
          </span>
        )}
      </div>
      <p className="text-[10px] text-slate-600 font-medium">{subValue}</p>
    </div>
  </div>
);

const NodeCard = ({ name, type, status, ip, mac, load }: any) => (
  <div className="bg-dash-panel border border-dash-border p-6 rounded-2xl shadow-lg hover:border-dash-accent/50 transition-all group">
    <div className="flex justify-between items-start mb-6">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          type === 'Controller' ? "bg-purple-500/20 text-purple-400" :
          type === 'Switch' ? "bg-blue-500/20 text-blue-400" : "bg-zinc-800 text-slate-400"
        )}>
          {type === 'Controller' ? <Shield className="w-5 h-5" /> : 
           type === 'Switch' ? <Network className="w-5 h-5" /> : <Database className="w-5 h-5" />}
        </div>
        <div>
          <h4 className="text-sm font-bold text-white group-hover:text-dash-accent transition-colors">{name}</h4>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{type}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-900 border border-dash-border text-[9px] font-black uppercase text-slate-400">
        <div className={cn("w-1.5 h-1.5 rounded-full", status === 'Online' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-rose-500")} />
        {status}
      </div>
    </div>
    
    <div className="grid grid-cols-2 gap-4 mb-6">
      <div className="space-y-1">
        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">IP Address</p>
        <p className="text-xs font-mono text-slate-300">{ip}</p>
      </div>
      <div className="space-y-1">
        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">MAC Layer</p>
        <p className="text-xs font-mono text-slate-300">{mac}</p>
      </div>
    </div>

    <div className="space-y-2">
      <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest">
        <span className="text-slate-500">Resource Load</span>
        <span className="text-white">{load}%</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-dash-accent rounded-full" style={{ width: `${load}%` }} />
      </div>
    </div>
  </div>
);

const SecurityRuleRow = ({ id, priority, match, action, packets, bytes }: any) => (
  <tr className="border-b border-dash-border/50 hover:bg-white/[0.02] transition-colors group">
    <td className="px-8 py-4">
      <span className="text-[10px] font-mono text-slate-500">ID_{id.padStart(4, '0')}</span>
    </td>
    <td className="px-8 py-4">
      <span className={cn(
        "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter",
        priority > 1000 ? "bg-purple-500/20 text-purple-400" : "bg-zinc-800 text-slate-400"
      )}>
        {priority}
      </span>
    </td>
    <td className="px-8 py-4">
      <div className="flex flex-wrap gap-2">
        {match.split(';').map((m: any) => (
          <span key={m} className="px-1.5 py-0.5 bg-zinc-900 border border-dash-border rounded text-[10px] font-mono text-slate-400">{m}</span>
        ))}
      </div>
    </td>
    <td className="px-8 py-4">
      <span className={cn(
        "text-[10px] font-black uppercase tracking-widest",
        action === 'ALLOW' ? "text-emerald-400" : "text-rose-400"
      )}>
        {action}
      </span>
    </td>
    <td className="px-8 py-4">
      <div className="flex flex-col">
        <span className="text-[10px] font-bold text-white">{packets.toLocaleString()} Pkts</span>
        <span className="text-[10px] text-slate-500">{(bytes/1024/1024).toFixed(2)} MB</span>
      </div>
    </td>
    <td className="px-8 py-4 text-right">
       <button className="text-[10px] font-bold text-dash-accent hover:underline">Revoke</button>
    </td>
  </tr>
);

// --- Hero Sub-Components ---

const NetworkCanvas = () => {
  const nodes = [
    { id: 0, cx: 50, cy: 16, type: 'controller' },
    { id: 1, cx: 22, cy: 44, type: 'switch' },
    { id: 2, cx: 78, cy: 44, type: 'switch' },
    { id: 3, cx: 8,  cy: 76, type: 'host' },
    { id: 4, cx: 34, cy: 82, type: 'host' },
    { id: 5, cx: 60, cy: 76, type: 'host' },
    { id: 6, cx: 88, cy: 70, type: 'host' },
    { id: 7, cx: 72, cy: 90, type: 'host' },
  ];
  const edges: [number, number][] = [[0,1],[0,2],[1,3],[1,4],[2,5],[2,6],[5,7]];

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
      <defs>
        <filter id="nglow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {edges.map(([fi, ti], i) => {
        const f = nodes[fi], t = nodes[ti];
        return (
          <g key={i}>
            <line x1={f.cx} y1={f.cy} x2={t.cx} y2={t.cy}
              stroke="rgba(168,85,247,0.18)" strokeWidth="0.4" strokeDasharray="3 2" />
            <circle r="0.9" fill="rgba(168,85,247,0.95)">
              <animateMotion dur={`${2 + i * 0.55}s`} repeatCount="indefinite" begin={`${i * 0.35}s`}
                path={`M ${f.cx} ${f.cy} L ${t.cx} ${t.cy}`} />
              <animate attributeName="opacity" values="0;1;1;0" dur={`${2 + i * 0.55}s`} repeatCount="indefinite" begin={`${i * 0.35}s`} />
            </circle>
          </g>
        );
      })}

      {nodes.map(node => {
        const r = node.type === 'controller' ? 3.8 : node.type === 'switch' ? 2.6 : 1.9;
        const fill = node.type === 'controller' ? 'rgba(168,85,247,0.95)' : node.type === 'switch' ? 'rgba(96,165,250,0.8)' : 'rgba(100,116,139,0.65)';
        const ring = node.type === 'controller' ? 'rgba(168,85,247,0.45)' : node.type === 'switch' ? 'rgba(96,165,250,0.35)' : 'rgba(100,116,139,0.25)';
        const dur = `${3.2 + node.id * 0.28}s`;
        return (
          <g key={node.id} filter="url(#nglow)">
            <circle cx={node.cx} cy={node.cy} r={r} fill="none" stroke={ring} strokeWidth="0.5">
              <animate attributeName="r" values={`${r};${r * 2.8};${r}`} dur={dur} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.9;0;0.9" dur={dur} repeatCount="indefinite" />
            </circle>
            <circle cx={node.cx} cy={node.cy} r={r} fill={fill} />
          </g>
        );
      })}
    </svg>
  );
};

const StatCounter = ({ target, label, formatFn, delay = 0 }: {
  target: number;
  label: string;
  formatFn: (n: number) => string;
  delay?: number;
}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      let start: number | null = null;
      const duration = 1600;
      const step = (ts: number) => {
        if (!start) start = ts;
        const p = Math.min((ts - start) / duration, 1);
        setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target));
        if (p < 1) requestAnimationFrame(step);
        else setCount(target);
      };
      requestAnimationFrame(step);
    }, delay);
    return () => clearTimeout(t);
  }, [target, delay]);

  return (
    <div>
      <p className="text-lg md:text-xl font-black text-white tracking-tight tabular-nums">{formatFn(count)}</p>
      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em] mt-0.5">{label}</p>
    </div>
  );
};

// --- View Components ---

const EnergyOrb = () => (
  <div className="relative w-[480px] h-[480px]">
    <div className="absolute -inset-[30%] rounded-full bg-purple-800/25 blur-[120px]" />
    <svg viewBox="0 0 500 500" className="relative w-full h-full overflow-visible">
      <defs>
        <radialGradient id="orbGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(216,180,254,0.22)" />
          <stop offset="45%"  stopColor="rgba(168,85,247,0.10)" />
          <stop offset="100%" stopColor="rgba(88,28,135,0)" />
        </radialGradient>
        <filter id="rGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="sGlow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="10" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <circle cx="250" cy="250" r="205" fill="url(#orbGrad)" />

      {/* Ring 1 — equatorial */}
      <g filter="url(#rGlow)">
        <ellipse cx="250" cy="250" rx="195" ry="60" fill="none" stroke="rgba(168,85,247,0.3)" strokeWidth="1" />
        <ellipse cx="250" cy="250" rx="195" ry="60" fill="none" stroke="rgba(216,180,254,0.9)" strokeWidth="2" strokeDasharray="80 826">
          <animate attributeName="stroke-dashoffset" from="0" to="-906" dur="5s" repeatCount="indefinite" />
        </ellipse>
      </g>

      {/* Ring 2 — tilted 62° */}
      <g filter="url(#rGlow)" transform="rotate(62 250 250)">
        <ellipse cx="250" cy="250" rx="182" ry="57" fill="none" stroke="rgba(168,85,247,0.25)" strokeWidth="1" />
        <ellipse cx="250" cy="250" rx="182" ry="57" fill="none" stroke="rgba(192,132,252,0.85)" strokeWidth="2" strokeDasharray="65 796">
          <animate attributeName="stroke-dashoffset" from="0" to="-861" dur="7s" repeatCount="indefinite" begin="-2.5s" />
        </ellipse>
      </g>

      {/* Ring 3 — tilted −55° */}
      <g filter="url(#rGlow)" transform="rotate(-55 250 250)">
        <ellipse cx="250" cy="250" rx="170" ry="54" fill="none" stroke="rgba(168,85,247,0.2)" strokeWidth="1" />
        <ellipse cx="250" cy="250" rx="170" ry="54" fill="none" stroke="rgba(216,180,254,0.75)" strokeWidth="1.5" strokeDasharray="50 764">
          <animate attributeName="stroke-dashoffset" from="0" to="-814" dur="9s" repeatCount="indefinite" begin="-5s" />
        </ellipse>
      </g>

      {/* Spark heads */}
      <g filter="url(#sGlow)">
        <circle r="5" fill="white">
          <animateMotion dur="5s" repeatCount="indefinite"
            path="M 445,250 A 195,60 0 1,0 55,250 A 195,60 0 1,0 445,250" />
        </circle>
        <g transform="rotate(62 250 250)">
          <circle r="4.5" fill="rgba(240,220,255,1)">
            <animateMotion dur="7s" repeatCount="indefinite" begin="-2.5s"
              path="M 432,250 A 182,57 0 1,0 68,250 A 182,57 0 1,0 432,250" />
          </circle>
        </g>
        <g transform="rotate(-55 250 250)">
          <circle r="4" fill="rgba(216,180,254,0.95)">
            <animateMotion dur="9s" repeatCount="indefinite" begin="-5s"
              path="M 420,250 A 170,54 0 1,0 80,250 A 170,54 0 1,0 420,250" />
          </circle>
        </g>
      </g>
    </svg>
  </div>
);

const LandingPage = ({ onGetStarted }: { onGetStarted: () => void }) => (
  <div className="h-screen bg-black text-slate-300 overflow-hidden selection:bg-dash-accent selection:text-white relative">

    {/* Subtle right glow behind orb */}
    <div className="absolute right-[-10%] top-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-purple-900/25 blur-[180px] rounded-full pointer-events-none" />

    {/* Nav */}
    <nav className="h-20 flex items-center justify-between px-8 md:px-16 relative z-50">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-2.5"
      >
        <div className="w-8 h-8 rounded-lg bg-dash-accent flex items-center justify-center shadow-lg shadow-purple-500/30">
          <span className="text-white font-black text-sm">A</span>
        </div>
        <span className="text-lg font-black text-white tracking-tight">Apex SDN</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="hidden md:flex items-center gap-8"
      >
        <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">Home</a>
        <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">Features</a>
        <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">Docs</a>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex items-center gap-3"
      >
        <button
          onClick={onGetStarted}
          className="px-5 py-2 bg-white text-black text-sm font-bold rounded-lg hover:bg-slate-100 transition-all"
        >
          Launch Dashboard
        </button>
      </motion.div>
    </nav>

    {/* Hero */}
    <section className="relative h-[calc(100vh-5rem)] flex items-center px-8 md:px-16 z-20">

      {/* Left */}
      <div className="flex-1 max-w-xl">

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-purple-500/10 border border-purple-500/20 mb-7"
        >
          <Zap className="w-3 h-3 text-purple-400" />
          <span className="text-xs font-semibold text-purple-300 tracking-wide">AI-Powered SDN Defense</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="text-6xl md:text-[5.5rem] font-display font-black text-white leading-[1.05] tracking-tight mb-6"
        >
          Shield Beyond<br />
          the{' '}
          <TerminalText
            words={['NETWORK', 'THREATS', 'PACKETS', 'TRAFFIC']}
            className="text-dash-accent text-shadow-glow"
          />
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-slate-400 text-lg leading-relaxed mb-8 max-w-lg"
        >
          Autonomous packet defense powered by an intelligent SDN controller.
          Monitor, analyze, and neutralize threats in real time.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="flex items-center gap-4"
        >
          <button
            onClick={onGetStarted}
            className="px-7 py-3.5 bg-white text-black text-base font-bold rounded-lg hover:bg-slate-100 transition-all"
          >
            Launch Dashboard
          </button>
          <button className="px-7 py-3.5 border border-slate-700 text-slate-300 text-base font-medium rounded-lg hover:border-slate-500 hover:text-white transition-all">
            View Architecture
          </button>
        </motion.div>
      </div>

      {/* Right: Energy Orb */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 1.2, ease: 'easeOut' }}
        className="hidden lg:flex items-center justify-end flex-shrink-0 w-[520px] xl:w-[600px] translate-x-16"
      >
        <EnergyOrb />
      </motion.div>

    </section>
  </div>
);

// --- Main App ---

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'app'>('landing');
  const [user, setUser] = useState<any>({ firstName: 'Admin', lastName: 'User', role: 'ADMIN' });
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Overview');
  const [activeSidebar, setActiveSidebar] = useState('Dashboard');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [simMode, setSimMode] = useState(false);

  // ── Transform raw stats data into dashboard-ready shape ──────────────────
  const transformStats = useCallback((data: any) => {
    return {
      ...data,
      throughput: parseFloat(((data.totalBytes || 0) / (1024 * 1024)).toFixed(1)),
      pps: data.totalPackets || 0,
      entropy: data.live ? (data.entropy ?? 0.85) : 0,
      cpu: data.totalFlows ? Math.min((data.totalFlows / 10) * 4, 99) : 0,
      ram: data.totalFlows ? data.totalFlows * 5 + 160 : 160,
      blockedIps: (data.blockedHosts || []).filter((h: any) => h.active).map((h: any) => h.ipAddress),
      logs: (data.logs || []).map((log: any) => ({
        ...log,
        timestamp: new Date(log.createdAt).toLocaleTimeString(),
        type: log.severity === 'CRITICAL' ? 'danger' : log.severity === 'WARNING' ? 'warning' : log.type === 'DDOS_MITIGATED' ? 'success' : 'info',
        message: log.message ?? '',
      })),
    };
  }, []);

  // ── Real API fetch ────────────────────────────────────────────────────────
  const fetchStats = async () => {
    try {
      const data = await networkApi.stats();
      const transformed = transformStats(data);
      setStats(transformed);
      setHistory(prev => [...prev.slice(-19), { time: new Date().toLocaleTimeString(), ...transformed }]);
    } catch (e) {
      console.error(e);
      setStats((prev: any) => prev ?? {
        live: false, throughput: 0, pps: 0, entropy: 0, cpu: 0, ram: 0,
        totalSwitches: 0, totalPackets: 0, totalBytes: 0, totalFlows: 0,
        switches: [], logs: [], blockedHosts: [], blockedIps: [],
        isAttackActive: false, ipsEnabled: false,
      });
    }
  };

  // ── Simulator subscription ────────────────────────────────────────────────
  useEffect(() => {
    if (!simMode) return;
    const unsub = simulator.subscribe((raw) => {
      const transformed = transformStats({
        ...raw,
        entropy: (() => {
          // Derive entropy from totalFlows (attack = high, idle = low)
          const phase = simulator.getPhase();
          if (phase === 'attack')     return 0.31 + Math.random() * 0.65;
          if (phase === 'mitigating') return 0.4 + Math.random() * 0.3;
          return 0.28 + Math.random() * 0.08;
        })(),
      });
      setStats(transformed);
      setHistory(prev => [...prev.slice(-19), { time: new Date().toLocaleTimeString(), ...transformed }]);
    });
    simulator.start();
    return () => {
      unsub();
      simulator.stop();
    };
  }, [simMode, transformStats]);

  // ── Real API polling (when NOT in sim mode) ───────────────────────────────
  useEffect(() => {
    if (simMode || currentView !== 'app') return;
    fetchStats();
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  }, [currentView, simMode]);

  // ── Auto-detect: try backend once; fall back to sim if unreachable ────────
  useEffect(() => {
    if (currentView !== 'app') return;
    networkApi.stats().then(() => {
      // Backend available — stay in real mode
    }).catch(() => {
      // Backend unreachable — silently activate simulation
      setSimMode(true);
    });
  }, [currentView]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const toggleAttack = () => {
    if (simMode) {
      const phase = simulator.getPhase();
      if (phase === 'attack' || phase === 'mitigating') {
        simulator.stopAttack();
      } else {
        simulator.triggerAttack();
      }
    } else {
      fetchStats();
    }
  };

  const toggleIPS = () => {
    if (simMode) {
      simulator.setIPS(!stats?.ipsEnabled);
    } else {
      fetchStats();
    }
  };

  const toggleSimMode = () => {
    setSimMode(prev => {
      const next = !prev;
      if (!next) {
        simulator.stop();
        simulator.reset();
        setStats(null);
        setHistory([]);
      } else {
        setStats(null);
        setHistory([]);
      }
      return next;
    });
  };

  if (!stats && currentView === 'app') return <div className="flex h-screen items-center justify-center bg-dash-bg text-slate-600 text-sm font-bold uppercase tracking-widest animate-pulse">Initializing Apex SDN Core...</div>;

  return (
    <div className="h-screen bg-dash-bg font-sans selection:bg-dash-accent selection:text-white">
      <AnimatePresence mode="wait">
        {currentView === 'landing' ? (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LandingPage onGetStarted={() => setCurrentView('app')} />
          </motion.div>
        ) : (
          <motion.div 
            key="app" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="flex h-screen overflow-hidden select-none"
            onClick={() => { setShowNotifications(false); setShowProfile(false); }}
          >
            {/* --- Sidebar --- */}
            <aside className="w-72 border-r border-dash-border flex flex-col p-6 shrink-0 z-50 bg-dash-sidebar">
              <div className="flex items-center gap-3 mb-10 px-2 cursor-pointer" onClick={() => setActiveSidebar('Dashboard')}>
                <div className="w-8 h-8 rounded-lg bg-dash-accent flex items-center justify-center shadow-lg shadow-purple-500/40">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-extrabold text-white tracking-tighter">Apex SDN</span>
              </div>

              <nav className="flex-1 space-y-2">
                <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeSidebar === 'Dashboard'} onClick={() => setActiveSidebar('Dashboard')} />
                <SidebarItem icon={Activity} label="Traffic Analysis" active={activeSidebar === 'Traffic Analysis'} onClick={() => setActiveSidebar('Traffic Analysis')} />
                <SidebarItem icon={Network} label="Topology Control" active={activeSidebar === 'Topology Control'} onClick={() => setActiveSidebar('Topology Control')} />
                <SidebarItem icon={Database} label="Log Archive" active={activeSidebar === 'Log Archive'} onClick={() => setActiveSidebar('Log Archive')} />
                <SidebarItem icon={Settings} label="System Config" active={activeSidebar === 'System Config'} onClick={() => setActiveSidebar('System Config')} />
              </nav>

              <div className="mt-auto px-2 space-y-3">
                {simMode && (
                  <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-2xl">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                      <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Simulation Mode</span>
                    </div>
                    <p className="text-[9px] text-purple-300/60 mt-1 pl-4">No backend required</p>
                  </div>
                )}
                <div className="p-4 bg-zinc-900/50 border border-dash-border rounded-2xl">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Instance Status</p>
                   <div className="flex items-center gap-2">
                     <div className={cn("w-2 h-2 rounded-full animate-pulse", simMode ? "bg-purple-500" : "bg-emerald-500")} />
                     <span className="text-xs font-bold text-slate-300">{simMode ? 'Simulating' : 'Sync Active'}</span>
                   </div>
                </div>
              </div>
            </aside>

            {/* --- Main Content --- */}
            <main className="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scroll">
              
              {/* Top Header */}
              <header className="h-28 flex items-center justify-between px-12 border-b border-dash-border sticky top-0 bg-dash-bg/80 backdrop-blur-xl z-40">
                <div className="flex items-center gap-16">
                  <h1 className="text-2xl font-bold text-white tracking-tight">{activeSidebar}</h1>
                  {activeSidebar === 'Dashboard' && (
                    <nav className="flex gap-10 text-sm font-semibold text-slate-500 mt-1 ml-4">
                      {['Overview', 'Nodes', 'Security Rules'].map(tab => (
                        <span 
                          key={tab}
                          className={cn("relative cursor-pointer transition-colors py-2", activeTab === tab ? "text-white" : "hover:text-slate-300")}
                          onClick={(e) => { e.stopPropagation(); setActiveTab(tab); }}
                        >
                          {tab}
                          {activeTab === tab && (
                            <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-dash-accent rounded-full" />
                          )}
                        </span>
                      ))}
                    </nav>
                  )}
                </div>

                <div className="flex items-center gap-8">
                  <div className="relative group hidden xl:block" onClick={(e) => e.stopPropagation()}>
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-dash-accent transition-colors" />
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search resources..." 
                      className="bg-dash-panel border border-dash-border rounded-xl py-2 pl-10 pr-4 text-xs font-medium w-64 focus:outline-none focus:border-dash-accent transition-all text-white"
                    />
                  </div>
                  
                  <div className="relative">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowNotifications(!showNotifications); setShowProfile(false); }}
                      className="p-2.5 rounded-xl border border-dash-border bg-dash-panel text-slate-400 hover:text-white transition-all relative"
                    >
                      <Bell className="w-4 h-4" />
                      <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-dash-accent rounded-full border-2 border-dash-panel" />
                    </button>

                    <AnimatePresence>
                      {showNotifications && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          className="absolute right-0 mt-3 w-80 bg-dash-panel border border-dash-border rounded-2xl shadow-2xl overflow-hidden z-50 p-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-bold text-white uppercase tracking-widest">Notifications</h3>
                            <button className="text-[10px] text-dash-accent font-bold hover:underline">Mark all read</button>
                          </div>
                          <div className="space-y-3 max-h-64 overflow-y-auto custom-scroll">
                            {stats.logs.slice(0, 5).map((log: any) => (
                              <div key={log.id} className="flex gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                                <div className={cn("w-1.5 h-1.5 rounded-full mt-1.5", log.type === 'danger' ? 'bg-rose-500' : 'bg-emerald-500')} />
                                <div className="flex-1">
                                  <p className="text-[11px] text-slate-200 leading-tight">{log.message}</p>
                                  <p className="text-[9px] text-slate-600 mt-1">{log.timestamp}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="relative">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowProfile(!showProfile); setShowNotifications(false); }}
                      className="w-9 h-9 rounded-xl bg-gradient-to-br from-dash-accent to-purple-800 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-purple-500/20 hover:ring-2 ring-dash-accent/50 transition-all"
                    >
                      {user?.firstName ? `${user.firstName[0]}${user.lastName?.[0] || ''}` : 'AD'}
                    </button>

                    <AnimatePresence>
                      {showProfile && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          className="absolute right-0 mt-3 w-48 bg-dash-panel border border-dash-border rounded-2xl shadow-2xl overflow-hidden z-50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="p-4 border-b border-dash-border bg-white/[0.02]">
                             <p className="text-xs font-bold text-white">{user?.firstName} {user?.lastName}</p>
                             <p className="text-[10px] text-slate-500 uppercase tracking-tighter">{user?.email}</p>
                          </div>
                          <div className="p-2">
                             <button className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">Profile Settings</button>
                             <button className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">Security Audit</button>
                             <button 
                              onClick={() => setCurrentView('landing')}
                              className="w-full text-left px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            >
                              Logout Instance
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </header>

              <section className="p-10 space-y-8">
                
                <AnimatePresence mode="wait">
                  {activeSidebar === 'Dashboard' ? (
                    <motion.div
                      key="dashboard-view"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-8"
                    >
                      {/* Action Row */}
                      <div className="flex justify-between items-center bg-dash-panel border border-dash-border p-4 rounded-2xl shadow-lg">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                              {simMode ? 'Simulation Mode' : 'Real-time stats'}
                            </span>
                            <span className="text-xs text-slate-300 font-mono">{new Date().toLocaleDateString()}</span>
                          </div>
                          <div className="h-8 w-[1px] bg-zinc-800" />
                          {!simMode && (
                            <button
                              onClick={fetchStats}
                              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-dash-border rounded-lg text-[10px] font-bold text-slate-400 hover:bg-zinc-800 transition-colors"
                            >
                              <Filter className="w-3 h-3" /> REFRESH DATA
                            </button>
                          )}
                        </div>

                        <div className="flex gap-3">
                          {/* SIMULATE toggle */}
                          <button
                            id="simulate-toggle-btn"
                            onClick={toggleSimMode}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-extrabold transition-all border",
                              simMode
                                ? "bg-purple-500/20 border-purple-400/50 text-purple-300 shadow-[0_0_16px_rgba(168,85,247,0.3)]"
                                : "bg-zinc-900 border-dash-border text-slate-500 hover:border-purple-500/40 hover:text-purple-400"
                            )}
                          >
                            {simMode
                              ? <><StopCircle className="w-3.5 h-3.5" /> STOP SIM</>
                              : <><PlayCircle className="w-3.5 h-3.5" /> SIMULATE</>}
                          </button>

                          <button 
                            onClick={toggleIPS}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-extrabold transition-all border",
                              stats.ipsEnabled 
                                ? "bg-dash-accent text-white border-purple-400/30" 
                                : "bg-zinc-900 border-dash-border text-slate-500"
                            )}
                          >
                            <Lock className="w-3.5 h-3.5" />
                            IPS: {stats.ipsEnabled ? 'PROTECTED' : 'DISABLED'}
                          </button>
                          <button 
                            onClick={toggleAttack}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-extrabold transition-all border",
                              stats.isAttackActive
                                ? "bg-white text-black border-white animate-pulse"
                                : "bg-dash-accent/10 border-dash-accent/30 text-dash-accent hover:bg-dash-accent/20"
                            )}
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            {stats.isAttackActive ? 'STOP ATTACK' : 'TRIGGER DDoS'}
                          </button>
                        </div>
                      </div>

                      <AnimatePresence mode="wait">
                        {activeTab === 'Overview' && (
                          <motion.div 
                            key="overview"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-8"
                          >
                            {/* Cards Row */}
                            <div className="flex gap-6">
                              <SummaryCard 
                                title="Throughput" 
                                value={`${stats.throughput.toFixed(1)} Mbps`} 
                                subValue="Real-time data flow rate" 
                                icon={Activity} 
                                gradient 
                                percent={stats.isAttackActive ? "-84.2%" : "+12.5%"}
                              />
                              <SummaryCard 
                                title="Packet Rate" 
                                value={Math.round(stats.pps).toLocaleString()} 
                                subValue="Packets processed per second" 
                                icon={Network} 
                                percent={stats.isAttackActive ? "+1500%" : "+3.2%"}
                              />
                              <SummaryCard 
                                title="Flow Entropy" 
                                value={stats.entropy.toFixed(3)} 
                                subValue="Packet header randomness score" 
                                icon={Database} 
                              />
                              <SummaryCard 
                                title="Controller Load" 
                                value={`${stats.cpu.toFixed(1)} %`} 
                                subValue="CPU usage of SDN controller" 
                                icon={Cpu} 
                              />
                            </div>

                            <div className="grid grid-cols-12 gap-8">
                              {/* Main Chart Area */}
                              <div className="col-span-8 bg-dash-panel border border-dash-border rounded-3xl p-8 shadow-xl">
                                <div className="flex justify-between items-center mb-8">
                                  <div>
                                    <h2 className="text-lg font-bold text-white tracking-tight">SDN Analytics</h2>
                                    <p className="text-xs text-slate-500 font-medium">Monitoring 1D-CNN Feature Extraction Trends</p>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-dash-accent">
                                      <Circle className="w-2 h-2 fill-current" /> Throughput
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-500">
                                      <Circle className="w-2 h-2 fill-current" /> Packet Flow
                                    </div>
                                  </div>
                                </div>

                                <div className="h-[340px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={history}>
                                      <defs>
                                        <linearGradient id="colorThroughput" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.15}/>
                                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                        </linearGradient>
                                      </defs>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" opacity={0.5} />
                                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#52525b' }} hide />
                                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#52525b' }} />
                                      <Tooltip 
                                        contentStyle={{ backgroundColor: '#161616', border: '1px solid #262626', borderRadius: '12px', fontSize: '12px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' }}
                                      />
                                      <Area type="monotone" dataKey="throughput" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorThroughput)" animationDuration={400} />
                                      <Area type="monotone" dataKey="pps" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" fill="url(#colorTarget)" animationDuration={400} />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>

                              {/* Side Status Panel */}
                              <div className="col-span-4 bg-dash-panel border border-dash-border rounded-3xl p-8 shadow-xl flex flex-col">
                                <div className="flex justify-between items-center mb-10">
                                  <h2 className="text-lg font-bold text-white tracking-tight">Threat Vectors</h2>
                                  <button className="text-slate-600 hover:text-slate-400"><MoreHorizontal className="w-5 h-5" /></button>
                                </div>

                                <div className="flex-1 space-y-6">
                                  {[
                                    { label: 'UDP Floods', val: stats.isAttackActive ? '85%' : '12%', color: 'bg-dash-accent' },
                                    { label: 'TCP SYN Scans', val: '70%', color: 'bg-blue-500/60' },
                                    { label: 'ICMP Bursts', val: '45%', color: 'bg-emerald-500/60' },
                                    { label: 'L7 Anomalies', val: '38%', color: 'bg-amber-500/60' },
                                  ].map(item => (
                                    <div key={item.label} className="space-y-2">
                                      <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest px-1">
                                        <span className="text-slate-500">{item.label}</span>
                                        <span className="text-white">{item.val}</span>
                                      </div>
                                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                        <motion.div 
                                          initial={{ width: 0 }}
                                          animate={{ width: item.val }}
                                          className={cn("h-full transition-all duration-1000 rounded-full", item.color)}
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <div className="mt-8 p-4 bg-dash-accent/5 border border-dash-accent/20 rounded-2xl flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full bg-dash-accent animate-pulse" />
                                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Inference Hub Active</span>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-slate-600" />
                                </div>
                              </div>
                            </div>

                            {/* Table Area */}
                            <div className="bg-dash-panel border border-dash-border rounded-3xl overflow-hidden shadow-2xl">
                              <div className="p-8 flex justify-between items-center border-b border-dash-border bg-dash-panel/40">
                                <div>
                                  <h2 className="text-lg font-bold text-white tracking-tight">Operation History</h2>
                                  <p className="text-xs text-slate-500 font-medium">Real-time Controller Log Audit</p>
                                </div>
                                <div className="flex gap-3">
                                  <button
                                    onClick={() => window.open('/api/logs/download?type=events', '_blank')}
                                    className="flex items-center gap-2 px-4 py-2 border border-dash-border rounded-xl text-[10px] font-bold text-slate-400 hover:bg-zinc-800 transition-colors"
                                  >
                                    <Download className="w-3.5 h-3.5" /> DOWNLOAD CSV
                                  </button>
                                  <button
                                    onClick={fetchStats}
                                    className="flex items-center gap-2 px-4 py-2 bg-dash-accent text-white rounded-xl text-[10px] font-extrabold hover:bg-dash-accent-hover transition-colors"
                                  >
                                    <Terminal className="w-3.5 h-3.5" /> RE-SCAN PORT
                                  </button>
                                </div>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                  <thead>
                                    <tr className="text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-dash-border">
                                      <th className="px-8 py-4">Status</th>
                                      <th className="px-8 py-4">Timestamp</th>
                                      <th className="px-8 py-4">Event Description</th>
                                      <th className="px-8 py-4">Category</th>
                                      <th className="px-8 py-4 text-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="text-xs font-medium">
                                    {(stats.logs || [])
                                      .filter((l: any) => (l.message ?? '').toLowerCase().includes(searchQuery.toLowerCase()))
                                      .map((log: any) => (
                                      <tr key={log.id} className="border-b border-dash-border/50 hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-4">
                                          <div className="flex items-center gap-3">
                                            <div className={cn(
                                              "w-2 h-2 rounded-full",
                                              log.type === 'danger' ? 'bg-rose-500' : 
                                              log.type === 'warning' ? 'bg-amber-500' : 
                                              log.type === 'success' ? 'bg-emerald-500' : 'bg-slate-600'
                                            )} />
                                            <span className={cn(
                                              "text-[10px] font-bold uppercase",
                                              log.type === 'danger' ? 'text-rose-500' : 
                                              log.type === 'warning' ? 'text-amber-500' : 
                                              log.type === 'success' ? 'text-emerald-500' : 'text-slate-600'
                                            )}>
                                              {log.type === 'danger' ? 'Blocked' : log.type === 'warning' ? 'Warning' : log.type === 'success' ? 'Resolved' : 'Info'}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="px-8 py-4 text-slate-500 font-mono italic">{log.timestamp}</td>
                                        <td className="px-8 py-4 text-slate-200">{log.message}</td>
                                        <td className="px-8 py-4">
                                          <span className="px-2 py-1 bg-zinc-800 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-tighter">SDN_V_EVENT</span>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                          <button className="text-[10px] font-bold text-slate-600 hover:text-white px-3 py-1.5 rounded-lg border border-dash-border/50 group-hover:border-dash-accent/50 transition-all">Details</button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </motion.div>
                        )}

                        {activeTab === 'Nodes' && (
                          <motion.div 
                            key="nodes"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="grid grid-cols-3 gap-6"
                          >
                             <NodeCard name="Apex_CORE_CTRL" type="Controller" status="Online" ip="10.0.0.1" mac="00:00:00:00:00:01" load={stats.cpu.toFixed(0)} />
                             <NodeCard name="Insforge_BACKEND" type="Backend" status="Online" ip="10.0.0.254" mac="00:00:00:00:00:FF" load="12" />
                            <NodeCard name="OVS_Switch_01" type="Switch" status="Online" ip="10.0.0.2" mac="00:00:00:00:01:02" load="42" />
                            <NodeCard name="OVS_Switch_02" type="Switch" status="Online" ip="10.0.0.3" mac="00:00:00:00:01:03" load="15" />
                            <NodeCard name="Web_Server_Farm" type="Host" status="Online" ip="192.168.1.10" mac="08:00:27:6c:9c:e1" load="68" />
                            <NodeCard name="DDoS_Vector_Mock" type="Host" status={stats.isAttackActive ? "Online" : "Offline"} ip="172.16.0.4" mac="08:00:27:4f:b1:a2" load={stats.isAttackActive ? "95" : "0"} />
                            <NodeCard name="Database_Mirror" type="Host" status="Online" ip="192.168.1.11" mac="08:00:27:aa:bb:cc" load="12" />
                          </motion.div>
                        )}

                        {activeTab === 'Security Rules' && (
                          <motion.div 
                            key="rules"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-dash-panel border border-dash-border rounded-3xl overflow-hidden shadow-2xl"
                          >
                            <div className="p-8 border-b border-dash-border bg-dash-panel/40 flex justify-between items-center">
                              <div>
                                <h2 className="text-lg font-bold text-white tracking-tight">Active Flow Rules</h2>
                                <p className="text-xs text-slate-500 font-medium font-mono lowercase tracking-tighter">Current OpenFlow mitigation strategies in data plane</p>
                              </div>
                              <button className="px-4 py-2 bg-dash-accent text-white text-[10px] font-black rounded-xl">NEW RULE +</button>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-dash-border">
                                    <th className="px-8 py-4">Rule ID</th>
                                    <th className="px-8 py-4">Priority</th>
                                    <th className="px-8 py-4">Match Conditions</th>
                                    <th className="px-8 py-4">Action</th>
                                    <th className="px-8 py-4">Statistics</th>
                                    <th className="px-8 py-4 text-right">Control</th>
                                  </tr>
                                </thead>
                                <tbody className="text-xs font-medium">
                                  <SecurityRuleRow id="1" priority={100} match="eth_type=0x0800;ip_proto=6" action="ALLOW" packets={12450} bytes={1560244} />
                                  <SecurityRuleRow id="2" priority={32768} match="eth_type=0x0800;ip_proto=17;udp_dst=80" action="ALLOW" packets={840} bytes={51200} />
                                  {stats.isAttackActive && stats.ipsEnabled && (
                                    <SecurityRuleRow id="3" priority={65535} match="eth_type=0x0800;ip_proto=17;udp_dst=*;entropy>0.7" action="DENY" packets={9456023} bytes={845120033} />
                                  )}
                                  <SecurityRuleRow id="4" priority={10} match="eth_type=0x0806" action="ALLOW" packets={45} bytes={2100} />
                                </tbody>
                              </table>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ) : activeSidebar === 'Traffic Analysis' ? (
                    <TrafficAnalysis key="traffic" stats={stats} history={history} />
                  ) : activeSidebar === 'Topology Control' ? (
                    <TopologyControl key="topology" />
                  ) : activeSidebar === 'Log Archive' ? (
                    <LogArchive key="logs" />
                  ) : activeSidebar === 'System Config' ? (
                    <SystemConfig key="config" />
                  ) : (
                    <motion.div
                      key="other-view"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      className="flex flex-col items-center justify-center min-h-[60vh] bg-dash-panel border border-dash-border border-dashed rounded-3xl"
                    >
                      <div className="w-20 h-20 bg-dash-accent/10 rounded-full flex items-center justify-center mb-6">
                         <Settings className="w-10 h-10 text-dash-accent" />
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">{activeSidebar} Module</h2>
                      <p className="text-slate-500 max-w-sm text-center text-sm">This module is currently in standby mode. Data synchronization with the core SDN controller is active.</p>
                      <button 
                        onClick={() => setActiveSidebar('Dashboard')}
                        className="mt-8 px-6 py-2 bg-dash-accent text-white font-bold rounded-xl hover:bg-dash-accent-hover transition-colors"
                      >
                        Return to Dashboard
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

              </section>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

