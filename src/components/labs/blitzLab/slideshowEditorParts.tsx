'use client';

// Constants and small pieces of the Blitz Slideshow editor (BlitzSlideshowEditor.tsx).

import type { BlitzProjectDto } from './api';
import type { FlowType } from './FlowTypePicker';
import type { SlideData } from './SlidePreview';

export const DEFAULT_SLIDES: SlideData[] = [
  { text: "Here's the #1 mistake people make…" },
  { text: "Here's what actually works." },
  { text: 'Save this if you found it helpful!' },
];

export type Step = 'profile' | 'research' | 'deck' | 'editor';
/** 'research' is the Angle step of the Zillow flow. */

/** Numbered steps — varies by flow type and whether linked to Campaign Studio. */
export const buildSteps = (withProfile: boolean, flowType: FlowType | null): { id: Step; label: string }[] => {
  if (flowType === 'real_estate') {
    return [
      { id: 'profile',  label: '1 · Zillow' },
      { id: 'research', label: '2 · Angle' },
      { id: 'deck',     label: '3 · Videos' },
    ];
  }
  // Linked to a Campaign Studio run, or a hand-typed profile: the website engine builds the deck.
  if (withProfile || flowType === 'b2b_manual') {
    return [
      { id: 'profile', label: '1 · Profile' },
      { id: 'deck',    label: '2 · Videos' },
    ];
  }
  return [{ id: 'editor', label: '1 · Slideshow' }];
};

/** A render belongs to this editor when its assets carry slides. */
export const isSlideshowProject = (project: BlitzProjectDto): boolean => {
  const assets = project.currentAssets as { slides?: unknown } | null;
  return Boolean(assets && 'slides' in assets);
};

export function EditorSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr_220px]" aria-busy="true">
      <div className="h-72 animate-pulse rounded-2xl bg-surface-alt" />
      <div className="mx-auto w-full max-w-[340px] animate-pulse rounded-2xl bg-surface-alt" style={{ aspectRatio: '9/16' }} />
      <div className="h-48 animate-pulse rounded-2xl bg-surface-alt" />
    </div>
  );
}
