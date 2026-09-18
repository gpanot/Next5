// server-only — never import from a 'use client' file.

import { NextResponse } from 'next/server';

/** An error that maps directly to an HTTP response. `code` is a stable, machine-readable id. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(status: number, code: string, message?: string, details?: Record<string, unknown>) {
    super(message ?? code);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export type ApiErrorBody = {
  error: string;
  message: string;
  details?: Record<string, unknown>;
};

/** Converts any thrown value into a JSON error response. Unknown errors become a 500. */
export const toErrorResponse = (err: unknown): NextResponse<ApiErrorBody> => {
  if (err instanceof HttpError) {
    // 4xx are the caller's mistake; 5xx are ours and must leave a trace in the logs.
    if (err.status >= 500) console.error(`[api] ${err.status} ${err.code}: ${err.message}`, err.details ?? '');
    return NextResponse.json(
      { error: err.code, message: err.message, details: err.details },
      { status: err.status },
    );
  }
  console.error('[api] Unhandled error:', err);
  return NextResponse.json(
    { error: 'internal_error', message: 'Something went wrong on our side. Please try again.' },
    { status: 500 },
  );
};

/** Parses a JSON body, throwing a 400 when it isn't valid JSON or isn't an object. */
export const readJsonObject = async (req: Request): Promise<Record<string, unknown>> => {
  const body: unknown = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'invalid_body', 'Request body must be a JSON object.');
  }
  return body as Record<string, unknown>;
};
