'use client';

import { useEffect, useState } from 'react';
import type { PhotoOptionDto } from '../../../../../types/admin/slideshowCampaign';
import { PhotoOptionGrid } from '../PhotoOptionGrid';
import { UnsplashCredit } from '../UnsplashCredit';
import { CheckIcon, SparkIcon } from './icons';
import { PoseStep } from './PoseStep';
import { SceneStep } from './SceneStep';
import { ScreenStep } from './ScreenStep';
import { StockSearch } from './StockSearch';
import { useAppShot, type AppShotState } from './useAppShot';

type Props = {
  token: string;
  campaignId: string;
  /** A finished App shot, picked in the dialog (Done puts it on the slide). */
  onBuilt: (option: PhotoOptionDto) => void;
  /** The dialog's picks (option keys), so App shots made before can be picked again. */
  selected: string[];
  onToggle: (option: PhotoOptionDto) => void;
};

/** The App shots made before, newest first: tap one to pick it again instead of building a new one. */
function PastShots({ shots, selected, onToggle }: { shots: PhotoOptionDto[] | null; selected: string[]; onToggle: Props['onToggle'] }) {
  if (shots !== null && shots.length === 0) return null;
  return (
    <section className="space-y-2 border-t border-white/10 pt-4">
      <h4 className="text-[11px] font-semibold tracking-widest text-white/50 uppercase">Your App shots</h4>
      <PhotoOptionGrid options={shots} loading={shots === null} selected={selected} onToggle={onToggle} empty="" />
    </section>
  );
}

/** What the Build bar says is missing, or what building costs. */
const buildHint = (s: AppShotState): string => {
  if (!s.screen) return 'Upload your app screen.';
  if (!s.ready) return 'Say where the phone is, or pick a background.';
  return 'AI puts the phone in your scene. About 25 s.';
};

/** How long Build takes: the AI step answers in about 20-25 s. */
const BUILD_SECONDS = 25;

/** Seconds left of the build, counted down from BUILD_SECONDS while `active`; 0 once the estimate ran out. */
const useBuildCountdown = (active: boolean): number => {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1_000);
    return () => {
      clearInterval(id);
      setElapsed(0);
    };
  }, [active]);
  return Math.max(0, BUILD_SECONDS - elapsed);
};

function Result({ option, onAnother }: { option: PhotoOptionDto; onAnother: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-white/10 bg-black/20 p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={option.thumbUrl} alt="Your App shot" className="aspect-[9/16] w-48 rounded-xl object-cover shadow-sm sm:w-56" />
      {option.credit && <UnsplashCredit credit={option.credit} className="text-xs text-white/50" />}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-300"><CheckIcon /> Picked. Tap Done to use it.</span>
        <button type="button" onClick={onAnother} className="min-h-11 rounded-full border border-white/15 px-4 text-sm font-semibold text-white/85 transition hover:bg-white/5 active:scale-95">Build another</button>
      </div>
    </div>
  );
}

/**
 * The picker's App shot tab: a pose (a hand holding a phone), the app screenshot, and the scene. Build puts the
 * screenshot on the phone's screen over the background on the server, then AI relights it for the scene.
 */
export function AppShotPanel({ token, campaignId, onBuilt, selected, onToggle }: Props) {
  const s = useAppShot(token, campaignId);
  const [searchFor, setSearchFor] = useState<string | null>(null);
  const left = useBuildCountdown(s.busy === 'build');

  const past = <PastShots shots={s.shots?.filter((o) => o.key !== s.built?.key) ?? null} selected={selected} onToggle={onToggle} />;
  if (s.built) return <div className="space-y-4"><Result option={s.built} onAnother={s.buildAnother} />{past}</div>;

  const build = async () => {
    const option = await s.build();
    if (option) onBuilt(option);
  };
  const stockKey = s.background?.bg.source === 'unsplash' ? `unsplash:${s.background.bg.id}` : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-5 rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow-sm md:grid-cols-3">
        <PoseStep pose={s.pose} screen={s.screen?.url ?? null} onPick={s.setPose} />
        <ScreenStep screen={s.screen} uploading={s.busy === 'screen'} onFile={s.uploadScreen} onClear={s.clearScreen} />
        <SceneStep
          scene={s.scene}
          background={s.background}
          busy={s.busy}
          searching={searchFor !== null}
          onScene={s.setScene}
          onUpload={s.uploadScene}
          onGenerate={s.generateScene}
          onSearch={() => setSearchFor(s.scene.trim())}
          onClear={s.clearBackground}
        />
      </div>
      {searchFor && (
        <StockSearch token={token} campaignId={campaignId} query={searchFor} selected={stockKey} onPick={(o) => { s.pickStock(o); setSearchFor(null); }} onClose={() => setSearchFor(null)} />
      )}
      {s.error && <p role="alert" className="rounded-lg bg-red-500/15 p-3 text-sm text-red-300">{s.error}</p>}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => void build()}
          disabled={!s.ready || s.busy !== null}
          className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-400 px-5 text-sm font-semibold text-zinc-950 shadow-sm transition active:scale-95 disabled:opacity-40"
        >
          <SparkIcon />
          {s.busy === 'build' ? (left > 0 ? `Building… ${left} s` : 'Almost done…') : 'Build the image'}
        </button>
        <p className="text-sm text-white/50">{buildHint(s)}</p>
      </div>
      {past}
    </div>
  );
}
