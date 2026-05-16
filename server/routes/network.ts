import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { apiLimiter } from '../middleware/rateLimiter';
import { prisma } from '../lib/prisma';
import {
  buildNetworkStats,
  getTopology,
  getFlowStats,
  addFlowRule,
  deleteFlowRule,
  blockHost,
  unblockHost,
  getSwitches,
} from '../services/ryuService';

const router = Router();

router.use(authenticate);
router.use(apiLimiter);

const flowRuleSchema = z.object({
  dpid: z.string().min(1),
  priority: z.number().int().min(0).max(65535),
  match: z.record(z.unknown()),
  actions: z.array(z.record(z.unknown())),
  idle_timeout: z.number().int().min(0).optional(),
  hard_timeout: z.number().int().min(0).optional(),
});

const deleteFlowSchema = z.object({
  dpid: z.string().min(1),
  match: z.record(z.unknown()),
});

const blockSchema = z.object({
  ipAddress: z.string().ip(),
  reason: z.string().max(500).optional(),
});

const unblockSchema = z.object({
  ipAddress: z.string().ip(),
});

// GET /api/network/stats
router.get('/stats', async (_req, res) => {
  const stats = await buildNetworkStats();
  res.json(stats);
});

// GET /api/network/topology
router.get('/topology', async (_req, res) => {
  try {
    const topology = await getTopology();
    res.json(topology);
  } catch {
    res.status(503).json({ error: 'Ryu controller unavailable' });
  }
});

// GET /api/network/switches
router.get('/switches', async (_req, res) => {
  try {
    const switches = await getSwitches();
    res.json({ switches });
  } catch {
    res.status(503).json({ error: 'Ryu controller unavailable' });
  }
});

// GET /api/network/flows/:dpid
router.get('/flows/:dpid', async (req, res) => {
  try {
    const flows = await getFlowStats(req.params.dpid);
    res.json(flows);
  } catch {
    res.status(503).json({ error: 'Ryu controller unavailable' });
  }
});

// POST /api/network/flows
router.post('/flows', requireAdmin, validate(flowRuleSchema), async (req: AuthRequest, res) => {
  const { dpid, ...rule } = req.body;
  try {
    await addFlowRule(dpid, rule);
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'ADD_FLOW',
        resource: `switch/${dpid}`,
        details: { rule },
      },
    });
    res.status(201).json({ success: true });
  } catch {
    res.status(503).json({ error: 'Failed to add flow rule' });
  }
});

// DELETE /api/network/flows
router.delete('/flows', requireAdmin, validate(deleteFlowSchema), async (req: AuthRequest, res) => {
  const { dpid, match } = req.body;
  try {
    await deleteFlowRule(dpid, match);
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'DELETE_FLOW',
        resource: `switch/${dpid}`,
        details: { match },
      },
    });
    res.json({ success: true });
  } catch {
    res.status(503).json({ error: 'Failed to delete flow rule' });
  }
});

// POST /api/network/block
router.post('/block', requireAdmin, validate(blockSchema), async (req: AuthRequest, res) => {
  const { ipAddress, reason } = req.body;
  try {
    const switches = await getSwitches();
    const dpids = switches.map(String);
    await blockHost(ipAddress, dpids, reason);
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'BLOCK_HOST',
        resource: 'ips',
        details: { ipAddress, reason },
      },
    });
    res.json({ success: true, blockedOn: dpids });
  } catch (err) {
    res.status(500).json({ error: 'Failed to block host' });
  }
});

// POST /api/network/unblock
router.post('/unblock', requireAdmin, validate(unblockSchema), async (req: AuthRequest, res) => {
  const { ipAddress } = req.body;
  try {
    const switches = await getSwitches();
    const dpids = switches.map(String);
    await unblockHost(ipAddress, dpids);
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UNBLOCK_HOST',
        resource: 'ips',
        details: { ipAddress },
      },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to unblock host' });
  }
});

// GET /api/network/blocked
router.get('/blocked', async (_req, res) => {
  const hosts = await prisma.blockedHost.findMany({
    orderBy: { createdAt: 'desc' },
  });
  res.json({ hosts });
});

export default router;
