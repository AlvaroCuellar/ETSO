import assert from 'node:assert/strict';
import test from 'node:test';
import { getAsodatWorkUrl } from '../src/lib/domain/asodat.ts';

test('ASODAT links only accept positive integer identifiers', () => {
  assert.equal(getAsodatWorkUrl(1234), 'https://asodat.uv.es/titulos/search/detail/1234');
  for (const value of [null, undefined, 0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(getAsodatWorkUrl(value), undefined);
  }
});
