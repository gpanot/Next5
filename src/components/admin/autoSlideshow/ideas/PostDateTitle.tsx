'use client';

import { Pencil } from 'lucide-react';
import type { IdeaDto } from '../../../../types/admin/calendarIdeas';
import { whenOf } from './ideaCards';

const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-10-22T19:00" in local time, as the date input wants it. */
const toInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

const tomorrow = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
};

type Props = { idea: IdeaDto; at: string; onChange: (iso: string) => void };

/**
 * Phones: the Ideas page title is the day the idea will be posted, with a pen. A tap on either opens the phone's own
 * date and time picker (an invisible input on top, so it opens on iOS too).
 */
export function PostDateTitle({ idea, at, onChange }: Props) {
  const pick = (value: string) => {
    const d = new Date(value);
    if (value && !Number.isNaN(d.getTime())) onChange(d.toISOString());
  };
  return (
    <span className="relative inline-flex max-w-full items-center gap-2">
      <span className="sr-only">Will be posted: </span>
      <span className="truncate">{whenOf(idea, at)}</span>
      <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-app-sunken text-app-muted">
        <Pencil className="h-3.5 w-3.5" />
      </span>
      {/* text-base: iOS zooms the page into inputs under 16px. */}
      <input
        type="datetime-local"
        aria-label="Change the posting date"
        value={toInput(new Date(at))}
        min={toInput(tomorrow())}
        onChange={(e) => pick(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer text-base opacity-0"
      />
    </span>
  );
}
