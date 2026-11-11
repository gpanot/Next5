// server-only — never import from a 'use client' file.

import type { NextRequest } from 'next/server';
import { adminRoute } from '../admin/route';
import { assertLocal } from './store';

type Handler<Ctx> = (req: NextRequest, ctx: Ctx) => Promise<Response>;

/** Admin route that also answers 404 off localhost (Copy Viral Post renders with local tools). */
export const copyViralRoute = <Ctx>(handler: Handler<Ctx>) =>
  adminRoute<Ctx>(async (req, ctx) => {
    assertLocal();
    return handler(req, ctx);
  });
