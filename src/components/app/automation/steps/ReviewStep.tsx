'use client';

/**
 * Step 6 — book it.
 *
 * Nothing is generated in this phase, so nothing is charged and nothing can fail halfway.
 * Scheduling writes the days to her calendar; the shot list goes with them.
 */
import { AlertTriangle, CalendarCheck } from 'lucide-react';
import type { AssetGapDto, CampaignDto } from '../../../../types/business/campaigns';
import { AppButton } from '../../../ui/AppButton';

type Props = {
  campaign: CampaignDto;
  gaps: AssetGapDto[];
  scheduling: boolean;
  onSchedule: () => void;
  onBackToAssets: () => void;
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline justify-between gap-3 py-1.5">
    <span className="text-[13px] text-app-muted">{label}</span>
    <span className="text-right text-[13px] font-medium text-app-ink">{value}</span>
  </div>
);

export function ReviewStep({ campaign, gaps, scheduling, onSchedule, onBackToAssets }: Props) {
  const live = campaign.posts.filter((p) => !p.skipped);
  const bySource = (source: string) => live.filter((p) => p.source === source).length;
  const last = live[live.length - 1];

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-app-line bg-app-surface p-4">
        <Row label="Posts" value={String(campaign.postCount)} />
        <Row label="Channels" value={campaign.channels.join(' + ')} />
        <Row label="Days on your calendar" value={String(campaign.slotCount)} />
        <Row label="Runs" value={`${campaign.startDate} → ${last?.date ?? campaign.startDate}`} />
        <Row label="Yours / Mix / Generated" value={`${bySource('real')} / ${bySource('mix')} / ${bySource('generated')}`} />
      </div>

      {gaps.length > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-[14px] font-medium text-amber-900">
            <AlertTriangle aria-hidden className="h-4 w-4 shrink-0" />
            {gaps.length} day{gaps.length === 1 ? '' : 's'} still need your footage
          </p>
          <ul className="flex flex-col gap-1">
            {gaps.slice(0, 4).map((gap) => (
              <li key={gap.postId} className="text-[12px] text-amber-900">
                {gap.date.slice(5)} · {gap.templateName} — {gap.missing.map((m) => m.label).join(', ')}
              </li>
            ))}
            {gaps.length > 4 && <li className="text-[12px] text-amber-900">…and {gaps.length - 4} more</li>}
          </ul>
          <button type="button" onClick={onBackToAssets} className="self-start text-[12px] font-medium text-amber-900 underline underline-offset-2">
            Sort out the footage
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <AppButton size="lg" loading={scheduling} onClick={onSchedule}>
          <CalendarCheck aria-hidden className="h-4 w-4" />
          Put {campaign.postCount} posts on my calendar
        </AppButton>
        <p className="text-[12px] text-app-muted">
          Nothing is charged. This books the days and keeps your shot list with them — you can change any day later.
        </p>
      </div>
    </div>
  );
}
