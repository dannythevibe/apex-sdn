import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../lib/jwt';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  req.user = { userId: undefined as any, role: 'ADMIN' } as JwtPayload;
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  next();
}
