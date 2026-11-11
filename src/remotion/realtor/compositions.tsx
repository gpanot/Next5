/**
 * The two voiced listing-video compositions, registered in the worker's Root.tsx (production renders)
 * and in realtor/index.tsx (local CLI tests). No test-data imports here: the worker image has no public/ folder.
 */
import { Composition } from 'remotion';
import { EditorialVoiced } from './EditorialVoiced';
import { RateVoiced } from './RateVoiced';
import { FPS, H, W } from './shared';
import { VOICED_DURATION_S, type VoicedProps } from './voiced';

export const REALTOR_COMPOSITIONS = { editorial: 'RealtorEditorialVoiced', rate: 'RealtorRateVoiced' } as const;

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

/** Voiced videos last as long as their props say (25 s minimum, longer when the voice runs long). */
const voicedMetadata = ({ props }: { props: VoicedProps }) => ({ durationInFrames: Math.round(props.durationS * FPS) });

export const RealtorVoicedCompositions = ({ editorialDefaults = SAMPLE, rateDefaults = SAMPLE }: { editorialDefaults?: VoicedProps; rateDefaults?: VoicedProps }) => (
  <>
    <Composition id={REALTOR_COMPOSITIONS.editorial} component={EditorialVoiced} calculateMetadata={voicedMetadata} durationInFrames={VOICED_DURATION_S * FPS} fps={FPS} width={W} height={H} defaultProps={editorialDefaults} />
    <Composition id={REALTOR_COMPOSITIONS.rate} component={RateVoiced} calculateMetadata={voicedMetadata} durationInFrames={VOICED_DURATION_S * FPS} fps={FPS} width={W} height={H} defaultProps={rateDefaults} />
  </>
);
