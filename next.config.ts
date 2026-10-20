import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a second dev server (e.g. e2e on :3100 against the local DB) run beside the usual one.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Remotion packages use CommonJS internals that the Next.js App Router
  // bundler won't resolve correctly without explicit transpilation.
  transpilePackages: ['remotion', '@remotion/player'],
  // Shorts render with ffmpeg-static (resolved at runtime, so not traced) and burn captions in Montserrat Bold.
  // The routes that run the posting tick use it too: a YouTube upload grabs its thumbnail frame with ffmpeg.
  outputFileTracingIncludes: {
    '/api/admin/shorts/**': ['./node_modules/ffmpeg-static/ffmpeg', './assets/fonts/**'],
    '/api/admin/blitz/schedule': ['./node_modules/ffmpeg-static/ffmpeg'],
    // Ideas deck voiceover: every TTS take is trimmed and paced with ffmpeg.
    '/api/admin/blitz/voice-preview': ['./node_modules/ffmpeg-static/ffmpeg'],
    '/api/admin/auto-slideshow/**': ['./node_modules/ffmpeg-static/ffmpeg'],
    '/api/cron/**': ['./node_modules/ffmpeg-static/ffmpeg'],
    // Slide renders read the store badge SVGs from public/ at runtime.
    '/api/**': ['./public/images/store-badges/**'],
  },
  // OAuth discovery for the Claude connector (/api/mcp): the well-known documents are served by API routes.
  async rewrites() {
    return [
      { source: '/.well-known/oauth-authorization-server', destination: '/api/oauth/metadata' },
      { source: '/.well-known/oauth-authorization-server/:path*', destination: '/api/oauth/metadata' },
      { source: '/.well-known/oauth-protected-resource', destination: '/api/oauth/protected-resource' },
      { source: '/.well-known/oauth-protected-resource/:path*', destination: '/api/oauth/protected-resource' },
    ];
  },
  // Auto Slideshow is the site root; the realtor/TikTok Shop home moved to /TTZillow. Old links keep working.
  async redirects() {
    return [
      { source: '/slideshow', destination: '/', permanent: true },
      // The blog lives on the guides hub, like /guides#blog; posts themselves are at /blog/<slug>.
      { source: '/blog', destination: '/guides#blog', permanent: false },
      { source: '/slideshow/pricing', destination: '/pricing', permanent: true },
      { source: '/slideshow/privacy', destination: '/privacy', permanent: true },
      { source: '/slideshow/terms', destination: '/terms', permanent: true },
      // Old home links carried the audience (?for=seller); the query string passes through.
      { source: '/', has: [{ type: 'query', key: 'for' }], destination: '/TTZillow', permanent: true },
    ];
  },
};

export default nextConfig;
