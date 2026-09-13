// server-only — never import from a 'use client' file.
// AI labeling for every generated image. Spec: docs/business-studios/02-architecture.md §6.3.

import sharp from 'sharp';

export const DIGITAL_SOURCE_TYPE = 'http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia';

const xmpPacket = (): string =>
  [
    '<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>',
    '<x:xmpmeta xmlns:x="adobe:ns:meta/">',
    ' <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">',
    '  <rdf:Description rdf:about=""',
    '    xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/"',
    '    xmlns:dc="http://purl.org/dc/elements/1.1/"',
    '    xmlns:xmp="http://ns.adobe.com/xap/1.0/">',
    `   <Iptc4xmpExt:DigitalSourceType>${DIGITAL_SOURCE_TYPE}</Iptc4xmpExt:DigitalSourceType>`,
    '   <xmp:CreatorTool>Next5 Studio</xmp:CreatorTool>',
    '   <dc:creator><rdf:Seq><rdf:li>Next5</rdf:li></rdf:Seq></dc:creator>',
    '   <dc:description><rdf:Alt><rdf:li xml:lang="x-default">AI-generated image</rdf:li></rdf:Alt></dc:description>',
    '  </rdf:Description>',
    ' </rdf:RDF>',
    '</x:xmpmeta>',
    '<?xpacket end="w"?>',
  ].join('\n');

/** Small "AI" pill, bottom-right, sized relative to the image width. */
const visibleTagSvg = (width: number, height: number): Buffer => {
  const scale = Math.max(1, width / 1024);
  const w = Math.round(34 * scale);
  const h = Math.round(20 * scale);
  const inset = Math.round(16 * scale);
  const x = width - w - inset;
  const y = height - h - inset;
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">` +
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="rgba(0,0,0,0.35)"/>` +
      `<text x="${x + w / 2}" y="${y + h * 0.7}" font-family="Helvetica, Arial, sans-serif" font-size="${Math.round(11 * scale)}" font-weight="600" fill="rgba(255,255,255,0.85)" text-anchor="middle">AI</text>` +
      '</svg>',
  );
};

/** Re-encodes to JPEG, embeds the IPTC "AI-generated" XMP label, and optionally burns a visible tag. */
export const labelImage = async (input: Buffer, options: { visibleTag: boolean }): Promise<Buffer> => {
  const base = sharp(input).rotate();
  const { width = 1024, height = 1024 } = await base.metadata();
  const pipeline = options.visibleTag ? base.composite([{ input: visibleTagSvg(width, height) }]) : base;
  return pipeline.jpeg({ quality: 90, mozjpeg: true }).withXmp(xmpPacket()).toBuffer();
};

/** A neutral sample image for mock mode when there is no input to reuse. */
export const mockSampleImage = async (label: string, ratio: string): Promise<Buffer> => {
  const [rw, rh] = ratio.split(':').map(Number);
  const width = 768;
  const height = Math.round((width * (rh || 1)) / (rw || 1));
  const safe = label.replace(/[<>&"]/g, '');
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#e9e1d6"/><text x="50%" y="50%" font-family="Helvetica, Arial" font-size="28" fill="#6b635a" text-anchor="middle">${safe}</text></svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
};
