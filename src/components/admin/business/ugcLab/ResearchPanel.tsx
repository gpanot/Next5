'use client';

import { useState } from 'react';
import { Researcher } from '../../shared/Researcher';
import type { ResearchVideo } from './ResearchCard';
import { EmptyState, PrimaryButton, Section, fieldClass, labelClass } from './ui';

type ResearchPanelProps = {
  token: string;
  onHookSelected: (hook: string) => void;
};

/**
 * UGC Lab research panel.
 * Uses the shared <Researcher> for search + grid, then adds hook editing.
 */
export function ResearchPanel({ token, onHookSelected }: ResearchPanelProps) {
  const [selectedVideo, setSelectedVideo] = useState<ResearchVideo | null>(null);
  const [editedHook, setEditedHook] = useState('');

  function handleAction(video: ResearchVideo) {
    setSelectedVideo(video);
    setEditedHook(video.hook);
  }

  return (
    <Section
      title="Research hooks"
      description="Enter a niche. We pull 10 TikTok videos, get the full script of each, and pull out its opening hook."
    >
      <Researcher
        token={token}
        cacheKey="ugc-lab-research"
        actionLabel="Use this hook"
        onAction={handleAction}
      />

      {selectedVideo && (
        <div className="flex flex-col gap-2 border-t border-line pt-4 mt-2">
          <label className={labelClass}>
            Edit the hook
            <textarea
              value={editedHook}
              onChange={(e) => setEditedHook(e.target.value)}
              rows={3}
              className={`${fieldClass} resize-none`}
            />
          </label>
          <div>
            <PrimaryButton
              onClick={() => editedHook.trim() && onHookSelected(editedHook.trim())}
              disabled={!editedHook.trim()}
            >
              Use this hook
            </PrimaryButton>
          </div>
        </div>
      )}

      {!selectedVideo && (
        <EmptyState
          title="No hook selected yet."
          hint={'Search for a niche above and click \u201cUse this hook\u201d on a result.'}
        />
      )}
    </Section>
  );
}
