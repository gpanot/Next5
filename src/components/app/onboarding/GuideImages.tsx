import Image from 'next/image';
import { hasManifestImage } from '../../../lib/manifest';

type Guide = { src: string; label: string; good: boolean };

const IMG = '/images/business/onboarding';

export const SELFIE_GUIDES: readonly Guide[] = [
  { src: `${IMG}/selfie-good.png`, label: 'Even light, just you', good: true },
  { src: `${IMG}/selfie-bad-sunglasses.png`, label: 'No sunglasses or hats', good: false },
  { src: `${IMG}/selfie-bad-dark.png`, label: 'Not too dark', good: false },
  { src: `${IMG}/selfie-bad-group.png`, label: 'No other people', good: false },
];

export const PRODUCT_GUIDES: readonly Guide[] = [
  { src: `${IMG}/product-good-flatlay.png`, label: 'Flat on a plain sheet', good: true },
  { src: `${IMG}/product-good-hanger.png`, label: 'On a hanger, plain wall', good: true },
  { src: `${IMG}/product-bad-wrinkled.png`, label: 'Not crumpled or dark', good: false },
  { src: `${IMG}/product-bad-multiple.png`, label: 'One item per photo', good: false },
];

/** Good/bad example photos with a tick or cross, so people upload usable references. */
export const GuideImages = ({ guides }: { guides: readonly Guide[] }) => (
  <ul className="grid grid-cols-4 gap-2">
    {guides.filter((g) => hasManifestImage(g.src)).map((g) => (
      <li key={g.src} className="flex flex-col gap-1">
        <div className={`relative aspect-square overflow-hidden rounded-xl ring-2 ${g.good ? 'ring-app-success' : 'ring-app-danger/60'}`}>
          <Image src={g.src} alt={g.label} fill sizes="120px" className="object-cover" />
          <span className={`absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold text-white ${g.good ? 'bg-app-success' : 'bg-app-danger'}`} aria-hidden>
            {g.good ? '✓' : '✕'}
          </span>
        </div>
        <span className="text-[11px] leading-tight text-app-muted">{g.label}</span>
      </li>
    ))}
  </ul>
);
