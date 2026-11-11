'use client';

/**
 * Client calls for Admin › Jun Yuh › My Blueprint (/api/admin/blueprint, admin token).
 * The server builds every prompt from the stored blueprint. Errors keep their code and details (409 copy, 429 wait).
 */
import { ApiError, UNAUTHORIZED_EVENT } from '../../../lib/apiClient';
import type { BlueprintDto, BlueprintPatch } from '../../../lib/blueprint/schema';
import type { HookOption, Script, ScriptHook } from '../../../lib/scriptGenerator/types';

type Init = { method?: 'GET' | 'POST' | 'PATCH'; json?: unknown; signal?: AbortSignal };
type ErrorBody = { error?: string; message?: string; details?: Record<string, unknown> };

const call = async <T,>(token: string, path: string, { method = 'GET', json, signal }: Init = {}): Promise<T> => {
  let res: Response;
  try {
    res = await fetch(`/api/admin/blueprint${path}`, {
      method,
      signal,
      headers: { Authorization: `Bearer ${token}`, ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: json !== undefined ? JSON.stringify(json) : undefined,
    });
  } catch {
    throw new ApiError(0, 'network_error', "We couldn't reach Next5. Check your connection and try again.");
  }
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const body = (data ?? {}) as ErrorBody;
    if (res.status === 401) window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    throw new ApiError(res.status, body.error ?? 'request_failed', body.message ?? 'Something went wrong. Please try again.', body.details);
  }
  return data as T;
};

export const getBlueprint = (token: string) => call<{ blueprint: BlueprintDto }>(token, '').then((r) => r.blueprint);

export const patchBlueprint = (token: string, patch: BlueprintPatch) =>
  call<{ blueprint: BlueprintDto }>(token, '', { method: 'PATCH', json: patch }).then((r) => r.blueprint);

export type ScriptResponse = { script: Script; blueprint: BlueprintDto };
export type RefineResponse = { refused: boolean; message: string; script: Script; blueprint: BlueprintDto };

export const writeScript = (token: string, day: number, hook: ScriptHook | undefined, signal: AbortSignal) =>
  call<ScriptResponse>(token, `/days/${day}/script`, { method: 'POST', json: { hook }, signal });

export const changeScript = (token: string, day: number, instruction: string, signal: AbortSignal) =>
  call<RefineResponse>(token, `/days/${day}/script/refine`, { method: 'POST', json: { instruction }, signal });

export const hookOptions = (token: string, day: number, signal: AbortSignal) =>
  call<{ hooks: HookOption[] }>(token, `/days/${day}/hooks`, { method: 'POST', json: {}, signal }).then((r) => r.hooks);
