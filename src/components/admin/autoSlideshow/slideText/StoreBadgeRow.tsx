'use client';

import { BADGE_ROW, badgeRow, type StoreBadge } from '../../../../types/storeBadges';

/** px of the 1080 px slide in cqw (the frame sets `container-type: inline-size`). */
const cqw = (px: number) => `${(px / 1080) * 100}cqw`;

/** The CTA's official store badges in one row, sized as the render draws them. Null without badges. */
export function StoreBadgeRow({ badges }: { badges: StoreBadge[] | undefined }) {
  const row = badgeRow(badges);
  if (row.length === 0) return null;
  return (
    <div className="flex" style={{ gap: cqw(BADGE_ROW.gap) }}>
      {row.map((b) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={b.id} src={b.src} alt={b.alt} draggable={false} style={{ width: cqw(b.width), height: cqw(b.height) }} />
      ))}
    </div>
  );
}
