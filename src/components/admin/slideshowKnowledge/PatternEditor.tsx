'use client';

import { FORMAT_LABELS, HOOK_ARCHETYPES, SLIDESHOW_FORMATS, type HookArchetype, type SlideshowFormat, type SlideshowPattern } from '../../../types/admin/slideshowKnowledge';

type Props = { pattern: SlideshowPattern; onChange: (pattern: SlideshowPattern) => void };

const HOOK_LABELS: Record<HookArchetype, string> = {
  call_out: 'Call-out',
  contrarian: 'Myth buster',
  proof_result: 'Result first',
  fear_inaction: 'Cost of a mistake',
  curiosity: 'Curiosity',
  action: 'Challenge',
};

const fieldClass = 'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink focus:border-blue-500 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100';
const labelClass = 'block space-y-1 text-[11px] font-semibold tracking-wide text-muted uppercase';

function TextField({ label, value, rows = 1, onChange }: { label: string; value: string; rows?: number; onChange: (v: string) => void }) {
  return (
    <label className={labelClass}>
      <span>{label}</span>
      {rows > 1 ? (
        <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className={`${fieldClass} font-normal normal-case`} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className={`${fieldClass} font-normal normal-case`} />
      )}
    </label>
  );
}

/** Every field of a model's pattern, editable. Hook → meat → CTA, then how it looks and why it works. */
export function PatternEditor({ pattern: p, onChange }: Props) {
  const set = <K extends keyof SlideshowPattern>(key: K, value: SlideshowPattern[K]) => onChange({ ...p, [key]: value });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <label className={labelClass}>
          <span>Format</span>
          <select value={p.format} onChange={(e) => set('format', e.target.value as SlideshowFormat)} className={`${fieldClass} font-normal normal-case`}>
            {SLIDESHOW_FORMATS.map((f) => <option key={f} value={f}>{FORMAT_LABELS[f]}</option>)}
          </select>
        </label>
        <label className={labelClass}>
          <span>Hook type</span>
          <select value={p.hookArchetype} onChange={(e) => set('hookArchetype', e.target.value as HookArchetype)} className={`${fieldClass} font-normal normal-case`}>
            {HOOK_ARCHETYPES.map((h) => <option key={h} value={h}>{HOOK_LABELS[h]}</option>)}
          </select>
        </label>
        <label className={labelClass}>
          <span>Meat slides</span>
          <input type="number" min={1} max={20} value={p.itemCount} onChange={(e) => set('itemCount', Math.max(1, Math.min(20, Math.round(Number(e.target.value)) || 1)))} className={`${fieldClass} font-normal`} />
        </label>
      </div>
      <TextField label="Hook pattern" value={p.hookPattern} onChange={(v) => set('hookPattern', v)} />
      <TextField label="Other proven hooks (one per line)" value={(p.hookVariants ?? []).join('\n')} rows={3} onChange={(v) => set('hookVariants', v.split('\n'))} />
      <TextField label="Meat slide pattern" value={p.itemPattern} rows={2} onChange={(v) => set('itemPattern', v)} />
      <TextField label="CTA pattern" value={p.ctaPattern} rows={2} onChange={(v) => set('ctaPattern', v)} />
      <TextField label="Visual rules (one per line)" value={p.visualRules.join('\n')} rows={4} onChange={(v) => set('visualRules', v.split('\n'))} />
      <TextField label="Caption style" value={p.captionStyle} onChange={(v) => set('captionStyle', v)} />
      <TextField label="Why it works" value={p.whyItWorks} rows={3} onChange={(v) => set('whyItWorks', v)} />
    </div>
  );
}
