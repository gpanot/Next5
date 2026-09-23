FROM node:20-slim
# @remotion/compositor-linux-x64-gnu is installed via optionalDependencies in package.json

# ── Chromium for headless Remotion rendering ──────────────────────────────────
# ffmpeg is used to transcode overlay assets that WebCodecs cannot decode
# (e.g. iPhone HEVC) — see blitz-worker/src/transcode.ts.
RUN apt-get update && apt-get install -y \
    chromium \
    ffmpeg \
    fonts-noto \
    fonts-noto-color-emoji \
    fonts-liberation \
    libgbm1 \
    --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

ENV CHROMIUM_PATH=/usr/bin/chromium

# ── Build context is next5-landing/ (the repo root in Railway) ───────────────
# Layout inside the container:
#   /app/blitz-worker/   — worker source
#   /app/src/remotion/   — shared Remotion composition (from next5-landing/src/)
#   /app/src/config/     — shared config (blitzLab.ts)

WORKDIR /app

# Copy shared Remotion source first (rarely changes → good layer cache)
COPY src/remotion/ src/remotion/
COPY src/config/blitzLab.ts src/config/

# Install worker dependencies (copy package files before full source for cache)
COPY blitz-worker/package.json blitz-worker/package-lock.json blitz-worker/
WORKDIR /app/blitz-worker
RUN npm ci --omit=dev --ignore-scripts || npm install --omit=dev

# Copy remaining worker source + prisma schema
COPY blitz-worker/ .

# Generate Prisma client
RUN npx prisma generate

CMD ["npm", "start"]
