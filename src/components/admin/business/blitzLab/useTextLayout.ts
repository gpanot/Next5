'use client';

import { useCallback, useMemo, useState } from 'react';
import { BLITZ_CANVAS_HEIGHT, BLITZ_DEFAULT_TEXT_CONFIG } from '../../../../config/blitzLab';
import { BUSINESS_DEFAULTS } from '../../../../remotion/businessDefaults';
import type { TextConfig } from '../../../../remotion/types';

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const defined = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;

/** Template textConfig + defaults + user overrides. */
export const mergeTextConfig = (templateTextConfig: unknown, overrides: Partial<TextConfig>): TextConfig => ({
  ...BLITZ_DEFAULT_TEXT_CONFIG,
  ...defined((templateTextConfig ?? {}) as Partial<TextConfig>),
  ...defined(overrides),
});

/**
 * Caption + business line styling and placement for one editing session.
 * `override` holds only what the user changed; it is sent to the worker as
 * textConfigOverride. Drags start from the template's real position.
 */
export function useTextLayout(templateTextConfig: unknown) {
  const [override, setOverride] = useState<Partial<TextConfig>>({});
  const base = useMemo(() => mergeTextConfig(templateTextConfig, {}), [templateTextConfig]);
  const resolved = useMemo(() => mergeTextConfig(templateTextConfig, override), [templateTextConfig, override]);

  /** dx → offsetX (canvas px); dy → positionY (caption bottom edge, fraction of height). */
  const dragCaption = useCallback((dx: number, dy: number) => {
    setOverride((prev) => ({
      ...prev,
      offsetX: (prev.offsetX ?? base.offsetX ?? 0) + dx,
      positionY: clamp((prev.positionY ?? base.positionY) + dy / BLITZ_CANVAS_HEIGHT, 0.02, 0.98),
    }));
  }, [base]);

  const dragBusiness = useCallback((dx: number, dy: number) => {
    setOverride((prev) => ({
      ...prev,
      businessOffsetX: (prev.businessOffsetX ?? BUSINESS_DEFAULTS.offsetX) + dx,
      businessPositionY: clamp((prev.businessPositionY ?? BUSINESS_DEFAULTS.positionY) + dy / BLITZ_CANVAS_HEIGHT, 0.05, 0.99),
    }));
  }, []);

  const resetCaptionPosition = useCallback(() => {
    setOverride((prev) => ({ ...prev, offsetX: base.offsetX ?? 0, positionY: base.positionY }));
  }, [base]);

  const resetBusinessPosition = useCallback(() => {
    setOverride((prev) => ({ ...prev, businessOffsetX: BUSINESS_DEFAULTS.offsetX, businessPositionY: BUSINESS_DEFAULTS.positionY }));
  }, []);

  const patch = useCallback((p: Partial<TextConfig>) => setOverride((prev) => ({ ...prev, ...p })), []);
  const reset = useCallback(() => setOverride({}), []);

  return { override, resolved, dragCaption, dragBusiness, resetCaptionPosition, resetBusinessPosition, patch, reset };
}
