import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { apiLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(authenticate);
router.use(apiLimiter);

const resolveSchema = z.object({
  resolved: z.boolean(),
});

// GET /api/logs/events?page=1&limit=50&severity=WARNING&type=DDOS_DETECTED
router.get('/events', async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
  const skip  = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (req.query.severity) where.severity = req.query.severity;
  if (req.query.type)     where.type     = req.query.type;
  if (req.query.resolved !== undefined) where.resolved = req.query.resolved === 'true';

  const [events, total] = await Promise.all([
    prisma.networkEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.networkEvent.count({ where }),
  ]);

  res.json({ events, total, page, limit, pages: Math.ceil(total / limit) });
});

// POST /api/logs/events/:id/resolve
router.post('/events/:id/resolve', requireAdmin, validate(resolveSchema), async (req: AuthRequest, res) => {
  const event = await prisma.networkEvent.update({
    where: { id: req.params.id },
    data: { resolved: req.body.resolved },
  });
  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: req.body.resolved ? 'RESOLVE_EVENT' : 'UNRESOLVE_EVENT',
      resource: `event/${req.params.id}`,
      details: "{}",
    },
  });
  res.json({ event });
});

// GET /api/logs/audit?page=1&limit=50&userId=xxx
router.get('/audit', requireAdmin, async (req, res) => {
  const page  = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
  const skip  = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (req.query.userId) where.userId = req.query.userId;
  if (req.query.action) where.action = req.query.action;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.json({ logs, total, page, limit, pages: Math.ceil(total / limit) });
});

// GET /api/logs/download?type=events|audit
router.get('/download', requireAdmin, async (req, res) => {
  const type = req.query.type === 'audit' ? 'audit' : 'events';

  if (type === 'events') {
    const events = await prisma.networkEvent.findMany({ orderBy: { createdAt: 'desc' } });
    const rows = events.map(
      (e) => `"${e.createdAt.toISOString()}","${e.type}","${e.severity}","${e.message?.replace(/"/g, '""') ?? ''}","${e.sourceIp ?? ''}","${e.resolved}"`
    );
    const csv = ['Timestamp,Type,Severity,Message,Source IP,Resolved', ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="network_events.csv"');
    res.send(csv);
  } else {
    const logs = await prisma.auditLog.findMany({
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const rows = logs.map(
      (l) => `"${l.createdAt.toISOString()}","${l.user?.email ?? ''}","${l.action}","${l.resource}"`
    );
    const csv = ['Timestamp,User,Action,Resource', ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit_log.csv"');
    res.send(csv);
  }
});

export default router;
