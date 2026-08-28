'use client';

import { useEffect, useRef, useState } from 'react';
import type { DirectorNoteRequestBody } from '../../app/api/director-note/route';

/**
 * Fetches the director's note once per preview. Deliberately never surfaces an
 * error: the API falls back to a written note, so the panel always has copy.
 *
 * Dedupes on the serialised payload rather than a boolean ref. Under Strict
 * Mode the effect runs mount → cleanup → mount; a boolean guard would block the
 * second run while the first run's cleanup discarded the response, and the note
 * would never land.
 */
export const useDirectorNote = (input: DirectorNoteRequestBody | null) => {
  const [note, setNote] = useState<string | null>(null);
  const requestedFor = useRef<string | null>(null);

  const payload = input === null ? null : JSON.stringify(input);

  useEffect(() => {
    if (!payload || requestedFor.current === payload) return;
    requestedFor.current = payload;

    fetch('/api/director-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    })
      .then((res) => res.json())
      .then((data) => {
        if (typeof data?.note === 'string' && data.note.length > 0) setNote(data.note);
      })
      .catch((err) => {
        console.error('[director-note] request failed:', err);
      });
  }, [payload]);

  return note;
};
