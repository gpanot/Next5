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
 * Every section has a "Select" mode for multi-select delete (LibrarySelectGrid).
 *
 * "See Description" button on Memes, Videos and Sounds fetches and expands
 * the AssetDescriptor (Gemini extraction) inline below the card.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Film, ImageIcon, Layers, Music, Plus, Search, Video, Zap } from 'lucide-react';
import type { BlitzAssetDto } from '../../labs/blitzLab/api';
import type { UgcVideoDto } from '../../../types/admin/ugc';
import { AiPicturesSection } from './AiPicturesSection';
import { AudioCard, HookCard, UgcCard, VideoCard } from './LibraryCards';
import { LibrarySelectGrid, type LibrarySection } from './LibrarySelectGrid';
import { AddAssetCard, SECTION_UPLOAD_TYPE, UploadModal } from './AssetUploadModal';
import { GenerateDescriptionsButton } from './GenerateDescriptionsButton';

// ── Types ─────────────────────────────────────────────────────────────────────

type Section = LibrarySection;

type LibraryData = {
  memes: BlitzAssetDto[];
  videos: BlitzAssetDto[];
  sounds: BlitzAssetDto[];
  aiPictures: BlitzAssetDto[];
  ugcVideos: UgcVideoDto[];
  hookVideos: BlitzAssetDto[];
  counts: Record<Section, number>;
};



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
  { id: 'memes',      label: 'Memes',        Icon: Layers   },
  { id: 'videos',     label: 'Videos',       Icon: Video    },
  { id: 'sounds',     label: 'Sounds',       Icon: Music    },
  { id: 'aiPictures', label: 'AI Pictures',  Icon: ImageIcon },
  { id: 'ugcVideos',  label: 'UGC Videos',   Icon: Film     },
  { id: 'hookVideos', label: 'Hook Videos',  Icon: Zap      },
];


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

/** Card for a Blitz asset of this section. */
function renderAsset(section: Section, asset: BlitzAssetDto, token: string) {
  if (section === 'sounds') return <AudioCard asset={asset} token={token} />;
  if (section === 'hookVideos') return <HookCard asset={asset} token={token} />;
  return <VideoCard asset={asset} token={token} />;
}

function SectionContent({
  section,
  data,
  token,
  onAssetUploaded,
  onRemoved,
  onAiPicturesMore,
}: {
  section: Section;
  data: LibraryData;
  token: string;
  onAssetUploaded: (asset: BlitzAssetDto) => void;
  onRemoved: (section: Section, ids: string[]) => void;
  onAiPicturesMore: (assets: BlitzAssetDto[]) => void;
}) {
  const [q, setQ] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const qLow = q.trim().toLowerCase();

  const canUpload = section in SECTION_UPLOAD_TYPE;
  const addCard = canUpload && <AddAssetCard onClick={() => setUploadOpen(true)} isAudio={section === 'sounds'} />;
  const removed = (ids: string[]) => onRemoved(section, ids);

  const filtered = useMemo(() => {
    if (section === 'memes')      return qLow ? data.memes.filter(a => a.name.toLowerCase().includes(qLow)) : data.memes;
    if (section === 'videos')     return qLow ? data.videos.filter(a => a.name.toLowerCase().includes(qLow)) : data.videos;
    if (section === 'sounds')     return qLow ? data.sounds.filter(a => a.name.toLowerCase().includes(qLow)) : data.sounds;
    if (section === 'aiPictures') return qLow ? data.aiPictures.filter(a => a.name.toLowerCase().includes(qLow)) : data.aiPictures;
    if (section === 'hookVideos') return qLow
      ? data.hookVideos.filter(a => a.name.toLowerCase().includes(qLow) || a.tags.some(t => t.toLowerCase().includes(qLow)))
      : data.hookVideos;
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
            section === 'ugcVideos'  ? 'Search by script or mode…'
            : section === 'videos'   ? 'Search by name…'
            : section === 'hookVideos' ? 'Search by name or tag…'
            : 'Search…'
          }
        />
        <span className="text-[12px] text-muted">
          {section === 'ugcVideos'
            ? `${filteredUgc.length} video${filteredUgc.length !== 1 ? 's' : ''}`
            : `${filtered.length} asset${filtered.length !== 1 ? 's' : ''}`}
        </span>
        {/* Scraping badge for hookVideos */}
        {section === 'hookVideos' && (
          <span className="flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200 px-2 py-0.5 text-[11px] font-medium text-orange-600">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
            Scraping in progress
          </span>
        )}
        {/* Generate Descriptions CTA */}
        <GenerateDescriptionsButton section={section} token={token} />

        {/* Upload button in toolbar (mirrors the + Add card) */}
        {canUpload && (
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600"
          >
            <Plus className="h-3.5 w-3.5" />
            Add asset
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto">
        {section === 'aiPictures' ? (
          <AiPicturesSection
            assets={filtered}
            loaded={data.aiPictures}
            total={data.counts.aiPictures}
            token={token}
            addCard={addCard}
            onRemoved={removed}
            onMore={onAiPicturesMore}
          />
        ) : section === 'ugcVideos' ? (
          <LibrarySelectGrid section={section} items={filteredUgc} token={token} gridClassName={GRID_VIDEO} renderItem={(v) => <UgcCard video={v} />} onRemoved={removed} />
        ) : (
          <LibrarySelectGrid
            key={section}
            section={section}
            items={filtered}
            token={token}
            gridClassName={section === 'sounds' ? GRID_AUDIO : GRID_VIDEO}
            addCard={addCard}
            renderItem={(a) => renderAsset(section, a, token)}
            onRemoved={removed}
          />
        )}

        {/* Empty state — only shown when search yields no results (not when only the Add card is there) */}
        {(section !== 'ugcVideos' ? filtered.length : filteredUgc.length) === 0 && qLow && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <p className="text-[13px] text-muted">No match. Try a different search.</p>
          </div>
        )}
        {(section !== 'ugcVideos' ? filtered.length : filteredUgc.length) === 0 && !qLow && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <p className="text-[13px] text-muted">
              {canUpload ? 'No assets yet — click "+ Add" to upload the first one.' : 'No assets in this section yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Upload modal */}
      {uploadOpen && canUpload && (
        <UploadModal
          section={section}
          token={token}
          onClose={() => setUploadOpen(false)}
          onUploaded={(asset) => {
            onAssetUploaded(asset);
            setUploadOpen(false);
          }}
        />
      )}
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

  /** Optimistically prepend a just-uploaded asset into the right bucket and bump the count. */
  const handleAssetUploaded = useCallback((asset: BlitzAssetDto) => {
    setData((prev) => {
      if (!prev) return prev;
      const isVideo = asset.mediaKind === 'video';
      const isImage = asset.mediaKind === 'image';
      const isAudio = asset.mediaKind === 'audio';

      let bucket: Section | null = null;
      if (asset.type === 'OVERLAY') bucket = 'memes';
      else if (asset.type === 'BACKGROUND' && isVideo) bucket = 'videos';
      else if (asset.type === 'BACKGROUND' && isImage) bucket = 'aiPictures';
      else if (asset.type === 'AUDIO' && isAudio) bucket = 'sounds';
      else if (asset.type === 'HOOK') bucket = 'hookVideos';

      if (!bucket) return prev;

      const updated = { ...prev };
      if (bucket === 'memes')      updated.memes      = [asset, ...prev.memes];
      if (bucket === 'videos')     updated.videos     = [asset, ...prev.videos];
      if (bucket === 'sounds')     updated.sounds     = [asset, ...prev.sounds];
      if (bucket === 'aiPictures') updated.aiPictures = [asset, ...prev.aiPictures];
      if (bucket === 'hookVideos') updated.hookVideos = [asset, ...prev.hookVideos];
      updated.counts = { ...prev.counts, [bucket]: prev.counts[bucket] + 1 };
      return updated;
    });
  }, []);

  /** Drops deleted assets from their section's grid and count. */
  const handleRemoved = useCallback((section: Section, ids: string[]) => {
    if (ids.length === 0) return;
    const gone = new Set(ids);
    setData((prev) => {
      if (!prev) return prev;
      const next = { ...prev, counts: { ...prev.counts, [section]: Math.max(0, prev.counts[section] - ids.length) } };
      if (section === 'ugcVideos') next.ugcVideos = prev.ugcVideos.filter((v) => !gone.has(v.id));
      else next[section] = prev[section].filter((a) => !gone.has(a.id));
      return next;
    });
  }, []);

  /** Appends the next page of AI pictures, skipping any already shown. */
  const handleAiPicturesMore = useCallback((assets: BlitzAssetDto[]) => {
    setData((prev) => {
      if (!prev) return prev;
      const seen = new Set(prev.aiPictures.map((a) => a.id));
      return { ...prev, aiPictures: [...prev.aiPictures, ...assets.filter((a) => !seen.has(a.id))] };
    });
  }, []);

  return (
    <div className="flex h-full flex-col gap-0 overflow-hidden -mx-4 -my-4 md:-mx-8 md:-my-8">

      {/* ── Section tab bar ──────────────────────────────────────────── */}
      <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-line bg-white px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-8">
        {SECTIONS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setSection(id)}
            className={[
              'flex shrink-0 items-center gap-2 whitespace-nowrap px-4 py-3.5 text-[13px] font-medium transition-colors border-b-2 -mb-px',
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
          className="ml-auto flex shrink-0 items-center gap-1.5 py-3.5 pl-3 text-[12px] text-muted transition-colors hover:text-ink disabled:opacity-40"
          title="Refresh"
        >
          <span className={loading ? 'animate-spin' : ''}>↻</span>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </nav>

      {/* ── Content area ─────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden px-4 py-4 md:px-8 md:py-6">
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
          <SectionContent
            section={section}
            data={data}
            token={token}
            onAssetUploaded={handleAssetUploaded}
            onRemoved={handleRemoved}
            onAiPicturesMore={handleAiPicturesMore}
          />
        ) : null}
      </div>
    </div>
  );
}
