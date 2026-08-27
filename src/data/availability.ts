import type { TimeSlot } from '../types/booking';
import { fromIsoDate, startOfToday, toIsoDate } from '../lib/date';

const BOOKING_WINDOW_DAYS = 60;
const LEAD_TIME_DAYS = 1;

const hash = (value: string): number => {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) % 100_000;
  }
  return result;
};

const daysFromToday = (iso: string): number => {
  const day = 24 * 60 * 60 * 1000;
  return Math.round((fromIsoDate(iso).getTime() - startOfToday().getTime()) / day);
};

export const isDateAvailable = (routeId: string, iso: string): boolean => {
  const offset = daysFromToday(iso);
  if (offset < LEAD_TIME_DAYS || offset > BOOKING_WINDOW_DAYS) return false;
  return (hash(routeId + iso) % 3) !== 0;
};

export const getAvailableSlots = (
  routeId: string,
  iso: string,
  template: readonly TimeSlot[],
): TimeSlot[] => {
  if (!isDateAvailable(routeId, iso)) return [];

  const open = template.filter(
    (slot, index) => Boolean(slot.badge) || (hash(routeId + iso + slot.id) + index) % 5 !== 0,
  );

  return open.length > 0 ? open : [template[template.length - 1]];
};

export const getFirstAvailableDate = (routeId: string): string | null => {
  const today = startOfToday();

  for (let offset = LEAD_TIME_DAYS; offset <= BOOKING_WINDOW_DAYS; offset += 1) {
    const candidate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    const iso = toIsoDate(candidate);
    if (isDateAvailable(routeId, iso)) return iso;
  }

  return null;
};
