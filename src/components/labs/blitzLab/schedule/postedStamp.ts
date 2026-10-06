import type { BlitzScheduleDto } from '../../../../types/admin/blitzSchedule';

const two = (n: number) => String(n).padStart(2, '0');

/** When a post went live, in the viewer's time: "10/07/26 4:31pm". */
export function postedStamp(item: BlitzScheduleDto): string {
  const at = new Date(item.postedAt ?? item.scheduledAt);
  const hours = at.getHours() % 12 || 12;
  const half = at.getHours() < 12 ? 'am' : 'pm';
  return `${two(at.getMonth() + 1)}/${two(at.getDate())}/${two(at.getFullYear() % 100)} ${hours}:${two(at.getMinutes())}${half}`;
}
