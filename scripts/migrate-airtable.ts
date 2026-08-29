/**
 * One-off migration script: exports all Airtable Orders and imports them
 * into the Railway PostgreSQL database (users + bookings + photos).
 *
 * Run ONCE before cutting over. Idempotent — safe to re-run.
 *
 * Usage (with .env.local):
 *   DATABASE_URL=... AIRTABLE_API_KEY=... AIRTABLE_BASE_ID=... npx tsx scripts/migrate-airtable.ts
 *
 * Or set vars in .env.local and run:
 *   npx tsx -r dotenv/config scripts/migrate-airtable.ts dotenv_config_path=.env.local
 */

import { PrismaClient } from '@prisma/client';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = process.env.AIRTABLE_TABLE_NAME ?? 'Orders';

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

const prisma = new PrismaClient();

// ── Route title → route_id mapping ───────────────────────────────────────────

const TITLE_TO_ROUTE_ID: Record<string, string> = {
  'Golden Saigon': 'golden-saigon',
  'Soft Girl Saigon': 'soft-girl-saigon',
  'Night Out': 'night-out',
  'Luxury Saigon': 'luxury-saigon',
  'Outfit Shoot': 'outfit-shoot',
};

const DIRECTOR_NAME_TO_ID: Record<string, string> = {
  Linh: 'linh',
  Mai: 'mai',
  Sofia: 'sofia',
  Anna: 'anna',
  Emma: 'emma',
};

// ── Airtable types ────────────────────────────────────────────────────────────

type AirtableOrderFields = {
  'Order ID'?: string;
  'Customer Email'?: string;
  'Studio'?: string;
  'Creative Director'?: string;
  'Feelings'?: string;
  'Goals'?: string;
  'Amount'?: number;
  'Payment Status'?: string;
  'Shoot Status'?: string;
  'Customer Photo'?: string;
  'Photo 2'?: string;
  'Photo 3'?: string;
  'Photo 4'?: string;
  'Photo 5'?: string;
};

type AirtableRecord = {
  id: string;
  fields: AirtableOrderFields;
};

// ── Airtable fetch ────────────────────────────────────────────────────────────

async function fetchAirtableOrders(): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`,
    );
    if (offset) url.searchParams.set('offset', offset);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    });

    if (!res.ok) {
      throw new Error(`Airtable fetch error ${res.status}: ${await res.text()}`);
    }

    const data = (await res.json()) as { records: AirtableRecord[]; offset?: string };
    records.push(...data.records);
    offset = data.offset;

    console.log(`  Fetched ${records.length} records so far…`);
  } while (offset);

  return records;
}

function extractR2Key(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/^\//, '');
    return path.includes('/') ? path.split('/').slice(1).join('/') : path;
  } catch {
    return null;
  }
}

function mapShootStatus(
  airtableStatus: string | undefined,
): 'preview_generating' | 'preview_ready' | 'creating' | 'delivered' | 'error' {
  switch ((airtableStatus ?? '').toLowerCase()) {
    case 'creating': return 'creating';
    case 'delivered': return 'delivered';
    case 'preview sent': return 'preview_ready';
    case 'scheduled': return 'creating';
    default: return 'preview_ready';
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n=== Airtable → Railway PostgreSQL Migration ===\n');

  console.log('Fetching Airtable Orders…');
  const records = await fetchAirtableOrders();
  console.log(`\nTotal Airtable records: ${records.length}\n`);

  let usersCreated = 0;
  let bookingsInserted = 0;
  let photosInserted = 0;
  let skipped = 0;

  for (const record of records) {
    const f = record.fields;
    const email = f['Customer Email']?.trim().toLowerCase();
    const bookingId = f['Order ID']?.trim();

    if (!email || !bookingId) {
      console.warn(`  SKIP — missing email or Order ID: ${record.id}`);
      skipped++;
      continue;
    }

    // Upsert user
    let userId: string;
    try {
      const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      if (existing) {
        userId = existing.id;
      } else {
        const created = await prisma.user.create({ data: { email }, select: { id: true } });
        userId = created.id;
        usersCreated++;
      }
    } catch (err) {
      console.error(`  ERROR creating user for ${email}:`, err);
      skipped++;
      continue;
    }

    const routeTitle = f['Studio'] ?? '';
    const routeId = TITLE_TO_ROUTE_ID[routeTitle] ?? routeTitle.toLowerCase().replace(/\s+/g, '-');
    const directorName = f['Creative Director'] ?? '';
    const directorId = DIRECTOR_NAME_TO_ID[directorName] ?? directorName.toLowerCase();
    const feelings = f['Feelings'] ? f['Feelings'].split(',').map((s) => s.trim()) : [];
    const goals = f['Goals'] ? f['Goals'].split(',').map((s) => s.trim()) : [];

    try {
      await prisma.booking.upsert({
        where: { id: bookingId },
        update: {},
        create: {
          id: bookingId,
          userId,
          routeId,
          routeTitle,
          directorId,
          directorName,
          feelings,
          goals,
          amountVnd: f['Amount'] ?? null,
          paymentStatus: 'confirmed',
          shootStatus: mapShootStatus(f['Shoot Status']),
        },
      });
      bookingsInserted++;
    } catch (err) {
      console.error(`  ERROR inserting booking ${bookingId}:`, err);
      skipped++;
      continue;
    }

    const photoRows: {
      bookingId: string;
      userId: string;
      type: 'upload' | 'preview' | 'generated';
      sceneIndex: number | null;
      r2Key: string | null;
      wavespeedUrl: string | null;
      isStored: boolean;
    }[] = [];

    if (f['Customer Photo']) {
      photoRows.push({
        bookingId,
        userId,
        type: 'upload',
        sceneIndex: null,
        r2Key: extractR2Key(f['Customer Photo']),
        wavespeedUrl: null,
        isStored: true,
      });
    }

    const generatedFields = ['Photo 2', 'Photo 3', 'Photo 4', 'Photo 5'] as const;
    generatedFields.forEach((field, i) => {
      const url = f[field];
      if (url) {
        photoRows.push({
          bookingId,
          userId,
          type: 'generated',
          sceneIndex: i + 1,
          r2Key: extractR2Key(url),
          wavespeedUrl: url,
          isStored: true,
        });
      }
    });

    if (photoRows.length > 0) {
      try {
        await prisma.photo.createMany({ data: photoRows, skipDuplicates: true });
        photosInserted += photoRows.length;
      } catch (err) {
        console.error(`  ERROR inserting photos for ${bookingId}:`, err);
      }
    }

    process.stdout.write(`  ✓ ${bookingId} (${email}) — ${photoRows.length} photos\n`);
  }

  const dbBookings = await prisma.booking.count();
  const dbUsers = await prisma.user.count();
  const dbPhotos = await prisma.photo.count();

  console.log('\n=== Migration complete ===');
  console.log(`Airtable records:  ${records.length}`);
  console.log(`Skipped:           ${skipped}`);
  console.log(`Users in DB:       ${dbUsers} (${usersCreated} new)`);
  console.log(`Bookings inserted: ${bookingsInserted}  (DB total: ${dbBookings})`);
  console.log(`Photos inserted:   ${photosInserted}  (DB total: ${dbPhotos})`);

  if (dbBookings < records.length - skipped) {
    console.warn('\n⚠️  DB booking count is less than expected — check errors above.');
  } else {
    console.log('\n✅ Row counts look good. Ready to cut over.');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
