import { evaluateFinding, type EvaluationRecord } from './benchmark';

const example: EvaluationRecord[] = [
  { participantId: 'p1', imageId: 'i1', finding: 'visible_acne', reference: 'observed', predicted: 'observed' },
  { participantId: 'p1', imageId: 'i2', finding: 'visible_acne', reference: 'observed', predicted: 'unassessable' },
  { participantId: 'p2', imageId: 'i3', finding: 'visible_acne', reference: 'not_observed', predicted: 'observed' },
  { participantId: 'p3', imageId: 'i4', finding: 'visible_acne', reference: 'unassessable', predicted: 'not_observed' },
];

test('reports abstentions separately and does not treat them as successful answers', () => {
  const result = evaluateFinding(example, 'visible_acne');
  expect(result.imageCount).toBe(4);
  expect(result.participantCount).toBe(3);
  expect(result.matrix.unassessable.not_observed).toBe(1);
  expect(result.abstainedOnAssessable).toBe(1);
  expect(result.precision).toBe(0.5);
  expect(result.recallAmongAnswered).toBe(1);
  expect(result.recallIncludingAbstentions).toBe(0.5);
});

test('rejects duplicate image labels and reports undefined metrics for empty data', () => {
  expect(() => evaluateFinding([...example, example[0]], 'visible_acne')).toThrow('Duplicate image');
  expect(evaluateFinding([], 'visible_redness').precision).toBeNull();
});
