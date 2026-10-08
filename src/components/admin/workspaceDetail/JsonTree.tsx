'use client';

type Envelope = { value: unknown; source?: string; confidence?: number; evidence?: unknown; locked?: boolean };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** A studio profile leaf: `{ value, source, confidence, evidence?, locked }`. */
const isEnvelope = (v: unknown): v is Envelope => isObject(v) && 'value' in v && ('source' in v || 'confidence' in v);

/** "audienceDescription" → "Audience description". */
const labelOf = (key: string) => {
  const words = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v);
const isUrl = (v: unknown): v is string => typeof v === 'string' && /^https?:\/\//.test(v);

function Scalar({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') return <span className="text-muted">—</span>;
  if (isHex(value)) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="h-4 w-4 rounded border border-line dark:border-zinc-700" style={{ background: value }} />
        <span className="font-mono text-xs">{value}</span>
      </span>
    );
  }
  if (isUrl(value)) return <a href={value} target="_blank" rel="noopener noreferrer" className="break-all text-blue-600 hover:underline dark:text-blue-400">{value}</a>;
  return <span className="break-words whitespace-pre-wrap">{String(value)}</span>;
}

function Value({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted">—</span>;
    if (value.every((v) => !isObject(v) && !Array.isArray(v))) {
      return (
        <span className="flex flex-wrap gap-1">
          {value.map((v, i) => (
            <span key={i} className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs dark:bg-zinc-800"><Scalar value={v} /></span>
          ))}
        </span>
      );
    }
    return (
      <ol className="space-y-2">
        {value.map((v, i) => (
          <li key={i} className="rounded-lg border border-line p-2 dark:border-zinc-800"><JsonTree data={v} /></li>
        ))}
      </ol>
    );
  }
  if (isObject(value)) return <JsonTree data={value} />;
  return <Scalar value={value} />;
}

function EnvelopeMeta({ env }: { env: Envelope }) {
  const evidence = Array.isArray(env.evidence) ? env.evidence : [];
  return (
    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
      {env.source && <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">{env.source}</span>}
      {typeof env.confidence === 'number' && <span className="tabular-nums">{Math.round(env.confidence * 100)}%</span>}
      {env.locked && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-950 dark:text-amber-300">locked</span>}
      {evidence.length > 0 && (
        <details className="w-full">
          <summary className="cursor-pointer">{evidence.length} evidence</summary>
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {evidence.map((e, i) => <li key={i} className="break-words">{String(e)}</li>)}
          </ul>
        </details>
      )}
    </span>
  );
}

/** Any extracted JSON as labelled rows; studio field envelopes show their value with source, confidence and evidence. */
export function JsonTree({ data }: { data: unknown }) {
  if (!isObject(data)) return <Value value={data} />;
  const entries = Object.entries(data);
  if (entries.length === 0) return <span className="text-sm text-muted">Empty</span>;
  return (
    <dl className="divide-y divide-line text-sm dark:divide-zinc-800">
      {entries.map(([key, v]) => {
        const nested = isObject(v) && !isEnvelope(v);
        return (
          <div key={key} className={nested ? 'py-3' : 'grid gap-1 py-2 sm:grid-cols-[180px_1fr] sm:gap-4'}>
            <dt className={nested ? 'mb-2 text-xs font-bold uppercase tracking-wide text-muted' : 'text-xs font-semibold text-muted sm:pt-0.5'}>{labelOf(key)}</dt>
            <dd className={`min-w-0 text-ink dark:text-zinc-100 ${nested ? 'border-l-2 border-line pl-3 dark:border-zinc-800' : ''}`}>
              {isEnvelope(v) ? (
                <>
                  <Value value={v.value} />
                  <EnvelopeMeta env={v} />
                </>
              ) : (
                <Value value={v} />
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
