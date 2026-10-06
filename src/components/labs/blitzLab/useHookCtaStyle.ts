'use client';

import { useState } from 'react';
import { pickHookCtaStyle, slideTextConfig } from '../../../remotion/slideTextConfig';
import type { TextConfig } from '../../../remotion/types';

type TextLayout = { resolved: TextConfig; patch: (p: Partial<TextConfig>) => void };

/** The Text panel's "All slides / Hook & CTA" switch, as ContextPanel's `scope` prop. */
export type HookCtaScope = {
  hookCta: boolean;
  onChange: (hookCta: boolean) => void;
  /** Hook & CTA back to the look of the other slides. Absent when they already share it. */
  onClear?: () => void;
};

/**
 * Lets the Text panel style the hook (first slide) and the CTA (last slide) on their own: in "Hook & CTA" mode the
 * panel shows and edits `hookCtaStyle`, the other slides keep theirs. Switching to it shows the hook in the preview.
 */
export function useHookCtaStyle(text: TextLayout, onShowHook: () => void) {
  const [hookCta, setHookCta] = useState(false);
  const own = text.resolved.hookCtaStyle;
  const textConfig = hookCta ? slideTextConfig(text.resolved, 0, 2) : text.resolved;

  const onTextConfigChange = (patch: Partial<TextConfig>) => {
    if (!hookCta) return text.patch(patch);
    // Positions stay per slide: only style fields go to the hook / CTA look.
    text.patch({ hookCtaStyle: { ...own, ...pickHookCtaStyle(patch) } });
  };

  const scope: HookCtaScope = {
    hookCta,
    onChange: (on) => {
      setHookCta(on);
      if (on) onShowHook();
    },
    onClear: own && Object.keys(own).length > 0 ? () => text.patch({ hookCtaStyle: undefined }) : undefined,
  };
  return { textConfig, onTextConfigChange, scope };
}
