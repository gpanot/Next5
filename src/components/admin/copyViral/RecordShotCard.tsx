'use client';

import type { CopyViralShot } from '../../../types/admin/copyViral';
import { ClipSlot } from './ClipSlot';
import { EditableText } from './EditableText';
import { PlayBadge } from './ShotCard';
import { MIN_SHOT_MS } from './shotEdits';
import { deleteClip, saveShotText, secondsLabel, timecode, uploadClip } from './useCopyViral';

type Props = {
  token: string;
  projectId: string;
  shot: CopyViralShot;
  frameUrl: string | null;
  busy: boolean;
  selected: boolean;
  /** Selects the shot and plays it alone in the reference player (again on each click). */
  onSelect: () => void;
  playing: boolean;
  onStop: () => void;
  onChange: () => void;
  onRecord: () => void;
  /** Joins this shot and the next into one take; undefined on the last shot. */
  onMerge?: () => void;
  /** Splits this shot at the sentence end nearest its middle. */
  onSplit: () => void;
};

const smallBtn = 'min-h-8 rounded-lg border border-app-line px-2 text-xs font-semibold text-app-ink transition hover:bg-app-sunken disabled:opacity-30';

const Label = ({ children }: { children: string }) => <p className="text-[11px] font-bold tracking-wide text-app-muted uppercase">{children}</p>;

/** One shot to record, laid out like the cut editor's card: still, original and my line, tools, then my take. */
export function RecordShotCard({ token, projectId, shot, frameUrl, busy, selected, onSelect, playing, onStop, onChange, onRecord, onMerge, onSplit }: Props) {
  const r = shot.reading;
  const save = (patch: { myLine?: string; myOnScreenText?: string }) => saveShotText(token, projectId, shot.index, shot.startMs, patch).then(onChange);
  const look = r ? [r.layout.replace('_', ' '), r.framing, r.facePct ? `face ${r.facePct}%` : '', r.movement].filter(Boolean).join(' · ') : '';
  const length = shot.endMs - shot.startMs;

  return (
    <li className={`flex gap-3 rounded-xl border bg-app-panel p-3 shadow-sm transition ${selected ? 'border-app-ink' : 'border-app-line'}`}>
      <button type="button" onClick={onSelect} className="relative aspect-[9/16] w-24 shrink-0 self-start overflow-hidden rounded-lg bg-app-sunken">
        {frameUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={frameUrl} alt={`Shot ${shot.index + 1}`} className="h-full w-full object-cover" />
        )}
        <span className="absolute top-1 left-1 rounded-md bg-app-ink px-1.5 text-[11px] font-bold text-app-panel">{shot.index + 1}</span>
        <PlayBadge playing={playing} />
      </button>

      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-sm font-bold text-app-ink">
          {timecode(shot.startMs)} → {timecode(shot.endMs)} <span className="font-normal text-app-muted">· {secondsLabel(length)} · target {secondsLabel(shot.targetMs)}</span>
        </p>
        {look && <p className="text-xs text-app-muted">{look}</p>}
        <p className="line-clamp-3 text-sm text-app-muted italic">{shot.transcript ? `“${shot.transcript}”` : '(no speech)'}</p>
        <div className="space-y-1">
          <Label>My line</Label>
          <EditableText value={shot.myLine} rows={Math.max(2, shot.myLine.split('\n').length)} placeholder="What I say in this shot (a return is a new teleprompter line)" onSave={(myLine) => save({ myLine })} />
        </div>
        {(r?.onScreenText || shot.myOnScreenText) && (
          <div className="space-y-1">
            <Label>My on-screen text</Label>
            {r?.onScreenText && <p className="text-xs text-app-muted italic">Original: {r.onScreenText.replace(/\n/g, ' · ')}</p>}
            <EditableText value={shot.myOnScreenText} rows={Math.max(1, shot.myOnScreenText.split('\n').length)} onSave={(myOnScreenText) => save({ myOnScreenText })} />
          </div>
        )}
        {r?.overlays && <p className="text-xs text-app-muted">Overlays: {r.overlays}</p>}
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={playing ? 'min-h-8 rounded-lg bg-red-500 px-2 text-xs font-semibold text-white transition hover:bg-red-400' : smallBtn} onClick={playing ? onStop : onSelect}>
            {playing ? '■ Stop' : '▶ Play shot'}
          </button>
          <button type="button" className={smallBtn} onClick={onSplit} disabled={busy || length < 2 * MIN_SHOT_MS} title="Split at the sentence end nearest the middle">Split</button>
          <button type="button" className={smallBtn} onClick={onMerge} disabled={busy || !onMerge} title="Record this shot and the next one in one take">Merge ↓</button>
        </div>
      </div>

      <ClipSlot
        token={token}
        projectId={projectId}
        clip={shot.clip}
        disabled={busy}
        onUpload={(file) => uploadClip(token, projectId, shot.index, shot.startMs, file).then(onChange)}
        onRemove={() => deleteClip(token, projectId, shot.index, shot.startMs).then(onChange)}
        onRecord={onRecord}
      />
    </li>
  );
}
