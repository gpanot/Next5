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
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Film, ImageIcon, Layers, Music, Play, Pause, Search, Video } from 'lucide-react';
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

// ── API fetch ─────────────────────────────────────────────────────────────────

async function fetchLibrary(token: string): Promise<LibraryData> {
  const res = await fetch('/api/admin/assets-library', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<LibraryData>;
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
  { id: 'memes',      label: 'Memes',       Icon: Layers  },
  { id: 'videos',     label: 'Videos',      Icon: Video   },
  { id: 'sounds',     label: 'Sounds',      Icon: Music   },
  { id: 'aiPictures', label: 'AI Pictures', Icon: ImageIcon },
  { id: 'ugcVideos',  label: 'UGC Videos',  Icon: Film    },
];

// ── Asset preview cards (reusing BlitzLab's visual style) ────────────────────

/** Video asset card — plays on hover, no select. */
function VideoCard({ asset }: { asset: BlitzAssetDto }) {
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
    </div>
  );
}

/** Image asset card. */
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
    </div>
  );
}

/** Audio track card — play/pause on click. */
function AudioCard({ asset }: { asset: BlitzAssetDto }) {
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
    <button
      type="button"
      onClick={toggle}
      className="flex flex-col items-center justify-center gap-3 rounded-xl border border-line bg-white p-3 shadow-sm transition-colors hover:border-orange-300 hover:bg-orange-50"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-orange-600">
        {playing
          ? <Pause className="h-6 w-6" />
          : <Play className="h-6 w-6 translate-x-0.5" />
        }
      </div>
      <p className="w-full truncate text-center text-[11px] font-medium text-ink" title={asset.name}>
        {asset.name}
      </p>
      <audio ref={ref} src={asset.url} preload="none" loop onEnded={() => setPlaying(false)} />
    </button>
  );
}

/** UGC video card — plays on hover. */
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

function SectionContent({ section, data }: { section: Section; data: LibraryData }) {
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
            : section === 'videos' ? 'Search by name or tag…'
            : 'Search…'
          }
        />
        <span className="text-[12px] text-muted">
          {section === 'ugcVideos' ? `${filteredUgc.length} video${filteredUgc.length !== 1 ? 's' : ''}` : `${filtered.length} asset${filtered.length !== 1 ? 's' : ''}`}
        </span>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        {section === 'sounds' ? (
          <div className={GRID_AUDIO}>
            {filtered.map((a) => <AudioCard key={a.id} asset={a} />)}
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
          <div className={GRID_VIDEO}>
            {filtered.map((a) => <VideoCard key={a.id} asset={a} />)}
          </div>
        )}

        {/* Empty states */}
        {(section !== 'ugcVideos' ? filtered.length : filteredUgc.length) === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-[13px] text-muted">{qLow ? 'No match. Try a different search.' : 'No assets in this section yet.'}</p>
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
          <SectionContent section={section} data={data} />
        ) : null}
      </div>
    </div>
  );
}
