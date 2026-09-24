'use client';

/**
 * Assets Library — admin-only view of all raw creative assets.
 *
 * Sections
 *   Memes        BlitzAsset type=OVERLAY       (video meme clips)
 *   Videos       BlitzAsset type=BACKGROUND    (scraped videos, not AI images)
 *   Sounds       BlitzAsset type=AUDIO
 *   AI Pictures  BlitzAsset type=BACKGROUND    (AI-generated still images)
 *   UGC Videos   UgcVideo rows (status=ready, Next5-owned)
 *
 * Card components are intentionally the same as those used in the Blitz Lab
 * AssetLibraryModal — just without the select/rename/delete interactions.
 *
 * "See Description" button on Memes, Videos and Sounds fetches and expands
 * the AssetDescriptor (Gemini extraction) inline below the card.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Film, ImageIcon, Layers, Loader2, Music, Pause, Play, Search, Video } from 'lucide-react';
import type { BlitzAssetDto } from '../../labs/blitzLab/api';
import type { UgcVideoDto } from '../../../types/admin/ugc';

// ── Types ─────────────────────────────────────────────────────────────────────

type Section = 'memes' | 'videos' | 'sounds' | 'aiPictures' | 'ugcVideos';

type LibraryData = {
  memes: BlitzAssetDto[];
  videos: BlitzAssetDto[];
  sounds: BlitzAssetDto[];
  aiPictures: BlitzAssetDto[];
  ugcVideos: UgcVideoDto[];
  counts: Record<Section, number>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Descriptor = Record<string, any>;

// ── API fetch ─────────────────────────────────────────────────────────────────

async function fetchLibrary(token: string): Promise<LibraryData> {
  const res = await fetch('/api/admin/assets-library', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<LibraryData>;
}

async function fetchDescriptor(token: string, blitzAssetId: string): Promise<Descriptor | null> {
  const res = await fetch(`/api/admin/assets-library/descriptor?blitzAssetId=${encodeURIComponent(blitzAssetId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { descriptor: Descriptor | null };
  return data.descriptor;
}

// ── Stat badge ────────────────────────────────────────────────────────────────

function CountBadge({ n }: { n: number }) {
  return (
    <span className="ml-1.5 rounded-full bg-ink/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted">
      {n.toLocaleString()}
    </span>
  );
}

// ── Section nav item ──────────────────────────────────────────────────────────

const SECTIONS: { id: Section; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'memes',      label: 'Memes',       Icon: Layers   },
  { id: 'videos',     label: 'Videos',      Icon: Video    },
  { id: 'sounds',     label: 'Sounds',      Icon: Music    },
  { id: 'aiPictures', label: 'AI Pictures', Icon: ImageIcon },
  { id: 'ugcVideos',  label: 'UGC Videos',  Icon: Film     },
];

// ── Description panel ─────────────────────────────────────────────────────────

/**
 * Lazy-loads and renders the AssetDescriptor for a BlitzAsset.
 * Opened by the "See Description" button below the card.
 */
function DescriptionPanel({ token, assetId }: { token: string; assetId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'none' | 'error'>('idle');
  const [desc, setDesc] = useState<Descriptor | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (state === 'loading') return;
    setState('loading');
    try {
      const d = await fetchDescriptor(token, assetId);
      setDesc(d);
      setState(d ? 'done' : 'none');
      setOpen(true);
    } catch {
      setState('error');
    }
  };

  const toggle = () => {
    if (state === 'idle') { void load(); return; }
    if (state === 'done' || state === 'none') setOpen((p) => !p);
  };

  const hasData = state === 'done' && desc;

  return (
    <div className="border-t border-line/60">
      {/* Toggle button */}
      <button
        type="button"
        onClick={toggle}
        disabled={state === 'loading' || state === 'error'}
        className="flex w-full items-center justify-between gap-1 px-2 py-1.5 text-[11px] font-medium text-muted transition-colors hover:bg-surface-alt hover:text-ink disabled:opacity-50"
      >
        <span className="flex items-center gap-1">
          {state === 'loading' && <Loader2 className="h-3 w-3 animate-spin" />}
          {state === 'error'   && <span className="text-red-500">Error</span>}
          {state === 'none'    && <span className="italic text-subtle">No descriptor yet</span>}
          {(state === 'idle' || state === 'done') && 'See Description'}
        </span>
        {(state === 'done' || state === 'none') && (
          open ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />
        )}
      </button>

      {/* Expanded content */}
      {open && hasData && (
        <div className="space-y-1.5 bg-surface-alt/60 px-2 pb-2.5 pt-1 text-[11px] leading-relaxed">
          {/* Video/Meme fields */}
          {desc.descriptor?.subject && <Row label="Subject" value={desc.descriptor.subject} />}
          {desc.descriptor?.action  && <Row label="Action"  value={desc.descriptor.action} />}
          {desc.descriptor?.emotion?.face  && <Row label="Face"    value={desc.descriptor.emotion.face} />}
          {desc.descriptor?.emotion?.voice && <Row label="Voice"   value={desc.descriptor.emotion.voice} />}
          {desc.descriptor?.meaning && <Row label="Meaning" value={desc.descriptor.meaning} />}
          {desc.descriptor?.bestUse && <Row label="Best use" value={desc.descriptor.bestUse} />}
          {desc.descriptor?.setting && <Row label="Setting"  value={desc.descriptor.setting} />}
          {desc.descriptor?.vibe?.length > 0 && <Row label="Vibe" value={(desc.descriptor.vibe as string[]).join(', ')} />}
          {desc.descriptor?.pacing  && <Row label="Pacing" value={`${desc.descriptor.pacing}  ·  energy ${desc.descriptor.energyLevel?.toFixed(2) ?? '—'}`} />}
          {desc.descriptor?.textSafeZone && <Row label="Text safe zone" value={desc.descriptor.textSafeZone} />}
          {desc.descriptor?.hasSpeech !== undefined && (
            <Row label="Has speech" value={String(desc.descriptor.hasSpeech)} />
          )}
          {desc.descriptor?.transcript && <Row label="Transcript" value={`"${desc.descriptor.transcript}"`} />}

          {/* Slot scores */}
          {desc.descriptor?.slotScores && (
            <Row label="Slots"
              value={Object.entries(desc.descriptor.slotScores as Record<string, number>)
                .map(([k, v]) => `${k} ${v.toFixed(2)}`).join('  ·  ')}
            />
          )}

          {/* Niche scores */}
          {desc.descriptor?.nicheScores && (
            <Row label="Niches"
              value={Object.entries(desc.descriptor.nicheScores as Record<string, number>)
                .map(([k, v]) => `${k} ${v.toFixed(2)}`).join('  ·  ')}
            />
          )}

          {/* Avoid */}
          {desc.descriptor?.avoidFor?.length > 0 && (
            <Row label="Avoid for" value={(desc.descriptor.avoidFor as string[]).join(', ')} />
          )}

          {/* Best trim */}
          {desc.descriptor?.bestTrim && (
            <Row label="Best trim" value={`${desc.descriptor.bestTrim.start}s → ${desc.descriptor.bestTrim.end}s`} />
          )}

          {/* Music fields */}
          {desc.descriptor?.sound     && <Row label="Sound"    value={desc.descriptor.sound} />}
          {desc.descriptor?.emotion && typeof desc.descriptor.emotion === 'string' && (
            <Row label="Emotion" value={desc.descriptor.emotion} />
          )}
          {desc.descriptor?.imagery   && <Row label="Imagery"  value={desc.descriptor.imagery} />}
          {desc.descriptor?.sections?.length > 0 && (
            <Row label="Sections"
              value={(desc.descriptor.sections as Array<{ label: string; start: number; end: number; energy: string }>)
                .map(s => `${s.label} [${s.start}–${s.end}s, ${s.energy}]`).join('  ·  ')}
            />
          )}
          {desc.descriptor?.dropAt !== undefined && desc.descriptor.dropAt !== null && (
            <Row label="Drop at" value={`${desc.descriptor.dropAt}s`} />
          )}
          {desc.descriptor?.bpmEstimate && <Row label="BPM" value={String(desc.descriptor.bpmEstimate)} />}
          {desc.descriptor?.bestStart !== undefined && <Row label="Best start" value={`${desc.descriptor.bestStart}s`} />}

          {/* Rights */}
          <Row
            label="Rights risk"
            value={`${desc.effectiveRightsRisk ?? desc.rightsRisk ?? '—'}${desc.rightsRiskOverride ? ` (override: ${desc.rightsRiskOverride})` : ''}`}
            highlight={desc.effectiveRightsRisk === 'high' ? 'red' : desc.effectiveRightsRisk === 'low' ? 'green' : undefined}
          />
          {desc.descriptor?.identifiablePerson !== undefined && (
            <Row label="Identifiable person" value={String(desc.descriptor.identifiablePerson)} />
          )}

          {/* Loudness */}
          {desc.loudnessCurve && <Row label="Loudness" value={desc.loudnessCurve} />}

          {/* Retrieval */}
          {desc.retrievalText && (
            <div className="mt-1.5 border-t border-line/40 pt-1.5">
              <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-wide text-subtle">Retrieval text</p>
              <p className="text-[10px] text-muted italic">"{desc.retrievalText}"</p>
            </div>
          )}

          {/* Model + version */}
          <div className="mt-1 text-[9px] text-subtle">
            {desc.model} · v{desc.descriptorVersion} · {desc.status}
          </div>
        </div>
      )}

      {open && state === 'none' && (
        <p className="px-2 pb-2 text-[10px] text-subtle italic">
          No AI description yet — run the descriptor pipeline on this asset.
        </p>
      )}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: 'red' | 'green' }) {
  return (
    <div className="flex gap-1.5">
      <span className="w-24 shrink-0 text-[9px] font-semibold uppercase tracking-wide text-subtle">{label}</span>
      <span className={[
        'flex-1 text-[10.5px]',
        highlight === 'red'   ? 'font-semibold text-red-600' :
        highlight === 'green' ? 'font-semibold text-green-700' :
        'text-ink',
      ].join(' ')}>
        {value}
      </span>
    </div>
  );
}

// ── Asset preview cards (reusing BlitzLab's visual style) ────────────────────

/** Video asset card (Memes + Videos) — plays on hover + "See Description" expand. */
function VideoCard({ asset, token }: { asset: BlitzAssetDto; token: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <div
        className="relative aspect-[9/16] w-full overflow-hidden bg-neutral-900"
        onMouseEnter={() => ref.current?.play().catch(() => undefined)}
        onMouseLeave={() => { if (ref.current) { ref.current.pause(); ref.current.currentTime = 0; } }}
      >
        <video
          ref={ref}
          src={asset.url}
          poster={asset.thumbnailUrl ?? undefined}
          muted
          loop
          playsInline
          preload="none"
          className="h-full w-full object-contain"
        />
      </div>
      <div className="min-h-8 px-2 py-1.5">
        <p className="truncate text-[11px] text-ink" title={asset.name}>{asset.name}</p>
      </div>
      <DescriptionPanel token={token} assetId={asset.id} />
    </div>
  );
}

/** Expandable prompt panel for AI-generated images (no AssetDescriptor — name IS the prompt). */
function ImagePromptPanel({ asset }: { asset: BlitzAssetDto }) {
  const [open, setOpen] = useState(false);
  const isAi = asset.name.includes('[AI]') || asset.source === 'library';
  const prompt = asset.name;

  return (
    <div className="border-t border-line/60">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="flex w-full items-center justify-between gap-1 px-2 py-1.5 text-[11px] font-medium text-muted transition-colors hover:bg-surface-alt hover:text-ink"
      >
        <span>See Description</span>
        {open ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />}
      </button>
      {open && (
        <div className="bg-surface-alt/60 px-2 pb-2.5 pt-1">
          {isAi && (
            <p className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-subtle">Generation prompt</p>
          )}
          <p className="text-[10.5px] text-ink leading-relaxed">{prompt}</p>
        </div>
      )}
    </div>
  );
}

/** Image asset card — with prompt description panel. */
function ImageCard({ asset }: { asset: BlitzAssetDto }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <div className="relative aspect-[9/16] w-full overflow-hidden bg-neutral-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset.thumbnailUrl ?? asset.url}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <div className="min-h-8 px-2 py-1.5">
        <p className="truncate text-[11px] text-ink" title={asset.name}>{asset.name}</p>
      </div>
      <ImagePromptPanel asset={asset} />
    </div>
  );
}

/** Audio track card — play/pause on click + "See Description" expand. */
function AudioCard({ asset, token }: { asset: BlitzAssetDto; token: string }) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      void el.play().then(() => setPlaying(true));
    } else {
      el.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <button
        type="button"
        onClick={toggle}
        className="flex flex-col items-center justify-center gap-2.5 p-3 transition-colors hover:bg-orange-50"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-orange-600">
          {playing
            ? <Pause className="h-5 w-5" />
            : <Play className="h-5 w-5 translate-x-0.5" />
          }
        </div>
        <p className="w-full truncate text-center text-[11px] font-medium text-ink" title={asset.name}>
          {asset.name}
        </p>
        <audio ref={ref} src={asset.url} preload="none" loop onEnded={() => setPlaying(false)} />
      </button>
      <DescriptionPanel token={token} assetId={asset.id} />
    </div>
  );
}

/** UGC video card — plays on hover. No description panel (separate pipeline). */
function UgcCard({ video }: { video: UgcVideoDto }) {
  const ref = useRef<HTMLVideoElement>(null);
  const src = video.captionedUrl ?? video.videoUrl ?? undefined;
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm">
      <div
        className="relative aspect-[9/16] w-full overflow-hidden bg-neutral-900"
        onMouseEnter={() => ref.current?.play().catch(() => undefined)}
        onMouseLeave={() => { if (ref.current) { ref.current.pause(); ref.current.currentTime = 0; } }}
      >
        {src ? (
          <video
            ref={ref}
            src={src}
            muted
            loop
            playsInline
            preload="none"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] text-muted">No preview</div>
        )}
        <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white">
          {video.mode}
        </span>
      </div>
      <div className="min-h-10 px-2 py-1.5">
        <p className="line-clamp-2 text-[11px] text-ink">{video.script || '(no script)'}</p>
      </div>
    </div>
  );
}

// ── Search bar ────────────────────────────────────────────────────────────────

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? 'Search…'}
        className="h-9 w-full max-w-xs rounded-lg border border-line bg-white pl-8 pr-3 text-[13px] text-ink placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-orange-400/40"
      />
    </div>
  );
}

// ── Section content ───────────────────────────────────────────────────────────

const GRID_VIDEO = 'grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2';
const GRID_AUDIO = 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3';

function SectionContent({ section, data, token }: { section: Section; data: LibraryData; token: string }) {
  const [q, setQ] = useState('');
  const qLow = q.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (section === 'memes')      return qLow ? data.memes.filter(a => a.name.toLowerCase().includes(qLow)) : data.memes;
    if (section === 'videos')     return qLow ? data.videos.filter(a => a.name.toLowerCase().includes(qLow)) : data.videos;
    if (section === 'sounds')     return qLow ? data.sounds.filter(a => a.name.toLowerCase().includes(qLow)) : data.sounds;
    if (section === 'aiPictures') return qLow ? data.aiPictures.filter(a => a.name.toLowerCase().includes(qLow)) : data.aiPictures;
    return [];
  }, [section, data, qLow]);

  const filteredUgc = useMemo(() => {
    if (section !== 'ugcVideos') return [];
    return qLow ? data.ugcVideos.filter(v => v.script.toLowerCase().includes(qLow) || v.mode.toLowerCase().includes(qLow)) : data.ugcVideos;
  }, [section, data, qLow]);

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-3">
        <SearchBar
          value={q}
          onChange={setQ}
          placeholder={
            section === 'ugcVideos' ? 'Search by script or mode…'
            : section === 'videos' ? 'Search by name…'
            : 'Search…'
          }
        />
        <span className="text-[12px] text-muted">
          {section === 'ugcVideos'
            ? `${filteredUgc.length} video${filteredUgc.length !== 1 ? 's' : ''}`
            : `${filtered.length} asset${filtered.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        {section === 'sounds' ? (
          <div className={GRID_AUDIO}>
            {filtered.map((a) => <AudioCard key={a.id} asset={a} token={token} />)}
          </div>
        ) : section === 'aiPictures' ? (
          <div className={GRID_VIDEO}>
            {filtered.map((a) => <ImageCard key={a.id} asset={a} />)}
          </div>
        ) : section === 'ugcVideos' ? (
          <div className={GRID_VIDEO}>
            {filteredUgc.map((v) => <UgcCard key={v.id} video={v} />)}
          </div>
        ) : (
          /* Memes and Videos — VideoCard with description */
          <div className={GRID_VIDEO}>
            {filtered.map((a) => <VideoCard key={a.id} asset={a} token={token} />)}
          </div>
        )}

        {/* Empty state */}
        {(section !== 'ugcVideos' ? filtered.length : filteredUgc.length) === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-[13px] text-muted">
              {qLow ? 'No match. Try a different search.' : 'No assets in this section yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className={GRID_VIDEO}>
      {Array.from({ length: 12 }, (_, i) => (
        <div key={i} className="animate-pulse rounded-xl bg-surface-alt" style={{ aspectRatio: '9/16' }} />
      ))}
    </div>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export function AssetsLibraryTab({ token }: { token: string }) {
  const [section, setSection] = useState<Section>('memes');
  const [data, setData] = useState<LibraryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchLibrary(token);
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="flex h-full flex-col gap-0 overflow-hidden -mx-8 -my-8">

      {/* ── Section tab bar ──────────────────────────────────────────── */}
      <nav className="flex shrink-0 border-b border-line bg-white px-8">
        {SECTIONS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={[
              'flex items-center gap-2 px-4 py-3.5 text-[13px] font-medium transition-colors border-b-2 -mb-px',
              section === id
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-muted hover:text-ink',
            ].join(' ')}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {data && <CountBadge n={data.counts[id]} />}
          </button>
        ))}

        {/* Refresh */}
        <button
          onClick={() => void load()}
          disabled={loading}
          className="ml-auto flex items-center gap-1.5 py-3.5 text-[12px] text-muted transition-colors hover:text-ink disabled:opacity-40"
          title="Refresh"
        >
          <span className={loading ? 'animate-spin' : ''}>↻</span>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </nav>

      {/* ── Content area ─────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden px-8 py-6">
        {error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-[13px] text-red-600">{error}</p>
            <button
              onClick={() => void load()}
              className="rounded-lg border border-line px-4 py-2 text-[13px] text-ink hover:bg-surface-alt"
            >
              Retry
            </button>
          </div>
        ) : loading && !data ? (
          <Skeleton />
        ) : data ? (
          <SectionContent section={section} data={data} token={token} />
        ) : null}
      </div>
    </div>
  );
}
