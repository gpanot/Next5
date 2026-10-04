'use client';

import { useMemo } from 'react';
import type { BlitzScheduleDto } from '../../../../types/admin/blitzSchedule';
import { AddToCalendarSheet, type CalendarCurrent } from '../../addToCalendar/AddToCalendarSheet';
import type { DayPost } from '../../addToCalendar/MonthPicker';
import { dayKey, whenLabel } from '../../addToCalendar/slots';
import type { DeckCardData } from '../SwipeDeck';
import type { BlitzSchedule } from './useBlitzSchedule';

export type BodyFor = (card: DeckCardData) => Promise<{ body: unknown } | { error: string }>;

type Props = { card: DeckCardData; schedule: BlitzSchedule; bodyFor: BodyFor; onClose: () => void };

export const titleOf = (card: DeckCardData) => card.shots[0]?.text ?? card.hookStyle;

/** Every post on the calendar by day (this card's own post left out, so it can move). */
const postsByDay = (schedule: BlitzSchedule, own: BlitzScheduleDto | null) => {
  const map = new Map<string, DayPost[]>();
  const add = (iso: string, post: DayPost) => {
    const key = dayKey(new Date(iso));
    map.set(key, [...(map.get(key) ?? []), post]);
  };
  schedule.busy.forEach((b) => add(b.scheduledAt, { coverUrl: b.coverUrl, title: b.title, blitz: false }));
  schedule.items.filter((i) => i.id !== own?.id && i.status !== 'failed').forEach((i) => add(i.scheduledAt, { coverUrl: i.coverUrl, coverIsVideo: i.coverIsVideo, title: i.title, blitz: true }));
  return map;
};

const STATUS_LABEL: Partial<Record<BlitzScheduleDto['status'], string>> = { posted: 'Posted', planned: 'On the calendar for', scheduled: 'Approved for' };

/** The card's own calendar post, for the sheet's top row. */
const currentOf = (own: BlitzScheduleDto | null, schedule: BlitzSchedule): CalendarCurrent | null => {
  if (!own) return null;
  const at = new Date(own.scheduledAt);
  return {
    at,
    label: `${STATUS_LABEL[own.status] ?? 'Being made for'} ${whenLabel(at)}`,
    // A video already being made or posted stays as it is.
    movable: own.status === 'planned' || own.status === 'scheduled',
    onRemove: () => schedule.cancel(own.id),
  };
};

/**
 * "Add to calendar" for a kept Blitz video. 1 credit is charged now. The user approves it on the calendar (TikTok
 * choices), like the slideshows; the video is made about an hour before its time, then posted to TikTok.
 */
export function ScheduleSheet({ card, schedule, bodyFor, onClose }: Props) {
  const own = schedule.itemFor(card.id);
  const posts = useMemo(() => postsByDay(schedule, own), [schedule, own]);
  const onSchedule = async (at: Date) => {
    const built = await bodyFor(card).catch(() => ({ error: 'Could not prepare this video. Try again.' }));
    if ('error' in built) return built.error;
    return schedule.schedule({
      cardId: card.id, variantId: card.variantId, title: titleOf(card), scheduledAt: at.toISOString(), tzOffsetMin: at.getTimezoneOffset(), renderBody: built.body,
    });
  };
  return <AddToCalendarSheet posts={posts} current={currentOf(own, schedule)} onSchedule={onSchedule} onClose={onClose} />;
}
