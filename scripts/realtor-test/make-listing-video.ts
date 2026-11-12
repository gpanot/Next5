/**
 * Zillow listing → voiced listing videos, end to end, any template at any length.
 * Run: npx tsx --env-file=.env.local scripts/realtor-test/make-listing-video.ts <zillow url | zpid> [editorial,rate,pov,day,top3,alert,luxe] [--length=short|standard|auto]
 * Standard Editorial / Rate use the app's writer (script.ts); everything else uses storyScript.ts.
 * Steps: listing (DB cache, else Apify scrape) → photo tags → shot plan → script (1 vision call)
 *        → voice per preset (Gemini TTS + Whisper) → Remotion render → -14 LUFS.
 * Output: out/realtor/<zpid>/<preset>-<length>.mp4 (+ props JSON). Voice files: public/realtor-videos/<zpid>/.
 */
import { execFile } from 'child_process';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { promisify } from 'util';
import { prisma } from '../../src/lib/db';
import { parseZillowUrl } from '../../src/lib/listingPhotos';
import { createMeter } from '../../src/server/metaAds/cost';
import { PUBLIC_ASSETS, buildPresetProps, buildVoicedProps, narrationOf, presetNarration } from '../../src/server/realtorVideo/build';
import { cleanPresetVoice, cleanVoice, planAndWrite, planAndWritePreset } from '../../src/server/realtorVideo/pipeline';
import { PRESET_META, isRealtorPreset, isVideoLength, type RealtorPreset, type VideoLength } from '../../src/server/realtorVideo/presets';
import type { RealtorFacts } from '../../src/server/realtorVideo/script';
import type { VoicedProps } from '../../src/remotion/realtor/voiced';
import type { CostMeter } from '../../src/server/metaAds/cost';
import { scrapeListing } from './scrapeListing';

const run = promisify(execFile);

type StoredFacts = {
  address?: string | null; city?: string | null; state?: string | null; priceUsd?: number | null; beds?: number | null; baths?: number | null;
  sqft?: number | null; status?: string | null; description?: string | null; street?: string | null; yearBuilt?: number | null;
  lotSqft?: number | null; homeType?: string | null; neighborhood?: string | null; highlights?: string[];
};
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
  return {
    city: f.city, state: f.state, priceUsd: f.priceUsd, beds: f.beds ?? 0, baths: f.baths ?? 0, sqft: f.sqft ?? 0, status: f.status ?? null,
    description: f.description ?? '', street: f.street ?? f.address?.split(',')[0] ?? null, yearBuilt: f.yearBuilt, lotSqft: f.lotSqft,
    homeType: f.homeType, neighborhood: f.neighborhood, highlights: f.highlights ?? [],
  };
};

const render = async (composition: string, propsFile: string, out: string) => {
  const raw = out.replace(/\.mp4$/, '.raw.mp4');
  await run('npx', ['-y', '-p', '@remotion/cli@4.0.526', 'remotion', 'render', 'src/remotion/realtor/index.tsx', composition, raw, `--props=${propsFile}`, '--log=error'], { maxBuffer: 1 << 26 });
  await run('ffmpeg', ['-loglevel', 'error', '-y', '-i', raw, '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', out]);
  await run('rm', [raw]);
};

type Job = { zpid: string; facts: RealtorFacts; candidates: StoredCandidate[]; length: VideoLength; outDir: string; meter: CostMeter };

/** One template at one length: words, voice, props. Standard Editorial / Rate keep the app's writer. */
const makeProps = async (preset: RealtorPreset, { zpid, facts, candidates, length, outDir, meter }: Job): Promise<VoicedProps> => {
  const voicePath = `realtor-videos/${zpid}/${preset}-${length}-voice.wav`;
  if (length === 'standard' && (preset === 'editorial' || preset === 'rate')) {
    const { plan, script } = await planAndWrite(facts, candidates);
    console.log(`\n[${preset}] ${narrationOf(script, preset)}`);
    const n = await cleanVoice(script, preset, meter);
    await writeFile(path.join('public', voicePath), n.wav);
    return buildVoicedProps({ preset, facts, plan, script, words: n.words, voiceDurationS: n.durationS, voicePath, assets: PUBLIC_ASSETS });
  }
  const { plan, script } = await planAndWritePreset(facts, candidates, preset, length);
  await writeFile(path.join(outDir, `${preset}-${length}.plan.json`), JSON.stringify({ plan, script }, null, 1));
  console.log(`\n[${preset}/${length}] shots: ${plan.beats.map((b) => `${b.role}:${b.tag}${b.url2 ? '+2' : ''}`).join(' ')}`);
  console.log(`[${preset}/${length}] highlights: ${script.highlights.join(' · ')}`);
  console.log(`[${preset}/${length}] ${presetNarration(script)}`);
  const n = await cleanPresetVoice(script, preset, meter);
  await writeFile(path.join('public', voicePath), n.wav);
  return buildPresetProps({ preset, length, facts, plan, script, words: n.words, voiceDurationS: n.durationS, voicePath, assets: PUBLIC_ASSETS });
};

const main = async () => {
  const args = process.argv.slice(2);
  const [input, presetArg] = args.filter((a) => !a.startsWith('--'));
  const lengthArg = args.find((a) => a.startsWith('--length='))?.split('=')[1] ?? 'standard';
  if (!input || !isVideoLength(lengthArg)) throw new Error('Usage: make-listing-video.ts <zillow url | zpid> [editorial,rate,pov,day,top3,alert,luxe] [--length=short|standard|auto]');
  const presets = (presetArg ?? 'editorial,rate').split(',').filter(isRealtorPreset);
  const meter = createMeter();
  const { zpid, facts: stored, candidates } = await loadListing(input);
  const outDir = path.join('out', 'realtor', zpid);
  await mkdir(outDir, { recursive: true });
  await mkdir(path.join('public', 'realtor-videos', zpid), { recursive: true });
  const job: Job = { zpid, facts: toFacts(stored), candidates, length: lengthArg, outDir, meter };
  for (const preset of presets) {
    const props = await makeProps(preset, job);
    const base = path.join(outDir, `${preset}-${lengthArg}`);
    await writeFile(`${base}.props.json`, JSON.stringify(props));
    await render(PRESET_META[preset].composition, `${base}.props.json`, `${base}.mp4`);
    console.log(`[${preset}/${lengthArg}] → ${base}.mp4 (${props.durationS} s)`);
  }
  console.log('\nCost:', meter.summary());
  await prisma.$disconnect();
};

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
