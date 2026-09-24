'use client';

import { Loader2 } from 'lucide-react';

const COLORS: Record<string, string> = {
  idle: 'bg-gray-100 text-gray-500',
  pending: 'bg-yellow-50 text-yellow-600',
  running: 'bg-blue-50 text-blue-600',
  done: 'bg-green-50 text-green-700',
  failed: 'bg-red-50 text-red-600',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium ${COLORS[status] ?? 'bg-gray-100'}`}>
      {status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
      {status}
    </span>
  );
}
