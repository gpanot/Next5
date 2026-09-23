'use client';

/** Step 4 — how often and for how long. Changing either rebuilds the plan, so it says so. */
import { Minus, Plus } from 'lucide-react';
import { Field } from '../../../ui/Field';
import { SegmentedControl } from '../../../ui/SegmentedControl';
import { TextInput } from '../../../ui/TextInput';

type Props = {
  postsPerDay: number;
  weeks: number;
  startDate: string;
  channels: string[];
  onChange: (patch: { postsPerDay?: number; weeks?: number; startDate?: string }) => void;
};

const WEEK_OPTIONS = [
  { value: '1', label: '1 week' },
  { value: '2', label: '2 weeks' },
  { value: '3', label: '3 weeks' },
  { value: '4', label: '4 weeks' },
] as const;

export function CadenceStep({ postsPerDay, weeks, startDate, channels, onChange }: Props) {
  const posts = postsPerDay * weeks * 7;
  const slots = posts * Math.max(1, channels.length);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="text-[15px] font-medium text-app-ink">Posts a day</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Fewer posts a day"
            disabled={postsPerDay <= 1}
            onClick={() => onChange({ postsPerDay: postsPerDay - 1 })}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-app-line text-app-ink transition-opacity duration-200 disabled:opacity-30"
          >
            <Minus aria-hidden className="h-4 w-4" />
          </button>
          <span className="w-10 text-center text-[20px] font-semibold text-app-ink tabular-nums">{postsPerDay}</span>
          <button
            type="button"
            aria-label="More posts a day"
            disabled={postsPerDay >= 3}
            onClick={() => onChange({ postsPerDay: postsPerDay + 1 })}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-app-line text-app-ink transition-opacity duration-200 disabled:opacity-30"
          >
            <Plus aria-hidden className="h-4 w-4" />
          </button>
        </div>
        {postsPerDay > 1 && (
          <p className="text-[12px] text-app-muted">
            More than one a day needs more footage from you. One a day is plenty to start.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[15px] font-medium text-app-ink">How long</p>
        <SegmentedControl
          options={WEEK_OPTIONS}
          value={String(weeks) as '1' | '2' | '3' | '4'}
          onChange={(v) => onChange({ weeks: Number(v) })}
        />
      </div>

      <Field label="Start date" htmlFor="campaign-start">
        <TextInput
          id="campaign-start"
          type="date"
          value={startDate}
          onChange={(e) => e.target.value && onChange({ startDate: e.target.value })}
        />
      </Field>

      <div className="rounded-2xl border border-app-line bg-app-surface p-4">
        <p className="text-[15px] font-medium text-app-ink">{posts} posts</p>
        <p className="text-[13px] text-app-muted">
          {channels.length > 1
            ? `The same ${posts} posts go to ${channels.length} channels — ${slots} days on your calendar.`
            : `${posts} days on your calendar.`}
        </p>
        <p className="mt-2 text-[12px] text-app-muted">Changing this builds a fresh plan.</p>
      </div>
    </div>
  );
}
