import type { FeedbackLabel, Priority, Triage } from './types';

/** How often IMEO sees the source emitting (persistency_category, lower-cased). */
export const PERSISTENCE_WEIGHTS: Readonly<Record<string, number>> = {
  persistent: 1.0,
  frequent: 0.7,
  sporadic: 0.4,
  undetermined: 0.5,
  absent: 0.1,
};

/** Response history from IMEO's published feedback state. */
export const RESPONSE_FACTORS: Readonly<Record<FeedbackLabel, number>> = {
  'Notified – no response received': 1.0,
  'Government responded': 0.6,
  'Operator responded': 0.5,
  'Government and operator responded': 0.3,
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Deterministic triage priority = impact x persistence x response history, 0..100.
 * impact maps 1,000 t CO2e/yr -> 0 and 10,000,000 t CO2e/yr -> 1 on a log scale.
 */
export function triage(co2eTonnesPerYear: number, persistency: string, label: FeedbackLabel): Triage {
  const impact = Math.min(1, Math.max(0, (Math.log10(Math.max(co2eTonnesPerYear, 1)) - 3) / 4));
  const persistenceWeight = PERSISTENCE_WEIGHTS[persistency.toLowerCase()] ?? 0.5;
  const responseFactor = RESPONSE_FACTORS[label];
  const score = Math.round(100 * impact * persistenceWeight * responseFactor);
  const priority: Priority = score >= 40 ? 'high' : score >= 15 ? 'medium' : 'low';
  return { score, priority, impact: round3(impact), persistenceWeight, responseFactor };
}
