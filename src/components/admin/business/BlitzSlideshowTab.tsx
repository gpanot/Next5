'use client';

/** Blitz Slideshow, wired to the admin API. The editor lives in src/components/labs/blitzLab. */

import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { AdminLabClientProvider } from '../../labs/LabClientProvider';
import { StudioRunProvider } from '../../labs/studio/runs/StudioRunContext';
import { BlitzSlideshowEditor } from '../../labs/blitzLab/BlitzSlideshowEditor';
import { FlowTypePicker, type FlowType } from '../../labs/blitzLab/FlowTypePicker';

export function BlitzSlideshowTab({ token }: { token: string }) {
  const [flowType, setFlowType] = useState<FlowType | null>(null);

  return (
    <AdminLabClientProvider token={token}>
      {/* ── "Change flow" back link — shown whenever a flow is active ──────── */}
      {flowType !== null && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setFlowType(null)}
            className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink transition-colors"
          >
            <ChevronLeft aria-hidden className="h-4 w-4" />
            Change flow
          </button>
        </div>
      )}

      {/* ── Step 0: pick flow ───────────────────────────────────────────────── */}
      {flowType === null && (
        <FlowTypePicker onSelect={setFlowType} />
      )}

      {/* ── B2B: wrap in StudioRunProvider so profile step is available ─────── */}
      {flowType === 'b2b' && (
        <StudioRunProvider token={token}>
          <BlitzSlideshowEditor />
        </StudioRunProvider>
      )}

      {/* ── B2B No Website: profile typed by hand, no Studio run picker ───────── */}
      {flowType === 'b2b_manual' && (
        <BlitzSlideshowEditor initialFlowType="b2b_manual" />
      )}

      {/* ── Real Estate: no Studio context, initialFlowType drives the steps ── */}
      {flowType === 'real_estate' && (
        <BlitzSlideshowEditor initialFlowType="real_estate" />
      )}

      {/* ── TikTok Shop: coming soon (FlowTypePicker already shows it disabled) */}
    </AdminLabClientProvider>
  );
}
