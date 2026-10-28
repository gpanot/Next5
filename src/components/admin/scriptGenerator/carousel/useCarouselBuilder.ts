'use client';

import { useCallback, useMemo, useState } from 'react';
import type { CarouselHook, CarouselInput, GeneratedCarousel, RefineCarouselResult } from '../../../../types/admin/carousel';
import { CAROUSEL_TEMPLATES, DEFAULT_LIST_COUNT, type CarouselQuestionKey, type CarouselTemplate } from '../../../../types/admin/carouselTemplates';
import type { CarouselDraft } from '../../../../types/admin/scriptDrafts';
import type { ScriptModel } from '../../../../types/admin/scriptGenerator';
import { adminFetch } from '../../business/useAdminApi';
import { useDraftSaver, type ChatEntry } from '../useDraftSaver';

export type CarouselStep = 'template' | 'questions' | 'hooks' | 'result';

const post = <T,>(token: string, path: string, body: unknown) =>
  adminFetch<T>(token, `/api/admin/script-generator/carousel/${path}`, { method: 'POST', body: JSON.stringify(body) });

const errorText = (err: unknown) => (err instanceof Error ? err.message : 'Failed');

/** The carousel path of the Script Generator: template > questions > slide 1 > carousel, then refine. Every carousel is saved. */
export function useCarouselBuilder(token: string, model: ScriptModel) {
  const [step, setStep] = useState<CarouselStep>('template');
  const [template, setTemplate] = useState<CarouselTemplate | null>(null);
  const [answers, setAnswers] = useState<CarouselInput['answers']>({});
  const [listCount, setListCount] = useState(DEFAULT_LIST_COUNT);
  const [pronoun, setPronoun] = useState<'her' | 'him'>('her');
  const [hooks, setHooks] = useState<CarouselHook[] | null>(null);
  const [carousel, setCarousel] = useState<GeneratedCarousel | null>(null);
  /** The answers the shown carousel was written from (refine and save send them). */
  const [input, setInput] = useState<CarouselInput | null>(null);
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [savedPhotos, setSavedPhotos] = useState<Record<string, string>>({});
  /** Bumped when another carousel takes the screen, so the result view starts fresh (photos, tabs). */
  const [session, setSession] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saver = useDraftSaver(token);
  const { save, attach } = saver;

  const current = useMemo<CarouselInput | null>(
    () => (template ? { template, answers, listCount, pronoun } : null),
    [template, answers, listCount, pronoun],
  );

  const pickTemplate = useCallback((t: CarouselTemplate) => { setTemplate(t); setError(''); setStep('questions'); }, []);
  const setAnswer = useCallback((key: CarouselQuestionKey, value: string) => setAnswers((prev) => ({ ...prev, [key]: value })), []);

  const generate = useCallback(async (next: CarouselInput) => {
    setBusy(true);
    setError('');
    try {
      const out = await post<{ carousel: GeneratedCarousel }>(token, 'generate', { ...next, model });
      setCarousel(out.carousel);
      setInput(next);
      setChat([]);
      setSavedPhotos({});
      setSession((n) => n + 1);
      setStep('result');
      attach(null);
      void save({ kind: 'carousel', input: next, script: out.carousel, chat: [], model });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }, [token, model, attach, save]);

  /** After the questions: slide 1 options, or straight to the carousel when the template fixes slide 1. */
  const submitAnswers = useCallback(async () => {
    if (!current) return;
    if (CAROUSEL_TEMPLATES[current.template].fixedHook) return void generate(current);
    setStep('hooks');
    setHooks(null);
    setError('');
    try {
      setHooks((await post<{ hooks: CarouselHook[] }>(token, 'hooks', { ...current, model })).hooks);
    } catch (err) {
      setError(errorText(err));
    }
  }, [current, generate, token, model]);

  const pickHook = useCallback((hook: CarouselHook) => { if (current) void generate({ ...current, hook }); }, [current, generate]);

  const refine = useCallback(async (instruction: string) => {
    if (!carousel || !input) return;
    setBusy(true);
    setError('');
    try {
      const out = await post<RefineCarouselResult>(token, 'refine', { input, carousel, instruction, model });
      const nextChat = [...chat, { you: instruction, reply: out.message, refused: out.refused }];
      setCarousel(out.carousel);
      setChat(nextChat);
      void save({ kind: 'carousel', input, script: out.carousel, chat: nextChat, model });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }, [token, carousel, input, chat, model, save]);

  /** Shows a saved carousel where it was left: slides, chat and photos. */
  const load = useCallback((saved: CarouselDraft) => {
    setTemplate(saved.input.template);
    setAnswers(saved.input.answers);
    setListCount(saved.input.listCount ?? DEFAULT_LIST_COUNT);
    setPronoun(saved.input.pronoun ?? 'her');
    setInput(saved.input);
    setCarousel(saved.script);
    setChat(saved.chat);
    setSavedPhotos(saved.photoUrls);
    setHooks(null);
    setError('');
    setSession((n) => n + 1);
    setStep('result');
    attach(saved.id);
  }, [attach]);

  const reset = useCallback(() => {
    setStep('template');
    setTemplate(null);
    setAnswers({});
    setListCount(DEFAULT_LIST_COUNT);
    setHooks(null);
    setCarousel(null);
    setInput(null);
    setChat([]);
    setSavedPhotos({});
    setError('');
    attach(null);
  }, [attach]);

  return {
    step, setStep, template, answers, listCount, pronoun, hooks, carousel, chat, savedPhotos, session, busy, error,
    draftId: saver.draftId, saveState: saver.saveState, retrySave: saver.retry,
    pickTemplate, setAnswer, setListCount, setPronoun, submitAnswers, pickHook, refine, load, reset,
  };
}

export type CarouselBuilder = ReturnType<typeof useCarouselBuilder>;
