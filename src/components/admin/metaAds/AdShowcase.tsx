/** Floating example ads around the Perfect Ads start screen (side decks on wide screens, swipe strip below). */
import { FittedImage } from '../shared/FittedImage';

type Stat = { label: string; value: string; direction: 'up' | 'down' };

/** Real Perfect Ads outputs, copied from the object store into public/. Ad copy is baked into each image. */
type ShowcaseAd = {
  kind: 'image' | 'video';
  src: string;
  /** Video only: first frame, shown until the clip loads */
  poster?: string;
  alt: string;
  stats: Stat[];
};

const SHOWCASE_ADS: ShowcaseAd[] = [
  {
    kind: 'image',
    src: '/images/perfect-ads/vintage-store-owner.jpg',
    alt: 'Ad: store owner among clothes racks, "Source vintage faster"',
    stats: [{ label: 'CTR', value: '4.2%', direction: 'up' }, { label: 'ROAS', value: '5.1×', direction: 'up' }],
  },
  {
    kind: 'video',
    src: '/videos/perfect-ads/booking-ugc.mp4',
    poster: '/images/perfect-ads/booking-ugc-poster.jpg',
    alt: 'UGC video ad: woman talking to camera about booking',
    stats: [{ label: 'CTR', value: '3.6%', direction: 'up' }, { label: 'CPA', value: '38%', direction: 'down' }],
  },
  {
    kind: 'image',
    src: '/images/perfect-ads/desk-headphones.jpg',
    alt: 'Ad: laptop and headphones on a desk, "Admin done instantly."',
    stats: [{ label: 'ROAS', value: '4.4×', direction: 'up' }],
  },
  {
    kind: 'image',
    src: '/images/perfect-ads/denim-flatlay.jpg',
    alt: 'Ad: denim jacket flat-lay, "Buyer protection on every order."',
    stats: [{ label: 'CTR', value: '5.3%', direction: 'up' }, { label: 'ROAS', value: '6.2×', direction: 'up' }],
  },
  {
    kind: 'image',
    src: '/images/perfect-ads/workshop-owner.jpg',
    alt: 'Ad: workshop owner on his phone, "Book from Google"',
    stats: [{ label: 'CPC', value: '41%', direction: 'down' }, { label: 'CTR', value: '3.9%', direction: 'up' }],
  },
  {
    kind: 'video',
    src: '/videos/perfect-ads/reminders-ugc.mp4',
    poster: '/images/perfect-ads/reminders-ugc-poster.jpg',
    alt: 'UGC video ad: man talking to camera in his workshop',
    stats: [{ label: 'CTR', value: '4.8%', direction: 'up' }, { label: 'ROAS', value: '3.7×', direction: 'up' }],
  },
  {
    kind: 'image',
    src: '/images/perfect-ads/garage-phone.jpg',
    alt: 'Ad: mechanic checking his phone in a garage, "AI answers every call"',
    stats: [{ label: 'CPA', value: '29%', direction: 'down' }],
  },
  {
    kind: 'image',
    src: '/images/perfect-ads/selfie-reminders.jpg',
    alt: 'Ad: smiling woman taking a selfie in her workshop, "Reminders cut no-shows"',
    stats: [{ label: 'CTR', value: '4.1%', direction: 'up' }, { label: 'ROAS', value: '4.9×', direction: 'up' }],
  },
];

/** Absolute slots for the wide-screen side decks: 3 cards per side, tilted like prints on a desk. */
/** Cards are ~300px tall on 2xl; 21rem steps keep them apart even when tilted. */
const LEFT_SLOTS = ['left-0 top-4 -rotate-6', 'left-24 top-[21rem] rotate-3', 'left-2 top-[42rem] -rotate-3'];
const RIGHT_SLOTS = ['right-2 top-0 rotate-6', 'right-24 top-[21rem] -rotate-3', 'right-0 top-[42rem] rotate-3'];
const STRIP_TILTS = ['-rotate-2', 'rotate-2', '-rotate-1', 'rotate-1'];

function Arrow({ direction }: { direction: Stat['direction'] }) {
  return (
    <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden className="text-emerald-500">
      <path d={direction === 'up' ? 'M5 1 9 8H1z' : 'M5 9 1 2h8z'} fill="currentColor" />
    </svg>
  );
}

function AdMedia({ ad }: { ad: ShowcaseAd }) {
  if (ad.kind === 'video') {
    return (
      <video
        src={ad.src}
        poster={ad.poster}
        aria-label={ad.alt}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      />
    );
  }
  return <FittedImage src={ad.src} alt={ad.alt} sizes="160px" />;
}

function AdCard({ ad, className }: { ad: ShowcaseAd; className: string }) {
  return (
    <figure className={`w-36 shrink-0 rounded-2xl border border-line bg-white p-2 shadow-sm transition duration-300 hover:z-10 hover:scale-105 hover:rotate-0 hover:shadow-lg 2xl:w-40 dark:border-zinc-800 dark:bg-zinc-900 ${className}`}>
      <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
        <AdMedia ad={ad} />
        {ad.kind === 'video' && (
          <span className="absolute right-2 bottom-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">Video</span>
        )}
      </div>
      <figcaption className="mt-2 flex items-center justify-center gap-3 text-[11px] text-muted dark:text-zinc-400">
        {ad.stats.map((stat) => (
          <span key={stat.label} className="flex items-center gap-1">
            <Arrow direction={stat.direction} />
            {stat.label}
            <b className="font-semibold text-ink dark:text-zinc-100">{stat.value}</b>
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/** Wide screens only: cards float in the empty space on both sides of the hero. */
export function AdSideDecks() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 hidden 2xl:block">
      {SHOWCASE_ADS.slice(0, 3).map((ad, i) => (
        <AdCard key={ad.src} ad={ad} className={`pointer-events-auto absolute ${LEFT_SLOTS[i]}`} />
      ))}
      {SHOWCASE_ADS.slice(3, 6).map((ad, i) => (
        <AdCard key={ad.src} ad={ad} className={`pointer-events-auto absolute ${RIGHT_SLOTS[i]}`} />
      ))}
    </div>
  );
}

/** Phones to laptops: one horizontal swipe row with snap. */
export function AdStrip() {
  return (
    <div className="-mx-4 mt-10 w-[calc(100%+2rem)] 2xl:hidden">
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pt-3 pb-6 [scrollbar-width:none]">
        {SHOWCASE_ADS.map((ad, i) => (
          <AdCard key={ad.src} ad={ad} className={`snap-center ${STRIP_TILTS[i % STRIP_TILTS.length]}`} />
        ))}
      </div>
    </div>
  );
}
