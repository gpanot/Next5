type ImageGridProps = {
  children: React.ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
};

const COLS: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
};

/** Responsive image grid — uses uniform aspect-ratio tiles (no masonry). */
export const ImageGrid = ({ children, cols = 3, className = '' }: ImageGridProps) => (
  <div className={['grid gap-3', COLS[cols], className].join(' ')}>
    {children}
  </div>
);
