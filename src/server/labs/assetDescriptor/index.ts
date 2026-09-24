/**
 * src/server/labs/assetDescriptor/index.ts
 *
 * Main entry point for the asset descriptor pipeline.
 *
 * describeAsset(input) is the single function called by:
 *  - scripts/test-descriptor.ts (smoke test harness)
 *  - blitz-worker/src/descriptor.ts (production worker loop)
 *
 * It does NOT touch the DB — the caller is responsible for writing the result
 * (writeVideo / writeMusic from ./db.ts). This keeps the function pure and
 * testable without a DB connection.
 *
 * Flow:
 *  1. probe()             — ffprobe for duration, hasVideo, hasAudio
 *  2. detectSceneCuts()   — ffmpeg showinfo filter (video only)
 *  3. measureLoudness()   — ffmpeg ebur128 (-v verbose required in ffmpeg 8)
 *  4. build parts         — inline base64 (<18 MB) or Files API upload
 *  5. callGemini()        — HIGH resolution, exp backoff
 *  6. JSON parse
 *  7. clamp timestamps    — before validation so float slop doesn't fail
 *  8. applyRightsRules()  — publicFigureLikely=true → high; scraped floor
 *  9. validate()          — scores [0,1], timestamps in range, spread check
 * 10. repairCall()        — one repair pass if validation fails
 * 11. return DescribeResult (no DB write)
 */

import fs from 'fs';
import type { DescribeInput, DescribeResult, VideoDescriptor, MusicDescriptor } from './types';
import { probe, measureLoudness, detectSceneCuts, videoFps } from './measure';
import { buildVideoPrompt, buildMusicPrompt } from './prompts';
import { validateVideo, validateMusic, clampVideo, clampMusic } from './validate';
import { applyRightsRules } from './rights';
import { callGemini, repairCall, uploadViaFilesApi, INLINE_LIMIT, getModelName } from './gemini';

export { getModelName };
export * from './types';
export * from './rights';
export { writeVideo, writeMusic, markFailed } from './db';
export { lufsToDigit } from './measure';

// ── Main describe function ────────────────────────────────────────────────────

export async function describeAsset(input: DescribeInput): Promise<DescribeResult> {
  const { filePath, kind, source, name, mimeType } = input;
  const wall0 = Date.now();
  let retries = 0;

  // 1. Probe
  const p = await probe(filePath);

  // 2. Scene cuts (video only)
  const cuts = (kind !== 'music' && p.hasVideo)
    ? await detectSceneCuts(filePath, p.durationSec)
    : [];

  // 3. Loudness
  const isMusic = kind === 'music';
  const loud = await measureLoudness(filePath, p.durationSec, isMusic);

  // 4. Build prompt parts
  let prompt: string;
  let mediaPart: Record<string, unknown>;
  let fps: number | undefined;

  if (isMusic) {
    const b64 = fs.readFileSync(filePath).toString('base64');
    mediaPart = { inlineData: { mimeType, data: b64 } };
    prompt = buildMusicPrompt({
      name, source, durationSec: p.durationSec,
      loudnessAbs:  loud.absolute,
      loudnessRel:  loud.relative,
      loudnessFlat: loud.flat,
    });
  } else {
    fps = videoFps(p.durationSec);
    if (p.fileSizeBytes < INLINE_LIMIT) {
      const b64 = fs.readFileSync(filePath).toString('base64');
      mediaPart = { inlineData: { mimeType, data: b64 }, videoMetadata: { fps } };
    } else {
      const uri = await uploadViaFilesApi(filePath, mimeType, name);
      mediaPart = { fileData: { mimeType, fileUri: uri }, videoMetadata: { fps } };
    }
    prompt = buildVideoPrompt({
      name, kind, source, durationSec: p.durationSec,
      cuts, loudnessDigits: loud.absolute, loudnessFlat: loud.flat,
    });
  }

  const parts = [mediaPart, { text: prompt }];

  // 5. Call model
  const geminiResult = await callGemini(parts);
  retries += geminiResult.retries;
  const { text, usage } = geminiResult;

  const expectedFrames = fps ? Math.round(p.durationSec * fps) : undefined;
  const tokPerFrame = expectedFrames && usage.video > 0
    ? Math.round(usage.video / expectedFrames)
    : undefined;

  // 6. Parse JSON
  let descriptor: VideoDescriptor | MusicDescriptor;
  try {
    descriptor = JSON.parse(text) as VideoDescriptor | MusicDescriptor;
  } catch {
    throw new Error(`JSON parse failed. Raw (first 400 chars): ${text.slice(0, 400)}`);
  }

  // 7 + 8. Clamp timestamps, apply rights rules, validate
  const loudnessWasOmitted = loud.flat || loud.samplesRead === 0;
  let validationErrs: string[];
  let rightsSetBy = 'model';

  const applyRightsAndValidate = (d: VideoDescriptor | MusicDescriptor) => {
    if (isMusic) {
      const m = clampMusic(d as MusicDescriptor, p.durationSec);
      const newRisk = applyRightsRules(m.rightsRisk, source);
      if (newRisk !== m.rightsRisk) { m.rightsRisk = newRisk; rightsSetBy = 'source-floor'; }
      return { d: m as MusicDescriptor, errs: validateMusic(m, p.durationSec, loudnessWasOmitted) };
    } else {
      const v = clampVideo(d as VideoDescriptor, p.durationSec);
      const newRisk = applyRightsRules(v.rightsRisk, source, v.publicFigureLikely);
      if (newRisk !== v.rightsRisk) {
        rightsSetBy = v.publicFigureLikely ? 'publicFigureLikely=true' : 'source-floor';
        v.rightsRisk = newRisk;
      }
      return { d: v as VideoDescriptor, errs: validateVideo(v, p.durationSec) };
    }
  };

  let result = applyRightsAndValidate(descriptor);
  descriptor  = result.d;
  validationErrs = result.errs;

  // 9. Repair if needed (one attempt)
  let repaired = false;
  if (validationErrs.length > 0) {
    const repairResult = await repairCall(prompt, text, validationErrs);
    retries += repairResult.retries;
    repaired = true;
    try {
      descriptor = JSON.parse(repairResult.text) as VideoDescriptor | MusicDescriptor;
    } catch { /* keep pre-repair descriptor */ }

    result = applyRightsAndValidate(descriptor);
    descriptor     = result.d;
    validationErrs = result.errs;
  }

  if (validationErrs.length > 0) {
    throw new Error(`Validation failed after repair: ${validationErrs.join('; ')}`);
  }

  return {
    descriptor,
    durationSec:   p.durationSec,
    cuts,
    loudDigits:    loud.absolute,
    loudRelDigits: loud.relative,
    loudFlat:      loud.flat,
    rightsSetBy,
    repaired,
    usageTotal:    usage.total,
    usageOut:      usage.out,
    usageVideo:    usage.video,
    usageAudio:    usage.audio,
    tokPerFrame,
    wallMs:        Date.now() - wall0,
    retries,
  };
}
