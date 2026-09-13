import Image from 'next/image';
import { hasManifestImage, manifestAlt } from '../../../lib/manifest';

type MarketingImageProps = {
  src: string;
  alt?: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  /** Short contact-sheet caption, e.g. "SET · MODERN OFFICE · 4:5". */
  caption?: string;
};

/**
 * A photo from the manifest, filling its (relative, sized) parent. Renders nothing when the image
 * has not been generated yet — never a stand-in box (global image rule).
 */
export const MarketingImage = ({ src, alt, sizes, priority = false, className = '', caption }: MarketingImageProps) => {
  if (!hasManifestImage(src)) return null;
  return (
    <>
      <Image
        src={src}
        alt={alt ?? manifestAlt(src, '')}
        fill
        sizes={sizes}
        priority={priority}
        className={`object-cover ${className}`}
      />
      {caption && (
        <span className="label-caps pointer-events-none absolute bottom-2.5 left-2.5 rounded-full bg-black/45 px-2 py-1 text-[8.5px] font-medium text-white/90 backdrop-blur-sm">
          {caption}
        </span>
      )}
    </>
  );
};
