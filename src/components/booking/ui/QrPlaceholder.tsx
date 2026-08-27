const SIZE = 25;
const FINDER = 7;

const seededRandom = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
};

const isFinderZone = (x: number, y: number): boolean =>
  (x < FINDER + 1 && y < FINDER + 1) ||
  (x > SIZE - FINDER - 2 && y < FINDER + 1) ||
  (x < FINDER + 1 && y > SIZE - FINDER - 2);

const buildModules = (value: string): boolean[][] => {
  let seed = 0;
  for (let index = 0; index < value.length; index += 1) {
    seed = (seed * 31 + value.charCodeAt(index)) | 0;
  }
  const random = seededRandom(seed);

  return Array.from({ length: SIZE }, (_, y) =>
    Array.from({ length: SIZE }, (_, x) => {
      if (isFinderZone(x, y)) return false;
      if (x === 6 || y === 6) return (x + y) % 2 === 0;
      return random() > 0.47;
    }),
  );
};

type QrPlaceholderProps = {
  value: string;
  className?: string;
};

export const QrPlaceholder = ({ value, className = '' }: QrPlaceholderProps) => {
  const modules = buildModules(value);
  const finders = [
    [0, 0],
    [SIZE - FINDER, 0],
    [0, SIZE - FINDER],
  ];

  return (
    <svg
      viewBox={`-1 -1 ${SIZE + 2} ${SIZE + 2}`}
      role="img"
      aria-label={`Payment QR code for reference ${value}`}
      className={`text-ink ${className}`}
    >
      <rect x="-1" y="-1" width={SIZE + 2} height={SIZE + 2} fill="#ffffff" />

      {modules.map((row, y) =>
        row.map((filled, x) =>
          filled ? (
            <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />
          ) : null,
        ),
      )}

      {finders.map(([x, y]) => (
        <g key={`${x}-${y}`} fill="none" stroke="currentColor">
          <rect x={x! + 0.5} y={y! + 0.5} width={FINDER - 1} height={FINDER - 1} strokeWidth="1" />
          <rect x={x! + 2} y={y! + 2} width={FINDER - 4} height={FINDER - 4} fill="currentColor" />
        </g>
      ))}
    </svg>
  );
};
