'use client';

import { useState } from 'react';
import {
  addMonths,
  buildMonthGrid,
  formatMonthYear,
  isSameMonth,
  startOfToday,
  toIsoDate,
  weekdayInitials,
} from '../../../lib/date';
import { ArrowRightIcon } from '../../ui/Icons';

type CalendarProps = {
  initialMonth: Date;
  selected: string | null;
  isAvailable: (iso: string) => boolean;
  onSelect: (iso: string) => void;
};

const dayBase =
  'flex h-10 w-full items-center justify-center rounded-lg text-[13px] transition-all duration-200 sm:h-11';

export const Calendar = ({ initialMonth, selected, isAvailable, onSelect }: CalendarProps) => {
  const [month, setMonth] = useState(initialMonth);
  const today = startOfToday();
  const days = buildMonthGrid(month);
  const canGoBack = !isSameMonth(month, today) && month > today;

  return (
    <div>
      <div className="flex items-center justify-between">
        <MonthArrow
          direction="prev"
          disabled={!canGoBack}
          onClick={() => setMonth((current) => addMonths(current, -1))}
        />
        <p className="font-serif text-[19px] tracking-[0.06em] text-ink">
          {formatMonthYear(month)}
        </p>
        <MonthArrow direction="next" onClick={() => setMonth((current) => addMonths(current, 1))} />
      </div>

      <div className="mt-5 grid grid-cols-7 gap-1 text-center">
        {weekdayInitials.map((day) => (
          <span key={day} className="label-caps pb-2 text-[9px] font-medium text-muted">
            {day.slice(0, 1)}
            <span className="hidden sm:inline">{day.slice(1, 2)}</span>
          </span>
        ))}

        {days.map((day) => {
          const iso = toIsoDate(day);
          const outside = !isSameMonth(day, month);
          const available = !outside && isAvailable(iso);
          const isSelected = selected === iso;

          return (
            <button
              key={iso}
              type="button"
              disabled={!available}
              aria-pressed={isSelected}
              onClick={() => onSelect(iso)}
              className={[
                dayBase,
                outside ? 'invisible' : '',
                isSelected
                  ? 'bg-ink-block font-medium text-on-dark'
                  : available
                    ? 'text-ink hover:bg-surface-alt'
                    : 'cursor-not-allowed text-muted/35',
              ].join(' ')}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
};

type MonthArrowProps = {
  direction: 'prev' | 'next';
  disabled?: boolean;
  onClick: () => void;
};

const MonthArrow = ({ direction, disabled = false, onClick }: MonthArrowProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={direction === 'prev' ? 'Previous month' : 'Next month'}
    className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink transition-colors duration-200 hover:border-ink/40 disabled:cursor-not-allowed disabled:opacity-30"
  >
    <ArrowRightIcon className={`h-4 w-4 ${direction === 'prev' ? 'rotate-180' : ''}`} />
  </button>
);
