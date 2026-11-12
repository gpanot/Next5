/**
 * Separate Remotion entry for the realtor preset tests (does not touch the Blitz Root.tsx).
 * Render: npx remotion render src/remotion/realtor/index.tsx RealtorEditorial out/realtor-editorial.mp4
 */
import { Composition, registerRoot } from 'remotion';
import type { ComponentType } from 'react';
import { EditorialCover } from './EditorialCover';
import { ScrapbookTour } from './ScrapbookTour';
import { SplitStack } from './SplitStack';
import { WhatYouGet } from './WhatYouGet';
import { GuessThePrice } from './GuessThePrice';
import { RateThisHouse } from './RateThisHouse';
import { ScrapbookBig } from './ScrapbookBig';
import { FPS, H, W } from './shared';
import { EDITORIAL_VOICED, RATE_VOICED } from './testVoiced';
import { RealtorVoicedCompositions } from './compositions';
import { CAROLYN_TEST } from './testListing';
import type { ListingVideoProps } from './types';

const PRESETS: { id: string; component: ComponentType<ListingVideoProps> }[] = [
  { id: 'RealtorEditorial', component: EditorialCover },
  { id: 'RealtorSplit', component: SplitStack },
  { id: 'RealtorScrapbook', component: ScrapbookTour },
  { id: 'RealtorWhatYouGet', component: WhatYouGet },
  { id: 'RealtorGuessPrice', component: GuessThePrice },
  { id: 'RealtorRateHouse', component: RateThisHouse },
  { id: 'RealtorScrapbookBig', component: ScrapbookBig },
];

const RealtorRoot = () => (
  <>
    {PRESETS.map(({ id, component }) => (
      <Composition key={id} id={id} component={component} durationInFrames={15 * FPS} fps={FPS} width={W} height={H} defaultProps={CAROLYN_TEST} />
    ))}
    <RealtorVoicedCompositions defaults={{ editorial: EDITORIAL_VOICED, rate: RATE_VOICED }} />
  </>
);

registerRoot(RealtorRoot);
