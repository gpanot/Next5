import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };

/** Branded text-only Open Graph card (no external assets, so nothing extra is traced into the bundle). */
export const renderOgImage = (eyebrow: string, title: string) =>
  new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#fbfaf8', padding: '72px 80px', fontFamily: 'Georgia, serif' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 34, letterSpacing: 10, color: '#1f1c19' }}>NEXT5</span>
          <span style={{ fontSize: 16, letterSpacing: 6, color: '#6b635a', fontFamily: 'Arial, sans-serif' }}>FOR BUSINESS</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <span style={{ fontSize: 22, letterSpacing: 5, color: '#b8683f', fontFamily: 'Arial, sans-serif' }}>{eyebrow.toUpperCase()}</span>
          <span style={{ fontSize: 68, lineHeight: 1.05, color: '#1f1c19', maxWidth: 980 }}>{title}</span>
        </div>
        <div style={{ display: 'flex', height: 8, width: 160, background: '#b8683f', borderRadius: 8 }} />
      </div>
    ),
    OG_SIZE,
  );
