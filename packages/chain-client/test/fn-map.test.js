import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FUNCTION_MAP } from '../src/fn-map.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..');

function walkDir(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(full));
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

describe('Function Map completeness and consistency', () => {
  it('covers every chainBridge submit and evaluate call from apps/api/src', () => {
    const apiSrc = path.join(REPO_ROOT, 'apps', 'api', 'src');
    const apiFiles = walkDir(apiSrc);

    const apiCalls = new Set();
    const pattern = /chainBridge\.(?:submit|evaluate)\s*\([^,]+,\s*'([^']+)'/g;

    for (const file of apiFiles) {
      const content = fs.readFileSync(file, 'utf8');
      const matches = [...content.matchAll(pattern)];
      for (const m of matches) {
        apiCalls.add(m[1]);
      }
    }

    assert.ok(apiCalls.size > 0, 'Found zero chainBridge calls in apps/api/src');

    const missingInMap = [];
    for (const fn of apiCalls) {
      if (!FUNCTION_MAP[fn]) {
        missingInMap.push(fn);
      }
    }

    assert.deepStrictEqual(
      missingInMap,
      [],
      `Missing functions in FUNCTION_MAP: ${missingInMap.join(', ')}`
    );
  });

  it('validates each entry has a contract string and an args function', () => {
    for (const [fnName, mapping] of Object.entries(FUNCTION_MAP)) {
      assert.ok(mapping.contract, `${fnName} must specify a contract name`);
      assert.strictEqual(
        typeof mapping.args,
        'function',
        `${fnName} must specify an args serializer function`
      );
      const argsResult = mapping.args({ id: 'TEST-123' });
      assert.ok(
        Array.isArray(argsResult),
        `${fnName} args serializer must return an array`
      );
    }
  });
});
