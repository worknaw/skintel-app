/** Evaluation of independently reviewed labels; this module never reads images. */
export const observations = ['observed', 'not_observed', 'unassessable'] as const;
export type Observation = (typeof observations)[number];
export type Finding = 'visible_acne' | 'visible_redness';
export type EvaluationRecord = Readonly<{
  participantId: string;
  imageId: string;
  finding: Finding;
  reference: Observation;
  predicted: Observation;
}>;

export type BenchmarkResult = Readonly<{
  imageCount: number;
  participantCount: number;
  matrix: Record<Observation, Record<Observation, number>>;
  assessableCount: number;
  abstainedOnAssessable: number;
  precision: number | null;
  recallAmongAnswered: number | null;
  recallIncludingAbstentions: number | null;
}>;

const isObservation = (value: unknown): value is Observation =>
  typeof value === 'string' && observations.some((item) => item === value);
const divide = (numerator: number, denominator: number) => denominator ? numerator / denominator : null;

/** Each call evaluates one finding from one model/configuration on a frozen dataset. */
export function evaluateFinding(records: readonly EvaluationRecord[], finding: Finding): BenchmarkResult {
  const matrix: BenchmarkResult['matrix'] = {
    observed: { observed: 0, not_observed: 0, unassessable: 0 },
    not_observed: { observed: 0, not_observed: 0, unassessable: 0 },
    unassessable: { observed: 0, not_observed: 0, unassessable: 0 },
  };
  const images = new Set<string>();
  const participants = new Set<string>();
  for (const record of records) {
    if (record.finding !== finding) continue;
    if (!record.imageId.trim() || !record.participantId.trim() || !isObservation(record.reference) || !isObservation(record.predicted)) {
      throw new Error('Invalid benchmark record');
    }
    if (images.has(record.imageId)) throw new Error('Duplicate image for finding');
    images.add(record.imageId);
    participants.add(record.participantId);
    matrix[record.reference][record.predicted]++;
  }
  const tp = matrix.observed.observed;
  const fp = matrix.not_observed.observed;
  const fn = matrix.observed.not_observed;
  const observedAbstained = matrix.observed.unassessable;
  return {
    imageCount: images.size,
    participantCount: participants.size,
    matrix,
    assessableCount: observations.reduce((sum, predicted) => sum + matrix.observed[predicted] + matrix.not_observed[predicted], 0),
    abstainedOnAssessable: observedAbstained + matrix.not_observed.unassessable,
    precision: divide(tp, tp + fp),
    recallAmongAnswered: divide(tp, tp + fn),
    recallIncludingAbstentions: divide(tp, tp + fn + observedAbstained),
  };
}
