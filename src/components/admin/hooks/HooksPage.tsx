'use client';

import { useState } from 'react';
import { HooksTab } from '../business/HooksTab';
import { HookKnowledgeTab } from './HookKnowledgeTab';

type Tab = 'library' | 'knowledge';

const tabClass = (on: boolean) =>
  `min-h-10 rounded-lg px-4 text-sm font-semibold transition active:scale-95 ${on ? 'bg-white text-ink shadow-sm dark:bg-zinc-800 dark:text-zinc-100' : 'text-muted hover:text-ink dark:hover:text-zinc-100'}`;

/** Admin → Hooks: the viral hook library, and the Hook Knowledge the campaign editor's "Generate for me" learns from. */
export function HooksPage({ token }: { token: string }) {
  const [tab, setTab] = useState<Tab>('library');
  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Hooks" className="flex w-fit rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
        <button type="button" role="tab" aria-selected={tab === 'library'} onClick={() => setTab('library')} className={tabClass(tab === 'library')}>Hooks Library</button>
        <button type="button" role="tab" aria-selected={tab === 'knowledge'} onClick={() => setTab('knowledge')} className={tabClass(tab === 'knowledge')}>Hook Knowledge</button>
      </div>
      {tab === 'library' ? <HooksTab token={token} /> : <HookKnowledgeTab token={token} />}
    </div>
  );
}
