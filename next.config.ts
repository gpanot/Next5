import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a second dev server (e.g. e2e on :3100 against the local DB) run beside the usual one.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Remotion packages use CommonJS internals that the Next.js App Router
  // bundler won't resolve correctly without explicit transpilation.
  transpilePackages: ['remotion', '@remotion/player'],
};

export default nextConfig;
