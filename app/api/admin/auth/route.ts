import { NextRequest, NextResponse } from 'next/server';
import { signAdminToken } from '../../../../src/lib/admin-auth';

export async function POST(req: NextRequest) {
  const { secret } = (await req.json()) as { secret?: string };

  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return NextResponse.json({ error: 'Admin not configured (ADMIN_SECRET missing)' }, { status: 503 });
  }
  if (!secret || secret !== adminSecret) {
    return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
  }

  const token = signAdminToken();
  return NextResponse.json({ token });
}
