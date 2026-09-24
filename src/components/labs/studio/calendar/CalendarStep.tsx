'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, DollarSign, Loader2, RefreshCw } from 'lucide-react';
import { assignCalendar, getCalendar, getRunSummary, type CalendarSlot, type RunSummary } from '../api';
import { microsToUsd, msToSec } from '../shared/format';

function SummaryPanel({ summary }: { summary: RunSummary }) {
  const row = (label: string, durationMs: number | null, targetMs: number, costMicros: string | null, onTarget: boolean | null) => (
    <div className="flex items-center gap-3 py-2 border-b border-line last:border-0">
      <span className="w-24 text-[12px] font-medium text-ink shrink-0">{label}</span>
      <span className={`text-[11px] font-medium ${onTarget === false ? 'text-red-600' : onTarget ? 'text-green-600' : 'text-muted'}`}>
        {onTarget === true ? '✓' : onTarget === false ? '✗' : '—'}
      </span>
      <span className="flex items-center gap-1 text-[11px] text-muted"><Clock className="w-3 h-3" />{msToSec(durationMs)} / {msToSec(targetMs)}</span>
      {costMicros && <span className="flex items-center gap-1 text-[11px] text-muted"><DollarSign className="w-3 h-3" />{microsToUsd(costMicros)}</span>}
    </div>
  );

  return (
    <div className="rounded-lg border border-line bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[13px] font-semibold text-ink">Run Summary</h4>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${summary.overallPass ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {summary.overallPass ? '✓ All targets met' : '✗ Some targets missed'}
        </span>
      </div>

      <div>
        <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">Timing & Cost</p>
        {row('Extract', summary.metrics.extract.durationMs, summary.metrics.extract.targetMs, summary.metrics.extract.costUsdMicros, summary.metrics.extract.onTarget)}
        {row('Research', summary.metrics.research.durationMs, summary.metrics.research.targetMs, summary.metrics.research.costUsdMicros, summary.metrics.research.onTarget)}
        {row('Generate', summary.metrics.generate.durationMs, summary.metrics.generate.targetMs, null, summary.metrics.generate.onTarget)}
        <div className="flex items-center gap-3 py-2">
          <span className="w-24 text-[12px] font-medium text-ink shrink-0">Total cost</span>
          <span className={`text-[11px] font-medium ${summary.metrics.totalCost.onTarget ? 'text-green-600' : 'text-red-600'}`}>
            {summary.metrics.totalCost.onTarget ? '✓' : '✗'}
          </span>
          <span className="text-[11px] text-muted">{microsToUsd(String(summary.metrics.totalCost.usdMicros))} / {microsToUsd(String(summary.metrics.totalCost.targetUsdMicros))}</span>
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold text-muted uppercase tracking-wide mb-2">Quality</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Research items', value: summary.quality.researchItems },
            { label: 'Candidates', value: summary.quality.candidatesTotal },
            { label: 'Accepted', value: summary.quality.candidatesAccepted },
          ].map((m) => (
            <div key={m.label} className="rounded border border-line p-3 text-center">
              <p className="text-[20px] font-bold text-ink">{m.value}</p>
              <p className="text-[11px] text-muted">{m.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[12px] text-ink">Acceptance rate:</span>
          <span className={`text-[12px] font-medium ${summary.quality.acceptanceOnTarget ? 'text-green-600' : 'text-red-600'}`}>
            {Math.round(summary.quality.acceptanceRate * 100)}%
          </span>
          <span className="text-[11px] text-muted">(target: ≥{Math.round(summary.quality.acceptanceRateTarget * 100)}%)</span>
        </div>
      </div>
    </div>
  );
}

export function CalendarStep({ token, runId }: { token: string; runId: string }) {
  const [slots, setSlots] = useState<CalendarSlot[]>([]);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const [calData, summaryData] = await Promise.all([
      getCalendar(token, runId),
      getRunSummary(token, runId),
    ]);
    setSlots(calData.slots);
    setSummary(summaryData);
    setLoaded(true);
  }, [token, runId]);

  const handleAssign = async () => {
    setAssigning(true);
    try {
      await assignCalendar(token, runId);
      await load();
    } finally {
      setAssigning(false);
    }
  };

  // Load on mount
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-ink">Content Calendar</h3>
        <button
          onClick={() => void handleAssign()}
          disabled={assigning}
          className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-[12px] font-medium hover:bg-surface disabled:opacity-50"
        >
          {assigning ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          {slots.length > 0 ? 'Re-assign slots' : 'Assign slots'}
        </button>
      </div>

      {summary && <SummaryPanel summary={summary} />}

      {loaded && slots.length === 0 && (
        <div className="rounded-lg border border-dashed border-line p-8 text-center">
          <p className="text-[13px] text-muted">Accept candidates in the Generation step, then click Assign slots.</p>
        </div>
      )}

      {slots.length > 0 && (
        <div className="rounded-lg border border-line bg-white divide-y divide-line">
          {slots.map((slot) => (
            <div key={slot.id} className="flex items-center gap-4 px-4 py-3">
              <div className="w-24 shrink-0 text-center">
                {slot.slotDate ? (
                  <>
                    <p className="text-[13px] font-semibold text-ink">
                      {new Date(slot.slotDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-[10px] text-muted">
                      {new Date(slot.slotDate).toLocaleDateString('en-US', { weekday: 'short' })}
                    </p>
                  </>
                ) : (
                  <span className="text-[11px] text-muted">Unscheduled</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-ink truncate">{slot.angle ?? slot.templateId ?? 'Candidate'}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {slot.blitzProjectId ? (
                  <span className="text-[11px] text-green-600 font-medium">Render queued</span>
                ) : (
                  <span className="text-[11px] text-yellow-600">Pending render</span>
                )}
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
