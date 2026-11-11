/**
 * Realtor preset test: voiceover (Blitz/Shorts Gemini TTS + Whisper word timings) and a Lyria music bed per preset.
 * Run: npx tsx --env-file=.env.local scripts/realtor-test/make-audio.ts [editorial|rate]
 * Writes public/realtor-test/audio/<id>-voice.wav, <id>-words.json, <id>-music.mp3
 */
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { synthesize } from '../../src/server/shorts/voice';
import { tregJson } from '../../src/server/shorts/treg';
import { createMeter } from '../../src/server/metaAds/cost';

type Job = { id: string; voice: string; direction: string; script: string; music: string };

const JOBS: Job[] = [
  {
    id: 'editorial',
    voice: 'Sulafat',
    direction: 'Warm, calm, premium. Smiling.',
    script: [
      'Just listed in Smyrna, Georgia.',
      'A charming ranch, one mile from The Battery.',
      'Inside, an open floor plan full of light.',
      'The kitchen is fully updated.',
      'Plus a brick wall room for movie nights.',
      'Three bedrooms, and a primary suite with its own bath.',
      'And out back, a rare flat walkout yard.',
      'Listed at $399,000. Comment TOUR to see it.',
    ].join(' '),
    music: 'Warm, elegant instrumental for a luxury home tour video. Soft acoustic guitar and felt piano, light brushed percussion, gentle uplifting chords, 92 BPM, airy and optimistic. No vocals.',
  },
  {
    id: 'rate',
    voice: 'Achird',
    direction: 'Upbeat, playful, energetic.',
    script: [
      'Rate this house from one to ten.',
      'It is $399,000 in Smyrna, Georgia.',
      'Open floor plan? Check.',
      'Updated kitchen? Check.',
      'Exposed brick bonus room? Check.',
      'Primary suite with its own bath? Check.',
      'Flat walkout backyard, a mile from The Battery? Check.',
      'So what is your number? Drop it in the comments, and comment tour to see it.',
    ].join(' '),
    music: 'Bright, bouncy pop instrumental for a fun TikTok house tour. Plucky synths, claps, punchy kick, catchy feel-good hook, 112 BPM. No vocals.',
  },
];

type LyriaResponse = { candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[] };

const makeMusic = async (prompt: string): Promise<Buffer> => {
  const { data } = await tregJson<LyriaResponse>('google-ai.music-gen.lyria-3-clip', {
    query: { model: 'lyria-3-clip-preview' },
    body: { contents: [{ parts: [{ text: prompt }] }] },
    timeoutMs: 180_000,
  });
  const b64 = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData?.data;
  if (!b64) throw new Error('Lyria returned no audio');
  return Buffer.from(b64, 'base64');
};

const run = async (job: Job, outDir: string) => {
  const meter = createMeter();
  const [narration, music] = await Promise.all([
    synthesize(job.script, { voice: job.voice, direction: job.direction }, meter),
    makeMusic(job.music),
  ]);
  await writeFile(path.join(outDir, `${job.id}-voice.wav`), narration.wav);
  await writeFile(path.join(outDir, `${job.id}-music.mp3`), music);
  await writeFile(path.join(outDir, `${job.id}-words.json`), JSON.stringify({ durationS: narration.durationS, words: narration.words }, null, 1));
  console.log(`${job.id}: voice ${narration.durationS.toFixed(2)} s, ${narration.words.length} words, tempo ${narration.tempo.toFixed(2)}`);
};

const main = async () => {
  const outDir = path.join(process.cwd(), 'public', 'realtor-test', 'audio');
  await mkdir(outDir, { recursive: true });
  const only = process.argv[2];
  await Promise.all(JOBS.filter((j) => !only || j.id === only).map((j) => run(j, outDir)));
};

void main();
