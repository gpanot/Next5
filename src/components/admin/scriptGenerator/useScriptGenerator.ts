'use client';

import { useCallback, useState } from 'react';
import { adminFetch } from '../business/useAdminApi';
import { DEFAULT_SCRIPT_MODEL, type GeneratedScript, type GenerateScriptInput, type HookOption, type RefineScriptResult, type ScriptModel } from '../../../types/admin/scriptGenerator';

export type ChatEntry = { you: string; reply: string; refused: boolean };
export type WizardInput = Omit<GenerateScriptInput, 'format' | 'structure' | 'goal'> & {
  format: GenerateScriptInput['format'] | null;
  structure: GenerateScriptInput['structure'] | null;
  goal: GenerateScriptInput['goal'] | null;
};

export const EMPTY_INPUT: WizardInput = { format: null, structure: null, goal: null, audience: '', message: '', credibility: '' };

const post = <T,>(token: string, path: string, body: unknown) =>
  adminFetch<T>(token, `/api/admin/script-generator/${path}`, { method: 'POST', body: JSON.stringify(body) });

/** Generate + refine calls, with one busy flag and one error string shared by the wizard and the result page. */
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const generate = useCallback(async (input: GenerateScriptInput) => {
    setBusy(true);
    setError('');
    try {
      const out = await post<{ script: GeneratedScript }>(token, 'generate', { ...input, model });
      setScript(out.script);
      setChat([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }, [token, model]);

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
    if (!script) return;
    setBusy(true);
    setError('');
    try {
      const out = await post<RefineScriptResult>(token, 'refine', { script, instruction, model });
      setScript(out.script);
      setChat((prev) => [...prev, { you: instruction, reply: out.message, refused: out.refused }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  }, [token, script, model]);

  const reset = useCallback(() => {
    setScript(null);
    setChat([]);
    setPending(null);
    setDraft(null);
    setHooks(null);
    setError('');
  }, []);

  return { model, setModel, script, chat, draft, pending, hooks, busy, error, requestHooks, pickHook, backToWizard, refine, reset };
}
