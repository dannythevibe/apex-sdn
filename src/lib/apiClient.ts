const BASE = '/api';

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include', // send httpOnly refresh cookie
  });

  // Auto-refresh on 401
  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(path, options, false);
    }
    accessToken = null;
    window.dispatchEvent(new Event('auth:logout'));
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `API error ${res.status}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return false;
    const data = await res.json() as { accessToken: string };
    accessToken = data.accessToken;
    return true;
  } catch {
    return false;
  }
}

// Auth
export const authApi = {
  register: (body: { email: string; password: string; firstName: string; lastName: string }) =>
    request<{ accessToken: string; user: User }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: { email: string; password: string }) =>
    request<{ accessToken: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  logout: () =>
    request<{ success: boolean }>('/auth/logout', { method: 'POST' }),

  me: () =>
    request<{ user: User }>('/auth/me'),

  refresh: () => tryRefresh(),
};

// Network
export const networkApi = {
  stats: () =>
    request<NetworkStats>('/network/stats'),

  topology: () =>
    request<Topology>('/network/topology'),

  flows: (dpid: string) =>
    request<Record<string, unknown[]>>(`/network/flows/${dpid}`),

  addFlow: (body: FlowRuleBody) =>
    request<{ success: boolean }>('/network/flows', { method: 'POST', body: JSON.stringify(body) }),

  deleteFlow: (body: { dpid: string; match: Record<string, unknown> }) =>
    request<{ success: boolean }>('/network/flows', { method: 'DELETE', body: JSON.stringify(body) }),

  block: (body: { ipAddress: string; reason?: string }) =>
    request<{ success: boolean; blockedOn: string[] }>('/network/block', { method: 'POST', body: JSON.stringify(body) }),

  unblock: (body: { ipAddress: string }) =>
    request<{ success: boolean }>('/network/unblock', { method: 'POST', body: JSON.stringify(body) }),

  blocked: () =>
    request<{ hosts: BlockedHost[] }>('/network/blocked'),
};

// Logs
export const logsApi = {
  events: (params?: { page?: number; limit?: number; severity?: string; type?: string; resolved?: boolean }) => {
    const qs = new URLSearchParams();
    if (params?.page)     qs.set('page',     String(params.page));
    if (params?.limit)    qs.set('limit',    String(params.limit));
    if (params?.severity) qs.set('severity', params.severity);
    if (params?.type)     qs.set('type',     params.type);
    if (params?.resolved !== undefined) qs.set('resolved', String(params.resolved));
    return request<EventsResponse>(`/logs/events?${qs}`);
  },

  resolveEvent: (id: string, resolved: boolean) =>
    request<{ event: NetworkEvent }>(`/logs/events/${id}/resolve`, { method: 'POST', body: JSON.stringify({ resolved }) }),

  audit: (params?: { page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page)  qs.set('page',  String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    return request<AuditResponse>(`/logs/audit?${qs}`);
  },

  downloadCsv: (type: 'events' | 'audit') => {
    window.open(`${BASE}/logs/download?type=${type}`, '_blank');
  },
};

// --- Types ---
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt?: string;
}

export interface NetworkStats {
  live: boolean;
  totalSwitches: number;
  totalPackets: number;
  totalBytes: number;
  totalFlows: number;
  switches: SwitchStat[];
  logs: NetworkEvent[];
  blockedHosts: BlockedHost[];
  isAttackActive: boolean;
  ipsEnabled: boolean;
}

export interface SwitchStat {
  dpid: string;
  flowCount: number;
  packetCount: number;
  byteCount: number;
  ports: unknown[];
}

export interface Topology {
  switches: unknown[];
  hosts: unknown[];
  links: unknown[];
}

export interface NetworkEvent {
  id: string;
  type: string;
  message: string | null;
  severity: string;
  sourceIp: string | null;
  resolved: boolean;
  createdAt: string;
}

export interface BlockedHost {
  id: string;
  ipAddress: string;
  reason: string | null;
  active: boolean;
  createdAt: string;
  unblockedAt: string | null;
}

export interface FlowRuleBody {
  dpid: string;
  priority: number;
  match: Record<string, unknown>;
  actions: Array<Record<string, unknown>>;
  idle_timeout?: number;
  hard_timeout?: number;
}

interface EventsResponse {
  events: NetworkEvent[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface AuditResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface AuditLog {
  id: string;
  action: string;
  resource: string;
  createdAt: string;
  user: { email: string; firstName: string; lastName: string } | null;
}
