'use client';

import { useCallback, useState } from 'react';
import { adminFetch } from '../business/useAdminApi';
import type { VideoDraft } from '../../../types/admin/scriptDrafts';
import type { GeneratedScript, GenerateScriptInput, HookOption, RefineScriptResult, ScriptModel } from '../../../types/admin/scriptGenerator';
import { useDraftSaver, type ChatEntry } from './useDraftSaver';

export type { ChatEntry };
export type WizardInput = Omit<GenerateScriptInput, 'format' | 'structure' | 'goal'> & {
  format: GenerateScriptInput['format'] | null;
  structure: GenerateScriptInput['structure'] | null;
  goal: GenerateScriptInput['goal'] | null;
};

export const EMPTY_INPUT: WizardInput = { format: null, structure: null, goal: null, audience: '', message: '', credibility: '' };

const post = <T,>(token: string, path: string, body: unknown) =>
  adminFetch<T>(token, `/api/admin/script-generator/${path}`, { method: 'POST', body: JSON.stringify(body) });

/** Video scripts: generate + refine calls, with one busy flag and one error string shared by the wizard and the result
 *  page. Every script is saved. `model` (picked in the tab) writes the hooks, the script and the edits. */
export function useScriptGenerator(token: string, model: ScriptModel) {
  const [script, setScript] = useState<GeneratedScript | null>(null);
  const [chat, setChat] = useState<ChatEntry[]>([]);
  /** Last wizard answers, kept so Back from the hooks step returns to the goal step filled in. */
  const [draft, setDraft] = useState<GenerateScriptInput | null>(null);
  /** Set while the hooks step is open: the answers waiting for a hook choice. */
  const [pending, setPending] = useState<GenerateScriptInput | null>(null);
  const [hooks, setHooks] = useState<HookOption[] | null>(null);
  /** Bumped when another script takes the screen, so the result view starts fresh. */
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
      setSession((n) => n + 1);
      attach(null);
      void save({ kind: 'video', input, script: out.script, chat: [], model });
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
      const out = await post<{ hooks: HookOption[] }>(token, 'hooks', { format, goal, audience, message, credibility, model });
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
      void save({ kind: 'video', input: pending, script: out.script, chat: nextChat, model });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }, [token, script, chat, pending, model, save]);

  /** Shows a saved script where it was left: script and chat. */
  const load = useCallback((saved: VideoDraft) => {
    setError('');
    setPending(saved.input);
    setDraft(saved.input);
    setHooks(null);
    setScript(saved.script);
    setChat(saved.chat);
    setSession((n) => n + 1);
    attach(saved.id);
  }, [attach]);

  const reset = useCallback(() => {
    setScript(null);
    setChat([]);
    setPending(null);
    setDraft(null);
    setHooks(null);
    setError('');
    attach(null);
  }, [attach]);

  return {
    script, chat, draft, pending, hooks, busy, error, session,
    saveState: saver.saveState, retrySave: saver.retry,
    requestHooks, pickHook, backToWizard, refine, load, reset,
  };
}
