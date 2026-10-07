import assert from 'node:assert/strict';
import test from 'node:test';
import { parseExamenFilters } from '../src/lib/server/examen-query.ts';

const parse = (query: string) => parseExamenFilters(new URLSearchParams(query));

test('month filters preserve valid older day-based links', () => {
	assert.equal(parse('desde=2026-08&hasta=2026-09').desde, '2026-08');
	assert.deepEqual(parse('desde=2026-08-01&hasta=2026-08-31'), parse('desde=2026-08&hasta=2026-08'));
	assert.equal(parse('desde=2024-02-29').desde, '2024-02');
	assert.equal(parse('').desde, '');
});

test('invalid dates and reversed ranges are rejected', () => {
	for (const query of [
		'desde=2026-09&hasta=2026-08',
		'desde=2026-08-31&hasta=2026-08-01',
		'desde=2026-13',
		'desde=2026-02-30',
		'desde=2025-02-29',
		'desde=invalid'
	]) {
		assert.throws(() => parse(query), (err: unknown) => (err as { status: number }).status === 400, query);
	}
});
