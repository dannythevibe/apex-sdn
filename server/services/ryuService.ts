import { prisma } from '../lib/prisma';

const RYU_BASE = process.env.RYU_URL || 'http://localhost:8080';
const TIMEOUT_MS = 5000;

async function ryuFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${RYU_BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...options?.headers },
    });
    clearTimeout(id);
    if (!res.ok) throw new Error(`Ryu API ${res.status}: ${path}`);
    return res.json() as Promise<T>;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

export async function getSwitches(): Promise<number[]> {
  return ryuFetch<number[]>('/stats/switches');
}

export async function getTopology() {
  const [switches, hosts, links] = await Promise.all([
    ryuFetch<unknown[]>('/v1.0/topology/switches'),
    ryuFetch<unknown[]>('/v1.0/topology/hosts'),
    ryuFetch<unknown[]>('/v1.0/topology/links'),
  ]);
  return { switches, hosts, links };
}

export async function getFlowStats(dpid: string) {
  return ryuFetch<Record<string, unknown[]>>(`/stats/flow/${dpid}`);
}

export async function getPortStats(dpid: string) {
  return ryuFetch<Record<string, unknown[]>>(`/stats/port/${dpid}`);
}

export async function getAggregateStats(dpid: string) {
  return ryuFetch<Record<string, { flow_count: number; packet_count: number; byte_count: number }>>(
    `/stats/aggregateflow/${dpid}`
  );
}

export async function addFlowRule(
  dpid: string,
  rule: {
    priority: number;
    match: Record<string, unknown>;
    actions: Array<Record<string, unknown>>;
    idle_timeout?: number;
    hard_timeout?: number;
  }
) {
  await ryuFetch('/stats/flowentry/add', {
    method: 'POST',
    body: JSON.stringify({ dpid: parseInt(dpid, 10), ...rule }),
  });

  await prisma.flowRule.create({
    data: {
      switchId: dpid,
      priority: rule.priority,
      match: rule.match,
      actions: rule.actions,
    },
  });
}

export async function deleteFlowRule(dpid: string, match: Record<string, unknown>) {
  await ryuFetch('/stats/flowentry/delete', {
    method: 'POST',
    body: JSON.stringify({ dpid: parseInt(dpid, 10), match }),
  });

  await prisma.flowRule.updateMany({
    where: { switchId: dpid },
    data: { active: false },
  });
}

export async function blockHost(ipAddress: string, dpids: string[], reason?: string) {
  for (const dpid of dpids) {
    await addFlowRule(dpid, {
      priority: 65535,
      match: { nw_src: ipAddress, eth_type: 0x0800 },
      actions: [],
      hard_timeout: 0,
    });
  }

  await prisma.blockedHost.upsert({
    where: { ipAddress },
    update: { active: true, unblockedAt: null, reason: reason ?? null },
    create: { ipAddress, reason: reason ?? null },
  });

  await prisma.networkEvent.create({
    data: {
      type: 'IPS_TRIGGERED',
      message: `Host ${ipAddress} blocked — ${reason ?? 'manual block'}`,
      severity: 'WARNING',
      sourceIp: ipAddress,
    },
  });
}

export async function unblockHost(ipAddress: string, dpids: string[]) {
  for (const dpid of dpids) {
    await deleteFlowRule(dpid, { nw_src: ipAddress, eth_type: 0x0800 });
  }

  await prisma.blockedHost.update({
    where: { ipAddress },
    data: { active: false, unblockedAt: new Date() },
  });

  await prisma.networkEvent.create({
    data: {
      type: 'INFO',
      message: `Host ${ipAddress} unblocked`,
      severity: 'INFO',
      sourceIp: ipAddress,
    },
  });
}

export async function buildNetworkStats() {
  try {
    const switchIds = await getSwitches();

    const switchStats = await Promise.all(
      switchIds.map(async (dpid) => {
        try {
          const [agg, ports] = await Promise.all([
            getAggregateStats(String(dpid)),
            getPortStats(String(dpid)),
          ]);
          const d = agg[dpid] ?? { flow_count: 0, packet_count: 0, byte_count: 0 };
          return {
            dpid: String(dpid),
            flowCount: d.flow_count,
            packetCount: d.packet_count,
            byteCount: d.byte_count,
            ports: (ports[dpid] ?? []) as unknown[],
          };
        } catch {
          return { dpid: String(dpid), flowCount: 0, packetCount: 0, byteCount: 0, ports: [] };
        }
      })
    );

    const totalPackets = switchStats.reduce((s, sw) => s + sw.packetCount, 0);
    const totalBytes   = switchStats.reduce((s, sw) => s + sw.byteCount, 0);
    const totalFlows   = switchStats.reduce((s, sw) => s + sw.flowCount, 0);

    const [recentEvents, blockedHosts] = await Promise.all([
      prisma.networkEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.blockedHost.findMany({ where: { active: true } }),
    ]);

    return {
      live: true,
      totalSwitches: switchIds.length,
      totalPackets,
      totalBytes,
      totalFlows,
      switches: switchStats,
      logs: recentEvents,
      blockedHosts,
      isAttackActive: recentEvents.some(
        (e) => e.type === 'DDOS_DETECTED' && !e.resolved
      ),
      ipsEnabled: true,
    };
  } catch {
    // Ryu offline — serve from DB only
    const [recentEvents, blockedHosts, flowRules] = await Promise.all([
      prisma.networkEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
      prisma.blockedHost.findMany({ where: { active: true } }),
      prisma.flowRule.findMany({ where: { active: true } }),
    ]);

    return {
      live: false,
      totalSwitches: 0,
      totalPackets: 0,
      totalBytes: 0,
      totalFlows: flowRules.length,
      switches: [],
      logs: recentEvents,
      blockedHosts,
      isAttackActive: false,
      ipsEnabled: false,
    };
  }
}
