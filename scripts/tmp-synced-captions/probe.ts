// Where a narrated line's time goes (2026-10-17): TTS vs Whisper, 7 lines at once.
import { createMeter } from '../../src/server/metaAds/cost';
import { synthesize } from '../../src/server/shorts/voice';
import { transcribe } from '../../src/server/shorts/wordTiming';
const LINE = `So your outfit works through class, then still feels right at coffee ${Date.now() % 1000}.`;
(async () => {
  const meter = createMeter();
  const t0 = Date.now();
  const r = await Promise.all(Array.from({ length: 7 }, async (_, i) => {
    const a = Date.now();
    const take = await synthesize(`${LINE} ${i}`, { voice: 'Sulafat' }, meter, { readBack: false, wordTimings: false });
    const b = Date.now();
    await transcribe(take.wav, LINE);
    return `tts ${((b - a) / 1000).toFixed(1)} + whisper ${((Date.now() - b) / 1000).toFixed(1)}`;
  }));
  console.log(r.join('\n'), `\nwall ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  process.exit(0);
})();
