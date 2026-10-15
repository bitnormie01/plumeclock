import type { FeedbackLabel } from './types';

/** IMEO's own caveat on response rates (methanedata.unep.org, MARS snapshot story). */
export const IMEO_RESPONSE_CAVEAT = 'Low response rates may not necessarily signal indifference.';

/** IMEO FAQ wording for a notified source, derived from the sources CSV feedback columns. */
export function feedbackLabel(feedbackOperator: string, feedbackGovernment: string): FeedbackLabel {
  const operator = feedbackOperator === 'Yes';
  const government = feedbackGovernment === 'Yes';
  if (operator && government) return 'Government and operator responded';
  if (operator) return 'Operator responded';
  if (government) return 'Government responded';
  return 'Notified – no response received';
}
