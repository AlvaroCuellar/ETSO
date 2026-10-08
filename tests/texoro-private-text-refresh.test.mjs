import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/server/r2-private.ts', import.meta.url), 'utf8');
const cache = source.slice(source.indexOf('interface PrivateTextCacheEntry'), source.indexOf('const logSlowR2'));
const loader = source.slice(source.indexOf('export const readPrivateTextByTextKey'), source.indexOf('export const readPrivateTextByWorkId'));
const compiled = ts.transpileModule(`const PRIVATE_TEXT_CACHE_TTL_MS = 600000;
const PRIVATE_TEXT_CACHE_MAX_ITEMS = 8; const PRIVATE_TEXT_CACHE_MAX_BYTES = 24 * 1024 * 1024;
${cache}\n${loader}`, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;

const fixture = (load) => {
  const exports = {};
  new Function('exports', 'dev', 'env', 'ensurePlainFileName', 'loadPrivateTextByFileName', 'readFile', 'resolve', compiled)(
    exports, false, {}, (name) => name, load, () => { throw new Error('No filesystem'); }, () => {}
  );
  return { read: exports.readPrivateTextByTextKey, clear: exports.clearPrivateTextCache };
};

test('an index update discards cached text with the same filename', async () => {
  let value = 'old poem', reads = 0;
  const cache = fixture(async () => { reads++; return value; });
  assert.equal(await cache.read('poetry.txt'), 'old poem');
  value = 'new poem with different positions';
  assert.equal(await cache.read('poetry.txt'), 'old poem');
  cache.clear();
  assert.equal(await cache.read('poetry.txt'), value);
  assert.equal(await cache.read('poetry.txt'), value);
  assert.equal(reads, 2);
});

for (const failOldRequest of [false, true]) {
  test(`an old text request ${failOldRequest ? 'failure cannot delete' : 'success cannot replace'} the new cache`, async () => {
    const requests = [];
    const cache = fixture(() => new Promise((resolve, reject) => requests.push({ resolve, reject })));
    const old = cache.read('poetry.txt');
    const oldFailure = failOldRequest ? assert.rejects(old, /old request failed/) : null;
    cache.clear();
    const fresh = cache.read('poetry.txt');
    assert.equal(requests.length, 2);
    requests[1].resolve('new text');
    assert.equal(await fresh, 'new text');
    if (failOldRequest) { requests[0].reject(new Error('old request failed')); await oldFailure; }
    else { requests[0].resolve('old text'); assert.equal(await old, 'old text'); }
    assert.equal(await cache.read('poetry.txt'), 'new text');
    assert.equal(requests.length, 2);
  });
}
