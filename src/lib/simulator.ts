/**
 * Apex SDN — Browser Simulation Engine
 *
 * Generates realistic, animated SDN network data entirely in the browser.
 * No backend required. Compatible with the existing NetworkStats shape used
 * by App.tsx's fetchStats transform pipeline.
 */

// ─── Types (mirrors apiClient.ts shapes) ─────────────────────────────────────

export interface SimNetworkEvent {
  id: string;
  type: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  sourceIp: string | null;
  resolved: boolean;
  createdAt: string;
}

export interface SimBlockedHost {
  id: string;
  ipAddress: string;
  reason: string | null;
  active: boolean;
  createdAt: string;
  unblockedAt: string | null;
}

export interface SimSwitchStat {
  dpid: string;
  flowCount: number;
  packetCount: number;
  byteCount: number;
  ports: unknown[];
}

export interface SimStats {
  live: boolean;
  totalSwitches: number;
  totalPackets: number;
  totalBytes: number;
  totalFlows: number;
  switches: SimSwitchStat[];
  logs: SimNetworkEvent[];
  blockedHosts: SimBlockedHost[];
  isAttackActive: boolean;
  ipsEnabled: boolean;
}

// ─── Internal State ───────────────────────────────────────────────────────────

type SimPhase = 'idle' | 'attack' | 'mitigating' | 'recovered';

interface SimState {
  phase: SimPhase;
  tick: number;
  phaseTick: number;
  totalPackets: number;
  totalBytes: number;
  totalFlows: number;
  logs: SimNetworkEvent[];
  blockedHosts: SimBlockedHost[];
  ipsEnabled: boolean;
  attackerIp: string;
  eventIdCounter: number;
  blockIdCounter: number;
  mitigationProgress: number; // 0-1 as mitigation completes
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(state: SimState, prefix: 'evt' | 'blk'): string {
  if (prefix === 'evt') return `sim-evt-${++state.eventIdCounter}`;
  return `sim-blk-${++state.blockIdCounter}`;
}

function jitter(base: number, pct: number): number {
  return base * (1 + (Math.random() * 2 - 1) * pct);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(Math.max(t, 0), 1);
}

function nowIso(): string {
  return new Date().toISOString();
}

// Static switch topology
const SWITCHES: SimSwitchStat[] = [
  { dpid: '0000000000000001', flowCount: 8,  packetCount: 0, byteCount: 0, ports: [] },
  { dpid: '0000000000000002', flowCount: 12, packetCount: 0, byteCount: 0, ports: [] },
  { dpid: '0000000000000003', flowCount: 6,  packetCount: 0, byteCount: 0, ports: [] },
];

// Pre-seeded log pool for idle chatter
const IDLE_LOG_POOL: Array<Omit<SimNetworkEvent, 'id' | 'createdAt'>> = [
  { type: 'FLOW_INSTALLED',    message: 'Flow rule installed on OVS_Switch_01 → port 3',         severity: 'INFO',    sourceIp: '10.0.0.2',     resolved: true  },
  { type: 'HOST_DISCOVERED',   message: 'New host 192.168.1.42 discovered on switch dpid:0x02',  severity: 'INFO',    sourceIp: '192.168.1.42', resolved: true  },
  { type: 'LINK_UP',           message: 'Port 2 on OVS_Switch_02 transitioned to UP state',      severity: 'INFO',    sourceIp: null,           resolved: true  },
  { type: 'TOPOLOGY_UPDATED',  message: 'Topology graph refreshed — 3 switches, 7 hosts',        severity: 'INFO',    sourceIp: null,           resolved: true  },
  { type: 'STATS_COLLECTED',   message: 'Controller polled switch stats — 26 active flows',      severity: 'INFO',    sourceIp: null,           resolved: true  },
  { type: 'FLOW_TIMEOUT',      message: 'Idle flow expired on dpid:0x01 (src: 10.0.0.4)',        severity: 'WARNING', sourceIp: '10.0.0.4',     resolved: true  },
  { type: 'ARP_FLOOD',         message: 'Spike in ARP broadcasts from 192.168.1.20 — monitoring',severity: 'WARNING', sourceIp: '192.168.1.20', resolved: false },
  { type: 'PACKET_IN_SURGE',   message: 'Packet-in rate elevated on dpid:0x03 — 812 events/s',  severity: 'WARNING', sourceIp: null,           resolved: false },
];

const ATTACK_LOG_POOL: Array<Omit<SimNetworkEvent, 'id' | 'createdAt'>> = [
  { type: 'DDOS_DETECTED',     message: 'DDoS DETECTED — UDP flood from {ip} at 14,500 pps',    severity: 'CRITICAL', sourceIp: null, resolved: false },
  { type: 'ENTROPY_CRITICAL',  message: 'Flow entropy exceeded threshold (0.94) — anomaly flagged', severity: 'CRITICAL', sourceIp: null, resolved: false },
  { type: 'CONTROLLER_OVERLOAD',message: 'SDN controller processing queue at 91% capacity',      severity: 'CRITICAL', sourceIp: null, resolved: false },
  { type: 'PORT_SATURATION',   message: 'Port 1 on OVS_Switch_01 saturated — 978 Mbps ingress', severity: 'CRITICAL', sourceIp: null, resolved: false },
  { type: 'SYN_FLOOD',         message: 'SYN flood wave detected from {ip} → port 80/443',      severity: 'CRITICAL', sourceIp: null, resolved: false },
  { type: 'PACKET_DROP',       message: 'Packet drop rate at 23% — upstream congestion detected',severity: 'WARNING',  sourceIp: null, resolved: false },
];

const MITIGATION_LOG_POOL: Array<Omit<SimNetworkEvent, 'id' | 'createdAt'>> = [
  { type: 'IPS_ACTIVATED',     message: 'IPS engaged — deploying high-priority DROP rules on all switches', severity: 'WARNING', sourceIp: null, resolved: false },
  { type: 'HOST_BLOCKED',      message: 'IP {ip} isolated — DROP rule pushed to 3 switches (priority 65535)', severity: 'WARNING', sourceIp: null, resolved: false },
  { type: 'FLOW_RATE_DROPPING',message: 'Malicious flow rate decreasing — mitigation in progress',  severity: 'INFO', sourceIp: null, resolved: true  },
  { type: 'DDOS_MITIGATED',    message: 'Attack fully neutralised — network traffic returning to baseline', severity: 'INFO', sourceIp: null, resolved: true  },
  { type: 'IPS_REPORT',        message: 'IPS blocked 9,456,023 packets from {ip} in 8.4 seconds',  severity: 'INFO', sourceIp: null, resolved: true  },
];

// ─── Engine ───────────────────────────────────────────────────────────────────

const MAX_LOGS = 30;

class ApexSimulator {
  private state: SimState;
  private subscribers: Array<(stats: SimStats) => void> = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.state = this.createInitialState();
    // Seed with a handful of idle logs
    this.seedIdleLogs(5);
  }

  private createInitialState(): SimState {
    return {
      phase: 'idle',
      tick: 0,
      phaseTick: 0,
      totalPackets: 2_840_000 + Math.floor(Math.random() * 100_000),
      totalBytes: 380_000_000 + Math.floor(Math.random() * 10_000_000),
      totalFlows: 26,
      logs: [],
      blockedHosts: [],
      ipsEnabled: false,
      attackerIp: '172.16.0.4',
      eventIdCounter: 0,
      blockIdCounter: 0,
      mitigationProgress: 0,
    };
  }

  private seedIdleLogs(count: number) {
    for (let i = 0; i < count; i++) {
      const template = IDLE_LOG_POOL[i % IDLE_LOG_POOL.length];
      this.state.logs.unshift({
        ...template,
        id: uid(this.state, 'evt'),
        createdAt: new Date(Date.now() - (count - i) * 12_000).toISOString(),
      });
    }
  }

  private addLog(template: Omit<SimNetworkEvent, 'id' | 'createdAt'>, ip?: string) {
    const log: SimNetworkEvent = {
      ...template,
      message: template.message.replace('{ip}', ip ?? this.state.attackerIp),
      sourceIp: template.sourceIp ?? (ip || null),
      id: uid(this.state, 'evt'),
      createdAt: nowIso(),
    };
    this.state.logs.unshift(log);
    if (this.state.logs.length > MAX_LOGS) {
      this.state.logs = this.state.logs.slice(0, MAX_LOGS);
    }
  }

  // ── Metric Computation ──────────────────────────────────────────────────────

  private computeStats(): SimStats {
    const s = this.state;
    const { phase, phaseTick, mitigationProgress } = s;

    // --- Base idle metrics ---
    const idleThroughputBytes = jitter(47 * 1024 * 1024, 0.08); // ~47 Mbps
    const idlePps = jitter(3_400, 0.12);

    let throughputBytes: number;
    let pps: number;
    let entropy: number;
    let flowCount: number;

    switch (phase) {
      case 'attack': {
        // Ramp up over first ~5 ticks then sustain
        const ramp = Math.min(phaseTick / 5, 1);
        throughputBytes = lerp(idleThroughputBytes, jitter(980 * 1024 * 1024, 0.05), ramp);
        pps             = lerp(idlePps, jitter(148_000, 0.08), ramp);
        entropy         = lerp(0.31, jitter(0.947, 0.01), ramp);
        flowCount       = Math.round(lerp(26, 320 + phaseTick * 12, ramp));
        break;
      }
      case 'mitigating': {
        // t goes 0→1 as mitigation progresses
        const t = mitigationProgress;
        throughputBytes = lerp(980 * 1024 * 1024, idleThroughputBytes, t * t);
        pps             = lerp(148_000, idlePps, t * t);
        entropy         = lerp(0.947, 0.31, t);
        flowCount       = Math.round(lerp(320, 26, t));
        break;
      }
      case 'recovered': {
        throughputBytes = jitter(idleThroughputBytes, 0.06);
        pps             = jitter(idlePps, 0.1);
        entropy         = jitter(0.31, 0.05);
        flowCount       = 26;
        break;
      }
      default: {
        // idle
        throughputBytes = jitter(idleThroughputBytes, 0.08);
        pps             = jitter(idlePps, 0.12);
        entropy         = jitter(0.31, 0.05);
        flowCount       = 26;
      }
    }

    // Accumulate counters
    s.totalPackets += Math.round(pps / 2); // ticks every ~2s
    s.totalBytes   += Math.round(throughputBytes / 2);
    s.totalFlows    = flowCount;

    // Build switches with current stats
    const switches = SWITCHES.map((sw, i) => ({
      ...sw,
      flowCount: Math.round(flowCount * [0.42, 0.35, 0.23][i]),
      packetCount: Math.round(s.totalPackets * [0.5, 0.35, 0.15][i]),
      byteCount:   Math.round(s.totalBytes   * [0.5, 0.35, 0.15][i]),
    }));

    return {
      live: true,
      totalSwitches: SWITCHES.length,
      totalPackets:  s.totalPackets,
      totalBytes:    s.totalBytes,
      totalFlows:    s.totalFlows,
      switches,
      logs:          [...s.logs],
      blockedHosts:  [...s.blockedHosts],
      isAttackActive: phase === 'attack' || phase === 'mitigating',
      ipsEnabled:    s.ipsEnabled,
    };
  }

  // ── Tick Logic ──────────────────────────────────────────────────────────────

  private tick() {
    const s = this.state;
    s.tick++;
    s.phaseTick++;

    switch (s.phase) {
      case 'idle': {
        // Occasionally emit an idle event (every ~15 ticks ≈ 30s)
        if (s.tick % 15 === 0) {
          const pool = IDLE_LOG_POOL.filter(l => l.severity === 'INFO');
          this.addLog(pool[Math.floor(Math.random() * pool.length)]);
        }
        break;
      }

      case 'attack': {
        // Flood attack events in first 4 ticks
        if (s.phaseTick <= 4) {
          const template = ATTACK_LOG_POOL[s.phaseTick - 1] ?? ATTACK_LOG_POOL[0];
          this.addLog(template, s.attackerIp);
        } else if (s.phaseTick % 3 === 0) {
          // Recurring attack telemetry
          this.addLog(ATTACK_LOG_POOL[Math.floor(Math.random() * ATTACK_LOG_POOL.length)], s.attackerIp);
        }

        // If IPS was enabled during attack → begin mitigation
        if (s.ipsEnabled) {
          this.startMitigation();
        }
        break;
      }

      case 'mitigating': {
        // Progress mitigation over ~8 ticks (16s)
        s.mitigationProgress = Math.min(s.mitigationProgress + 0.125, 1);

        // Log mitigation events at key milestones
        if (s.phaseTick === 1) this.addLog(MITIGATION_LOG_POOL[0]);
        if (s.phaseTick === 2) this.addLog(MITIGATION_LOG_POOL[1], s.attackerIp);
        if (s.phaseTick === 5) this.addLog(MITIGATION_LOG_POOL[2]);
        if (s.phaseTick === 8) {
          this.addLog(MITIGATION_LOG_POOL[3]);
          this.addLog(MITIGATION_LOG_POOL[4], s.attackerIp);
        }

        if (s.mitigationProgress >= 1) {
          s.phase = 'recovered';
          s.phaseTick = 0;
        }
        break;
      }

      case 'recovered': {
        // After 5 quiet ticks, return to idle
        if (s.phaseTick >= 5) {
          s.phase = 'idle';
          s.phaseTick = 0;
        }
        // Occasional post-attack info logs
        if (s.phaseTick === 2) {
          this.addLog({ type: 'TOPOLOGY_UPDATED', message: 'Topology stable — 3 switches, 7 hosts active', severity: 'INFO', sourceIp: null, resolved: true });
        }
        break;
      }
    }

    const stats = this.computeStats();
    this.subscribers.forEach(cb => cb(stats));
  }

  // ── Public Controls ─────────────────────────────────────────────────────────

  /** Start the simulation engine (2-second ticks, matching real polling interval) */
  start() {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.tick(), 2000);
    // Emit immediately so the UI isn't blank
    this.subscribers.forEach(cb => cb(this.computeStats()));
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  subscribe(cb: (stats: SimStats) => void): () => void {
    this.subscribers.push(cb);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== cb);
    };
  }

  /** Trigger a DDoS attack simulation */
  triggerAttack() {
    if (this.state.phase !== 'idle' && this.state.phase !== 'recovered') return;
    this.state.phase = 'attack';
    this.state.phaseTick = 0;
    this.tick(); // immediate feedback
  }

  /** Stop a running attack */
  stopAttack() {
    if (this.state.phase !== 'attack') return;
    this.state.phase = 'idle';
    this.state.phaseTick = 0;
    this.addLog({ type: 'ATTACK_CANCELLED', message: 'Attack simulation cancelled by operator', severity: 'INFO', sourceIp: null, resolved: true });
    this.tick();
  }

  /** Toggle IPS on/off */
  setIPS(enabled: boolean) {
    this.state.ipsEnabled = enabled;

    if (enabled && this.state.phase === 'attack') {
      this.startMitigation();
    }

    if (!enabled) {
      this.addLog({ type: 'IPS_DISABLED', message: 'IPS protection disabled by operator', severity: 'WARNING', sourceIp: null, resolved: false });
    } else {
      this.addLog({ type: 'IPS_ENABLED', message: 'IPS protection activated — monitoring all flows', severity: 'INFO', sourceIp: null, resolved: true });
    }
    this.tick();
  }

  private startMitigation() {
    if (this.state.phase === 'mitigating') return;
    this.state.phase = 'mitigating';
    this.state.phaseTick = 0;
    this.state.mitigationProgress = 0;

    // Block the attacker IP
    const already = this.state.blockedHosts.find(
      h => h.ipAddress === this.state.attackerIp && h.active
    );
    if (!already) {
      this.state.blockedHosts.push({
        id: uid(this.state, 'blk'),
        ipAddress: this.state.attackerIp,
        reason: 'DDoS attack — UDP flood (simulated)',
        active: true,
        createdAt: nowIso(),
        unblockedAt: null,
      });
    }
  }

  /** Get current phase for UI labels */
  getPhase(): SimPhase {
    return this.state.phase;
  }

  /** Snapshot of current stats (for initial render before first tick) */
  snapshot(): SimStats {
    return this.computeStats();
  }

  /** Reset everything back to idle */
  reset() {
    this.state = this.createInitialState();
    this.seedIdleLogs(5);
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────

export const simulator = new ApexSimulator();
