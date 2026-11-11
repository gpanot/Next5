/**
 * Script generator: the script shape shared by the server port (src/server/scriptGenerator) and the Brand Blueprint page.
 * Client-safe (no server imports). `beats[].onScreen` maps to Blitz Slideshow slide text, `beats[].spoken` to UGC Lab
 * script segments, so the labs can read a stored script later.
 */
import { z } from 'zod';

export type BlueprintFormat = 'talking' | 'carousel' | 'broll';
export const BLUEPRINT_FORMATS: BlueprintFormat[] = ['talking', 'carousel', 'broll'];

export type Pillar = 'skills' | 'passions' | 'story';
export const PILLARS: Pillar[] = ['skills', 'passions', 'story'];

/** Beats allowed per format. Talking head keeps the MVP's 3 beat minimum. */
export const BEAT_RANGE: Record<BlueprintFormat, { min: number; max: number }> = {
  talking: { min: 3, max: 8 },
  carousel: { min: 5, max: 7 },
  broll: { min: 3, max: 6 },
};

const text = (max: number) => z.string().max(max);

export const scriptHookSchema = z.object({
  visual: text(400),
  onScreen: text(120),
  spoken: text(400),
});

export const scriptBeatSchema = z.object({
  label: text(60),
  spoken: text(800),
  onScreen: text(200),
  visual: text(400),
  rehook: text(300),
});

export const scriptSchema = z.object({
  title: text(120).min(1),
  hook: scriptHookSchema,
  beats: z.array(scriptBeatSchema).min(3).max(8),
  cta: text(300),
  caption: text(300),
  tips: z.array(text(200)).max(5),
});

export type ScriptHook = z.infer<typeof scriptHookSchema>;
export type ScriptBeat = z.infer<typeof scriptBeatSchema>;
export type Script = z.infer<typeof scriptSchema>;

export type HookAngle = 'contrarian' | 'pain' | 'stakes' | 'proof' | 'mistake';
export const HOOK_ANGLES: HookAngle[] = ['contrarian', 'pain', 'stakes', 'proof', 'mistake'];

/** One of the 3 options from "Show me hook options". */
export type HookOption = ScriptHook & { angle: HookAngle };

/** Matches `[like this]`: a personal detail the creator must fill in before recording. */
export const PLACEHOLDER_RE = /\[[^\]\n]{2,120}\]/g;

export const findPlaceholders = (value: string): string[] => value.match(PLACEHOLDER_RE) ?? [];

/** Placeholders left in the text the viewer sees or hears. Visual notes are for the creator, so they do not block. */
export const scriptPlaceholders = (script: Script): string[] => {
  const parts = [script.hook.onScreen, script.hook.spoken, script.cta, ...script.beats.flatMap((b) => [b.spoken, b.onScreen])];
  return parts.flatMap(findPlaceholders);
};
