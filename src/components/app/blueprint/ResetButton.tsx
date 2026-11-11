'use client';

import { useEffect, useState } from 'react';
import { SHELL } from './copy';

const CONFIRM_MS = 4000;

/** Clears the whole blueprint. The first tap arms it, a second tap within 4 seconds does it. */
export const ResetButton = ({ onReset }: { onReset: () => void }) => {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const id = window.setTimeout(() => setArmed(false), CONFIRM_MS);
    return () => window.clearTimeout(id);
  }, [armed]);

  const onClick = () => {
    if (!armed) return setArmed(true);
    setArmed(false);
    onReset();
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'min-h-11 self-start px-1 text-[13px] underline underline-offset-4 transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent',
        armed ? 'font-semibold text-app-danger' : 'text-app-muted hover:text-app-ink',
      ].join(' ')}
    >
      {armed ? SHELL.resetConfirm : SHELL.reset}
    </button>
  );
};
