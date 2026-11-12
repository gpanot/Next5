/**
 * The voiced listing-video compositions, registered in the worker's Root.tsx (production renders)
 * and in realtor/index.tsx (local CLI tests). No test-data imports here: the worker image has no public/ folder.
 */
import type { ComponentType } from 'react';
import { Composition } from 'remotion';
import { PRESET_META, type RealtorPreset } from '../../server/realtorVideo/presets';
import { AlertVoiced } from './AlertVoiced';
import { DayVoiced } from './DayVoiced';
import { EditorialVoiced } from './EditorialVoiced';
import { LuxeVoiced } from './LuxeVoiced';
import { PovVoiced } from './PovVoiced';
import { RateVoiced } from './RateVoiced';
import { Top3Voiced } from './Top3Voiced';
import { FPS, H, W } from './shared';
import { VOICED_DURATION_S, type VoicedProps } from './voiced';

export const REALTOR_COMPOSITIONS = Object.fromEntries(Object.entries(PRESET_META).map(([k, m]) => [k, m.composition])) as Record<RealtorPreset, string>;

const COMPONENTS: Record<RealtorPreset, ComponentType<VoicedProps>> = {
  editorial: EditorialVoiced, rate: RateVoiced, pov: PovVoiced, day: DayVoiced, top3: Top3Voiced, alert: AlertVoiced, luxe: LuxeVoiced,
};

/** Studio preview only; real renders always pass their own props. */
const SAMPLE: VoicedProps = {
  facts: { city: 'Smyrna', state: 'GA', priceLabel: '$399,000', beds: 3, baths: 2, sqft: 1350, hookTop: 'JUST LISTED', hookBottom: 'A mile from The Battery', locationLine: '1 MILE TO THE BATTERY', ctaKeyword: 'TOUR' },
  beats: [{ photo: 'https://photos.zillowstatic.com/fp/f672f53d2d406117381959691dc8d2b3-p_f.jpg', room: 'porch', kicker: 'JUST LISTED', title: 'Smyrna', startS: 0 }],
  endStartS: 20,
  endPhoto: 'https://photos.zillowstatic.com/fp/dcf4a8c7ede14a15c3b4179502975233-p_f.jpg',
  voice: 'realtor/sfx/chime.mp3',
  music: 'realtor/music/editorial-warm.mp3',
  words: [],
  sfx: [],
  durationS: VOICED_DURATION_S,
};

/** Voiced videos last as long as their props say (15 s, 25 s or up to 60 s for Auto). */
const voicedMetadata = ({ props }: { props: VoicedProps }) => ({ durationInFrames: Math.round(props.durationS * FPS) });

export const RealtorVoicedCompositions = ({ defaults = {} }: { defaults?: Partial<Record<RealtorPreset, VoicedProps>> }) => (
  <>
    {(Object.keys(COMPONENTS) as RealtorPreset[]).map((preset) => (
      <Composition
        key={preset}
        id={REALTOR_COMPOSITIONS[preset]}
        component={COMPONENTS[preset]}
        calculateMetadata={voicedMetadata}
        durationInFrames={VOICED_DURATION_S * FPS}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={defaults[preset] ?? SAMPLE}
      />
    ))}
  </>
);
