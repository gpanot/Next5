/**
 * Caption of a narrated slide (2026-10-17): the text on screen is the spoken line, and each word appears as the voice
 * says it, a few words at a time (spokenPages.ts) so a long line never fills the frame.
 * Plain captions pop word by word; boxed ones show each page whole so the box does not grow word by word.
 */

import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { spokenPageAt, spokenPages, SPOKEN_LEAD_S } from './spokenPages';
import { CaptionLayer } from './TextLayers';
import type { SpokenWord, TextConfig } from './types';
import { WordPopCaption } from './WordPopCaption';

type Props = { words: SpokenWord[]; config: TextConfig; width: number; height: number };

export function SpokenCaption({ words, config, width, height }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pages = spokenPages(words);
  const index = spokenPageAt(pages, frame / fps);
  const page = pages[index] ?? [];
  const text = page.map((w) => w.word).join(' ');
  if (config.textBackground) {
    return (
      <AbsoluteFill key={index}>
        <CaptionLayer text={text} config={config} width={width} height={height} />
      </AbsoluteFill>
    );
  }
  const startFrames = page.map((w) => Math.max(0, Math.round((w.startS - SPOKEN_LEAD_S) * fps)));
  return <WordPopCaption key={index} text={text} config={config} width={width} height={height} startFrames={startFrames} />;
}
