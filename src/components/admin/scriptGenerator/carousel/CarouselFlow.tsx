'use client';

import { CarouselHookStep } from './CarouselHookStep';
import { CarouselQuestions } from './CarouselQuestions';
import { CarouselResult } from './CarouselResult';
import { CarouselTemplateStep } from './CarouselTemplateStep';
import type { CarouselBuilder } from './useCarouselBuilder';

/** The carousel path: template > questions > slide 1 > carousel. `onExit` goes back to the format choice. */
export function CarouselFlow({ token, c, onExit }: { token: string; c: CarouselBuilder; onExit: () => void }) {
  if (c.step === 'result') return <CarouselResult key={c.session} token={token} c={c} />;
  if (c.step === 'hooks') return <CarouselHookStep c={c} />;
  if (c.step === 'questions') return <CarouselQuestions c={c} />;
  return <CarouselTemplateStep selected={c.template} onPick={c.pickTemplate} onBack={onExit} />;
}
