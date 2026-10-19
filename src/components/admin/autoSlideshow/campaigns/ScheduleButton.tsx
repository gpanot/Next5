'use client';

/** What the button needs from a schedule: a campaign's (useCampaignSchedule) or one slideshow's (useSlideshowSchedule). */
export type SchedulePlan = { open: readonly unknown[]; making: boolean; planning: boolean; label: string; disabled: boolean; schedule: () => Promise<void> };

/** The editor's top bar "Schedule N posts": makes the slideshows when needed, then puts the posts on the Calendar. */
export function ScheduleButton({ plan }: { plan: SchedulePlan }) {
  if (plan.open.length === 0) return null;
  const working = plan.making || plan.planning;
  const label = plan.making ? 'Making slideshows…' : plan.planning ? 'Adding…' : plan.label;
  return (
    <button
      type="button"
      onClick={() => void plan.schedule()}
      disabled={plan.disabled}
      className="flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-emerald-400 px-4 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-emerald-300 active:scale-95 disabled:opacity-40 disabled:active:scale-100"
    >
      {working ? (
        <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950/30 border-t-zinc-950" />
      ) : (
        <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>
      )}
      <span className="max-sm:hidden">{label}</span>
      <span className="sm:hidden">{working ? 'Working…' : 'Schedule'}</span>
    </button>
  );
}
