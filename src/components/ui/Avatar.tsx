import { User } from 'lucide-react';

type AvatarSize = 'sm' | 'md' | 'lg';

type AvatarProps = {
  src?: string;
  alt?: string;
  initials?: string;
  size?: AvatarSize;
  className?: string;
};

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: 'h-7  w-7  text-[10px]',
  md: 'h-9  w-9  text-[12px]',
  lg: 'h-12 w-12 text-[15px]',
};

export const Avatar = ({
  src,
  alt = '',
  initials,
  size = 'md',
  className = '',
}: AvatarProps) => {
  const base = [
    'relative inline-flex shrink-0 items-center justify-center rounded-full overflow-hidden bg-app-sunken text-app-muted',
    SIZE_CLASSES[size],
    className,
  ].join(' ');

  if (src) {
    return (
      <span className={base}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      </span>
    );
  }

  if (initials) {
    return (
      <span className={[base, 'font-medium text-app-accent bg-app-accent-soft'].join(' ')} aria-label={alt}>
        {initials.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    <span className={base} aria-label={alt || 'Avatar'}>
      <User className="h-4 w-4" aria-hidden="true" />
    </span>
  );
};
