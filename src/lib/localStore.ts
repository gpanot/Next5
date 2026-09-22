'use client';

import { useSyncExternalStore } from 'react';

/**
 * A tiny localStorage-backed store for useSyncExternalStore.
 * Server/hydration snapshot is `undefined` ("not known yet"); after hydration it's the stored string or null.
 */
export const createLocalStore = (key: string) => {
  let listeners: (() => void)[] = [];
  const notify = () => listeners.forEach((l) => l());

  const subscribe = (listener: () => void) => {
    listeners.push(listener);
    const onStorage = (e: StorageEvent) => e.key === key && listener();
    window.addEventListener('storage', onStorage);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
      window.removeEventListener('storage', onStorage);
    };
  };

  const get = (): string | null => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const set = (value: string | null) => {
    try {
      if (value === null) window.localStorage.removeItem(key);
      else window.localStorage.setItem(key, value);
    } catch {
      // storage blocked — value lives for this tab only via listeners
    }
    notify();
  };

  const useValue = (): string | null | undefined => useSyncExternalStore(subscribe, get, () => undefined);

  return { get, set, useValue };
};

export const sessionTokenStore = createLocalStore('studio_token');
export const productStore = createLocalStore('next5-product');
export const onboardingModelStore = createLocalStore('next5-onboarding-model');
/** Shop onboarding: the product picked for the free trial. */
export const trialProductStore = createLocalStore('next5-trial-product');
export const lastSetStore = createLocalStore('next5-last-set');
export const postingTipsStore = createLocalStore('next5-posting-tips-dismissed');
/** Step-1 details typed before an email check, so the magic link can finish setup without asking again. */
export const onboardingDraftStore = createLocalStore('next5-onboarding-draft');
/** Quickstart onboarding card state (JSON). Keyed by workspace so it resets on workspace switch. */
export const quickstartStore = createLocalStore('next5-quickstart');
