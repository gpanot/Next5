'use client';

import { useEffect } from 'react';

const CONSUMER_HASHES = new Set(['#routes', '#how-it-works', '#faq']);

/** Old consumer links like `/#routes` now live on `/photos` — hashes never reach the server, so forward on the client. */
export const LegacyHashRedirect = () => {
  useEffect(() => {
    if (CONSUMER_HASHES.has(window.location.hash)) window.location.replace(`/photos${window.location.hash}`);
  }, []);
  return null;
};
