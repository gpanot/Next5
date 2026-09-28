'use client';

import type { ReactNode } from 'react';
import type { MetaAdVideoDto } from '../../../types/admin/metaAds';

function Expand({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="rounded-xl border border-line bg-white p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900">
      <summary className="cursor-pointer font-medium text-ink dark:text-zinc-100">{title}</summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}

const pretty = (json: string) => {
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
};

/** The script and both prompts behind a video, each expandable. */
export function VideoDetails({ video }: { video: MetaAdVideoDto }) {
  const { script } = video;
  return (
    <div className="space-y-2">
      {script && (
        <Expand title={`Script · ${script.wordCount}/${script.wordBudget} words · ${script.persona.gender}, ${script.persona.age}`}>
          <ol className="space-y-2">
            {script.beats.map((b) => (
              <li key={b.from} className="grid grid-cols-[52px_minmax(0,1fr)] gap-2">
                <span className="font-mono text-muted">{b.from}-{b.to}s</span>
                <span>
                  <span className="text-ink dark:text-zinc-100">“{b.say}”</span>
                  {b.action && <span className="block text-muted">{b.action}</span>}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-muted">
            <b className="text-ink dark:text-zinc-100">Persona:</b> {script.persona.look} · filmed in {script.persona.setting}
          </p>
          {script.why && (
            <p className="mt-1 text-muted">
              <b className="text-ink dark:text-zinc-100">Why:</b> {script.why}
            </p>
          )}
        </Expand>
      )}
      {video.avatarPrompt && (
        <Expand title="Avatar prompt (portrait-clone JSON, GPT Image 2.5)">
          <pre className="max-h-72 overflow-auto rounded-lg bg-zinc-950 p-3 text-[11px] leading-relaxed whitespace-pre-wrap text-zinc-200">{pretty(video.avatarPrompt)}</pre>
        </Expand>
      )}
      {video.videoPrompt && (
        <Expand title="Video prompt (Wan 3.0, avatar as character reference)">
          <p className="leading-relaxed whitespace-pre-wrap text-ink dark:text-zinc-200">{video.videoPrompt}</p>
        </Expand>
      )}
    </div>
  );
}
