'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

type CopyRowProps = {
  label: string;
  value: string;
  emphasis?: boolean;
};

/** A label/value row with a copy button — business-surface tokens, dark-mode ready. */
export const CopyRow = ({ label, value, emphasis = false }: CopyRowProps) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value.replace(/\s/g, ''));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="label-caps text-[9px] font-medium text-app-muted">{label}</p>
        <p className={`mt-0.5 truncate text-[14px] tabular-nums ${emphasis ? 'font-semibold text-app-accent' : 'font-medium text-app-ink'}`}>
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${label.toLowerCase()}`}
        className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-app-line px-3 text-[12px] text-app-muted transition-colors duration-200 hover:border-app-accent hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-app-success" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
};
