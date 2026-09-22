import type { UgcScene } from '../../config/ugcLab';

/** A saved UGC Lab character, as the admin UI receives it. URLs are signed for 24 h. */
export type UgcCharacterDto = {
  id: string;
  /** ai | photo | avatar */
  kind: 'ai' | 'photo' | 'avatar';
  url: string;
  model: string | null;
  scene: UgcScene | null;
  /** Portrait-clone JSON locking visual attributes for consistent Seedance prompts. Avatar kind only. */
  portraitJson: Record<string, unknown> | null;
  createdAt: string;
};

export type UgcVideoStatus = 'generating' | 'ready' | 'failed';

/** A UGC Lab video, as the admin UI receives it. URLs are signed for 24 h. */
export type UgcVideoDto = {
  id: string;
  mode: string;
  script: string;
  /** Full video-generation prompt sent to Seedance / Wan 3.0. */
  prompt: string | null;
  durationSec: number;
  resolution: string;
  /** Which Treg route made it: openrouter | reapi | wan3. */
  provider: string;
  status: UgcVideoStatus;
  characterUrl: string | null;
  characterKind: 'ai' | 'photo' | null;
  videoUrl: string | null;
  captionedUrl: string | null;
  /** Saves the captioned version when there is one, else the raw video. */
  downloadUrl: string | null;
  error: string | null;
  /** The last status check failed; the video is still being checked. */
  lastPollError: string | null;
  estimatedCostUsd: number;
  /** Real provider cost once finished; null before that. */
  costUsd: number | null;
  /** Generation time, submit to finish (see UgcVideo.generationSeconds). */
  seconds: number | null;
  submittedAt: string;
  createdAt: string;
};

/** How long a video usually takes, from past videos. */
export type UgcEta = {
  seconds: number;
  /** Videos the median is based on. */
  samples: number;
  /** All samples had their finish time pinned within 30 s. */
  precise: boolean;
  /** same_length: videos of this length. all_lengths: no video of this length yet, so every length. */
  basis: 'same_length' | 'all_lengths';
};
