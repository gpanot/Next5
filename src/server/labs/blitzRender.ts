// server-only — never import from a 'use client' file.
// Queues one Blitz render (a PENDING BlitzProject the Railway blitz-worker picks up). Shared by POST /api/admin/blitz/render
// and the calendar, which renders scheduled videos shortly before their post time.

import type { BlitzProject, Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import type { TextConfig } from '../../remotion/types';
import {
  BLITZ_BUSINESS_TEXT_MAX,
  BLITZ_MAX_DURATION_S,
  BLITZ_SLIDESHOW_MAX_DURATION_S,
  clampBlitzDuration,
} from '../../config/blitzLab';
import { HttpError } from '../http';
import { createPaidRender } from '../slideshowCredits/blitzCharge';
import { withSlideCameras } from './blitzCamera';
import type { LabAccess } from './labAccess';

export type RenderBody = {
  templateId: string;
  currentAssets: {
    backgroundKey: string;
    overlayKey?: string;   // optional for CAROUSEL (no overlay)
    audioKey?: string;
  };
  overlayZoom?: number;
  overlayOffsetX?: number;
  overlayOffsetY?: number;
  mentionBusiness?: boolean;
  regenPrompt?: string;
  captionText: string;
  isIdentifiablePerson?: boolean;
  /** Partial TextConfig overrides from the editor (font, color, strokeWidth, etc.) */
  textConfigOverride?: Partial<TextConfig>;
  /** Clip length measured in the browser (shortest video layer). */
  durationSeconds?: number;
  /** Business line drawn on the video when mentionBusiness is on. */
  businessText?: string;
  /** Silence the sound of the video layers. */
  muteVideoAudio?: boolean;
  /** Slide texts for CAROUSEL type.
   * Accepts string[] (legacy) or SlideData[] (new format with per-slide backgroundKey). */
  slides?: Array<string | SlideBody>;
  /** Everything needed to re-open this render in the editor (Remix). Stored as-is, size-capped. */
  set?: unknown;
};

/** Max stored Set size: a 7-shot deck Set with swaps is ~15 KB. */
const MAX_SET_BYTES = 200_000;

const cleanSet = (set: unknown): object | null => {
  if (!set || typeof set !== 'object' || Array.isArray(set)) return null;
  return JSON.stringify(set).length <= MAX_SET_BYTES ? set : null;
};

type SlideBody = { text: string; backgroundKey?: string; durationSec?: number; trimStart?: number; positionY?: number };

/** Keeps only well-formed per-slide timing: 1–10 s slides, non-negative trims, positions inside the frame. */
const cleanSlide = (s: SlideBody): SlideBody => {
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
  const durationSec = num(s.durationSec);
  const trimStart = num(s.trimStart);
  const positionY = num(s.positionY);
  return {
    text: s.text,
    ...(s.backgroundKey ? { backgroundKey: s.backgroundKey } : {}),
    ...(durationSec !== undefined ? { durationSec: Math.min(10, Math.max(1, durationSec)) } : {}),
    ...(trimStart !== undefined && trimStart > 0 ? { trimStart } : {}),
    ...(positionY !== undefined ? { positionY: Math.min(0.95, Math.max(0.05, positionY)) } : {}),
  };
};

/**
 * Render settings stored in the current_assets JSON next to the asset keys.
 * The worker reads them from there, so no column (and no web/worker deploy-order
 * risk) is needed. Keys: textConfigOverride, durationSeconds, businessText, muteVideoAudio.
 *
 * @param maxDurationSeconds - the clip-length ceiling for this template type.
 */
const renderSettings = (body: RenderBody, maxDurationSeconds: number) => {
  const businessText = body.mentionBusiness ? body.businessText?.trim().slice(0, BLITZ_BUSINESS_TEXT_MAX) : undefined;
  const duration = Number(body.durationSeconds);
  return {
    ...(body.textConfigOverride ? { textConfigOverride: body.textConfigOverride } : {}),
    ...(Number.isFinite(duration) && duration > 0
      ? { durationSeconds: clampBlitzDuration(duration, maxDurationSeconds) }
      : {}),
    ...(businessText ? { businessText } : {}),
    ...(body.muteVideoAudio ? { muteVideoAudio: true } : {}),
  };
};

const reject = (status: number, message: string, log: string): never => {
  console.warn(`[blitz/render] Rejected: ${log}`);
  throw new HttpError(status, 'invalid_render', message);
};

/** Checks the request against its template. Returns the template type and its caption height. */
const checkRequest = async (body: RenderBody) => {
  if (!body.templateId) reject(400, 'templateId is required', 'missing templateId');
  if (!body.captionText?.trim()) reject(400, 'captionText is required', 'missing captionText');
  if (!body.currentAssets?.backgroundKey) reject(400, 'backgroundKey is required', 'missing backgroundKey');
  const template = await prisma.blitzTemplate.findUnique({ where: { id: body.templateId } });
  if (!template) return reject(404, 'Template not found', `template ${body.templateId} not found`);
  // overlayKey is required only for non-CAROUSEL templates
  if (template.type !== 'CAROUSEL' && !body.currentAssets.overlayKey) reject(400, 'overlayKey is required', 'missing overlayKey for non-CAROUSEL template');
  const textConfig = template.textConfig as TextConfig | null;
  if (!textConfig?.font) reject(422, 'Template has invalid textConfig', `template ${body.templateId} has no font`);
  return { templateType: template.type, captionY: body.textConfigOverride?.positionY ?? textConfig?.positionY ?? 0.5 };
};

/**
 * Creates the PENDING render. Workspace users pay 1 credit per video (402 and nothing queued when short); admins
 * render for free, and `prepaid` (a scheduled video, paid when scheduled) is not charged again. Throws HttpError on a bad request.
 */
export async function queueBlitzRender(access: LabAccess, body: RenderBody, prepaid = false): Promise<BlitzProject> {
  const { templateType, captionY } = await checkRequest(body);
  // Normalize slides early so we can validate per-slide backgroundKeys below
  const normalizedSlides = (body.slides ?? []).map((s) => (typeof s === 'string' ? { text: s } : cleanSlide(s)));
  const keys = [body.currentAssets.backgroundKey, body.currentAssets.overlayKey, body.currentAssets.audioKey, ...normalizedSlides.map((s) => s.backgroundKey)];
  if (keys.some((k) => k?.startsWith('local:'))) reject(400, 'Wait for uploads to finish', 'local: key still present');

  // For CAROUSEL: derive captionText from slides[0] if not already set
  const textSlides = normalizedSlides.filter((s) => s.text.trim());
  // Slideshow photos get a camera move (zoom/pan + depth parallax) so stills in a row do not feel like a slideshow.
  const nonEmptySlides = templateType === 'CAROUSEL' ? await withSlideCameras(textSlides, captionY) : textSlides;
  const captionText = body.captionText.trim() || (nonEmptySlides[0]?.text ?? '');
  const set = cleanSet(body.set);
  const data: Prisma.BlitzProjectUncheckedCreateInput = {
    workspaceId: access.workspaceId,
    templateId: body.templateId,
    currentAssets: {
      backgroundKey: body.currentAssets.backgroundKey,
      ...(body.currentAssets.overlayKey ? { overlayKey: body.currentAssets.overlayKey } : {}),
      ...(body.currentAssets.audioKey ? { audioKey: body.currentAssets.audioKey } : {}),
      // Store slides array for CAROUSEL — worker reads currentAssets.slides
      ...(nonEmptySlides.length > 0 ? { slides: nonEmptySlides } : {}),
      // Set: provenance + swaps so the render can be remixed later (the worker ignores it).
      ...(set ? { set } : {}),
      // A still-image slideshow has no footage to follow, so it may run longer than the footage cap.
      ...renderSettings(body, templateType === 'CAROUSEL' ? BLITZ_SLIDESHOW_MAX_DURATION_S : BLITZ_MAX_DURATION_S),
    },
    overlayZoom: body.overlayZoom ?? 1.0,
    overlayOffsetX: body.overlayOffsetX ?? 0,
    overlayOffsetY: body.overlayOffsetY ?? 0,
    mentionBusiness: body.mentionBusiness ?? false,
    regenPrompt: body.regenPrompt ?? null,
    captionText,
    renderStatus: 'PENDING',
    isIdentifiablePerson: body.isIdentifiablePerson ?? false,
  };
  const project = access.admin || prepaid ? await prisma.blitzProject.create({ data }) : await createPaidRender(access.userId, data);
  console.log(`[blitz/render] BlitzProject created: id=${project.id} status=PENDING template.type=${templateType}`);
  return project;
}
