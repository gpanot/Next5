'use client';

import { Settings2 } from 'lucide-react';
import { useState } from 'react';
import { WEEKDAY_LABELS } from '../../../lib/calendarDates';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import type { CalendarDto, PlatformDto } from '../../../types/business/calendar';
import { AppButton } from '../../ui/AppButton';

type Props = { calendar: CalendarDto; onSaved: (calendar: CalendarDto) => void };

const PLATFORMS: { id: PlatformDto; label: string }[] = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'linkedin', label: 'LinkedIn' },
];

/** Settings live on the calendar page itself — changing your days should never mean leaving your month. */
export const CadenceCard = ({ calendar, onSaved }: Props) => {
  const [open, setOpen] = useState(false);
  const [weekdays, setWeekdays] = useState<number[]>(calendar.schedule.weekdays);
  const [platform, setPlatform] = useState<PlatformDto>(calendar.schedule.platform);
  const [autopilot, setAutopilot] = useState(calendar.schedule.autopilot);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (day: number) => setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await apiFetch<CalendarDto>('/api/app/calendar', {
        method: 'PUT',
        json: {
          ...calendar.schedule,
          weekdays,
          platform,
          autopilot,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      onSaved(next);
      setOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your days.');
    } finally {
      setBusy(false);
    }
  };

  const summary = weekdays.map((d) => WEEKDAY_LABELS[d]).join(' · ');

  return (
    <div className="rounded-2xl border border-app-line bg-app-panel">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="min-w-0">
          <span className="block text-[14px] font-medium text-app-ink">You post on {summary || 'no days yet'}</span>
          <span className="block truncate text-[12px] text-app-muted">{autopilot ? 'New photos are made for you' : 'Tap to change your days'}</span>
        </span>
        <Settings2 aria-hidden className="h-4 w-4 shrink-0 text-app-muted" />
      </button>

      {open && (
        <div className="flex flex-col gap-4 border-t border-app-line px-4 py-4">
          <div>
            <p className="text-[12px] font-medium uppercase tracking-wide text-app-muted">Days you post</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {WEEKDAY_LABELS.map((label, day) => {
                const on = weekdays.includes(day);
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => toggleDay(day)}
                    aria-pressed={on}
                    className={`h-10 w-11 rounded-xl text-[13px] font-medium transition-colors duration-200 ${
                      on ? 'bg-app-cta text-app-cta-ink' : 'border border-app-line text-app-muted hover:bg-app-sunken'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-[12px] font-medium uppercase tracking-wide text-app-muted">Where you post</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlatform(p.id)}
                  aria-pressed={platform === p.id}
                  className={`h-10 rounded-xl px-3 text-[13px] font-medium transition-colors duration-200 ${
                    platform === p.id ? 'bg-app-cta text-app-cta-ink' : 'border border-app-line text-app-muted hover:bg-app-sunken'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-start gap-3">
            <input type="checkbox" checked={autopilot} onChange={(e) => setAutopilot(e.target.checked)} className="mt-1 h-4 w-4 accent-[var(--app-accent)]" />
            <span>
              <span className="block text-[14px] text-app-ink">Make my photos for me</span>
              <span className="block text-[12px] text-app-muted">We keep two weeks of posts ready, using this month’s photos. Never more than your plan includes.</span>
            </span>
          </label>

          {error && <p className="text-[13px] text-app-danger">{error}</p>}

          <div className="flex gap-2">
            <AppButton onClick={() => void save()} loading={busy} disabled={weekdays.length === 0}>Save</AppButton>
            <AppButton variant="ghost" onClick={() => setOpen(false)}>Cancel</AppButton>
          </div>
        </div>
      )}
    </div>
  );
};
