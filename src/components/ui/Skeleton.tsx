// ── Base ──────────────────────────────────────────────────────────────────────

type SkeletonProps = { className?: string };

const Base = ({ className = '' }: SkeletonProps) => (
  <div className={['animate-pulse rounded-lg bg-app-sunken', className].join(' ')} aria-hidden="true" />
);

// ── SkeletonText ──────────────────────────────────────────────────────────────

type SkeletonTextProps = {
  lines?: number;
  className?: string;
};

export const SkeletonText = ({ lines = 3, className = '' }: SkeletonTextProps) => (
  <div className={['space-y-2', className].join(' ')} aria-busy="true" aria-label="Loading…">
    {Array.from({ length: lines }, (_, i) => (
      <Base key={i} className={['h-4', i === lines - 1 ? 'w-3/5' : 'w-full'].join(' ')} />
    ))}
  </div>
);

// ── SkeletonCard ──────────────────────────────────────────────────────────────

export const SkeletonCard = ({ className = '' }: SkeletonProps) => (
  <div
    className={['rounded-2xl border border-app-line bg-app-panel p-5 space-y-3', className].join(' ')}
    aria-busy="true"
    aria-label="Loading…"
  >
    <Base className="h-40 w-full rounded-xl" />
    <Base className="h-4 w-3/4" />
    <Base className="h-3 w-1/2" />
  </div>
);

// ── SkeletonGrid ──────────────────────────────────────────────────────────────

type SkeletonGridProps = {
  count?: number;
  cols?: 2 | 3 | 4;
  className?: string;
};

const GRID_COLS: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
};

export const SkeletonGrid = ({ count = 6, cols = 3, className = '' }: SkeletonGridProps) => (
  <div
    className={['grid gap-4', GRID_COLS[cols], className].join(' ')}
    aria-busy="true"
    aria-label="Loading…"
  >
    {Array.from({ length: count }, (_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);
