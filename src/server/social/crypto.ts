// server-only — never import from a 'use client' file.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/** 32-byte key from SOCIAL_TOKEN_KEY (falls back to JWT_SECRET, so dev works without extra setup). */
const key = (): Buffer => {
  const secret = process.env.SOCIAL_TOKEN_KEY ?? process.env.JWT_SECRET;
  if (!secret) throw new Error('SOCIAL_TOKEN_KEY is missing');
  return createHash('sha256').update(secret).digest();
};

/** AES-256-GCM, stored as "v1.<iv>.<tag>.<data>" in base64url. */
export const encryptToken = (plain: string): string => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return ['v1', iv, cipher.getAuthTag(), data].map((part) => (typeof part === 'string' ? part : part.toString('base64url'))).join('.');
};

export const decryptToken = (stored: string): string => {
  const [version, iv, tag, data] = stored.split('.');
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Unknown token format');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
};
