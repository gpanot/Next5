'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../../lib/apiClient';
import type { WorkspaceAngleDto } from '../../../types/business/me';
import { useWorkspace } from '../shell/WorkspaceProvider';
import { ContentAnglesSection } from './ContentAnglesSection';
import { VoiceSettingsSection } from './VoiceSettingsSection';
import { WebsiteSourceBar } from './WebsiteSourceBar';

export type AngleState = {
  angles: WorkspaceAngleDto[];
  genState: string;
  genAt: string | null;
};

export const BrandView = () => {
  const { me, product } = useWorkspace();
  const ws = me?.workspace;

  // Bootstrap from me DTO (fast first paint), then allow local updates
  const [state, setState] = useState<AngleState>({
    angles: ws?.angles ?? [],
    genState: ws?.anglesGenState ?? 'idle',
    genAt: null,
  });
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // If workspace is mid-generation, poll until done
  const pollAngles = useCallback(async () => {
    if (!product) return;
    try {
      const data = await apiFetch<AngleState>(`/api/app/workspace/angles?product=${product}`);
      setState(data);
      if (data.genState === 'pending') {
        pollingRef.current = setTimeout(() => void pollAngles(), 2500);
      }
    } catch {
      // silently ignore poll failures
    }
  }, [product]);

  useEffect(() => {
    if (state.genState === 'pending') void pollAngles();
    return () => {
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, [state.genState, pollAngles]);

  const handleRefresh = async () => {
    if (!product) return;
    setState((s) => ({ ...s, genState: 'pending' }));
    try {
      await apiFetch('/api/app/workspace/angles/generate', {
        method: 'POST',
        json: { product },
      });
      // Start polling for result
      void pollAngles();
    } catch {
      setState((s) => ({ ...s, genState: 'failed' }));
    }
  };

  const handleAnglesChange = (next: WorkspaceAngleDto[]) => setState((s) => ({ ...s, angles: next }));

  const mentionFreq = ws?.mentionFrequency ?? 'sometimes';
  const genderFilter = ws?.genderFilter ?? null;
  const websiteUrl = ws?.websiteUrl ?? null;

  return (
    <div className="flex flex-col gap-6">
      <WebsiteSourceBar
        url={websiteUrl}
        product={product}
        genState={state.genState}
        onRefresh={handleRefresh}
      />
      <ContentAnglesSection
        angles={state.angles}
        genState={state.genState}
        product={product}
        onChange={handleAnglesChange}
      />
      <VoiceSettingsSection
        angles={state.angles}
        mentionFrequency={mentionFreq}
        genderFilter={genderFilter}
        product={product}
        onChange={handleAnglesChange}
      />
    </div>
  );
};
