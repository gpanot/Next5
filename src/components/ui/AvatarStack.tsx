import { PlaceholderImage } from './PlaceholderImage';

type AvatarStackProps = {
  sources: readonly string[];
  size?: 'sm' | 'md';
  ringClassName?: string;
};

const sizeStyles = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
} as const;

export const AvatarStack = ({
  sources,
  size = 'md',
  ringClassName = 'ring-white',
}: AvatarStackProps) => (
  <div className="flex items-center">
    {sources.map((src, index) => (
      <PlaceholderImage
        key={src}
        src={src}
        alt="Happy Next5 customer"
        className={`${sizeStyles[size]} shrink-0 rounded-full ring-2 ${ringClassName} ${
          index === 0 ? '' : '-ml-2.5'
        }`}
      />
    ))}
  </div>
);
