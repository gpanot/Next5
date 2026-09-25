// A green-screen "Set" is everything needed to re-open a rendered Blitz Lab video and edit it
// again (Remix): template, layer keys, meme position, caption, text style, business line and
// audio settings. Most of it already lives on BlitzProject (columns + currentAssets settings);
// `currentAssets.set` marks the render as a green-screen Set and keeps the prompt used.

import type { TextConfig } from '../../../remotion/types';
import type { CurrentAssets } from './AssetsPanel';
import type { BlitzProjectDto } from './api';

export type GreenScreenSet = {
  version: 1;
  kind: 'greenscreen';
  /** "Remix it!" explanation, when the combination came from the AI remix. */
  remixReason?: string;
};

type StoredAssets = {
  backgroundKey?: string;
  overlayKey?: string;
  audioKey?: string;
  slides?: unknown;
  textConfigOverride?: Partial<TextConfig>;
  businessText?: string;
  muteVideoAudio?: boolean;
  set?: { kind?: string };
};

export type GreenScreenRemixData = {
  templateId: string;
  currentAssets: CurrentAssets;
  overlay: { zoom: number; offsetX: number; offsetY: number };
  captionText: string;
  regenPrompt: string;
  mentionBusiness: boolean;
  businessText: string;
  muteVideoAudio: boolean;
  textConfigOverride: Partial<TextConfig>;
};

export function buildGreenScreenSet(remixReason?: string): GreenScreenSet {
  return { version: 1, kind: 'greenscreen', ...(remixReason ? { remixReason } : {}) };
}

/** True for a Blitz Lab render (meme over background), including renders made before Sets existed. */
export function isGreenScreenProject(project: BlitzProjectDto): boolean {
  const assets = project.currentAssets as StoredAssets | null;
  if (!assets || 'slides' in assets) return false;
  return Boolean(assets.overlayKey && assets.backgroundKey);
}

/** Reads a green-screen render back into Blitz Lab editor state. */
export function readGreenScreenRemix(project: BlitzProjectDto): GreenScreenRemixData | null {
  if (!isGreenScreenProject(project)) return null;
  const assets = project.currentAssets as StoredAssets;
  return {
    templateId: project.templateId,
    currentAssets: {
      backgroundKey: assets.backgroundKey ?? '',
      overlayKey: assets.overlayKey ?? '',
      audioKey: assets.audioKey,
    },
    overlay: { zoom: project.overlayZoom, offsetX: project.overlayOffsetX, offsetY: project.overlayOffsetY },
    captionText: project.captionText,
    regenPrompt: project.regenPrompt ?? '',
    mentionBusiness: project.mentionBusiness && Boolean(assets.businessText),
    businessText: assets.businessText ?? '',
    muteVideoAudio: Boolean(assets.muteVideoAudio),
    textConfigOverride: assets.textConfigOverride ?? {},
  };
}
