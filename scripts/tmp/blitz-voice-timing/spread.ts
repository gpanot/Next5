// Spread check (2026-10-14): 4 rounds of 7 TTS calls at once, each call timed, failures shown.
import { tregJson } from '../../../src/server/shorts/treg';
const LINE = "Most buyers decide in the first ten seconds, and here's what they notice first.";
const tts = async () => {
  const t = Date.now();
  try {
    await tregJson('google-ai.voice-gen.gemini-3-8-flash-tts', { query: { model: 'gemini-3.8-flash-tts' }, body: { contents: [{ parts: [{ text: LINE }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Sulafat' } } } } }, timeoutMs: 90_000 });
    return ((Date.now() - t) / 1000).toFixed(1);
  } catch (e) {
    return `ERR(${((Date.now() - t) / 1000).toFixed(1)}s ${(e instanceof Error ? e.message : String(e)).slice(0, 60)})`;
  }
};
(async () => {
  for (let r = 0; r < 4; r++) console.log(`round ${r + 1}:`, (await Promise.all(Array.from({ length: 7 }, tts))).join(', '));
  process.exit(0);
})();
