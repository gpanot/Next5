import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remotion packages use CommonJS internals that the Next.js App Router
  // bundler won't resolve correctly without explicit transpilation.
  transpilePackages: ['remotion', '@remotion/player'],
};

export default nextConfig;
