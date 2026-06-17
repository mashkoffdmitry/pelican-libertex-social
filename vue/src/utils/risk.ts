import type { RiskLevel } from '../types/strategy';

/**
 * Pelican derives a strategy's risk profile from its maximum drawdown, NOT from
 * the upstream `RiskProfile` field — which frequently disagrees (e.g. a strategy
 * sitting in the official LowRisk group whose field reads "High"). Reproducing
 * the drawdown thresholds matches the official catalog exactly: validated at
 * 100% (609/609) against the LowRisk/MediumRisk/HighRisk discover groups.
 *
 *   |MaxDD| <= 15%  -> Low
 *   |MaxDD| <= 35%  -> Medium
 *   |MaxDD|  > 35%  -> High
 *
 * MaxDD is stored as a percentage (e.g. -10.68 = -10.68%); the sign is ignored.
 * Returns null when drawdown is unknown so the UI can fall back to "Unsuitable".
 */
export function riskFromDrawdown(maxDD: number | null | undefined): RiskLevel | null {
  if (maxDD == null) return null;
  const dd = Math.abs(maxDD);
  if (dd <= 15) return 'Low';
  if (dd <= 35) return 'Medium';
  return 'High';
}
