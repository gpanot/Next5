'use client';

import { useState } from 'react';
import type { ShortBeatDto, ShortDetailDto } from '../../../types/admin/shorts';
import { DownloadIcon } from '../../ui/Icons';
import { PhotoLightbox } from './PhotoLightbox';
import { Disclosure, Section } from './Section';
import { ShotQaBadge, ShotQaDetail } from './ShotQaBadge';
import { seconds } from './useShorts';

/** The Blitz caption styles a hook can use (server/shorts/hookFit.ts). */
const HOOK_STYLE_LABELS: Record<string, string> = { 'tiktok-red': 'TikTok Red', 'white-box': 'White box' };

function BeatMedia({ beat, onOpen }: { beat: ShortBeatDto; onOpen: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <figure className="space-y-1">
        <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-app-sunken">
          {beat.imageUrl && (
            <button type="button" onClick={onOpen} aria-label={`View photo of shot ${beat.idx + 1}`} className="block h-full w-full cursor-zoom-in">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={beat.imageUrl} alt={`Photo of shot ${beat.idx + 1}`} loading="lazy" className="h-full w-full object-cover transition duration-300 hover:scale-[1.02]" />
            </button>
          )}
          {beat.imageDownloadUrl && (
            <a
              href={beat.imageDownloadUrl}
              download
              aria-label={`Download photo of shot ${beat.idx + 1}`}
              className="absolute top-1.5 right-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:bg-black/75"
            >
              <DownloadIcon className="h-4 w-4" />
            </a>
          )}
        </div>
        <figcaption className="text-[10px] text-app-muted">Photo (first frame)</figcaption>
      </figure>
      <figure className="space-y-1">
        <div className="flex aspect-[9/16] items-center justify-center overflow-hidden rounded-lg bg-app-sunken">
          {beat.clipUrl ? (
            <video src={beat.clipUrl} poster={beat.imageUrl ?? undefined} muted loop playsInline controls preload="metadata" className="h-full w-full object-cover" />
          ) : (
            <p className="p-2 text-center text-[10px] text-app-muted">{beat.clipError ? 'Clip failed: slow zoom of the photo used' : 'No clip yet'}</p>
          )}
        </div>
        <figcaption className="text-[10px] text-app-muted">Clip{beat.clipMs ? ` · made in ${seconds(beat.clipMs)}` : ''}</figcaption>
      </figure>
    </div>
  );
}

function BeatCard({ beat, onOpen }: { beat: ShortBeatDto; onOpen: () => void }) {
  const changed = beat.rawImagePrompt && beat.imagePrompt && beat.rawImagePrompt !== beat.imagePrompt;
  return (
    <li className="space-y-3 rounded-lg border border-app-line p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="flex flex-wrap items-center gap-2 text-xs font-bold tracking-wide text-app-muted uppercase">
          Shot {beat.idx + 1} · {beat.role}
          <ShotQaBadge beat={beat} />
        </p>
        <p className="text-[11px] text-app-muted tabular-nums">
          {beat.startS.toFixed(1)}–{(beat.startS + beat.spanS).toFixed(1)} s on screen{beat.genS ? ` · ${beat.genS} s generated` : ''}
          {beat.motionHint ? ` · ${beat.motionHint.replace(/_/g, ' ')}` : ''}
        </p>
      </div>
      <p className="text-sm font-semibold text-app-ink">“{beat.text}”</p>
      {beat.visualAnchor && <p className="text-xs text-app-muted">Grounded on: <span className="text-app-ink">{beat.visualAnchor}</span></p>}
      {beat.accent && <p className="text-xs text-app-muted">On-screen text: <span className="font-bold text-app-ink uppercase">{beat.accent}</span></p>}
      {beat.role === 'hook' && beat.accent && (
        <p className="text-xs text-app-muted">
          Hook position: {typeof beat.accentTopY === 'number' ? `Auto Fit, top at ${beat.accentTopY} px of 1920${beat.accentFitReason ? ` · ${beat.accentFitReason}` : ''}` : 'default (Auto Fit not run or failed)'}
          <br />
          Hook style: {beat.accentStyle ? `${HOOK_STYLE_LABELS[beat.accentStyle] ?? beat.accentStyle}${beat.accentStyleReason ? ` · ${beat.accentStyleReason}` : ''}` : 'Montserrat (before styles)'}
        </p>
      )}
      {beat.board && (
        <p className="text-xs text-app-muted">
          Storyboard: <span className="text-app-ink">{beat.board.shot} · {beat.board.setting} · {beat.board.person}</span>
        </p>
      )}
      <BeatMedia beat={beat} onOpen={onOpen} />
      <ShotQaDetail beat={beat} />
      {beat.clipError && <p className="rounded-lg bg-app-accent-soft p-2 font-mono text-[11px] break-words text-app-danger">{beat.clipError}</p>}
      <div className="space-y-1.5">
        {beat.imagePrompt && <Disclosure label="Image prompt (sent)" text={beat.imagePrompt} />}
        {changed && <Disclosure label="Image prompt as planned (before text/number stripping)" text={beat.rawImagePrompt ?? ''} />}
        {beat.motionAction && <p className="text-xs text-app-muted">Motion: <span className="text-app-ink">{beat.motionAction}</span></p>}
        {beat.videoPrompt && <Disclosure label="Video prompt" text={beat.videoPrompt} />}
      </div>
    </li>
  );
}

/** Every shot: its line, timing, photo, clip and the prompts that made them. A photo opens full size. */
export function BeatsPanel({ short }: { short: ShortDetailDto }) {
  const [open, setOpen] = useState<number | null>(null);
  if (short.beats.length === 0) {
    return (
      <Section title="Shots">
        <p className="text-sm text-app-muted">{short.status === 'FAILED' ? 'The short stopped before the shots were planned.' : short.status === 'AWAITING_PHOTOS' ? 'Shots appear once you pick the photo model above.' : 'Shots appear once the voice is done.'}</p>
      </Section>
    );
  }
  return (
    <Section title="Shots" aside={`${short.beats.length} shots`}>
      <ul className="grid gap-3 lg:grid-cols-2">{short.beats.map((b, i) => <BeatCard key={b.idx} beat={b} onOpen={() => setOpen(i)} />)}</ul>
      {open !== null && <PhotoLightbox beats={short.beats} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </Section>
  );
}
