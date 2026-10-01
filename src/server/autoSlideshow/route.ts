// server-only — never import from a 'use client' file.

import type { NextRequest } from 'next/server';
import { toErrorResponse } from '../http';
import { resolveAccess, type Access } from './access';

type Handler<Ctx> = (req: NextRequest, ctx: Ctx, access: Access) => Promise<Response>;

/** Auto Slideshow API route for admins and signed-in users: token check, access scope, error mapping. */
export const slideshowRoute =
  <Ctx>(handler: Handler<Ctx>) =>
  async (req: NextRequest, ctx: Ctx): Promise<Response> => {
    try {
      return await handler(req, ctx, await resolveAccess(req));
    } catch (err) {
      return toErrorResponse(err);
    }
  };
