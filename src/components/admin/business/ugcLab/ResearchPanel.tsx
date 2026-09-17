'use client';

import { useState } from 'react';
import { ExternalLink, Search, Eye, ThumbsUp, ChevronRight } from 'lucide-react';

export type VideoCard = {
  id: string;
  video_url: string;
  thumbnail: string;
  author: string;
  views: number;
  likes: number;
  hook: string;
  raw_transcript: string;
};

type ResearchPanelProps = {
  token: string;
  onHookSelected: (hook: string) => void;
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function ResearchPanel({ token, onHookSelected }: ResearchPanelProps) {
  const [industry, setIndustry] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [videos, setVideos] = useState<VideoCard[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [editedHook, setEditedHook] = useState('');

  async function handleSearch() {
    if (!industry.trim()) return;
    setLoading(true);
    setError('');
    setVideos([]);
    setSelectedId('');
    setEditedHook('');

    try {
      const res = await fetch('/api/admin/ugc-lab/research', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ industry }),
      });

      const data = (await res.json()) as { videos?: VideoCard[]; error?: string };

      if (!res.ok || data.error) {
        setError(data.error ?? `Request failed (${res.status})`);
        return;
      }

      setVideos(data.videos ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleCardClick(v: VideoCard) {
    setSelectedId(v.id);
    setEditedHook(v.hook);
  }

  function handleUseHook() {
    if (editedHook.trim()) {
      onHookSelected(editedHook.trim());
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Step 1 — Research Trending Hooks</h2>
        <p className="text-sm text-zinc-400">
          Enter your niche. We'll pull 10 trending TikTok videos and extract the opening hook from each.
        </p>
      </div>

      {/* Industry search */}
      <div className="flex gap-2">
        <input
          type="text"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="e.g. real estate, fitness, SaaS..."
          className="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
        />
        <button
          onClick={handleSearch}
          disabled={loading || !industry.trim()}
          className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black disabled:opacity-40 hover:bg-zinc-100 transition-colors"
        >
          <Search className="w-4 h-4" />
          {loading ? 'Searching…' : 'Search'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Video grid */}
      {videos.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">
            {videos.length} videos — click a card to select its hook
          </p>

          <div className="grid grid-cols-1 gap-3">
            {videos.map((v) => (
              <div
                key={v.id}
                onClick={() => handleCardClick(v)}
                className={[
                  'flex gap-4 rounded-xl border p-4 cursor-pointer transition-all',
                  selectedId === v.id
                    ? 'border-white bg-zinc-800'
                    : 'border-zinc-700 bg-zinc-900 hover:border-zinc-600',
                ].join(' ')}
              >
                {/* Thumbnail */}
                <div className="shrink-0 w-16 h-24 rounded-lg overflow-hidden bg-zinc-800">
                  {v.thumbnail ? (
                    <img
                      src={v.thumbnail}
                      alt={v.author}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                      <Search className="w-5 h-5" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs text-zinc-400 truncate">@{v.author}</p>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="flex items-center gap-1 text-xs text-zinc-400">
                        <Eye className="w-3 h-3" />
                        {formatCount(v.views)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-zinc-400">
                        <ThumbsUp className="w-3 h-3" />
                        {formatCount(v.likes)}
                      </span>
                      {v.video_url && (
                        <a
                          href={v.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                          title="Open on TikTok — verify video length"
                        >
                          <ExternalLink className="w-3 h-3" />
                          TikTok
                        </a>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-white leading-snug line-clamp-3">
                    {v.hook || <span className="text-zinc-500 italic">No hook extracted</span>}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected hook editor */}
      {selectedId && (
        <div className="space-y-3 border-t border-zinc-800 pt-5">
          <p className="text-sm font-medium text-white">Edit hook (optional)</p>
          <textarea
            value={editedHook}
            onChange={(e) => setEditedHook(e.target.value)}
            rows={3}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-500 resize-none"
            placeholder="The hook text..."
          />
          <button
            onClick={handleUseHook}
            disabled={!editedHook.trim()}
            className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black disabled:opacity-40 hover:bg-zinc-100 transition-colors"
          >
            Use this hook
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
