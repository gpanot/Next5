'use client';

import type { VideoVersion } from './videoVersions';

type Props = { versions: VideoVersion[]; selectedId: string; onSelect: (id: string) => void; isWorking: (version: VideoVersion) => boolean };

/** "V1 - 5s", "V2 - 10s"…: one tab per generated version, so earlier ones stay one tap away. */
export function VersionTabs({ versions, selectedId, onSelect, isWorking }: Props) {
  return (
    <div role="tablist" aria-label="Video versions" className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {versions.map((v) => {
        const active = v.id === selectedId;
        return (
          <button
            key={v.id}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(v.id)}
            className={[
              'flex min-h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-xs font-semibold transition',
              active
                ? 'border-ink bg-ink text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                : 'border-line bg-white text-muted hover:text-ink dark:border-zinc-700 dark:bg-zinc-900 dark:hover:text-zinc-100',
            ].join(' ')}
          >
            {isWorking(v) && <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-label="In progress" />}
            V{v.number} - {v.duration}s
            {v.videos.length > 1 && <span className="font-normal opacity-70">· {v.videos.length}</span>}
          </button>
        );
      })}
    </div>
  );
}
