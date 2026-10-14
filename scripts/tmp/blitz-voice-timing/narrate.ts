// Timing check (2026-10-14): one full Blitz voiceover through narrateSlides, no Whisper, all lines at once.
// Run: npx tsx --env-file=.env.local scripts/tmp/blitz-voice-timing/narrate.ts
import { narrateSlides } from '../../../src/server/labs/blitzVoice';

const slides = ['Sellers lose $20k by pricing too high', 'Buyers scroll past stale listings', 'Day 21 is when offers dry up', 'Price right on day one', 'Great photos double clicks', 'We sold 14 homes this year', 'Book a free home review'].map((text) => ({ text: `${text} (${Date.now()})` }));
const t = Date.now();
narrateSlides(slides, undefined, null).then((n) => {
  console.log(`total ${((Date.now() - t) / 1000).toFixed(1)} s, audio ${n.durationSeconds} s`);
  process.exit(0);
});
