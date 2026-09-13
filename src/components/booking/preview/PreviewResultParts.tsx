'use client';

import type { CreativeDirector, FeelingChoice, GoalChoice, ShootIntention } from '../../../types/booking';
import type { PhotoRoute } from '../../../data/routes';
import {
  DownloadIcon,
  GiftIcon,
  LockIcon,
  PhotoIcon,
  ClockIcon,
  StarIcon,
  HeartIcon,
} from '../../ui/Icons';
import { ShotFrame } from '../ui/ShotFrame';

// ── Label maps ───────────────────────────────────────────────────────────────

const feelingLabels: Record<FeelingChoice, string> = {
  beautiful: '✨ Beautiful & confident',
  soft: '🌸 Soft & feminine',
  elegant: '💎 Elegant & expensive',
  bold: '🔥 Bold & irresistible',
  fashion: '👗 Like a fashion girl',
  noticed: '📸 Like everyone noticed me',
};

const goalLabels: Record<GoalChoice, string> = {
  instagram: 'Refresh my Instagram',
  attention: 'Get more attention',
  style: 'Show my style',
  confident: 'Feel more confident',
  content: 'Create content',
  fun: 'Just have fun',
  jealous: 'Make someone jealous 😏',
};

// ── DirectorBar ───────────────────────────────────────────────────────────────

export const DirectorBar = ({ director }: { director: CreativeDirector }) => (
  <div className="mb-4 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="relative shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={director.avatar}
          alt={director.name}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = director.avatarFallback; }}
          className="h-11 w-11 rounded-full object-cover object-top"
        />
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-[2px] border-page bg-green-400" />
      </div>
      <div>
        <p className="label-caps text-[9px] font-medium text-accent-strong">With {director.name}</p>
        <p className="text-[12px] text-muted">Your Creative Director</p>
      </div>
    </div>
    <div className="flex items-center gap-2 rounded-xl border border-accent/25 bg-accent/8 px-3 py-2">
      <GiftIcon className="h-4 w-4 text-accent-strong" />
      <div>
        <p className="label-caps text-[8px] font-medium text-muted">First photo</p>
        <p className="label-caps text-[9px] font-semibold text-ink">Free preview</p>
      </div>
    </div>
  </div>
);

// ── IntentionRecap ────────────────────────────────────────────────────────────

export const IntentionRecap = ({ intention }: { intention: ShootIntention }) => {
  if (intention.feelings.length === 0 && intention.goals.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-1.5">
      {intention.feelings.map((f) => (
        <span key={f} className="rounded-full bg-accent/12 px-2.5 py-1 text-[11px] text-ink">
          {feelingLabels[f]}
        </span>
      ))}
      {intention.goals.map((g) => (
        <span key={g} className="rounded-full bg-surface-alt px-2.5 py-1 text-[11px] text-muted">
          {goalLabels[g]}
        </span>
      ))}
    </div>
  );
};

// ── IncludedItem ──────────────────────────────────────────────────────────────

export const IncludedItems = ({ directorName }: { directorName: string }) => (
  <ul className="hidden items-center gap-6 lg:flex">
    <IncludedItem icon={<PhotoIcon className="h-4.5 w-4.5" />}>5 personalized<br />photos</IncludedItem>
    <IncludedItem icon={<StarIcon className="h-4.5 w-4.5" />}>{directorName}&apos;s creative<br />direction</IncludedItem>
    <IncludedItem icon={<ClockIcon className="h-4.5 w-4.5" />}>Delivered within<br />30 min</IncludedItem>
  </ul>
);

const IncludedItem = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <li className="flex items-center gap-2.5 text-[11.5px] leading-tight text-muted">
    <span className="shrink-0 text-accent">{icon}</span>
    <span>{children}</span>
  </li>
);

// ── LockedShots ───────────────────────────────────────────────────────────────

export const LockedShots = ({ route }: { route: PhotoRoute }) => (
  <div className="mt-2.5 grid grid-cols-4 gap-2 lg:grid-cols-2">
    {route.shots.slice(1).map((shot, index) => (
      <div key={shot.src} className="relative aspect-[3/4] overflow-hidden rounded-lg">
        <ShotFrame shot={shot} alt="" loading="lazy" interactive={false} className="h-full w-full scale-110 blur-[6px] brightness-75" />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/25">
          <LockIcon className="h-4 w-4 text-white/85" />
          <span className="font-serif text-[10px] text-white/85">{String(index + 2).padStart(2, '0')}</span>
        </div>
        <span className="sr-only">Shot {index + 2}, {route.scenes[index + 1]} — unlocked with the full shoot</span>
      </div>
    ))}
  </div>
);

// ── PreviewLightboxOverlay ────────────────────────────────────────────────────

export const PreviewLightboxOverlay = ({ onDownload }: { onDownload: () => void }) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onDownload(); }}
    aria-label="Download preview photo"
    className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-[12px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:bottom-6 sm:left-auto sm:right-16 sm:translate-x-0"
  >
    <DownloadIcon className="h-3.5 w-3.5" />
    Download
  </button>
);

// ── FullShootPanel ────────────────────────────────────────────────────────────

export const FullShootPanel = ({ route }: { route: PhotoRoute }) => (
  <div className="lg:pt-1">
    <div className="mb-3 flex flex-col items-center gap-1 py-2 text-center">
      <HeartIcon className="h-4 w-4 text-accent/60" />
      <p className="label-caps text-[11px] font-semibold tracking-[0.18em] text-ink">Your full shoot</p>
      <p className="text-[12px] text-muted">4 more moments waiting for you</p>
    </div>
    <LockedShots route={route} />
    <ul className="mt-3 space-y-1">
      {route.scenes.slice(1).map((scene, index) => (
        <li key={scene} className="flex items-baseline gap-2 text-[11.5px] text-muted">
          <span className="font-serif text-[10px] text-accent-strong">{String(index + 2).padStart(2, '0')}</span>
          {scene}
        </li>
      ))}
    </ul>
  </div>
);
