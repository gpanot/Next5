/**
 * src/server/labs/assetDescriptor/rights.ts
 *
 * Rights risk enforcement rules, applied after the model returns a descriptor.
 *
 * Rule priority (highest wins):
 *  1. publicFigureLikely=true → always 'high' (model or code override)
 *  2. source='scraped' && model said 'none' → floor to 'low'
 *  3. Model value otherwise
 *
 * effectiveRightsRisk() is the read-time helper used by callers who query the DB.
 * The DB column `effective_rights_risk` is a generated column that does the same
 * computation for SQL filtering:
 *   GENERATED ALWAYS AS (coalesce(rights_risk_override, rights_risk)) STORED
 *
 * So callers filter on `effectiveRightsRisk` column directly — no helper call needed
 * in SQL queries.
 */

import type { AssetSource } from './types';

/**
 * Apply post-model rights rules (hardcoded business logic, not model-settable).
 * Returns the final rightsRisk string to persist and display.
 */
export function applyRightsRules(
  modelRightsRisk: string,
  source: AssetSource,
  publicFigureLikely?: boolean,
): string {
  if (publicFigureLikely) return 'high';
  if (source === 'scraped' && modelRightsRisk === 'none') return 'low';
  return modelRightsRisk;
}

/**
 * Read-time helper: returns the admin override if set, otherwise the model value.
 * Use this in application code that reads a descriptor row.
 *
 * In SQL, use the generated column `effective_rights_risk` directly — it does the
 * same computation via COALESCE(rights_risk_override, rights_risk).
 */
export function effectiveRightsRisk(
  modelRightsRisk: string,
  rightsRiskOverride: string | null | undefined,
): string {
  return rightsRiskOverride ?? modelRightsRisk;
}
