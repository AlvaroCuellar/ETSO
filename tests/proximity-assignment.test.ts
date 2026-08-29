import assert from 'node:assert/strict';
import test from 'node:test';

import {
	assignDistinctProximitySpans,
	canonicalSpanPairKey,
	canonicalSpanSetKey,
	tokenSpanKey
} from '../src/lib/search/proximity-assignment.ts';

const span = (tokenStart: number, tokenEnd = tokenStart) => ({ tokenStart, tokenEnd });

test('asigna una aparición diferente a cada condición repetida', () => {
	const first = span(3);
	const second = span(6);
	const assignment = assignDistinctProximitySpans([
		[first, second],
		[first, second]
	]);

	assert.ok(assignment);
	assert.equal(new Set(assignment.map(tokenSpanKey)).size, 2);
});

test('rechaza una consulta si varias condiciones solo pueden reutilizar la misma aparición', () => {
	const onlyOccurrence = span(4);
	assert.equal(assignDistinctProximitySpans([[onlyOccurrence], [onlyOccurrence]]), null);
});

test('exige cuatro apariciones diferentes cuando la misma condición se repite cuatro veces', () => {
	const occurrences = [span(1), span(3), span(5), span(7)];
	const assignment = assignDistinctProximitySpans([
		occurrences,
		occurrences,
		occurrences,
		occurrences
	]);

	assert.ok(assignment);
	assert.equal(new Set(assignment.map(tokenSpanKey)).size, 4);
	assert.equal(
		assignDistinctProximitySpans([
			occurrences.slice(0, 3),
			occurrences.slice(0, 3),
			occurrences.slice(0, 3),
			occurrences.slice(0, 3)
		]),
		null
	);
});

test('reasigna una condición amplia para reservar la única aparición válida de una condición restrictiva', () => {
	const near = span(2);
	const far = span(8);
	const assignment = assignDistinctProximitySpans([
		[near, far],
		[near]
	]);

	assert.ok(assignment);
	assert.equal(tokenSpanKey(assignment[0]), tokenSpanKey(far));
	assert.equal(tokenSpanKey(assignment[1]), tokenSpanKey(near));
});

test('considera idénticas las apariciones con el mismo intervalo de tokens aunque sean objetos distintos', () => {
	assert.equal(assignDistinctProximitySpans([[span(5, 6)], [span(5, 6)]]), null);
});

test('mantiene la asignación en el orden original de las condiciones', () => {
	const firstConditionOnly = span(10);
	const shared = span(12);
	const assignment = assignDistinctProximitySpans([
		[firstConditionOnly],
		[shared, firstConditionOnly]
	]);

	assert.ok(assignment);
	assert.equal(tokenSpanKey(assignment[0]), tokenSpanKey(firstConditionOnly));
	assert.equal(tokenSpanKey(assignment[1]), tokenSpanKey(shared));
});

test('genera la misma clave para las dos orientaciones de una pareja', () => {
	const left = span(7);
	const right = span(14);
	assert.equal(canonicalSpanPairKey(left, right), canonicalSpanPairKey(right, left));
});

test('genera la misma clave para todas las permutaciones de un conjunto de apariciones', () => {
	const first = span(1);
	const second = span(4);
	const third = span(9);
	assert.equal(
		canonicalSpanSetKey([first, second, third]),
		canonicalSpanSetKey([third, first, second])
	);
});
