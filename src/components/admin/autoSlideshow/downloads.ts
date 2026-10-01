'use client';

import type JSZip from 'jszip';
import type { AutoSlideshowDto } from '../../../types/admin/autoSlideshow';

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const pad = (n: number) => String(n).padStart(2, '0');

const captionText = (show: AutoSlideshowDto) => [show.caption, show.hashtags.map((h) => `#${h}`).join(' ')].filter(Boolean).join('\n\n');

/** Adds one slideshow to the zip: numbered slides (upload order) and caption.txt. Slides that fail to fetch are skipped. */
const addSlideshow = async (zip: JSZip, show: AutoSlideshowDto, folder: string): Promise<number> => {
  const results = await Promise.all(
    show.slides.map(async (slide, i) => {
      if (!slide.imageUrl) return 0;
      try {
        const res = await fetch(slide.imageUrl);
        if (!res.ok) throw new Error(String(res.status));
        zip.file(`${folder}${pad(i + 1)}.jpg`, await res.arrayBuffer());
        return 1;
      } catch {
        return 0;
      }
    }),
  );
  zip.file(`${folder}caption.txt`, captionText(show));
  // The chosen track, to add as the sound when posting by hand (TikTok's API cannot attach it).
  if (show.audio) {
    const res = await fetch(show.audio.url).catch(() => null);
    if (res?.ok) zip.file(`${folder}music-${slug(show.audio.name) || 'track'}.mp3`, await res.arrayBuffer());
  }
  return results.reduce<number>((a, b) => a + b, 0);
};

const save = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
};

/** One slideshow as a zip, ready to upload to TikTok. Returns how many slides made it in. */
export const downloadSlideshow = async (show: AutoSlideshowDto, brandName: string): Promise<number> => {
  const { default: Zip } = await import('jszip');
  const zip = new Zip();
  const count = await addSlideshow(zip, show, '');
  if (count > 0) save(await zip.generateAsync({ type: 'blob' }), `${slug(brandName)}-${pad(show.position + 1)}-${slug(show.topic)}.zip`);
  return count;
};
