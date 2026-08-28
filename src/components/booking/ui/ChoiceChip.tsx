import type { ReactNode } from 'react';
import { CheckIcon } from '../../ui/Icons';

type ChoiceChipProps = {
  selected: boolean;
  onClick: () => void;
  emoji?: string;
  children: ReactNode;
};

export const ChoiceChip = ({ selected, onClick, emoji, children }: ChoiceChipProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={selected}
    className={[
      'flex w-full items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left text-[13px] leading-tight',
      'transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
      selected
        ? 'border-accent-strong bg-accent/12 font-medium text-ink shadow-[0_0_0_1px_var(--color-accent-strong)]'
        : 'border-line bg-surface text-muted hover:border-accent/60 hover:bg-surface-alt hover:text-ink',
    ].join(' ')}
  >
    {emoji && <span className="text-[15px] leading-none">{emoji}</span>}
    <span className="min-w-0 flex-1">{children}</span>

    <span
      aria-hidden="true"
      className={[
        'flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full transition-all duration-200',
        selected ? 'bg-accent-strong text-white' : 'border border-line',
      ].join(' ')}
    >
      {selected && <CheckIcon className="h-2.5 w-2.5" strokeWidth={3} />}
    </span>
  </button>
);
