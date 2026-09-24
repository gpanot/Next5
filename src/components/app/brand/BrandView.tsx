'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../../lib/apiClient';
import type { BrandExtractData, WorkspaceAngleDto } from '../../../types/business/me';
import { useWorkspace } from '../shell/WorkspaceProvider';
import { ContentAnglesSection } from './ContentAnglesSection';
import { VoiceSettingsSection } from './VoiceSettingsSection';
import { BusinessProfileSection } from './BusinessProfileSection';
import { WebsiteSourceBar } from './WebsiteSourceBar';
import { BrandToneSection } from './BrandToneSection';
import { BrandIdentitySection } from './BrandIdentitySection';
import { BrandPurposeSection } from './BrandPurposeSection';
import { BrandMarketSection } from './BrandMarketSection';

export type AngleState = {
  angles: WorkspaceAngleDto[];
  genState: string;
  genAt: string | null;
  brandExtract?: BrandExtractData | null;
  audienceType?: string | null;
  promoting?: string | null;
  offer?: string | null;
};

const EMPTY_EXTRACT: BrandExtractData = {
  coreIdentity: '',
  productOffering: '',
  uniqueBenefits: '',
  problemSolution: '',
  mission: '',
  differentiation: '',
  ownedSpace: '',
  customerSegments: [],
  toneDos: [],
  toneDonts: [],
  competitors: [],
};

export const BrandView = () => {
  const { me, product } = useWorkspace();
  const ws = me?.workspace;

  // ── Angle polling state ──────────────────────────────────────────────────────
  const [state, setState] = useState<AngleState>({
    angles: ws?.angles ?? [],
    genState: ws?.anglesGenState ?? 'idle',
    genAt: null,
  });
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Brand extract state (rich brand profile from website) ────────────────────
  const [brandExtract, setBrandExtract] = useState<BrandExtractData>(
    (ws?.brandExtract as BrandExtractData | null) ?? EMPTY_EXTRACT,
  );

  // ── "Your business" profile fields (audienceType / promoting / offer) ─────────
  // These are extracted alongside brandExtract — refresh them from the polling loop.
  const [wsProfile, setWsProfile] = useState({
    audienceType: ws?.audienceType ?? null as string | null,
    promoting: ws?.promoting ?? null as string | null,
    offer: ws?.offer ?? null as string | null,
  });

  // If workspace is mid-generation, poll until done — also refreshes brandExtract + wsProfile
  const pollAngles = useCallback(async () => {
    if (!product) return;
    try {
      const data = await apiFetch<AngleState>(
        `/api/app/workspace/angles?product=${product}`,
      );
      setState(data);
      if (data.brandExtract) setBrandExtract(data.brandExtract);
      // Refresh "Your business" fields if extraction populated them
      if (data.audienceType || data.promoting || data.offer) {
        setWsProfile({
          audienceType: data.audienceType ?? null,
          promoting: data.promoting ?? null,
          offer: data.offer ?? null,
        });
      }
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
      // Start polling for result — will also update brandExtract when done
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

      {/* Tone & Voice — always visible (user can fill manually; auto-filled after extraction) */}
      <BrandToneSection
        product={product}
        toneDos={brandExtract.toneDos}
        toneDonts={brandExtract.toneDonts}
        onUpdate={(dos, donts) => setBrandExtract((s) => ({ ...s, toneDos: dos, toneDonts: donts }))}
      />

      {/* Rich brand sections — always visible; show placeholder when extraction hasn't run yet */}
      <BrandIdentitySection
        product={product}
        data={brandExtract}
        onUpdate={setBrandExtract}
      />
      <BrandPurposeSection
        product={product}
        data={brandExtract}
        onUpdate={setBrandExtract}
      />
      <BrandMarketSection
        product={product}
        data={brandExtract}
        onUpdate={setBrandExtract}
      />

      <BusinessProfileSection
        product={product}
        audienceType={wsProfile.audienceType}
        promoting={wsProfile.promoting}
        offer={wsProfile.offer}
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
