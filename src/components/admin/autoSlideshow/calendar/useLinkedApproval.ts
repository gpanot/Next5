'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { parsePins } from '../../../../lib/approvalLink';

/** How long the link waits for the calendar to load its posts before giving up on opening the sheet. */
const WAIT_MS = 20_000;

/**
 * The Claude connector's approval link (`?approve=all&pins=…`, src/lib/approvalLink.ts): pins the slideshows made from
 * ideas on their days (pins live in this browser, so a new device needs them), then opens the approval sheet once there
 * is something to approve, and drops both from the URL so a reload keeps the user's own view.
 */
export function useLinkedApproval(o: { pins: Record<string, string>; setPins: (pins: Record<string, string>) => void; toApproveCount: number; openAll: () => void }) {
  const params = useSearchParams();
  const approve = params.get('approve') === 'all';
  const rawPins = params.get('pins');
  const pinned = useRef(false);
  const opened = useRef(false);
  const { pins, setPins, toApproveCount, openAll } = o;

  useEffect(() => {
    if (pinned.current || !rawPins) return;
    pinned.current = true;
    const linked = parsePins(rawPins);
    if (Object.keys(linked).length > 0) setPins({ ...pins, ...linked });
  }, [rawPins, pins, setPins]);

  useEffect(() => {
    if (!approve && !rawPins) return;
    const drop = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('approve');
      url.searchParams.delete('pins');
      window.history.replaceState(null, '', url.toString());
    };
    if (approve && !opened.current && toApproveCount > 0) {
      opened.current = true;
      openAll();
      drop();
      return;
    }
    const timer = window.setTimeout(drop, approve ? WAIT_MS : 0);
    return () => window.clearTimeout(timer);
  }, [approve, rawPins, toApproveCount, openAll]);
}
