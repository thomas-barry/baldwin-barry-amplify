// These mirror the checks in amplify/data/complaints/submitComplaint.js, which
// is the enforcement — that file runs verbatim in AppSync and cannot import
// from here. Change both together.
export const DISSATISFACTION_MIN = 1;
export const DISSATISFACTION_MAX = 11;
export const DISSATISFACTION_DEFAULT = 6;
export const TEXT_MIN = 10;
export const TEXT_MAX = 1000;
export const NICKNAME_MAX = 40;

export const ANONYMOUS = 'Anonymous';

/** One word per reading, from DISSATISFACTION_MIN (1) to DISSATISFACTION_MAX (11). */
const DISSATISFACTION_LABELS = [
  'Miffed',
  'Peeved',
  'Irked',
  'Vexed',
  'Cross',
  'Aggrieved',
  'Indignant',
  'Fuming',
  'Seething',
  'Livid',
  'Incandescent',
] as const;

/** The words for a dissatisfaction reading, e.g. `Fuming` for 8. */
export const dissatisfactionLabel = (value: number): string => {
  const index = Math.min(Math.max(Math.round(value), DISSATISFACTION_MIN), DISSATISFACTION_MAX) - DISSATISFACTION_MIN;
  return DISSATISFACTION_LABELS[index];
};
