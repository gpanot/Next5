import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a second dev server (e.g. e2e on :3100 against the local DB) run beside the usual one.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Remotion packages use CommonJS internals that the Next.js App Router
  // bundler won't resolve correctly without explicit transpilation.
  transpilePackages: ['remotion', '@remotion/player'],
  // Shorts render with ffmpeg-static (resolved at runtime, so not traced) and burn captions in Montserrat Bold.
  outputFileTracingIncludes: {
    '/api/admin/shorts/**': ['./node_modules/ffmpeg-static/ffmpeg', './assets/fonts/**'],
  },
  // Auto Slideshow is the site root; the realtor/TikTok Shop home moved to /TTZillow. Old links keep working.
  async redirects() {
    return [
      { source: '/slideshow', destination: '/', permanent: true },
      { source: '/slideshow/pricing', destination: '/pricing', permanent: true },
      { source: '/slideshow/privacy', destination: '/privacy', permanent: true },
      { source: '/slideshow/terms', destination: '/terms', permanent: true },
      // Old home links carried the audience (?for=seller); the query string passes through.
      { source: '/', has: [{ type: 'query', key: 'for' }], destination: '/TTZillow', permanent: true },
    ];
  },
};

export default nextConfig;
