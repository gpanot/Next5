'use client';

import { useState, useMemo } from 'react';
import hooksData from '../../../data/hooks.json';

type Hook = {
  id: string;
  text: string;
  category: string;
  tier: string;
  engagementRate: number;
  platforms: string[];
};

const CATEGORY_LABELS: Record<string, string> = {
  authority: 'Authority',
  bold_statement: 'Bold Statement',
  comparison: 'Comparison',
  confession: 'Confession',
  controversial: 'Controversial',
  curiosity_gap: 'Curiosity Gap',
  engagement: 'Engagement',
  fomo: 'FOMO',
  how_to: 'How To',
  list_promise: 'List Promise',
  mistake: 'Mistakes & Lessons',
  prediction: 'Prediction',
  question: 'Question',
  relatable: 'Relatable',
  social_proof: 'Social Proof',
  statistic: 'Statistics',
  story_opener: 'Story Opener',
  success_story: 'Success Story',
  transformation: 'Transformation',
};

const PLATFORM_ICONS: Record<string, string> = {
  linkedin: 'LI',
  twitter: 'X',
  tiktok: 'TK',
  youtube: 'YT',
  instagram: 'IG',
  threads: 'TH',
};

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: 'bg-blue-100 text-blue-700',
  twitter: 'bg-zinc-100 text-zinc-700',
  tiktok: 'bg-pink-100 text-pink-700',
  youtube: 'bg-red-100 text-red-700',
  instagram: 'bg-purple-100 text-purple-700',
  threads: 'bg-zinc-100 text-zinc-600',
};

const allHooks = hooksData.hooks as Hook[];
const allCategories = Array.from(new Set(allHooks.map((h) => h.category))).sort();

export function HooksTab({ token: _token }: { token: string }) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [copied, setCopied] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'engagementRate' | 'category'>('engagementRate');

  const allPlatforms = useMemo(
    () => Array.from(new Set(allHooks.flatMap((h) => h.platforms))).sort(),
    []
  );

  const filtered = useMemo(() => {
    let hooks = allHooks;
    if (activeCategory !== 'all') hooks = hooks.filter((h) => h.category === activeCategory);
    if (platformFilter !== 'all') hooks = hooks.filter((h) => h.platforms.includes(platformFilter));
    if (search.trim()) {
      const q = search.toLowerCase();
      hooks = hooks.filter((h) => h.text.toLowerCase().includes(q) || h.category.includes(q));
    }
    if (sortBy === 'engagementRate') hooks = [...hooks].sort((a, b) => b.engagementRate - a.engagementRate);
    else hooks = [...hooks].sort((a, b) => a.category.localeCompare(b.category));
    return hooks;
  }, [search, activeCategory, platformFilter, sortBy]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allHooks.length };
    allCategories.forEach((cat) => {
      counts[cat] = allHooks.filter((h) => h.category === cat).length;
    });
    return counts;
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-xl font-semibold text-ink">Hook Library</h2>
        <p className="text-[13px] text-muted">
          {allHooks.length} viral hooks — sourced from hookugc.com, sorted by engagement rate
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search hooks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 flex-1 min-w-[200px] rounded-lg border border-line bg-white px-3 text-[13px] placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ink/20"
        />
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value)}
          className="h-9 rounded-lg border border-line bg-white px-3 text-[13px] text-ink focus:outline-none"
        >
          <option value="all">All Platforms</option>
          {allPlatforms.map((p) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="h-9 rounded-lg border border-line bg-white px-3 text-[13px] text-ink focus:outline-none"
        >
          <option value="engagementRate">Sort: Engagement ↓</option>
          <option value="category">Sort: Category A–Z</option>
        </select>
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveCategory('all')}
          className={[
            'rounded-full px-3 py-1 text-[12px] font-medium transition-colors',
            activeCategory === 'all'
              ? 'bg-ink text-white'
              : 'bg-surface text-muted hover:text-ink hover:bg-zinc-100',
          ].join(' ')}
        >
          All <span className="opacity-60">{categoryCounts.all}</span>
        </button>
        {allCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={[
              'rounded-full px-3 py-1 text-[12px] font-medium transition-colors',
              activeCategory === cat
                ? 'bg-ink text-white'
                : 'bg-surface text-muted hover:text-ink hover:bg-zinc-100',
            ].join(' ')}
          >
            {CATEGORY_LABELS[cat] ?? cat} <span className="opacity-60">{categoryCounts[cat]}</span>
          </button>
        ))}
      </div>

      {/* Results count */}
      <p className="text-[12px] text-muted -mt-2">
        Showing <strong className="text-ink">{filtered.length}</strong> hooks
      </p>

      {/* Hook grid */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((hook) => (
          <div
            key={hook.id}
            className="group flex flex-col gap-3 rounded-xl border border-line bg-white p-4 transition-shadow hover:shadow-sm"
          >
            {/* Top row: category badge + score */}
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600">
                {CATEGORY_LABELS[hook.category] ?? hook.category}
              </span>
              <span className={[
                'text-[11px] font-semibold tabular-nums',
                hook.engagementRate >= 95 ? 'text-emerald-600' :
                hook.engagementRate >= 90 ? 'text-blue-600' :
                hook.engagementRate >= 85 ? 'text-amber-600' : 'text-muted',
              ].join(' ')}>
                {hook.engagementRate}%
              </span>
            </div>

            {/* Hook text */}
            <p className="flex-1 text-[14px] font-medium leading-snug text-ink">
              &ldquo;{hook.text}&rdquo;
            </p>

            {/* Platforms + copy */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1">
                {hook.platforms.map((p) => (
                  <span
                    key={p}
                    className={[
                      'rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
                      PLATFORM_COLORS[p] ?? 'bg-zinc-100 text-zinc-600',
                    ].join(' ')}
                  >
                    {PLATFORM_ICONS[p] ?? p}
                  </span>
                ))}
              </div>
              <button
                onClick={() => handleCopy(hook.text, hook.id)}
                className={[
                  'shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors',
                  copied === hook.id
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-zinc-50 text-muted hover:bg-zinc-100 hover:text-ink',
                ].join(' ')}
              >
                {copied === hook.id ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="py-16 text-center text-[13px] text-muted">
          No hooks match your filters.
        </div>
      )}
    </div>
  );
}
