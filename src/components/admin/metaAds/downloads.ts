'use client';

import { downloadAllAsZip } from '../../../lib/download';
import type { MetaAdDto, MetaAdRunDto } from '../../../types/admin/metaAds';

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

const fileName = (ad: MetaAdDto, brandName: string) => `${slug(brandName)}-${String(ad.position + 1).padStart(2, '0')}-${slug(ad.angle)}.jpg`;

/** Saves one ad without the NEXT5 watermark the shared downloadFile helper adds. */
export const downloadAd = async (ad: MetaAdDto, brandName: string): Promise<void> => {
  if (!ad.finalUrl) return;
  try {
    const res = await fetch(ad.finalUrl);
    if (!res.ok) throw new Error(String(res.status));
    const url = URL.createObjectURL(await res.blob());
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName(ad, brandName);
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
  } catch {
    window.open(ad.finalUrl, '_blank', 'noopener,noreferrer');
  }
};

export const downloadRun = async (run: MetaAdRunDto): Promise<void> => {
  const brandName = run.profile?.brandName ?? 'ads';
  const files = run.ads.filter((ad) => ad.finalUrl).map((ad) => ({ url: ad.finalUrl as string, filename: fileName(ad, brandName) }));
  await downloadAllAsZip(files, `${slug(brandName)}-meta-ads.zip`);
};
