'use client';

import { useCallback, useRef, useState } from 'react';
import type { CarouselInput, GeneratedCarousel } from '../../../types/admin/carousel';
import type { DraftChatEntry, ScriptDraft } from '../../../types/admin/scriptDrafts';
import type { GeneratedScript, GenerateScriptInput, ScriptModel } from '../../../types/admin/scriptGenerator';
import { adminFetch } from '../business/useAdminApi';

export type ChatEntry = DraftChatEntry;

/** idle: nothing to save yet. failed: the work is on screen but not in the database (Retry saves it). */
export type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

export type DraftWork =
  | { kind: 'video'; input: GenerateScriptInput; script: GeneratedScript; chat: ChatEntry[]; model: ScriptModel }
  | { kind: 'carousel'; input: CarouselInput; script: GeneratedCarousel; chat: ChatEntry[]; model: ScriptModel };

const DRAFTS = '/api/admin/script-generator/drafts';

/** Saves the work on screen: creates its row the first time, then updates the whole row (script, answers, chat). */
export function useDraftSaver(token: string) {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const idRef = useRef<string | null>(null);
  const last = useRef<DraftWork | null>(null);

  const save = useCallback(async (work: DraftWork) => {
    last.current = work;
    setSaveState('saving');
    try {
      if (idRef.current) {
        await adminFetch(token, `${DRAFTS}/${idRef.current}`, { method: 'PATCH', body: JSON.stringify(work) });
      } else {
        const { draft } = await adminFetch<{ draft: ScriptDraft }>(token, DRAFTS, { method: 'POST', body: JSON.stringify(work) });
        idRef.current = draft.id;
        setDraftId(draft.id);
        if (work.chat.length) await adminFetch(token, `${DRAFTS}/${draft.id}`, { method: 'PATCH', body: JSON.stringify({ chat: work.chat }) });
      }
      if (last.current === work) setSaveState('saved');
    } catch {
      if (last.current === work) setSaveState('failed');
    }
  }, [token]);

  const retry = useCallback(() => { if (last.current) void save(last.current); }, [save]);

  /** Points the saver at an opened row, or at nothing for new work. */
  const attach = useCallback((id: string | null) => {
    idRef.current = id;
    last.current = null;
    setDraftId(id);
    setSaveState(id ? 'saved' : 'idle');
  }, []);

  return { draftId, saveState, save, retry, attach };
}
