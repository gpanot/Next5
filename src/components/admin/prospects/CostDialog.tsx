'use client';

import type { ProspectCostLine, ProspectCostsDto, ProspectPackDto } from '../../../types/admin/prospects';
import { useAdminApi } from '../business/useAdminApi';
import { Dialog } from '../../ui/Dialog';
import { ErrorState } from '../../ui/ErrorState';
import { SkeletonText } from '../../ui/Skeleton';
import { formatDuration } from './timing';

type Props = { token: string; pack: ProspectPackDto; onClose: () => void };

const usd = (n: number) => `$${n < 0.01 && n > 0 ? n.toFixed(4) : n.toFixed(2)}`;

/** Each part's lines, biggest part first. */
const groupByPart = (lines: ProspectCostLine[]): Array<{ part: string; usd: number; lines: ProspectCostLine[] }> => {
  const parts = new Map<string, ProspectCostLine[]>();
  for (const line of lines) parts.set(line.part, [...(parts.get(line.part) ?? []), line]);
  return [...parts.entries()].map(([part, rows]) => ({ part, usd: rows.reduce((s, r) => s + r.usd, 0), lines: rows })).sort((a, b) => b.usd - a.usd);
};

/** Site + faces, then posts: where the make time went (the face check wait is left out). */
function TimingRow({ pack }: { pack: ProspectPackDto }) {
  const { siteSec, postsSec } = pack.timing;
  if (siteSec === null && postsSec === null) return null;
  return (
    <p className="rounded-xl bg-app-sunken px-3 py-2 text-[12px] tabular-nums text-app-muted">
      Site + faces {siteSec === null ? '…' : formatDuration(siteSec)} · Posts {postsSec === null ? '…' : formatDuration(postsSec)} · face check wait not counted
    </p>
  );
}

function CostLines({ costs }: { costs: ProspectCostsDto }) {
  if (costs.lines.length === 0) return <p className="text-[13px] text-app-muted">No paid calls yet.</p>;
  return (
    <div className="space-y-3">
      {costs.source === 'run' && <p className="text-[12px] text-app-muted">Made before per-call billing: these are the brand run&apos;s steps only.</p>}
      {groupByPart(costs.lines).map((group) => (
        <section key={group.part} className="rounded-xl border border-app-line">
          <h3 className="flex justify-between border-b border-app-line px-3 py-2 text-[13px] font-semibold text-app-ink">
            <span>{group.part}</span>
            <span className="tabular-nums">{usd(group.usd)}</span>
          </h3>
          <ul className="divide-y divide-app-line">
            {group.lines.map((line, i) => (
              <li key={`${line.provider}|${line.model}|${i}`} className="flex items-baseline justify-between gap-3 px-3 py-2 text-[12px]">
                <span className="min-w-0 break-words text-app-ink">
                  {line.model}
                  {line.provider && <span className="text-app-muted"> · {line.provider}</span>}
                </span>
                <span className="shrink-0 tabular-nums text-app-muted">
                  {costs.source === 'ledger' && `${line.calls}× · `}
                  <span className="text-app-ink">{usd(line.usd)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** The pack's cost, by part and model, with call counts: why one pack costs more than another. */
export function CostDialog({ token, pack, onClose }: Props) {
  const { data, error, loading, refresh } = useAdminApi<{ costs: ProspectCostsDto }>(token, `/api/admin/prospects/${pack.id}/costs`);
  return (
    <Dialog open onClose={onClose} title={`${pack.name}: ${usd(data?.costs.totalUsd ?? pack.costUsd)}`} description="Every paid call made for this pack." className="max-h-[85vh] overflow-y-auto">
      <div className="space-y-3">
        <TimingRow pack={pack} />
        {error && <ErrorState message={error} onRetry={refresh} />}
        {loading && !data && (
          <SkeletonText lines={6} />
        )}
        {data && <CostLines costs={data.costs} />}
      </div>
    </Dialog>
  );
}
