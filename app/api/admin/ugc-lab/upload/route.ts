import { NextResponse, type NextRequest } from 'next/server';
import sharp from 'sharp';
import { adminRoute } from '../../../../../src/server/admin/route';
import { browserUrl, putFile, toCharacterDto, ugcKeys, uniqueStamp } from '../../../../../src/server/admin/ugcStore';
import { prisma } from '../../../../../src/lib/db';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 12 * 1024 * 1024;

/**
 * Crops to 9:16 around the most interesting area (usually the person) and re-encodes as JPEG.
 * Seedance first-frame mode keeps the photo's shape, so a 4:5 photo would give a 4:5 video.
 */
const cropToVertical = async (input: Buffer): Promise<Buffer> => {
  // Apply EXIF rotation first so width and height are the ones people see.
  const upright = await sharp(input).rotate().toBuffer();
  const { width: w = 0, height: h = 0 } = await sharp(upright).metadata();
  const wider = w / h > 9 / 16;
  const cropW = wider ? Math.round((h * 9) / 16) : w;
  const cropH = wider ? h : Math.round((w * 16) / 9);
  // sharp applies one resize per pipeline: crop first, then downscale in a second pass.
  const cropped = await sharp(upright)
    .resize({ width: cropW, height: cropH, fit: 'cover', position: sharp.strategy.attention })
    .toBuffer();
  return sharp(cropped)
    .resize({ width: 1080, height: 1920, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 90 })
    .toBuffer();
};

/**
 * POST multipart: file, purpose ("photo" | "reference").
 * photo → cropped to 9:16 and saved as a character → { character }.
 * reference → stored as-is for AI portrait generation → { key, url }.
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
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, or WebP images accepted' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image is larger than 12 MB' }, { status: 413 });
  }

  const original = Buffer.from(await file.arrayBuffer());
  const stamp = uniqueStamp();

  if (formData.get('purpose') === 'photo') {
    // Seedance first-frame mode keeps the photo's shape, so photos become 9:16.
    const imageKey = ugcKeys.photo(stamp, 'jpg');
    await putFile(imageKey, await cropToVertical(original), 'image/jpeg');
    const character = await prisma.ugcCharacter.create({ data: { kind: 'photo', imageKey } });
    return NextResponse.json({ character: await toCharacterDto(character) });
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const key = ugcKeys.reference(stamp, ext);
  await putFile(key, original, file.type);
  return NextResponse.json({ key, url: await browserUrl(key) });
});
