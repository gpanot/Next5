// server-only
/**
 * BigInt-safe JSON response helper for studio routes.
 *
 * Prisma returns BigInt for cost micros fields (extractCostUsdMicros, etc.).
 * JSON.stringify throws on BigInt, so we use a replacer to convert to string —
 * matching the `string | null` types declared in the client's api.ts.
 */
import { NextResponse } from 'next/server';

const bigIntReplacer = (_: string, v: unknown) =>
  typeof v === 'bigint' ? v.toString() : v;

export function studioJson<T>(data: T, status = 200) {
  const body = JSON.stringify(data, bigIntReplacer);
  return new NextResponse(body, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
