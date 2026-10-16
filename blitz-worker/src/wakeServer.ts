/**
 * Tiny HTTP server so the Next.js app can wake the worker when it queues a render.
 *
 *   GET  /health → 200
 *   POST /wake   → 202, resumes polling (Authorization: Bearer BLITZ_WORKER_WAKE_SECRET)
 *
 * Railway wakes a sleeping service on inbound traffic, so the request itself boots the container; the handler then
 * restarts the polling loop if it had stopped for being idle.
 */

import http from 'http';

export function startWakeServer(port: number, secret: string, onWake: () => void): http.Server {
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200).end('ok');
      return;
    }
    if (req.method === 'POST' && req.url === '/wake') {
      if (req.headers.authorization !== `Bearer ${secret}`) {
        res.writeHead(401).end();
        return;
      }
      onWake();
      res.writeHead(202).end();
      return;
    }
    res.writeHead(404).end();
  });
  server.listen(port, () => console.log(`[blitz-worker] Wake server listening on :${port}`));
  return server;
}
