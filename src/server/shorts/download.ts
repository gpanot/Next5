// server-only — never import from a 'use client' file.
// Downloads a finished clip. Some networks' DNS cannot resolve a provider's CDN host (seen 2026-10-06 with reAPI's
// reapiflexible.b-cdn.net: ENOTFOUND locally, resolves on 8.8.8.8), so a lookup failure retries through public DNS.

import { Resolver } from 'dns';
import https from 'https';
import type { LookupFunction } from 'net';

const publicResolver = new Resolver();
publicResolver.setServers(['1.1.1.1', '8.8.8.8']);

const publicLookup: LookupFunction = (hostname, options, callback) => {
  publicResolver.resolve4(hostname, (err, addresses) => {
    if (err || !addresses.length) return callback(err ?? new Error(`No address for ${hostname}`), '', 4);
    if (typeof options === 'object' && options.all) return (callback as unknown as (e: null, a: { address: string; family: number }[]) => void)(null, addresses.map((address) => ({ address, family: 4 })));
    callback(null, addresses[0], 4);
  });
};

const viaPublicDns = (url: string, redirects = 3): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const req = https.get(url, { lookup: publicLookup, timeout: 120_000 }, (res) => {
      const status = res.statusCode ?? 0;
      if (status >= 300 && status < 400 && res.headers.location && redirects > 0) {
        res.resume();
        return resolve(viaPublicDns(new URL(res.headers.location, url).toString(), redirects - 1));
      }
      if (status !== 200) {
        res.resume();
        return reject(new Error(`Download: HTTP ${status}`));
      }
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('timeout', () => req.destroy(new Error('Download timed out')));
    req.on('error', reject);
  });

const causeOf = (err: unknown): string => {
  const cause = (err as { cause?: { code?: string; message?: string } }).cause;
  return cause?.code ?? cause?.message ?? (err instanceof Error ? err.message : String(err));
};

/** The file's bytes. Throws with the real network cause (not just "fetch failed"). */
export const downloadUrl = async (url: string): Promise<Buffer> => {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) throw new Error(`Download: HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    const cause = causeOf(err);
    if (!/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(cause)) throw new Error(`Download failed: ${cause}`);
    return viaPublicDns(url).catch((e: unknown) => {
      throw new Error(`Download failed (${cause}, then via public DNS: ${causeOf(e)})`);
    });
  }
};
