/**
 * Set NEXT5_MOCK_GENERATION=true in .env.local to run the full booking flow —
 * preview, post-payment shots, the director's note, and order recording —
 * against static placeholder data instead of WaveSpeed / OpenAI / Airtable.
 * Same components, same timings, zero external calls and zero cost. Every
 * route checks this before touching a paid API, so flipping it off restores
 * exact production behaviour.
 */
export const isMockGeneration = (): boolean => process.env.NEXT5_MOCK_GENERATION === 'true';
