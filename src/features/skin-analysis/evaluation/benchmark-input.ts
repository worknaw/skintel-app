import { observations, type EvaluationRecord, type Finding, type Observation } from './benchmark.ts';

export type BenchmarkInput = Readonly<{
  datasetVersion: string;
  split: 'validation' | 'test';
  modelVersion: string;
  records: EvaluationRecord[];
}>;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 120;
}

function isObservation(value: unknown): value is Observation {
  return typeof value === 'string' && observations.some((item) => item === value);
}

function isFinding(value: unknown): value is Finding {
  return value === 'visible_acne' || value === 'visible_redness';
}

/** Validates untrusted local files without printing their contents or identifiers. */
export function parseBenchmarkInput(value: unknown): BenchmarkInput {
  if (!isObject(value) || !isText(value.datasetVersion) || !isText(value.modelVersion) ||
      (value.split !== 'validation' && value.split !== 'test') ||
      !Array.isArray(value.records) || value.records.length === 0) {
    throw new Error('Invalid benchmark input metadata or empty records');
  }
  const records: EvaluationRecord[] = [];
  const owners = new Map<string, string>();
  const keys = new Set<string>();
  for (const item of value.records) {
    if (!isObject(item) || !isText(item.imageId) || !isText(item.participantId) ||
        !isFinding(item.finding) || !isObservation(item.reference) || !isObservation(item.predicted)) {
      throw new Error('Invalid benchmark record');
    }
    if (owners.has(item.imageId) && owners.get(item.imageId) !== item.participantId) {
      throw new Error('Image belongs to multiple participants');
    }
    owners.set(item.imageId, item.participantId);
    const key = JSON.stringify([item.finding, item.imageId]);
    if (keys.has(key)) throw new Error('Duplicate image for finding');
    keys.add(key);
    records.push({ participantId: item.participantId, imageId: item.imageId, finding: item.finding, reference: item.reference, predicted: item.predicted });
  }
  return { datasetVersion: value.datasetVersion, modelVersion: value.modelVersion, split: value.split, records };
}
