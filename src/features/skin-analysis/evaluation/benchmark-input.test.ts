import { parseBenchmarkInput } from './benchmark-input';

const record = { participantId: 'p1', imageId: 'i1', finding: 'visible_acne', reference: 'observed', predicted: 'unassessable' };
const input = { datasetVersion: 'v1', modelVersion: 'test-model', split: 'validation', records: [record] };

test('accepts a valid record and rejects malformed or duplicate labels', () => {
  expect(parseBenchmarkInput(input).records).toHaveLength(1);
  expect(() => parseBenchmarkInput({ ...input, records: [{ ...record, predicted: 'unknown' }] })).toThrow();
  expect(() => parseBenchmarkInput({ ...input, records: [record, record] })).toThrow('Duplicate');
  expect(() => parseBenchmarkInput({ ...input, records: [record, { ...record, finding: 'visible_redness', participantId: 'p2' }] })).toThrow('multiple participants');
  expect(() => parseBenchmarkInput({ ...input, split: 'train' })).toThrow();
});
