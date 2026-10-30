'use client';

import { useState } from 'react';

const MAX_REQUEST = 500;

type Props = {
  label: string;
  placeholder: string;
  /** Short ideas the owner can tap to send at once. */
  ideas: string[];
  disabled: boolean;
  busy: boolean;
  /** Resolves true when the change worked: the box then empties and the request joins the list above it. */
  onSend: (request: string) => Promise<boolean>;
};

/** The wizard's chat box: what the owner asked so far, a few one-tap ideas, and a text box with Send. */
export function ChatBox({ label, placeholder, ideas, disabled, busy, onSend }: Props) {
  const [text, setText] = useState('');
  const [sent, setSent] = useState<string[]>([]);

  const send = async (request: string) => {
    const clean = request.trim();
    if (!clean || disabled) return;
    if (await onSend(clean)) {
      setSent((list) => [...list, clean]);
      setText('');
    }
  };

  return (
    <div className="space-y-2 rounded-xl border border-app-line bg-app-sunken/50 p-3">
      <p className="text-sm font-semibold text-app-ink">{label}</p>
      {sent.length > 0 && (
        <ul className="flex flex-col items-end gap-1.5" aria-label="Your changes">
          {sent.map((s, i) => (
            <li key={i} className="max-w-[85%] rounded-xl rounded-br-sm bg-app-cta px-3 py-1.5 text-sm text-app-cta-ink">{s}</li>
          ))}
        </ul>
      )}
      {sent.length === 0 && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {ideas.map((idea) => (
            <button key={idea} type="button" disabled={disabled} onClick={() => void send(idea)}
              className="min-h-9 shrink-0 rounded-full border border-app-line bg-app-panel px-3 text-xs font-medium text-app-ink transition hover:bg-app-sunken active:scale-95 disabled:opacity-40">
              {idea}
            </button>
          ))}
        </div>
      )}
      <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); void send(text); }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_REQUEST))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send(text);
            }
          }}
          rows={2}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={label}
          className="min-h-11 flex-1 resize-none rounded-xl border border-app-line bg-app-panel px-3 py-2 text-base text-app-ink placeholder:text-app-muted focus:border-app-cta focus:outline-none disabled:opacity-50 sm:text-sm"
        />
        <button type="submit" disabled={disabled || !text.trim()}
          className="min-h-11 shrink-0 rounded-full bg-app-cta px-4 text-sm font-semibold text-app-cta-ink shadow-sm transition active:scale-95 disabled:opacity-40">
          {busy ? 'Working…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
