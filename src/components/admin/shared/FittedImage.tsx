import Image from 'next/image';

type Props = { src: string; alt: string; sizes: string; className?: string };

/** A 4:5 creative inside a taller (9:16) frame, as TikTok and Reels show it: whole image on top of a blurred fill
 *  of itself, so text baked into the image never gets cropped. The parent must be `relative`. */
export function FittedImage({ src, alt, sizes, className = '' }: Props) {
  return (
    <div className={`absolute inset-0 ${className}`}>
      <Image src={src} alt="" aria-hidden fill sizes={sizes} className="scale-110 object-cover blur-xl brightness-75" />
      <Image src={src} alt={alt} fill sizes={sizes} className="object-contain" />
    </div>
  );
}
