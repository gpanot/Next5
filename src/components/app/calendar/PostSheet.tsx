'use client';

import { Check, Copy, Download, ExternalLink, Trash2, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { track } from '../../../lib/analytics';
import { ApiError, apiFetch, downloadPhoto } from '../../../lib/apiClient';
import type { SlotDto } from '../../../types/business/calendar';
import { AppButton } from '../../ui/AppButton';
import { Sheet } from '../../ui/Sheet';

type Props = {
  slot: SlotDto | null;
  postKitAllowed: boolean;
  onClose: () => void;
  onChanged: (slot: SlotDto) => void;
  onToast: (message: string) => void;
};

const OPEN_URLS: Record<string, string> = {
  instagram: 'https://www.instagram.com/',
  tiktok: 'https://www.tiktok.com/upload',
  facebook: 'https://www.facebook.com/',
  linkedin: 'https://www.linkedin.com/feed/',
};

const slug = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'post';

/**
 * The twenty-second hand-off: save the photo, copy the words, open the app.
 * Copying or saving marks the post done on its own — she never ticks a box to keep her guarantee alive.
 */
export const PostSheet = ({ slot, postKitAllowed, onClose, onChanged, onToast }: Props) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLink, setShowLink] = useState(false);
  const [link, setLink] = useState('');

  const act = async (action: string, body: Record<string, unknown> = {}, quiet = false) => {
    if (!slot) return;
    setBusy(action);
    setError(null);
    try {
      const res = await apiFetch<{ slot: SlotDto }>(`/api/app/calendar/slots/${slot.id}`, { method: 'PATCH', json: { action, ...body } });
      onChanged(res.slot);
      return res.slot;
    } catch (err) {
      if (!quiet) setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(null);
    }
  };

  /** Anything that means "she is posting this" counts as posted. */
  const countAsPosted = async () => {
    if (!slot || slot.status === 'posted') return;
    await act('posted', {}, true);
    track('post_marked', { source: 'handoff' });
    onToast('Marked as posted');
  };

  const copy = async (what: string, text: string) => {
    await navigator.clipboard.writeText(text);
    onToast(`${what} copied`);
    await countAsPosted();
  };

  const save = async () => {
    if (!slot?.photo) return;
    setBusy('save');
    try {
      await downloadPhoto(slot.photo.batchId, slot.photo.itemId, `${slug(slot.photo.postKit?.hook ?? 'next5-post')}.png`);
      await countAsPosted();
    } catch {
      setError('Could not save the photo. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const kit = slot?.photo?.postKit ?? null;
  const caption = kit ? [kit.hook, kit.caption].filter(Boolean).join('\n\n') : null;
  const posted = slot?.status === 'posted';

  return (
    <Sheet open={slot !== null} onClose={onClose} title="Your post" side="bottom" className="sm:mx-auto sm:max-w-lg">
      {slot && (
        <div className="flex flex-col gap-4 overflow-y-auto px-5 pb-8 pt-2">
          {slot.photo?.url && (
            <div className="relative mx-auto w-full max-w-[280px] overflow-hidden rounded-2xl bg-app-sunken">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={slot.photo.url} alt="Your post" className="w-full object-cover" />
              {posted && (
                <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                  <Check aria-hidden className="h-3 w-3" /> Posted
                </span>
              )}
            </div>
          )}

          {slot.photo?.scoreDetails?.tip && (
            <p className="rounded-xl bg-app-sunken px-3 py-2 text-[13px] leading-snug text-app-muted">{slot.photo.scoreDetails.tip}</p>
          )}

          {/* The three things she actually needs, as big targets. */}
          <div className="flex flex-col gap-2">
            <AppButton size="lg" fullWidth loading={busy === 'save'} onClick={() => void save()} iconLeft={<Download aria-hidden className="h-4 w-4" />}>
              Save photo
            </AppButton>
            {caption ? (
              <>
                <AppButton size="lg" fullWidth variant="secondary" onClick={() => void copy('Caption', caption)} iconLeft={<Copy aria-hidden className="h-4 w-4" />}>
                  Copy caption
                </AppButton>
                {kit && kit.hashtags.length > 0 && (
                  <AppButton size="lg" fullWidth variant="secondary" onClick={() => void copy('Hashtags', kit.hashtags.join(' '))} iconLeft={<Copy aria-hidden className="h-4 w-4" />}>
                    Copy hashtags
                  </AppButton>
                )}
              </>
            ) : (
              !postKitAllowed && (
                <p className="rounded-xl border border-app-line px-3 py-2 text-[13px] text-app-muted">
                  Growth writes the hook, caption and hashtags for every photo.
                </p>
              )
            )}
            <a
              href={OPEN_URLS[slot.platform] ?? OPEN_URLS.instagram}
              target="_blank"
              rel="noreferrer"
              onClick={() => void countAsPosted()}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-app-line text-[14px] font-medium text-app-ink transition-colors duration-200 hover:bg-app-sunken"
            >
              Open {slot.platform === 'tiktok' ? 'TikTok' : slot.platform === 'linkedin' ? 'LinkedIn' : slot.platform === 'facebook' ? 'Facebook' : 'Instagram'}
              <ExternalLink aria-hidden className="h-4 w-4" />
            </a>
          </div>

          {caption && <p className="whitespace-pre-line rounded-xl bg-app-sunken px-3 py-2 text-[13px] leading-snug text-app-ink">{caption}</p>}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-app-line pt-3">
            {posted ? (
              <button type="button" onClick={() => void act('undo')} disabled={busy !== null} className="inline-flex items-center gap-1.5 text-[13px] text-app-muted hover:text-app-ink">
                <Undo2 aria-hidden className="h-3.5 w-3.5" /> Not posted yet
              </button>
            ) : (
              <button type="button" onClick={() => void act('remove').then(onClose)} disabled={busy !== null} className="inline-flex items-center gap-1.5 text-[13px] text-app-muted hover:text-app-danger">
                <Trash2 aria-hidden className="h-3.5 w-3.5" /> Remove from calendar
              </button>
            )}
            {posted && !slot.postUrl && (
              <button type="button" onClick={() => setShowLink((v) => !v)} className="text-[13px] text-app-accent hover:text-app-ink">
                Add the link
              </button>
            )}
          </div>

          {showLink && posted && (
            <div className="flex gap-2">
              <input
                id={`post-link-${slot.id}`}
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="Paste your post link"
                className="h-10 min-w-0 flex-1 rounded-xl border border-app-line bg-app-panel px-3 text-[14px] text-app-ink placeholder:text-app-muted"
              />
              <AppButton
                size="md"
                onClick={() => void act('posted', { postUrl: link }).then(() => { setShowLink(false); onToast('Link saved'); })}
                disabled={!link.trim() || busy !== null}
              >
                Save
              </AppButton>
            </div>
          )}

          {error && <p className="text-[13px] text-app-danger">{error}</p>}
        </div>
      )}
    </Sheet>
  );
};
