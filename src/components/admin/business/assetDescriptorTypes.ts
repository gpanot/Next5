/**
 * Client-side shape of an AssetDescriptor row as returned by
 * /api/admin/assets-library/descriptor. Fields are optional because the
 * descriptor JSON differs between video/meme and music assets.
 */

export type DescriptorJson = {
  subject?: string;
  action?: string;
  setting?: string;
  meaning?: string;
  bestUse?: string;
  emotion?: { face?: string; voice?: string | null; arc?: string } | string;
  vibe?: string[];
  pacing?: string;
  energyLevel?: number;
  textSafeZone?: string;
  hasSpeech?: boolean;
  transcript?: string | null;
  slotScores?: Record<string, number>;
  nicheScores?: Record<string, number>;
  avoidFor?: string[];
  bestTrim?: { start: number; end: number };
  identifiablePerson?: boolean;
  // Music
  sound?: string;
  imagery?: string;
  sections?: Array<{ label: string; start: number; end: number; energy: string }>;
  dropAt?: number | null;
  bpmEstimate?: number | null;
  bestStart?: number;
};

export type DescriptorRow = {
  id: string;
  kind: string;
  status: string;
  model: string | null;
  descriptorVersion: number | null;
  descriptor: DescriptorJson | null;
  loudnessCurve: string | null;
  retrievalText: string | null;
  rightsRisk: string | null;
  rightsRiskOverride?: string | null;
  effectiveRightsRisk?: string | null;
};

export async function fetchDescriptor(token: string, blitzAssetId: string): Promise<DescriptorRow | null> {
  const res = await fetch(`/api/admin/assets-library/descriptor?blitzAssetId=${encodeURIComponent(blitzAssetId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { descriptor: DescriptorRow | null };
  return data.descriptor;
}

export async function patchDescriptorSpeech(
  token: string,
  id: string,
  patch: { hasSpeech: boolean; transcript: string | null },
): Promise<DescriptorRow> {
  const res = await fetch('/api/admin/assets-library/descriptor', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...patch }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { descriptor: DescriptorRow };
  return data.descriptor;
}
