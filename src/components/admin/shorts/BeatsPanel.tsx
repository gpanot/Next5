'use client';

import type { ShortBeatDto, ShortDetailDto } from '../../../types/admin/shorts';
import { Disclosure, Section } from './Section';
import { seconds } from './useShorts';

function BeatMedia({ beat }: { beat: ShortBeatDto }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <figure className="space-y-1">
        <div className="aspect-[9/16] overflow-hidden rounded-lg bg-app-sunken">
          {beat.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={beat.imageUrl} alt={`Photo of shot ${beat.idx + 1}`} loading="lazy" className="h-full w-full object-cover" />
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

function BeatCard({ beat }: { beat: ShortBeatDto }) {
  const changed = beat.rawImagePrompt && beat.imagePrompt && beat.rawImagePrompt !== beat.imagePrompt;
  return (
    <li className="space-y-3 rounded-lg border border-app-line p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-bold tracking-wide text-app-muted uppercase">Shot {beat.idx + 1} · {beat.role}</p>
        <p className="text-[11px] text-app-muted tabular-nums">
          {beat.startS.toFixed(1)}–{(beat.startS + beat.spanS).toFixed(1)} s on screen{beat.genS ? ` · ${beat.genS} s generated` : ''}
          {beat.motionHint ? ` · ${beat.motionHint.replace(/_/g, ' ')}` : ''}
        </p>
      </div>
      <p className="text-sm font-semibold text-app-ink">“{beat.text}”</p>
      {beat.visualAnchor && <p className="text-xs text-app-muted">Grounded on: <span className="text-app-ink">{beat.visualAnchor}</span></p>}
      {beat.accent && <p className="text-xs text-app-muted">On-screen accent: <span className="font-bold text-app-ink uppercase">{beat.accent}</span></p>}
      <BeatMedia beat={beat} />
      {beat.clipError && <p className="rounded-lg bg-app-accent-soft p-2 font-mono text-[11px] break-words text-app-danger">{beat.clipError}</p>}
      <div className="space-y-1.5">
        {beat.imagePrompt && <Disclosure label="Image prompt (sent)" text={beat.imagePrompt} />}
        {changed && <Disclosure label="Image prompt as planned (before text/number stripping)" text={beat.rawImagePrompt ?? ''} />}
        {beat.videoPrompt && <Disclosure label="Video prompt" text={beat.videoPrompt} />}
      </div>
    </li>
  );
}

/** Every shot: its line, timing, photo, clip and the prompts that made them. */
export function BeatsPanel({ short }: { short: ShortDetailDto }) {
  if (short.beats.length === 0) {
    return (
      <Section title="Shots">
        <p className="text-sm text-app-muted">{short.status === 'FAILED' ? 'The short stopped before the shots were planned.' : 'Shots appear once the voice is done.'}</p>
      </Section>
    );
  }
  return (
    <Section title="Shots" aside={`${short.beats.length} shots`}>
      <ul className="grid gap-3 lg:grid-cols-2">{short.beats.map((b) => <BeatCard key={b.idx} beat={b} />)}</ul>
    </Section>
  );
}
