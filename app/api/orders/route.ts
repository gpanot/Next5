import { NextRequest, NextResponse } from 'next/server';

export type OrderPayload = {
  bookingId: string;
  studioId: string;
  studioTitle: string;
  directorName: string;
  email: string;
  feelings: string[];
  goals: string[];
  amountVnd: number;
};

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME ?? 'Orders';

export async function POST(req: NextRequest) {
  const body = (await req.json()) as OrderPayload;

  // If Airtable is not configured, log and return success so the UX is not blocked.
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.warn('[orders] Airtable env vars not set — skipping record creation.', body);
    return NextResponse.json({ ok: true, skipped: true });
  }

  const fields: Record<string, unknown> = {
    'Order ID': body.bookingId,
    'Customer Email': body.email,
    'Studio': body.studioTitle,
    'Creative Director': body.directorName,
    'Feelings': body.feelings.join(', '),
    'Goals': body.goals.join(', '),
    'Amount': body.amountVnd,
    'Payment Status': 'Confirmed',
    'Shoot Status': 'Preview Sent',
    'Booking Date': new Date().toISOString().slice(0, 10),
  };

  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error('[orders] Airtable error', res.status, error);
    return NextResponse.json({ ok: false, error }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json({ ok: true, id: data.id });
}
