'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { errorOf } from '../../labClient';
import { useLabClient } from '../../LabClientProvider';
import type { RemixSource } from '../useSetRemix';
import { scheduleApi } from './scheduleApi';

/**
 * Opens a calendar video in the editor (Content page `?editPost=<id>`, from the calendar's "Edit"): its saved render
 * request re-opens like a Remix, keeping its card id so "Save changes" updates that post. `exit` goes back to where it
 * was opened (the Library or the calendar).
 */
export function useOpenPost(postId: string | null, ready: boolean, remix: (source: RemixSource) => void) {
  const client = useLabClient();
  const router = useRouter();
  const opened = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    // Cleared once the URL drops the post, so editing the same post again (the page stays mounted) opens it again.
    if (!postId) opened.current = null;
    if (!postId || !ready || opened.current === postId) return;
    opened.current = postId;
    void scheduleApi.get(client, postId).catch(() => null).then((res) => {
      if (!res?.ok) return setError(res ? errorOf(res) : 'Could not reach the server. Check your connection.');
      remix({ id: postId, currentAssets: res.data.assets, cardId: res.data.item.cardId });
    });
  }, [postId, ready, client, remix]);
  return { error, exit: () => router.back() };
}

/** Why a calendar video could not be opened in the editor. */
export function OpenPostError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-[13px] text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">{message}</p>;
}
