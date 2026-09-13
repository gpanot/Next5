// server-only — never import from a 'use client' file.

import { NextResponse } from 'next/server';
import { isBusinessEnabled } from '../config/business';
import { isDbConfigured } from '../lib/db';
import { requireSession, type Session } from './auth/session';
import { InsufficientCreditsError } from './credits/ledger';
import { HttpError, toErrorResponse } from './http';

type Handler<Ctx> = (req: Request, ctx: Ctx) => Promise<Response>;
type AuthedHandler<Ctx> = (req: Request, session: Session, ctx: Ctx) => Promise<Response>;

const guard = (): void => {
  if (!isBusinessEnabled()) throw new HttpError(404, 'not_found', 'Not found.');
  if (!isDbConfigured()) throw new HttpError(503, 'db_unavailable', 'Service temporarily unavailable.');
};

const mapError = (err: unknown): Response => {
  if (err instanceof InsufficientCreditsError) {
    return NextResponse.json(
      {
        error: 'insufficient_credits',
        message: `You need ${err.needed} photos but have ${err.available} left.`,
        details: { needed: err.needed, available: err.available },
      },
      { status: 402 },
    );
  }
  return toErrorResponse(err);
};

/** Public business API route: feature flag + error mapping. */
export const businessRoute =
  <Ctx>(handler: Handler<Ctx>): Handler<Ctx> =>
  async (req, ctx) => {
    try {
      guard();
      return await handler(req, ctx);
    } catch (err) {
      return mapError(err);
    }
  };

/** Authenticated business API route: feature flag + session + error mapping. */
export const authedRoute =
  <Ctx>(handler: AuthedHandler<Ctx>): Handler<Ctx> =>
  async (req, ctx) => {
    try {
      guard();
      const session = requireSession(req);
      return await handler(req, session, ctx);
    } catch (err) {
      return mapError(err);
    }
  };
