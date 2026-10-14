// Timing probe (2026-10-14): where does a Blitz voiceover preview spend its time?
// Run: npx tsx --env-file=.env.local scripts/tmp/blitz-voice-timing/probe.ts
import { createMeter } from '../../../src/server/metaAds/cost';
import { tregJson } from '../../../src/server/shorts/treg';
import { transcribe } from '../../../src/server/shorts/wordTiming';
import { creativeJson } from '../../../src/server/shorts/llm';

const LINE = "Most buyers decide in the first ten seconds, and here's what they notice first.";
const tts = async (text: string) => {
  const t = Date.now();
  const { data } = await tregJson<{ candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[] }>('google-ai.voice-gen.gemini-3-8-flash-tts', {
    query: { model: 'gemini-3.8-flash-tts' },
    body: { contents: [{ parts: [{ text: `### DIRECTOR'S NOTES\nStyle: warm, clear\n### TRANSCRIPT\n${text}` }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Sulafat' } } } } },
    timeoutMs: 90_000,
  });
  const b64 = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData?.data ?? '';
  return { s: (Date.now() - t) / 1000, wav: Buffer.from(b64, 'base64') };
};
const main = async () => {
  const meter = createMeter();
  let t = Date.now();
  await creativeJson('Write JSON {"line_1": string, ..., "line_7": string}: 7 short voiceover lines about selling a house.', 'Go.', meter, 'probe');
  console.log(`LLM write lines: ${((Date.now() - t) / 1000).toFixed(1)} s`);
  const one = await tts(LINE);
  console.log(`1 TTS call: ${one.s.toFixed(1)} s`);
  for (const n of [3, 7]) {
    t = Date.now();
    const r = await Promise.allSettled(Array.from({ length: n }, () => tts(LINE)));
    console.log(`${n} TTS in parallel: ${((Date.now() - t) / 1000).toFixed(1)} s wall, each ${r.map((x) => (x.status === 'fulfilled' ? x.value.s.toFixed(1) : 'FAIL')).join(', ')}`);
  }
  t = Date.now();
  await transcribe(one.wav, LINE);
  console.log(`1 Whisper call: ${((Date.now() - t) / 1000).toFixed(1)} s`);
};
main().then(() => process.exit(0));
