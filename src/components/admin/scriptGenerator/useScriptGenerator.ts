'use client';

import { useCallback, useRef, useState } from 'react';
import { adminFetch } from '../business/useAdminApi';
import type { DraftChatEntry, ScriptDraft } from '../../../types/admin/scriptDrafts';
import { DEFAULT_SCRIPT_MODEL, type GeneratedScript, type GenerateScriptInput, type HookOption, type RefineScriptResult, type ScriptModel } from '../../../types/admin/scriptGenerator';

export type ChatEntry = DraftChatEntry;
export type WizardInput = Omit<GenerateScriptInput, 'format' | 'structure' | 'goal'> & {
  format: GenerateScriptInput['format'] | null;
  structure: GenerateScriptInput['structure'] | null;
  goal: GenerateScriptInput['goal'] | null;
};

/** idle: nothing to save yet. failed: the script is on screen but not in the database (Retry saves it). */
export type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

export const EMPTY_INPUT: WizardInput = { format: null, structure: null, goal: null, audience: '', message: '', credibility: '' };

const post = <T,>(token: string, path: string, body: unknown) =>
  adminFetch<T>(token, `/api/admin/script-generator/${path}`, { method: 'POST', body: JSON.stringify(body) });

/** Saves the current script: creates its row the first time, then updates it. Returns the row id. */
function useDraftSaver(token: string) {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const idRef = useRef<string | null>(null);
  const last = useRef<{ input: GenerateScriptInput; script: GeneratedScript; chat: ChatEntry[]; model: ScriptModel } | null>(null);

  const save = useCallback(async (state: NonNullable<typeof last.current>) => {
    last.current = state;
    setSaveState('saving');
    try {
      if (idRef.current) {
        await adminFetch(token, `/api/admin/script-generator/drafts/${idRef.current}`, { method: 'PATCH', body: JSON.stringify({ script: state.script, chat: state.chat, model: state.model }) });
      } else {
        const { draft } = await post<{ draft: ScriptDraft }>(token, 'drafts', { input: state.input, script: state.script, model: state.model });
        idRef.current = draft.id;
        setDraftId(draft.id);
        if (state.chat.length) await adminFetch(token, `/api/admin/script-generator/drafts/${draft.id}`, { method: 'PATCH', body: JSON.stringify({ chat: state.chat }) });
      }
      if (last.current === state) setSaveState('saved');
    } catch {
      if (last.current === state) setSaveState('failed');
    }
  }, [token]);

  const retry = useCallback(() => { if (last.current) void save(last.current); }, [save]);

  /** Points the saver at an opened row (or at nothing, for a new script). */
  const attach = useCallback((id: string | null) => {
    idRef.current = id;
    last.current = null;
    setDraftId(id);
    setSaveState(id ? 'saved' : 'idle');
  }, []);

  return { draftId, saveState, save, retry, attach };
}

/** Generate + refine calls, with one busy flag and one error string shared by the wizard and the result page. Every script is saved. */
export function useScriptGenerator(token: string) {
  const [script, setScript] = useState<GeneratedScript | null>(null);
  const [chat, setChat] = useState<ChatEntry[]>([]);
  /** Last wizard answers, kept so Back from the hooks step returns to the goal step filled in. */
  const [draft, setDraft] = useState<GenerateScriptInput | null>(null);
  /** Set while the hooks step is open: the answers waiting for a hook choice. */
  const [pending, setPending] = useState<GenerateScriptInput | null>(null);
  const [hooks, setHooks] = useState<HookOption[] | null>(null);
  /** Which text model writes the hooks, script and edits. Sent with every call, so it can change between steps. */
  const [model, setModel] = useState<ScriptModel>(DEFAULT_SCRIPT_MODEL);
  /** Signed photo links of an opened saved script, keyed by slot. */
  const [savedPhotos, setSavedPhotos] = useState<Record<string, string>>({});
  /** Bumped when another script takes the screen, so the result view starts fresh (photos, tabs). */
  const [session, setSession] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saver = useDraftSaver(token);
  const { save, attach } = saver;

  const generate = useCallback(async (input: GenerateScriptInput) => {
    setBusy(true);
    setError('');
    try {
      const out = await post<{ script: GeneratedScript }>(token, 'generate', { ...input, model });
      setScript(out.script);
      setChat([]);
      setSavedPhotos({});
      setSession((n) => n + 1);
      attach(null);
      void save({ input, script: out.script, chat: [], model });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }, [token, model, attach, save]);

  const requestHooks = useCallback(async (input: GenerateScriptInput) => {
    setDraft(input);
    setPending(input);
    setHooks(null);
    setError('');
    try {
      const { format, goal, audience, message, credibility } = input;
      const template = format === 'carousel' ? input.structure : undefined;
      const out = await post<{ hooks: HookOption[] }>(token, 'hooks', { format, goal, audience, message, credibility, template, model });
      setHooks(out.hooks);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }, [token, model]);

  const pickHook = useCallback((hook: HookOption) => {
    if (!pending) return;
    void generate({ ...pending, hook: { visual: hook.visual, text: hook.text, verbal: hook.verbal } });
  }, [pending, generate]);

  /** Back from the hooks step to the goal step, keeping the answers. */
  const backToWizard = useCallback(() => {
    setPending(null);
    setDraft(null);
    setHooks(null);
    setError('');
  }, []);

  const refine = useCallback(async (instruction: string) => {
    if (!script || !pending) return;
    setBusy(true);
    setError('');
    try {
      const out = await post<RefineScriptResult>(token, 'refine', { script, instruction, model });
      const nextChat = [...chat, { you: instruction, reply: out.message, refused: out.refused }];
      setScript(out.script);
      setChat(nextChat);
      void save({ input: pending, script: out.script, chat: nextChat, model });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }, [token, script, chat, pending, model, save]);

  /** Reopens a saved script where it was left: script, chat, model and photos. */
  const open = useCallback(async (id: string) => {
    setError('');
    try {
      const { draft: saved } = await adminFetch<{ draft: ScriptDraft }>(token, `/api/admin/script-generator/drafts/${id}`);
      setPending(saved.input);
      setDraft(saved.input);
      setHooks(null);
      setModel(saved.model);
      setScript(saved.script);
      setChat(saved.chat);
      setSavedPhotos(saved.photoUrls);
      setSession((n) => n + 1);
      attach(saved.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open this script');
    }
  }, [token, attach]);

  const reset = useCallback(() => {
    setScript(null);
    setChat([]);
    setPending(null);
    setDraft(null);
    setHooks(null);
    setSavedPhotos({});
    setError('');
    attach(null);
  }, [attach]);

  return {
    model, setModel, script, chat, draft, pending, hooks, busy, error, savedPhotos, session,
    draftId: saver.draftId, saveState: saver.saveState, retrySave: saver.retry,
    requestHooks, pickHook, backToWizard, refine, open, reset,
  };
}
