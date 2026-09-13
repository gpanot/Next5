// server-only — never import from a 'use client' file.

import { randomInt } from 'node:crypto';

/** Unambiguous alphabet: no 0/O or 1/I, so references survive being read aloud or retyped. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const REFERENCE_PREFIX = 'N5';
const LENGTH = 8;

export const createReference = (): string => {
  let body = '';
  for (let i = 0; i < LENGTH; i += 1) body += ALPHABET[randomInt(ALPHABET.length)];
  return `${REFERENCE_PREFIX}${body}`;
};

/** Finds a reference inside free-text bank memo content (spaces, dashes and case are ignored). */
export const extractReference = (content: string): string | null => {
  const normalised = content.toUpperCase().replace(/[\s.\-_]/g, '');
  const match = normalised.match(/N5[A-HJ-NP-Z2-9]{8}/);
  return match ? match[0] : null;
};
