'use client';

import { useState } from 'react';
import type { DraftChatEntry } from '../../../types/admin/scriptDrafts';
import { eyebrowClass as label, primaryBtn } from './ui';

type Props = {
  /** "script" or "carousel": what the chat edits. */
  what: 'script' | 'carousel';
  chat: DraftChatEntry[];
  busy: boolean;
  error: string;
  onRefine: (instruction: string) => void;
};

const EXAMPLES = {
  script: '“Make the hook stronger.” “Cut 10 seconds.” “Less corporate.”',
  carousel: '“Make slide 1 punchier.” “Shorter text on every slide.” “Make it 7 items.”',
};

/** The refine chat under a script or a carousel. Off-topic requests are declined by the model. */
export function RefineBox({ what, chat, busy, error, onRefine }: Props) {
  const [text, setText] = useState('');
  const send = () => {
    const v = text.trim();
    if (!v || busy) return;
    onRefine(v);
    setText('');
  };
  return (
    <div className="space-y-3">
      <p className={label}>Refine the {what}</p>
      <p className="text-xs text-app-muted">{EXAMPLES[what]} Only edits to this {what} are accepted.</p>
      {chat.map((m, i) => (
        <div key={i} className="space-y-1 text-sm">
          <p className="text-app-ink"><span className={`${label} mr-2`}>You</span>{m.you}</p>
          <p className="text-app-ink"><span className={`${label} mr-2 ${m.refused ? 'text-app-warning' : 'text-app-success'}`}>{m.refused ? 'Declined' : 'Updated'}</span>{m.reply}</p>
        </div>
      ))}
      {error && <p role="alert" className="text-sm text-app-danger">{error}</p>}
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} disabled={busy} placeholder={what === 'script' ? 'e.g. make the hook punchier' : 'e.g. make slide 1 about the viewer'} className="min-h-12 flex-1 rounded-xl bg-app-panel px-4 text-base text-app-ink shadow-sm outline-none ring-1 ring-transparent focus:ring-amber-400" />
        <button type="button" onClick={send} disabled={busy || !text.trim()} className={primaryBtn}>{busy ? '…' : 'Send'}</button>
      </div>
    </div>
  );
}
