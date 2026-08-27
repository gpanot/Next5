'use client';

import { useMemo } from 'react';
import type { PhotoRoute } from '../../../data/routes';
import { getAvailableSlots, getFirstAvailableDate, isDateAvailable } from '../../../data/availability';
import { formatLongDate, fromIsoDate, startOfToday } from '../../../lib/date';
import type { TimeSlot } from '../../../types/booking';
import { Button } from '../../ui/Button';
import { SunIcon } from '../../ui/Icons';
import { Calendar } from '../ui/Calendar';
import { StepFooter } from '../ui/StepFooter';
import { StepHeading } from '../ui/StepHeading';

type DateStepProps = {
  route: PhotoRoute;
  date: string | null;
  slot: TimeSlot | null;
  onSelectDate: (iso: string) => void;
  onSelectSlot: (slot: TimeSlot) => void;
  onNext: () => void;
};

export const DateStep = ({
  route,
  date,
  slot,
  onSelectDate,
  onSelectSlot,
  onNext,
}: DateStepProps) => {
  const initialMonth = useMemo(() => {
    const first = getFirstAvailableDate(route.id);
    return first ? fromIsoDate(first) : startOfToday();
  }, [route.id]);

  const slots = useMemo(
    () => (date ? getAvailableSlots(route.id, date, route.slotTemplate) : []),
    [route.id, route.slotTemplate, date],
  );

  return (
    <section>
      <StepHeading
        eyebrow={route.title}
        title="Choose your date"
        subtitle={`${route.durationShort} · ${route.locationCount} locations · shot at the best light of the day`}
      />

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10">
        <Calendar
          initialMonth={initialMonth}
          selected={date}
          isAvailable={(iso) => isDateAvailable(route.id, iso)}
          onSelect={onSelectDate}
        />

        <div className="lg:border-l lg:border-line lg:pl-8">
          <h3 className="label-caps text-[9.5px] font-medium text-muted">Available times</h3>

          {!date && (
            <p className="mt-4 rounded-xl border border-dashed border-line px-4 py-6 text-center text-[12.5px] leading-relaxed text-muted">
              Pick a date to see the times we can shoot.
            </p>
          )}

          {date && slots.length === 0 && (
            <p className="mt-4 rounded-xl border border-dashed border-line px-4 py-6 text-center text-[12.5px] leading-relaxed text-muted">
              This day just filled up. Try another date.
            </p>
          )}

          {date && slots.length > 0 && (
            <ul className="mt-4 space-y-2.5">
              {slots.map((option) => {
                const active = slot?.id === option.id;

                return (
                  <li key={option.id}>
                    <button
                      type="button"
                      onClick={() => onSelectSlot(option)}
                      aria-pressed={active}
                      className={[
                        'flex w-full items-center justify-between rounded-xl border px-4 py-3.5 text-left transition-all duration-200',
                        active
                          ? 'border-ink-block bg-ink-block text-on-dark'
                          : 'border-line bg-page text-ink hover:border-ink/35 hover:bg-surface',
                      ].join(' ')}
                    >
                      <span className="text-[14px]">{option.label}</span>
                      {option.badge && (
                        <span
                          className={[
                            'label-caps flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[8.5px] font-medium',
                            active ? 'bg-white/15 text-on-dark' : 'bg-accent/12 text-accent-strong',
                          ].join(' ')}
                        >
                          <SunIcon className="h-3 w-3" />
                          {option.badge}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <StepFooter
        aside={
          date && slot ? (
            <span className="text-ink">
              {formatLongDate(date)} · {slot.label}
            </span>
          ) : (
            'Free reschedule if the weather turns.'
          )
        }
      >
        <Button
          onClick={onNext}
          size="lg"
          withArrow
          fullWidth
          disabled={!date || !slot}
          className="sm:w-auto"
        >
          See your photographer
        </Button>
      </StepFooter>
    </section>
  );
};
