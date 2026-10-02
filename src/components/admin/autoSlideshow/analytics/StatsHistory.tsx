'use client';

import type { PostStats } from '../../../../types/admin/autoSlideshow';
import type { StatsSnapshotDto } from '../../../../types/admin/slideshowAnalytics';
import { compact } from '../posting/PostStats';

const COLUMNS: Array<[keyof PostStats, string]> = [
  ['views', 'Views'],
  ['likes', 'Likes'],
  ['comments', 'Comments'],
  ['shares', 'Shares'],
  ['saves', 'Saves'],
];

/** "48h", "4d", "2w": how old the post was at that read. */
export const ageLabel = (hours: number): string => {
  if (hours < 72) return `${hours}h`;
  if (hours < 14 * 24) return `${Math.round(hours / 24)}d`;
  return `${Math.round(hours / 168)}w`;
};

const cell = (value: number | undefined) => (value === undefined ? '—' : compact(value));

/** Every read of one post, oldest first: how its numbers grew. Only the columns the platform gives. */
export function StatsHistory({ snapshots }: { snapshots: StatsSnapshotDto[] }) {
  const columns = COLUMNS.filter(([key]) => snapshots.some((s) => s.stats[key] !== undefined));
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs tabular-nums">
        <thead className="text-app-muted">
          <tr>
            <th scope="col" className="py-1.5 pr-3 font-semibold">Age</th>
            {columns.map(([key, label]) => (
              <th key={key} scope="col" className="py-1.5 pr-3 font-semibold">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="text-app-ink">
          {snapshots.map((s) => (
            <tr key={s.takenAt} className="border-t border-app-line">
              <td className="py-1.5 pr-3 font-semibold">{ageLabel(s.ageHours)}</td>
              {columns.map(([key]) => (
                <td key={key} className="py-1.5 pr-3">{cell(s.stats[key])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
