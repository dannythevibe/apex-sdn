import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// POST /api/auth/register
router.post('/register', authLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    const hash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, password: hash, firstName, lastName },
    });

    await prisma.auditLog.create({
      data: { userId: user.id, action: 'REGISTER', resource: 'auth', details: { email } },
    });

    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
    res.status(201).json({
      accessToken,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      await prisma.networkEvent.create({
        data: { type: 'UNAUTHORIZED_ACCESS', message: `Failed login for ${email}`, severity: 'WARNING', sourceIp: req.ip ?? null },
      }).catch(() => {});
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const payload = { userId: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    await prisma.auditLog.create({
      data: { userId: user.id, action: 'LOGIN', resource: 'auth', details: { ip: req.ip } },
    }).catch(() => {});

    res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
    res.json({
      accessToken,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) { res.status(401).json({ error: 'No refresh token' }); return; }

    let payload;
    try { payload = verifyRefreshToken(token); }
    catch { res.status(401).json({ error: 'Invalid or expired refresh token' }); return; }

    const stored = await prisma.refreshToken.findFirst({
      where: { token, revoked: false, expiresAt: { gt: new Date() } },
    });
    if (!stored) {
      res.clearCookie('refreshToken');
      res.status(401).json({ error: 'Refresh token revoked or expired' });
      return;
    }

    const newRefreshRaw = signRefreshToken({ userId: payload.userId, email: payload.email, role: payload.role });
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
    await prisma.refreshToken.create({
      data: { token: newRefreshRaw, userId: payload.userId, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    const accessToken = signAccessToken({ userId: payload.userId, email: payload.email, role: payload.role });
    res.cookie('refreshToken', newRefreshRaw, COOKIE_OPTS);
    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const token = req.cookies?.refreshToken;
    if (token) {
      await prisma.refreshToken.updateMany({ where: { token }, data: { revoked: true } });
    }
    res.clearCookie('refreshToken');
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true },
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;
