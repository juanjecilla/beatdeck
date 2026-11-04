import { test } from 'node:test';
import assert from 'node:assert/strict';
import { failedPage, reportPage } from '../../scripts/lib.mjs';

// R17: a page whose capture threw had no printDiff, and the report step died on undefined.toFixed.
test('a page that could not be captured still has a report row', () => {
  const row = reportPage(failedPage([3, 2]));
  assert.deepEqual(row, { page: '3.2', mode: 'vector', printDiff: null, losses: [{ level: 'error', text: 'the page could not be captured' }] });
});
test('a result without printDiff (undefined) is reported as null, not a crash', () => {
  assert.equal(reportPage({ s: 1, b: 1, mode: 'vector', losses: [] }).printDiff, null);
});
test('printDiff is rounded to two decimals', () => assert.equal(reportPage({ s: 1, b: 1, mode: 'raster', printDiff: 14.2857, losses: [] }).printDiff, 14.29));
