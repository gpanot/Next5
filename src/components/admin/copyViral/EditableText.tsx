'use client';

import { useState } from 'react';

/**
 * A textarea that saves on blur when the text changed. Follows a new saved value (a rewrite) unless it is being edited.
 */
export function EditableText({ value, onSave, placeholder, rows = 2 }: {
  value: string;
  onSave: (text: string) => Promise<unknown>;
  placeholder?: string;
  rows?: number;
}) {
  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(value);
  const [focused, setFocused] = useState(false);
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle');

  if (value !== seen) {
    setSeen(value);
    if (!focused) setDraft(value);
  }

  const blur = async () => {
    setFocused(false);
    if (draft === value) return;
    setState('saving');
    try {
      await onSave(draft);
      setState('idle');
    } catch {
      setState('error');
    }
  };

  return (
    <div className="relative">
      <textarea
        value={draft}
        rows={rows}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={blur}
        className={`w-full resize-y rounded-lg border bg-app-sunken px-2.5 py-1.5 text-sm text-app-ink outline-none transition focus:border-app-ink ${state === 'error' ? 'border-app-danger' : 'border-app-line'}`}
      />
      {state !== 'idle' && (
        <span className={`absolute right-2 bottom-2 text-[11px] ${state === 'error' ? 'text-app-danger' : 'text-app-muted'}`}>
          {state === 'saving' ? 'Saving…' : 'Not saved'}
        </span>
      )}
    </div>
  );
}
