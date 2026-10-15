/** IPCC AR6 GWP100 for fossil CH4 is 29.8, stored x10 (same constant as PlumeBase.GWP100_X10). */
export const GWP100_X10 = 298n;
export const HOURS_PER_YEAR = 8760n;
export const GWP100 = 29.8;

/**
 * t CO2e per year if the plume persisted at `rateKgPerHour` for a full year.
 * Identical integer math to Solidity `PlumeBase.co2eTonnesPerYear` (floor division).
 */
export function co2eTonnesPerYear(rateKgPerHour: number): number {
  if (!Number.isInteger(rateKgPerHour) || rateKgPerHour < 0 || rateKgPerHour > 0xffffffff) {
    throw new Error(`rateKgPerHour must be a uint32, got ${rateKgPerHour}`);
  }
  return Number((BigInt(rateKgPerHour) * HOURS_PER_YEAR * GWP100_X10) / 10_000n);
}
