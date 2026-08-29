import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';
const ADMIN_TTL_S = 8 * 60 * 60; // 8 hours

export type AdminPayload = { type: 'admin' };

export function signAdminToken(): string {
  return jwt.sign({ type: 'admin' } satisfies AdminPayload, JWT_SECRET, {
    expiresIn: ADMIN_TTL_S,
  });
}

export function verifyAdminToken(token: string): AdminPayload {
  const payload = jwt.verify(token, JWT_SECRET) as AdminPayload;
  if (payload.type !== 'admin') throw new Error('Not an admin token');
  return payload;
}

/** Middleware helper: returns null if valid, or an error NextResponse. */
export function requireAdmin(req: NextRequest): NextResponse | null {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    verifyAdminToken(token);
    return null;
  } catch {
    return NextResponse.json({ error: 'Invalid or expired admin token' }, { status: 401 });
  }
}
