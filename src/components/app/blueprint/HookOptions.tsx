'use client';

import type { HookOption } from '../../../lib/scriptGenerator/types';
import { AppButton } from '../../ui/AppButton';
import { SCRIPT_UI } from './planCopy';

const ANGLE_LABEL: Record<HookOption['angle'], string> = { contrarian: 'Push back', pain: 'Name the pain', stakes: 'What it costs', proof: 'Proof', mistake: 'The mistake' };

/** The 3 hook options; picking one writes the script around it. */
export const HookOptions = ({ hooks, onPick, disabled }: { hooks: HookOption[]; onPick: (hook: HookOption) => void; disabled: boolean }) => (
  <ul className="grid gap-2 sm:grid-cols-3">
    {hooks.map((hook) => (
      <li key={hook.angle} className="flex flex-col gap-2 rounded-xl border border-app-line bg-app-panel p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-app-accent">{ANGLE_LABEL[hook.angle]}</p>
        <p className="text-[15px] font-semibold text-app-ink">{hook.onScreen}</p>
        {hook.spoken && <p className="text-[14px] text-app-ink">{hook.spoken}</p>}
        <p className="text-[13px] text-app-muted">{SCRIPT_UI.firstFrame}: {hook.visual}</p>
        <AppButton size="lg" variant="secondary" className="mt-auto" disabled={disabled} onClick={() => onPick(hook)}>
          {SCRIPT_UI.pickHook}
        </AppButton>
      </li>
    ))}
  </ul>
);
