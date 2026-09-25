'use client';

import { Check, ClipboardPaste, Link2, Loader2, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { parseZillowUrl } from '../../../lib/listingPhotos';
import type { ListingFacts, ReAngle } from '../../../server/labs/slideshowCopy';
import type { ZillowCandidate } from '../../../server/listings/zillowNormalize';
import { useLabClient } from '../LabClientProvider';

const PHOTO_LIMITS = [10, 20, 30, 0] as const; // 0 = all
const labelFor = (n: number) => (n === 0 ? 'All photos' : `${n} photos`);

export type ZillowData = {
  listingRunId: string;
  facts: ListingFacts;
  angles: ReAngle[];
  allCandidates: ZillowCandidate[];
  selectedCandidates: ZillowCandidate[];
  photoTags: string[];
};

type Props = {
  onDone: (data: ZillowData) => void;
};

type ScrapeResult = {
  runId: string;
  candidates: ZillowCandidate[];
  facts: ListingFacts;
  angles: ReAngle[];
  cached: boolean;
  selectedIds: string[];
  photoTags: string[];
};

/** Lightweight shape used for the "recent listings" sidebar. */
type RecentRun = {
  id: string;
  address: string | null;
  facts: ListingFacts;
  candidates: ZillowCandidate[];
  angles: ReAngle[];
  selectedIds: string[];
  photoTags: string[];
  scrapeDurationMs: number | null;
  avgPhotoFetchMs: number | null;
  apifyCostUsdMicros: number | null;
  createdAt: string;
};

const PhotoTile = ({ photo, picked, onToggle }: { photo: ZillowCandidate; picked: boolean; onToggle: () => void }) => (
  <li>
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={picked}
      aria-label="Listing photo"
      className={`relative block aspect-[4/3] w-full overflow-hidden rounded-xl bg-surface-alt ring-offset-2 ring-offset-white transition duration-200 ${picked ? 'ring-2 ring-ink' : ''}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.thumbUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
      <span className={`absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border transition-colors duration-200 ${picked ? 'border-ink bg-ink text-white' : 'border-white/80 bg-black/30 text-transparent'}`}>
        <Check aria-hidden className="h-3.5 w-3.5" />
      </span>
    </button>
  </li>
);

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const fmtCost = (micros: number | null) =>
  micros !== null ? `$${(micros / 1_000_000).toFixed(4)}` : null;

const fmtMs = (ms: number | null) => (ms !== null ? `${ms.toLocaleString()} ms` : null);

export function ZillowScrapeStep({ onDone }: Props) {
  const client = useLabClient();
  const [url, setUrl] = useState('');
  const [touched, setTouched] = useState(false);
  const [maxPhotos, setMaxPhotos] = useState<number>(20);
  const [busy, setBusy] = useState(false);
  const [tagging, setTagging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [picked, setPicked] = useState<string[]>([]);

  // Recent past runs
  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);

  const valid = parseZillowUrl(url) !== null;
  const urlHint = touched && url.trim() && !valid ? 'Open the home on Zillow, then copy that link.' : null;

  // Load recent runs on mount
  useEffect(() => {
    fetch(client.url('/blitz/listing-runs'), { headers: client.authHeaders() })
      .then((r) => r.json() as Promise<{ runs: RecentRun[] }>)
      .then((d) => setRecentRuns(d.runs ?? []))
      .catch(() => { /* non-critical */ })
      .finally(() => setRunsLoading(false));
  }, [client]);

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text.trim());
      setTouched(true);
    } catch {
      document.getElementById('zillow-url')?.focus();
    }
  };

  const scrape = async () => {
    if (!valid) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setPicked([]);
    try {
      const res = await fetch(client.url('/blitz/zillow-scrape'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...client.authHeaders() },
        body: JSON.stringify({ url, maxPhotos: maxPhotos === 0 ? undefined : maxPhotos }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? `Error ${res.status}`);
      }
      const data = (await res.json()) as ScrapeResult;
      setResult(data);
      // Restore previous selection if cached, otherwise pre-select all
      setPicked(data.selectedIds.length > 0
        ? data.selectedIds.filter((id) => data.candidates.some((c) => c.id === id))
        : data.candidates.map((c) => c.id),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scrape failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  /** Restore a past run without re-scraping */
  const loadRun = (run: RecentRun) => {
    const fakeResult: ScrapeResult = {
      runId: run.id,
      candidates: run.candidates,
      facts: run.facts,
      angles: run.angles,
      cached: true,
      selectedIds: run.selectedIds,
      photoTags: run.photoTags,
    };
    setResult(fakeResult);
    setPicked(
      run.selectedIds.length > 0
        ? run.selectedIds.filter((id) => run.candidates.some((c) => c.id === id))
        : run.candidates.map((c) => c.id),
    );
    setError(null);
  };

  const toggle = (id: string) =>
    setPicked((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  const useSelected = async () => {
    if (!result || picked.length === 0) return;
    const selectedCandidates = result.candidates.filter((c) => picked.includes(c.id));
    setTagging(true);
    setError(null);
    try {
      const res = await fetch(client.url('/blitz/photo-tags'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...client.authHeaders() },
        body: JSON.stringify({ photoUrls: selectedCandidates.map((c) => c.thumbUrl) }),
      });
      const data = (await res.json()) as { photoTags?: string[] };
      const photoTags = data.photoTags ?? selectedCandidates.map((_, i) => (i === 0 ? 'exterior' : 'other'));

      // Persist selection + tags to the run (fire-and-forget)
      void fetch(client.url(`/blitz/listing-runs/${result.runId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...client.authHeaders() },
        body: JSON.stringify({ selectedIds: picked, photoTags }),
      }).catch(() => { /* non-critical */ });

      onDone({
        listingRunId: result.runId,
        facts: result.facts,
        angles: result.angles,
        allCandidates: result.candidates,
        selectedCandidates,
        photoTags,
      });
    } catch {
      setError('Could not tag photos. Proceeding anyway.');
      const photoTags = selectedCandidates.map((_, i) => (i === 0 ? 'exterior' : 'other'));
      onDone({
        listingRunId: result.runId,
        facts: result.facts,
        angles: result.angles,
        allCandidates: result.candidates,
        selectedCandidates,
        photoTags,
      });
    } finally {
      setTagging(false);
    }
  };

  const factsLine = result
    ? [
        result.facts.priceUsd ? `$${Math.round(result.facts.priceUsd).toLocaleString('en-US')}` : null,
        result.facts.beds !== null ? `${result.facts.beds} bd` : null,
        result.facts.baths !== null ? `${result.facts.baths} ba` : null,
        result.facts.sqft ? `${result.facts.sqft.toLocaleString('en-US')} sqft` : null,
      ].filter(Boolean).join(' · ')
    : null;

  return (
    <div className="flex flex-col gap-5">
      {/* ── Scrape form ─────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-5 rounded-2xl border border-line bg-white p-5">
        <div>
          <h2 className="text-[16px] font-semibold text-ink">Real Estate — Zillow Import</h2>
          <p className="mt-0.5 text-[13px] text-muted">Paste a Zillow listing link to scrape photos and listing facts.</p>
        </div>

        <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); setTouched(true); void scrape(); }}>
          <div className="flex gap-2">
            <input
              id="zillow-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="zillow.com/homedetails/…"
              inputMode="url"
              autoComplete="off"
              aria-invalid={Boolean(urlHint) || undefined}
              className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-white px-3 text-[14px] text-ink placeholder:text-muted transition-colors focus:border-ink focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void paste()}
              className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-line bg-surface-alt px-3 text-[13px] font-medium text-ink hover:border-ink transition-colors"
            >
              <ClipboardPaste aria-hidden className="h-4 w-4" /> Paste
            </button>
          </div>
          {(urlHint ?? error) && <p className="text-[13px] text-red-600" role="alert">{urlHint ?? error}</p>}

          {/* Photo limit */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] text-muted">Show:</span>
            {PHOTO_LIMITS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setMaxPhotos(n)}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${maxPhotos === n ? 'bg-ink text-white' : 'bg-surface-alt text-muted hover:text-ink'}`}
              >
                {labelFor(n)}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={!valid || busy}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy ? <><Loader2 aria-hidden className="h-4 w-4 animate-spin" /> Scraping…</> : <><Link2 aria-hidden className="h-4 w-4" /> Scrape listing</>}
          </button>
        </form>

        {/* Results grid */}
        {result && (
          <div className="flex flex-col gap-3">
            {(result.cached || factsLine) && (
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-medium text-ink">
                  {result.facts.address ?? 'Listing'}
                  {factsLine ? ` — ${factsLine}` : ''}
                </p>
                {result.cached && (
                  <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 border border-amber-200">
                    cached
                  </span>
                )}
              </div>
            )}
            <p className="text-[12px] text-muted">{picked.length} of {result.candidates.length} photos selected</p>
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {result.candidates.map((c) => (
                <PhotoTile key={c.id} photo={c} picked={picked.includes(c.id)} onToggle={() => toggle(c.id)} />
              ))}
            </ul>
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPicked(result.candidates.map((c) => c.id))}
                className="text-[12px] text-muted hover:text-ink"
              >
                Select all
              </button>
              <button
                type="button"
                disabled={picked.length === 0 || tagging}
                onClick={() => void useSelected()}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {tagging ? <><Loader2 aria-hidden className="h-4 w-4 animate-spin" /> Tagging…</> : `Use ${picked.length} photo${picked.length === 1 ? '' : 's'} →`}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Recent listings ─────────────────────────────────────────────────── */}
      {(runsLoading || recentRuns.length > 0) && (
        <section className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-5">
          <h3 className="text-[14px] font-semibold text-ink">Recent listings</h3>

          {runsLoading ? (
            <div className="flex items-center gap-2 text-[13px] text-muted">
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {recentRuns.map((run) => {
                const price = (run.facts as ListingFacts).priceUsd
                  ? `$${Math.round((run.facts as ListingFacts).priceUsd!).toLocaleString('en-US')}`
                  : null;
                return (
                  <li key={run.id}>
                    <button
                      type="button"
                      onClick={() => loadRun(run)}
                      className="w-full flex items-start gap-3 rounded-xl border border-line bg-surface-alt p-3 text-left hover:border-ink transition-colors group"
                    >
                      <RotateCcw aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted group-hover:text-ink" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-ink truncate">
                          {run.address ?? 'Listing'}
                          {price ? <span className="ml-2 font-normal text-muted">{price}</span> : null}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {fmtDate(run.createdAt)}
                          {run.scrapeDurationMs !== null && <> · scrape {fmtMs(run.scrapeDurationMs)}</>}
                          {run.avgPhotoFetchMs !== null && <> · avg fetch {fmtMs(run.avgPhotoFetchMs)}/photo</>}
                          {run.apifyCostUsdMicros !== null && <> · Apify {fmtCost(run.apifyCostUsdMicros)}</>}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted">
                        {run.candidates.length} photos
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
