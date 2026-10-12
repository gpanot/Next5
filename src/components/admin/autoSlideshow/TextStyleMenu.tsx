'use client';

import type { AutoSlideDto } from '../../../types/admin/autoSlideshow';
import { bodyPick, titlePick, type SlideLook } from '../../../types/slideText';
import { LookMenu } from './LookMenu';
import { styleGroupOf, type StyleGroup } from './useLiveEdits';

type Part = 'look' | 'bodyLook';
type Props = { slide: AutoSlideDto; part: Part; onPick: (group: StyleGroup, part: Part, look: SlideLook) => void };

/** Which slides a pick reaches, named in the menu. */
const SCOPE: Record<StyleGroup, string> = { hook: 'Hook', content: 'Every content slide', cta: 'CTA' };

/**
 * The title's or the subtitle's text style, in front of its field: each on its own, on every slide of the on-screen
 * slide's kind (every content slide shares one, like the campaign editor). Picks show on the slides at once.
 */
export function TextStyleMenu({ slide, part, onPick }: Props) {
  const group = styleGroupOf(slide);
  const title = part === 'look';
  return (
    <LookMenu
      label={title ? 'Title style' : 'Subtitle style'}
      scope={SCOPE[group]}
      active={title ? titlePick(slide.role, slide.look) : bodyPick(slide.bodyLook)}
      onPick={(look) => onPick(group, part, look)}
    />
  );
}
