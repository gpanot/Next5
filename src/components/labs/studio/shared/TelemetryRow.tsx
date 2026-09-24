'use client';

import { Clock, DollarSign } from 'lucide-react';
import { microsToUsd, msToSec } from './format';

export function TelemetryRow({ label, durationMs, costMicros }: {
  label: string;
  durationMs: number | null | undefined;
  costMicros: string | null | undefined;
}) {
  return (
    <div className="flex items-center gap-4 text-[12px] text-muted">
      <span className="font-medium text-ink w-24">{label}</span>
      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {msToSec(durationMs)}</span>
      <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {microsToUsd(costMicros)}</span>
    </div>
  );
}
