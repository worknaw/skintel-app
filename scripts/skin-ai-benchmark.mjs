import { readFile } from 'node:fs/promises';
import { evaluateFinding } from '../src/features/skin-analysis/evaluation/benchmark.ts';
import { parseBenchmarkInput } from '../src/features/skin-analysis/evaluation/benchmark-input.ts';

async function main() {
  if (process.argv.length !== 3) throw new Error('Usage: node scripts/skin-ai-benchmark.mjs <input.json>');
  const input = parseBenchmarkInput(JSON.parse(await readFile(process.argv[2], 'utf8')));
  const summary = {
    datasetVersion: input.datasetVersion,
    split: input.split,
    modelVersion: input.modelVersion,
    results: {
      visible_acne: evaluateFinding(input.records, 'visible_acne'),
      visible_redness: evaluateFinding(input.records, 'visible_redness'),
    },
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
}

main().catch((error) => {
  const message = error instanceof SyntaxError ? 'Invalid JSON' : error?.code ? 'Cannot read input file' : error.message;
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
