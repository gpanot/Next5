'use client';

import { useEffect, useState } from 'react';
import { CheckIcon, CopyIcon } from '../../ui/Icons';

type CopyFieldProps = {
  label: string;
  value: string;
};

export const CopyField = ({ label, value }: CopyFieldProps) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="label-caps text-[8.5px] font-medium text-muted">{label}</p>
        <p className="mt-0.5 truncate text-[13px] font-medium text-ink">{value}</p>
      </div>

      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label.toLowerCase()}`}
        className="flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[11px] text-muted transition-colors duration-200 hover:border-accent/60 hover:text-ink"
      >
        {copied ? (
          <>
            <CheckIcon className="h-3 w-3 text-accent-strong" strokeWidth={3} />
            Copied
          </>
        ) : (
          <>
            <CopyIcon className="h-3 w-3" />
            Copy
          </>
        )}
      </button>
    </div>
  );
};
