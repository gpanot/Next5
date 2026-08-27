import type { Shot } from '../../../types/booking';
import { PlaceholderImage } from '../../ui/PlaceholderImage';

type ShotFrameProps = {
  shot: Shot;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  interactive?: boolean;
};

export const ShotFrame = ({
  shot,
  alt,
  className = '',
  loading = 'lazy',
  interactive = true,
}: ShotFrameProps) => (
  <PlaceholderImage
    src={shot.src}
    fallbackSrc={shot.fallbackSrc}
    alt={alt}
    label={shot.label}
    loading={loading}
    className={`bg-surface-alt ${className}`}
    imageClassName={[
      shot.objectClassName ?? 'object-center',
      'transition-transform duration-700',
      interactive ? 'group-hover:scale-[1.04]' : '',
    ].join(' ')}
  />
);
