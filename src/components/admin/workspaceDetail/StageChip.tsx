'use client';

const STAGE_STYLES: Record<string, string> = {
  Attention: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  Trust: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  Proof: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  Conversion: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
};

/** A campaign stage (Attention, Trust, Proof, Conversion) as a colored pill; nothing when unknown. */
export function StageChip({ stage }: { stage: string }) {
  if (!stage) return null;
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STAGE_STYLES[stage] ?? 'bg-zinc-100 text-muted dark:bg-zinc-800'}`}>{stage}</span>;
}
