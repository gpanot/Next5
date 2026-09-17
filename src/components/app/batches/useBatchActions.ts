'use client';

import { track } from '../../../lib/analytics';
import { useState } from 'react';
import { FORMATS, isFormatId } from '../../../config/formats';
import { ApiError, apiFetch, downloadPhoto, downloadWithAuth } from '../../../lib/apiClient';
import type { BatchDetailDto, BatchItemDto } from '../../../types/business/batches';
import type { RedoReason } from './RedoDialog';

type Patch = (itemId: string, patch: Partial<BatchItemDto>) => void;

/** Favourite, download, redo, zip, archive and calendar actions for one batch, with optimistic updates. */
export const useBatchActions = (batch: BatchDetailDto | null, patchItem: Patch, refresh: () => Promise<unknown>, notify: (msg: string, tone?: 'success' | 'error') => void) => {
  const [downloading, setDownloading] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [calendarBusy, setCalendarBusy] = useState<string | null>(null);

  const fail = (err: unknown, fallback: string) => notify(err instanceof ApiError ? err.message : fallback, 'error');

  const favorite = async (item: BatchItemDto) => {
    if (!batch) return;
    patchItem(item.id, { favorite: !item.favorite });
    await apiFetch(`/api/app/batches/${batch.id}/items/${item.id}`, { method: 'PATCH', json: { favorite: !item.favorite } })
      .catch((err: unknown) => { patchItem(item.id, { favorite: item.favorite }); fail(err, 'Could not update favourite.'); });
  };

  const download = async (item: BatchItemDto, index: number) => {
    if (!item.url || !batch) return;
    const suffix = isFormatId(item.format) ? FORMATS[item.format].filenameSuffix : item.format;
    setSavingPhoto(true);
    await downloadPhoto(batch.id, item.id, `${batch.name.replace(/[^a-z0-9]+/gi, '-')}-${index + 1}-${suffix}.jpg`).catch((err: unknown) => fail(err, 'Download failed.'));
    setSavingPhoto(false);
  };

  const redo = async (item: BatchItemDto, reason: RedoReason, note: string) => {
    if (!batch) return;
    try {
      await apiFetch(`/api/app/batches/${batch.id}/items/${item.id}/redo`, { method: 'POST', json: { reason, note } });
      track('item_redo', { reason });
      patchItem(item.id, { status: 'queued' });
      notify(item.status === 'failed' ? 'Trying again with our second AI model — free' : item.freeRedosLeft > 0 ? 'Redoing your photo — free' : 'Redoing your photo');
      void refresh();
    } catch (err) {
      fail(err, 'Could not redo this photo.');
    }
  };

  const downloadZip = async (query: string, filename: string) => {
    if (!batch) return;
    setDownloading(true);
    track('zip_downloaded', { scope: query ? 'filtered' : 'batch' });
    await downloadWithAuth(`/api/app/batches/${batch.id}/zip${query}`, filename).catch((err: unknown) => fail(err, 'Download failed.'));
    setDownloading(false);
  };

  const downloadSelected = async (ids: string[]) => {
    setDownloading(true);
    await downloadWithAuth(`/api/app/library/zip?ids=${ids.join(',')}`, 'next5-selected.zip').catch((err: unknown) => fail(err, 'Download failed.'));
    setDownloading(false);
  };

  /** Trash icon. The page hides the photo at once; `onDone(false)` puts it back if the server says no. */
  const archive = async (item: BatchItemDto, onDone: (archived: boolean) => void) => {
    if (!batch) return;
    onDone(true);
    try {
      await apiFetch(`/api/app/batches/${batch.id}/items/${item.id}`, { method: 'PATCH', json: { archived: true } });
      notify('Photo archived');
    } catch (err) {
      onDone(false);
      fail(err, 'Could not archive this photo.');
    }
  };

  /** "Add to calendar", or take it off again. */
  const toggleCalendar = async (item: BatchItemDto) => {
    if (!batch) return;
    const on = item.calendar && item.calendar.status !== 'skipped';
    setCalendarBusy(item.id);
    try {
      const res = await apiFetch<{ item: BatchItemDto }>(`/api/app/batches/${batch.id}/items/${item.id}/calendar`, { method: on ? 'DELETE' : 'POST' });
      patchItem(item.id, { calendar: res.item.calendar });
      if (!on) track('calendar_planned', { source: 'manual' });
      notify(on ? 'Taken off your calendar' : 'Added to your calendar');
    } catch (err) {
      fail(err, 'Could not update your calendar.');
    } finally {
      setCalendarBusy(null);
    }
  };

  return { favorite, download, redo, downloadZip, downloadSelected, archive, toggleCalendar, calendarBusy, downloading, savingPhoto };
};
