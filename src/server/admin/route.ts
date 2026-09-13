// server-only — never import from a 'use client' file.

import type { Prisma } from '@prisma/client';
import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '../../lib/admin-auth';
import { prisma } from '../../lib/db';
import { toErrorResponse } from '../http';

type Handler<Ctx> = (req: NextRequest, ctx: Ctx) => Promise<Response>;

/** Admin API route: ADMIN token check + error mapping. */
export const adminRoute =
  <Ctx>(handler: Handler<Ctx>): Handler<Ctx> =>
  async (req, ctx) => {
    const denied = requireAdmin(req);
    if (denied) return denied;
    try {
      return await handler(req, ctx);
    } catch (err) {
      return toErrorResponse(err);
    }
  };

export const audit = (action: string, targetType: string, targetId: string, details?: Prisma.InputJsonValue) =>
  prisma.adminAuditLog.create({ data: { action, targetType, targetId, details } });

export const json = NextResponse.json;
