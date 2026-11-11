/**
 * Zillow listing → voiced Editorial + "Rate this house" videos, end to end.
 * Run: npx tsx --env-file=.env.local scripts/realtor-test/make-listing-video.ts <zillow url | zpid> [editorial,rate]
 * Steps: listing (DB cache, else Apify scrape) → photo tags → shot plan → script (1 vision call)
 *        → voice per preset (Gemini TTS + Whisper) → Remotion render → -14 LUFS.
 * Output: out/realtor/<zpid>/<preset>.mp4 (+ props JSON). Voice files: public/realtor-videos/<zpid>/.
 */
import { execFile } from 'child_process';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { prisma } from '../../src/lib/db';
import { parseZillowUrl } from '../../src/lib/listingPhotos';
import { createMeter } from '../../src/server/metaAds/cost';
import { PUBLIC_ASSETS, buildVoicedProps, narrationOf, type RealtorPreset } from '../../src/server/realtorVideo/build';
import { cleanVoice, planAndWrite } from '../../src/server/realtorVideo/pipeline';
import type { RealtorFacts } from '../../src/server/realtorVideo/script';
import { scrapeListing } from './scrapeListing';

const run = promisify(execFile);

const COMPOSITION: Record<RealtorPreset, string> = { editorial: 'RealtorEditorialVoiced', rate: 'RealtorRateVoiced' };

type StoredFacts = { city?: string | null; state?: string | null; priceUsd?: number | null; beds?: number | null; baths?: number | null; sqft?: number | null; status?: string | null; description?: string | null };
type StoredCandidate = { url: string; thumbUrl: string };

const loadListing = async (input: string) => {
  const zpid = /^\d+$/.test(input) ? input : parseZillowUrl(input)?.zpid;
  if (!zpid) throw new Error('Pass a Zillow home link or a zpid.');
  const cached = await prisma.blitzListingRun.findFirst({ where: { zpid }, orderBy: { createdAt: 'desc' } });
  if (cached) return { zpid, facts: cached.facts as StoredFacts, candidates: cached.candidates as StoredCandidate[] };
  if (/^\d+$/.test(input)) throw new Error(`No cached scrape for zpid ${zpid}; pass the Zillow link instead.`);
  console.log('Not cached: scraping Zillow (Apify)…');
  return { zpid, ...(await scrapeListing(input)) };
};

const toFacts = (f: StoredFacts): RealtorFacts => {
  if (!f.city || !f.state || !f.priceUsd) throw new Error('Listing is missing city, state or price.');
  return { city: f.city, state: f.state, priceUsd: f.priceUsd, beds: f.beds ?? 0, baths: f.baths ?? 0, sqft: f.sqft ?? 0, status: f.status ?? null, description: f.description ?? '' };
};

const render = async (composition: string, propsFile: string, out: string) => {
  const raw = out.replace(/\.mp4$/, '.raw.mp4');
  await run('npx', ['-y', '-p', '@remotion/cli@4.0.526', 'remotion', 'render', 'src/remotion/realtor/index.tsx', composition, raw, `--props=${propsFile}`, '--log=error'], { maxBuffer: 1 << 26 });
  await run('ffmpeg', ['-loglevel', 'error', '-y', '-i', raw, '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', out]);
  await run('rm', [raw]);
};

const main = async () => {
  const [input, presetArg] = process.argv.slice(2);
  if (!input) throw new Error('Usage: make-listing-video.ts <zillow url | zpid> [editorial,rate]');
  const presets = (presetArg ?? 'editorial,rate').split(',') as RealtorPreset[];
  const meter = createMeter();
  const { zpid, facts: stored, candidates } = await loadListing(input);
  const facts = toFacts(stored);
  const { plan, script } = await planAndWrite(facts, candidates);
  console.log('Shots:', plan.beats.map((b) => `${b.role}:${b.tag}`).join(' '), '| end:', plan.end.tag);
  const outDir = path.join('out', 'realtor', zpid);
  const voiceDir = path.join('public', 'realtor-videos', zpid);
  await mkdir(outDir, { recursive: true });
  await mkdir(voiceDir, { recursive: true });
  await writeFile(path.join(outDir, 'plan.json'), JSON.stringify({ plan, script }, null, 1));
  for (const preset of presets) {
    console.log(`\n[${preset}] ${narrationOf(script, preset)}`);
    const narration = await cleanVoice(script, preset, meter);
    const voicePath = `realtor-videos/${zpid}/${preset}-voice.wav`;
    await writeFile(path.join('public', voicePath), narration.wav);
    const props = buildVoicedProps({ preset, facts, plan, script, words: narration.words, voiceDurationS: narration.durationS, voicePath, assets: PUBLIC_ASSETS });
    const propsFile = path.join(outDir, `${preset}.props.json`);
    await writeFile(propsFile, JSON.stringify(props));
    const out = path.join(outDir, `${preset}.mp4`);
    await render(COMPOSITION[preset], propsFile, out);
    console.log(`[${preset}] voice ${narration.durationS.toFixed(1)} s → ${out} (${props.durationS} s)`);
  }
  console.log('\nCost:', meter.summary());
  await prisma.$disconnect();
};

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
