'use client';

import { Camera, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { STUDIO_LABEL, studioHref } from '../../../lib/studioPaths';
import type { ProductLineDto } from '../../../types/business/me';
import { useWorkspace } from './WorkspaceProvider';

const STUDIOS: { id: ProductLineDto; icon: typeof Camera; hint: string }[] = [
  { id: 'brand', icon: Camera, hint: 'Of you' },
  { id: 'shop', icon: ShoppingBag, hint: 'TikTok' },
];

/** Two studios, one account. Shows both; the one you don't have yet links to its setup. */
export const StudioSwitcher = ({ compact = false }: { compact?: boolean }) => {
  const { me, product } = useWorkspace();
  const owned = new Set(me?.workspaces.map((w) => w.product) ?? []);
  return (
    <div role="tablist" aria-label="Studio" className={`grid grid-cols-2 gap-1 rounded-xl bg-app-sunken p-1 ${compact ? 'w-full' : ''}`}>
      {STUDIOS.map(({ id, icon: Icon, hint }) => {
        const active = product === id;
        const href = owned.has(id) ? studioHref(id) : `/start/${id}`;
        return (
          <Link
            key={id}
            href={href}
            role="tab"
            aria-selected={active}
            className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors duration-200 ${active ? 'bg-app-panel text-app-ink shadow-sm' : 'text-app-muted hover:text-app-ink'}`}
          >
            <Icon aria-hidden className={`h-4 w-4 shrink-0 ${active ? 'text-app-accent' : ''}`} />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[13px] font-medium">{STUDIO_LABEL[id].replace(' Studio', '')}</span>
              <span className="block truncate text-[11px] text-app-muted">{owned.has(id) ? hint : 'Add'}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
};
