import { Check, Lock } from 'lucide-react';

export type StepState = 'done' | 'next' | 'todo' | 'locked';

type Props = {
  n: number;
  state: StepState;
  title: string;
  sub?: string;
  children?: React.ReactNode;
};

const MARK: Record<StepState, string> = {
  done: 'bg-app-success text-white',
  next: 'bg-app-accent text-white',
  todo: 'border border-app-line text-app-muted',
  locked: 'border border-app-line text-app-muted',
};

/** One checklist row: its number (or a check), what to do, and the action while it is not done. */
export const QuickstartStep = ({ n, state, title, sub, children }: Props) => {
  const done = state === 'done';
  return (
    <li className={`flex items-start gap-3 px-4 py-4 transition-colors duration-200 sm:gap-4 sm:px-5 ${state === 'next' ? 'bg-app-accent-soft/40' : ''}`}>
      <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${MARK[state]}`}>
        {done ? <Check aria-hidden className="h-3.5 w-3.5" /> : state === 'locked' ? <Lock aria-hidden className="h-3 w-3" /> : n}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        <div>
          <p className={`text-[14px] font-medium leading-snug ${done ? 'text-app-muted line-through' : 'text-app-ink'}`}>
            <span className="sr-only">{done ? 'Done: ' : `Step ${n}: `}</span>
            {title}
          </p>
          {sub && !done && <p className="mt-0.5 text-[13px] text-app-muted">{sub}</p>}
        </div>
        {!done && children}
      </div>
    </li>
  );
};
