import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { uploadToR2, getPresignedUrl } from '../../../../../src/lib/r2';

export const POST = adminRoute(async (req: NextRequest) => {
  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, or WebP images accepted' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const key = `ugc-lab/references/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  await uploadToR2(key, buffer, file.type);

  // Presign for 7 days so Seedance can fetch it during task processing
  const url = await getPresignedUrl(key, 7 * 24 * 3600);

  if (!url) {
    return NextResponse.json({ error: 'Failed to generate presigned URL' }, { status: 500 });
  }

  return NextResponse.json({ url, key });
});
