import { NextResponse, type NextRequest } from 'next/server';
import { adminRoute } from '../../../../../src/server/admin/route';
import { browserUrl, putFile, ugcKeys, uniqueStamp } from '../../../../../src/server/admin/ugcStore';

const ALLOWED_TYPES = new Map([
  ['audio/mpeg',  'mp3'],
  ['audio/mp3',   'mp3'],
  ['audio/wav',   'wav'],
  ['audio/x-wav', 'wav'],
  ['audio/wave',  'wav'],
  ['audio/mp4',   'm4a'],
  ['audio/m4a',   'm4a'],
  ['audio/x-m4a', 'm4a'],
  ['audio/aac',   'aac'],
]);

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * POST multipart: file (audio)
 * → stores in R2 under ugc-lab/voices/{stamp}.{ext}
 * → returns { voiceKey, voiceUrl }
 */
export const POST = adminRoute(async (req: NextRequest) => {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const ext = ALLOWED_TYPES.get(file.type);
  if (!ext) {
    return NextResponse.json(
      { error: 'Only MP3, WAV, M4A, or AAC audio files accepted' },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Audio file is larger than 10 MB' }, { status: 413 });
  }

  const stamp = uniqueStamp();
  const voiceKey = ugcKeys.voice(stamp, ext);
  await putFile(voiceKey, Buffer.from(await file.arrayBuffer()), file.type);
  const voiceUrl = await browserUrl(voiceKey);

  return NextResponse.json({ voiceKey, voiceUrl });
});
