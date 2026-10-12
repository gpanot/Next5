'use client';

import { useId } from 'react';
import { OTHER_TEXT_MAX } from '../../../../types/admin/onboarding';
import type { Option } from './onboardingCopy';

const rowBase = 'flex min-h-[52px] w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition active:scale-[0.99]';
const rowOff = 'border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700';
const rowOn = 'border-blue-600 bg-blue-50 dark:border-blue-400 dark:bg-blue-950';

function CheckBox({ on }: { on: boolean }) {
  return (
    <span aria-hidden className={`ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${on ? 'border-blue-600 bg-blue-600 text-white dark:border-blue-400 dark:bg-blue-400 dark:text-zinc-950' : 'border-zinc-300 dark:border-zinc-600'}`}>
      {on && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12 5 5 9-10" />
        </svg>
      )}
    </span>
  );
}

/** Multi-select: one toggle button per option, `aria-pressed` carries the state. */
export function MultiOptions<K extends string>({ options, selected, onToggle }: { options: Option<K>[]; selected: K[]; onToggle: (key: K) => void }) {
  return (
    <ul className="space-y-2.5">
      {options.map((o) => {
        const on = selected.includes(o.key);
        return (
          <li key={o.key}>
            <button type="button" aria-pressed={on} onClick={() => onToggle(o.key)} className={`${rowBase} ${on ? rowOn : rowOff}`}>
              <span className="text-[15px] font-semibold text-ink dark:text-zinc-100">{o.label}</span>
              <CheckBox on={on} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function RadioDot({ on }: { on: boolean }) {
  return (
    <span aria-hidden className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${on ? 'border-blue-600 dark:border-blue-400' : 'border-zinc-300 dark:border-zinc-600'}`}>
      {on && <span className="h-2.5 w-2.5 rounded-full bg-blue-600 dark:bg-blue-400" />}
    </span>
  );
}

export type RadioItem<K extends string> = { key: K; title: string; line?: string; badge?: string };

/** Single select: a real radio group, one card per option. */
export function RadioCards<K extends string>({ label, items, value, onChange }: { label: string; items: RadioItem<K>[]; value: K | null; onChange: (key: K) => void }) {
  const name = useId();
  return (
    <fieldset className="space-y-2.5">
      <legend className="sr-only">{label}</legend>
      {items.map((item) => {
        const on = value === item.key;
        return (
          <label key={item.key} className={`${rowBase} cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-600/40 ${on ? rowOn : rowOff}`}>
            <input type="radio" name={name} value={item.key} checked={on} onChange={() => onChange(item.key)} className="sr-only" />
            <RadioDot on={on} />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-[15px] font-semibold text-ink dark:text-zinc-100">{item.title}</span>
                {item.badge && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{item.badge}</span>}
              </span>
              {item.line && <span className="mt-0.5 block text-sm text-muted">{item.line}</span>}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

/** "Something else?" free text, at most 140 characters. */
export function OtherInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="mt-5">
      <label htmlFor={id} className="text-sm font-semibold text-ink dark:text-zinc-100">
        Something else?
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={OTHER_TEXT_MAX}
        placeholder="Tell us in a few words"
        className="mt-2 min-h-12 w-full rounded-xl border border-zinc-200 bg-white px-4 text-base text-ink transition placeholder:text-zinc-400 focus:border-blue-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
      />
    </div>
  );
}
