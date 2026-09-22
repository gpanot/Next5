# Blitz Render Worker

Railway service that polls for `PENDING` `BlitzProject` rows and renders them with Remotion.

## Architecture

- Polls Postgres every 5 s using `FOR UPDATE SKIP LOCKED` (safe for multiple replicas).
- Remotion composition is bundled **once at startup** (10–20 s); `serveUrl` is reused for all jobs.
- Assets are downloaded from R2 to `/tmp/blitz_${jobId}/` before rendering so headless Chrome reads local files.
- Rendered `.mp4` is uploaded to R2 at `blitz/renders/${projectId}/output.mp4`.
- Temp files are cleaned up after each job.

## Local development

```bash
cp .env.example .env
# Fill in DATABASE_URL, R2 credentials, CHROMIUM_PATH

npm install
npx prisma generate
npm start
```

## Railway deployment

1. Add this directory as a new Railway service in the same project.
2. Set `ROOT_DIRECTORY` to `/blitz-worker` in Railway service settings (or use the Dockerfile at the repo root with `--context` set).
3. Set all env vars from `.env.example` in Railway Variables.
4. Deploy. The worker starts, bundles Remotion (~20 s), then begins polling.

## Env vars required

| Var | Description |
|---|---|
| `DATABASE_URL` | Same Postgres as the main app |
| `CLOUDFLARE_ACCOUNT_ID` | R2 account |
| `R2_ACCESS_KEY_ID` | R2 key |
| `R2_SECRET_ACCESS_KEY` | R2 secret |
| `R2_BUCKET_NAME` | Bucket name (default: `next5-photos`) |
| `CHROMIUM_PATH` | Path to Chromium binary (default: `/usr/bin/chromium`) |
| `POLL_INTERVAL_MS` | Polling interval in ms (default: `5000`) |
