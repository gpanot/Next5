import { Check, X } from 'lucide-react';
import type { ChatGptRow } from '../../../content/business/offer';

/** "Why not just use ChatGPT?" — the doubt every visitor has, answered row by row. Stacks into cards on phones. */
export const ChatGptCompare = ({ rows }: { rows: readonly ChatGptRow[] }) => (
  <div className="overflow-hidden rounded-2xl border border-app-line bg-app-panel">
    <div className="hidden grid-cols-[160px_1fr_1fr] border-b border-app-line text-[13px] font-semibold md:grid">
      <span className="p-4" />
      <span className="p-4 text-app-muted">Doing it yourself with ChatGPT</span>
      <span className="bg-app-accent-soft p-4 text-app-accent">Next5</span>
    </div>
    <ul>
      {rows.map((row) => (
        <li key={row.topic} className="grid gap-2 border-b border-app-line p-4 last:border-0 md:grid-cols-[160px_1fr_1fr] md:gap-0 md:p-0">
          <span className="label-caps text-[11px] font-medium text-app-muted md:p-4">{row.topic}</span>
          <span className="flex gap-2 text-[15px] text-app-muted md:p-4">
            <X aria-label="ChatGPT" className="mt-0.5 h-4 w-4 shrink-0 text-app-danger" />{row.chatgpt}
          </span>
          <span className="flex gap-2 rounded-lg bg-app-accent-soft/60 p-2 text-[15px] font-medium text-app-ink md:rounded-none md:p-4">
            <Check aria-label="Next5" className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" />{row.next5}
          </span>
        </li>
      ))}
    </ul>
  </div>
);
