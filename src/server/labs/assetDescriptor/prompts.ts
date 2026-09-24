/**
 * src/server/labs/assetDescriptor/prompts.ts
 *
 * Builds the text prompts sent to Gemini.
 * Exported for unit testing and for the test harness to read the prompt length.
 */

import type { AssetKind, AssetSource } from './types';

// ── Video prompt ──────────────────────────────────────────────────────────────

export function buildVideoPrompt(opts: {
  name: string;
  kind: AssetKind;
  source: AssetSource;
  durationSec: number;
  cuts: number[];
  loudnessDigits: string;
  loudnessFlat: boolean;
}): string {
  const { name, kind, source, durationSec, cuts, loudnessDigits, loudnessFlat } = opts;
  const dur     = durationSec.toFixed(2);
  const cutsStr = cuts.length > 0 ? cuts.map(t => `${t}s`).join(', ') : 'none';
  const loudnessLine = loudnessFlat
    ? ''
    : `Loudness per second, 0 quiet to 9 loud: ${loudnessDigits}.\n`;

  return `You are casting short vertical clips for Next5, which builds 4-shot slideshows (2 to 5 s per shot) for realtors and TikTok Shop sellers.

Each shot plays one role:
- hook: stops the scroll in the first second. Direct eye contact, a bold look, surprise, an instantly relatable moment.
- problem: shows a pain, a frustration, a doubt or a bad outcome.
- proof: shows evidence, a result, a demonstration or credibility.
- payoff: the release. Relief, satisfaction, celebration or a punchline.
- cta: an invitation to act. Pointing, nodding, beckoning, speaking to camera.

You receive the clip "${name}" (kind: ${kind}, source: ${source}), ${dur} s, with its original audio.
Measured: scene cuts at ${cutsStr}. ${loudnessLine}
Describe it the way a social media editor would brief a colleague who cannot watch it. We need what the clip EXPRESSES and how it would be USED, not a list of objects.

Fill the JSON in this exact order. Write the descriptive fields first and score last.

{
  "subject": "who is on screen: apparent age range, look and style, presence",
  "action": "what they do and how the camera sees it: shot type, camera style, movement",
  "setting": "where it happens and what that signals",
  "emotion": {
    "face": "facial expression and how it changes",
    "voice": "vocal tone and delivery, including non-words. null if no voice",
    "arc": "how the feeling moves over the clip"
  },
  "vibe": ["3 to 5 words"],
  "meaning": "what the clip says as a shot, as the viewer's inner line or a caption idea",
  "bestUse": "one sentence: the role this clip plays best and why",
  "pairsWithHooks": ["3 to 6 example captions for realtors or TikTok Shop sellers"],
  "avoidFor": ["tones, topics or claims where this clip would feel wrong"],
  "timeline": [{ "start": 0.0, "end": 0.0, "what": "action and emotion in this segment", "peak": false }],
  "peakAt": 0.0,
  "bestTrim": { "start": 0.0, "end": 0.0 },
  "transcript": "verbatim speech, including fillers and non-words. null if none",
  "hasSpeech": false,
  "originalAudio": { "keep": false, "description": "string" },
  "pacing": "slow | medium | fast",
  "energyLevel": 0.0,
  "textSafeZone": "top_third | center | bottom_third | none",
  "identifiablePerson": false,
  "publicFigureLikely": false,
  "rightsRisk": "none | low | high",
  "slotScores": { "hook": 0.0, "problem": 0.0, "proof": 0.0, "payoff": 0.0, "cta": 0.0 },
  "nicheScores": { "realtor": 0.0, "tiktokShop": 0.0 },
  "retrievalText": "2 to 3 plain sentences combining subject, emotion, meaning and bestUse"
}

Rules:
1. All times are seconds within [0, ${dur}]. The timeline covers the whole clip with no gaps.
2. peakAt is the moment of strongest expression. bestTrim is the 2 to 5 s window around it.
3. Scores: first decide which role fits best, then score. The best role gets 0.6 to 0.95, a clearly wrong role gets below 0.2. Never give all five roles the same score.
4. All numeric scores (slotScores.*, nicheScores.*, energyLevel) are in [0, 1].
5. For meaning, bestUse and pairsWithHooks, think about how a realtor or a TikTok Shop seller would actually use this shot.
6. Describe only what you see and hear. Never name real people, brands or characters.
7. publicFigureLikely: true if the person appears to be a well-known public figure (actor, musician, athlete, influencer with a recognisable persona). Do not name them.
8. rightsRisk: "high" if it looks lifted from film, TV, a music video or shows a celebrity. Otherwise follow the source: ${source === 'scraped' ? 'this clip is scraped — use at least "low".' : '"none" is fine if clearly original.'}`;
}

// ── Music prompt ──────────────────────────────────────────────────────────────

export function buildMusicPrompt(opts: {
  name: string;
  source: AssetSource;
  durationSec: number;
  loudnessAbs: string;
  loudnessRel: string;
  loudnessFlat: boolean;
}): string {
  const { name, source, durationSec, loudnessAbs, loudnessRel, loudnessFlat } = opts;
  const dur      = durationSec.toFixed(2);
  const maxStart = Math.max(0, durationSec - 12).toFixed(2);

  // Absolute loudness line (always included when not flat)
  const absLine = loudnessFlat ? '' : `Loudness, absolute (0 quiet to 9 loud): ${loudnessAbs}.\n`;

  // Relative loudness line (music only: shows internal dynamics even for loud/quiet tracks)
  const relLine = loudnessRel
    ? `Loudness, relative to this track (0 = its quietest second, 9 = its loudest): ${loudnessRel}.\n`
    : '';

  return `You are choosing soundtracks for Next5, which builds 4-shot vertical slideshows of about 12 s for realtors and TikTok Shop sellers.

You receive the track "${name}" (source: ${source}), ${dur} s.
${absLine}${relLine}
Listen to the whole track and describe it so a colleague can match it to a slideshow without hearing it. Fill the JSON in this exact order. Write the descriptive fields first and score last.

{
  "sound": "instruments, texture and production style in plain words",
  "emotion": "what it makes a listener feel and how that changes over the track",
  "imagery": "what kind of scene this would score",
  "meaning": "the feeling it adds to a post, as a caption-style line",
  "vibe": ["3 to 5 words"],
  "sections": [{ "start": 0.0, "end": 0.0, "label": "intro | build | verse | chorus | drop | breakdown | outro", "energy": "low | medium | high" }],
  "dropAt": 0.0,
  "bestStart": 0.0,
  "fitsStructures": ["hook_to_reveal | steady_montage | comedic_sting | emotional_build | before_after"],
  "pairsWithHooks": ["3 to 6 example captions this track would carry well"],
  "avoidFor": ["tones or topics where it would feel wrong"],
  "hasVocals": false,
  "lyricsTheme": "what the lyrics are about in a few words. null if instrumental",
  "pacing": "slow | medium | fast",
  "energyLevel": 0.0,
  "bpmEstimate": 0,
  "rightsRisk": "none | low | high",
  "nicheScores": { "realtor": 0.0, "tiktokShop": 0.0 },
  "retrievalText": "2 to 3 plain sentences combining sound, emotion, imagery and meaning"
}

Rules:
1. All times are seconds within [0, ${dur}]. Sections cover the whole track with no gaps${!loudnessFlat ? '; use the relative loudness curve for section boundaries' : ''}.
2. dropAt is the moment the track hits hardest (a drop, a beat entering, a big hit). Use null if the track has no such moment, for example steady ambient music. It is NOT where the track ends.
3. bestStart is where a 12 s slideshow should start so the strongest part lands on shot 3 or 4. Between 0 and ${maxStart}. If dropAt is null, bestStart is where the track is most representative.
4. fitsStructures: pick only the 1 or 2 that fit best.
5. All numeric scores (nicheScores.*, energyLevel) are in [0, 1].
6. Never name artists, songs or albums. rightsRisk: "high" if recognisable commercial track, "low" if sounds commercial but unclear, "none" only for generic library-style music. ${source === 'scraped' ? 'This track is scraped — use at least "low".' : ''}`;
}
