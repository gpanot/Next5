'use client';

/**
 * Lazy-loads and renders the AssetDescriptor for a BlitzAsset.
 * Opened by the "See Description" button below the card in the Assets Library.
 * Speech fields (has speech + transcript) are editable for video/meme assets.
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { fetchDescriptor, type DescriptorJson, type DescriptorRow } from './assetDescriptorTypes';
import { DescriptorSpeechEditor } from './DescriptorSpeechEditor';

export function Row({ label, value, highlight }: { label: string; value: string; highlight?: 'red' | 'green' }) {
  return (
    <div className="flex gap-1.5">
      <span className="w-24 shrink-0 text-[9px] font-semibold uppercase tracking-wide text-subtle">{label}</span>
      <span className={[
        'flex-1 text-[10.5px]',
        highlight === 'red'   ? 'font-semibold text-red-600' :
        highlight === 'green' ? 'font-semibold text-green-700' :
        'text-ink',
      ].join(' ')}>
        {value}
      </span>
    </div>
  );
}

const scoreLine = (scores: Record<string, number>) =>
  Object.entries(scores).map(([k, v]) => `${k} ${v.toFixed(2)}`).join('  ·  ');

function VideoFields({ d }: { d: DescriptorJson }) {
  const emotion = typeof d.emotion === 'object' ? d.emotion : null;
  return (
    <>
      {d.subject && <Row label="Subject" value={d.subject} />}
      {d.action  && <Row label="Action"  value={d.action} />}
      {emotion?.face  && <Row label="Face"  value={emotion.face} />}
      {emotion?.voice && <Row label="Voice" value={emotion.voice} />}
      {d.meaning && <Row label="Meaning" value={d.meaning} />}
      {d.bestUse && <Row label="Best use" value={d.bestUse} />}
      {d.setting && <Row label="Setting"  value={d.setting} />}
      {d.vibe && d.vibe.length > 0 && <Row label="Vibe" value={d.vibe.join(', ')} />}
      {d.pacing  && <Row label="Pacing" value={`${d.pacing}  ·  energy ${d.energyLevel?.toFixed(2) ?? '—'}`} />}
      {d.textSafeZone && <Row label="Text safe zone" value={d.textSafeZone} />}
    </>
  );
}

function ScoreFields({ d }: { d: DescriptorJson }) {
  return (
    <>
      {d.slotScores  && <Row label="Slots"  value={scoreLine(d.slotScores)} />}
      {d.nicheScores && <Row label="Niches" value={scoreLine(d.nicheScores)} />}
      {d.avoidFor && d.avoidFor.length > 0 && <Row label="Avoid for" value={d.avoidFor.join(', ')} />}
      {d.bestTrim && <Row label="Best trim" value={`${d.bestTrim.start}s → ${d.bestTrim.end}s`} />}
    </>
  );
}

function MusicFields({ d }: { d: DescriptorJson }) {
  return (
    <>
      {d.sound && <Row label="Sound" value={d.sound} />}
      {typeof d.emotion === 'string' && <Row label="Emotion" value={d.emotion} />}
      {d.imagery && <Row label="Imagery" value={d.imagery} />}
      {d.sections && d.sections.length > 0 && (
        <Row label="Sections" value={d.sections.map((s) => `${s.label} [${s.start}–${s.end}s, ${s.energy}]`).join('  ·  ')} />
      )}
      {d.dropAt !== undefined && d.dropAt !== null && <Row label="Drop at" value={`${d.dropAt}s`} />}
      {d.bpmEstimate ? <Row label="BPM" value={String(d.bpmEstimate)} /> : null}
      {d.bestStart !== undefined && <Row label="Best start" value={`${d.bestStart}s`} />}
    </>
  );
}

function RowMeta({ row }: { row: DescriptorRow }) {
  const risk = row.effectiveRightsRisk ?? row.rightsRisk;
  return (
    <>
      <Row
        label="Rights risk"
        value={`${risk ?? '—'}${row.rightsRiskOverride ? ` (override: ${row.rightsRiskOverride})` : ''}`}
        highlight={risk === 'high' ? 'red' : risk === 'low' ? 'green' : undefined}
      />
      {row.descriptor?.identifiablePerson !== undefined && (
        <Row label="Identifiable person" value={String(row.descriptor.identifiablePerson)} />
      )}
      {row.loudnessCurve && <Row label="Loudness" value={row.loudnessCurve} />}
      {row.retrievalText && (
        <div className="mt-1.5 border-t border-line/40 pt-1.5">
          <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-wide text-subtle">Retrieval text</p>
          <p className="text-[10px] italic text-muted">&ldquo;{row.retrievalText}&rdquo;</p>
        </div>
      )}
      <div className="mt-1 text-[9px] text-subtle">
        {row.model} · v{row.descriptorVersion} · {row.status}
      </div>
    </>
  );
}

function DescriptorBody({ token, row, onChange }: { token: string; row: DescriptorRow; onChange: (r: DescriptorRow) => void }) {
  const d = row.descriptor ?? {};
  const isVideo = row.kind !== 'music';
  return (
    <div className="space-y-1.5 bg-surface-alt/60 px-2 pb-2.5 pt-1 text-[11px] leading-relaxed">
      <VideoFields d={d} />
      {isVideo && row.status === 'done' && <DescriptorSpeechEditor token={token} row={row} onSaved={onChange} />}
      <ScoreFields d={d} />
      <MusicFields d={d} />
      <RowMeta row={row} />
    </div>
  );
}

type LoadState = 'idle' | 'loading' | 'done' | 'none' | 'error';

export function DescriptionPanel({ token, assetId }: { token: string; assetId: string }) {
  const [state, setState] = useState<LoadState>('idle');
  const [row, setRow] = useState<DescriptorRow | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (state === 'loading') return;
    setState('loading');
    try {
      const d = await fetchDescriptor(token, assetId);
      setRow(d);
      setState(d ? 'done' : 'none');
      setOpen(true);
    } catch {
      setState('error');
    }
  };

  const toggle = () => {
    if (state === 'idle') { void load(); return; }
    if (state === 'done' || state === 'none') setOpen((p) => !p);
  };

  return (
    <div className="border-t border-line/60">
      <button
        type="button"
        onClick={toggle}
        disabled={state === 'loading' || state === 'error'}
        className="flex w-full items-center justify-between gap-1 px-2 py-1.5 text-[11px] font-medium text-muted transition-colors hover:bg-surface-alt hover:text-ink disabled:opacity-50"
      >
        <span className="flex items-center gap-1">
          {state === 'loading' && <Loader2 className="h-3 w-3 animate-spin" />}
          {state === 'error'   && <span className="text-red-500">Error</span>}
          {state === 'none'    && <span className="italic text-subtle">No descriptor yet</span>}
          {(state === 'idle' || state === 'done') && 'See Description'}
        </span>
        {(state === 'done' || state === 'none') && (
          open ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />
        )}
      </button>

      {open && state === 'done' && row && <DescriptorBody token={token} row={row} onChange={setRow} />}

      {open && state === 'none' && (
        <p className="px-2 pb-2 text-[10px] italic text-subtle">
          No AI description yet — run the descriptor pipeline on this asset.
        </p>
      )}
    </div>
  );
}
