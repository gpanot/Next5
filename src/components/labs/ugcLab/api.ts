'use client';

/**
 * Re-exported so the UGC panels have one local import for the transport. The client itself is
 * shared by all four labs — see src/components/labs/labClient.ts.
 */
export { errorOf, type LabClient, type LabResponse, type LabRequestInit } from '../labClient';
export { useLabClient } from '../LabClientProvider';
export { useLabQuery } from '../useLabQuery';
