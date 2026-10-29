import assert from 'node:assert/strict';
import test from 'node:test';
import { formatAttribution, formatAttributionConfidence, formatConfidence, inferWorkAuthorshipType, normalizeConfidence } from '../src/lib/domain/catalog.ts';
import type { AttributionMember, AttributionSet, CatalogWork } from '../src/lib/domain/catalog.ts';
import { resolveStylometryResult } from '../src/lib/utils/stylometry-result.ts';
import { buildTraditionalAttributionParts } from '../src/lib/utils/traditional-attribution-phrase.ts';

const member = (authorId: string, extra: Partial<AttributionMember> = {}): AttributionMember => ({ authorId, authorName: authorId, ...extra });
const set = (...groups: AttributionMember[][]): AttributionSet => ({ groups: groups.map((members) => ({ members })), connector: groups.length > 1 ? 'or' : 'and' });
const work = (stylometryAttribution: AttributionSet, traditionalAttribution = stylometryAttribution, result1 = 'automático', result2?: string): CatalogWork => ({ stylometryAttribution, traditionalAttribution, result1, result2 } as CatalogWork);

test('participation is an optional scope, not a new confidence or filter value', () => {
	const a = member('Bances', { confidence: 'segura', scope: 'participation' });
	assert.equal(formatAttributionConfidence(a), 'Participación segura');
	assert.equal(formatAttribution(set([a])), 'Bances [Participación segura]');
	assert.equal(a.confidence, 'segura');
	assert.equal(normalizeConfidence('segura'), 'segura');
	assert.equal(normalizeConfidence('participación segura'), undefined);
	assert.equal(formatConfidence('segura'), 'Segura');
	assert.equal(formatAttribution(set([member('Bances', { confidence: 'segura' })])), 'Bances [Segura]');
});

test('alternative authors are not flattened into a collaboration', () => {
	assert.equal(inferWorkAuthorshipType(work(set([member('A')], [member('B')]))), 'unica');
	assert.equal(inferWorkAuthorshipType(work(set([member('A'), member('B')], [member('C')]))), 'desconocida');
});

test('one participant in a collaborative tradition does not become sole author', () => {
	const a = member('A', { scope: 'participation', confidence: 'segura' });
	assert.equal(inferWorkAuthorshipType(work(set([a]), set([member('A'), member('B')]))), 'colaboracion');
	const anonymous = member('desconocido_dos_ingenios', { authorName: 'Desconocido (Dos ingenios)' });
	assert.equal(inferWorkAuthorshipType(work(set([a]), set([member('A')], [member('A'), anonymous]))), 'desconocida');
	assert.equal(inferWorkAuthorshipType(work(set([anonymous]))), 'colaboracion');
});

test('approved manual result wins, preserves second result and ignores No', () => {
	const a = member('A', { confidence: 'segura', scope: 'participation' });
	assert.equal(resolveStylometryResult(work(set([a]), undefined, 'Texto aprobado.', 'No')), 'Texto aprobado.');
	assert.equal(resolveStylometryResult(work(set([a]), undefined, 'Texto aprobado.', 'Matiz por jornadas.')), 'Texto aprobado. Matiz por jornadas.');
	assert.equal(resolveStylometryResult(work(set([a]), undefined, 'Texto aprobado. Matiz por jornadas.', 'Matiz por jornadas.')), 'Texto aprobado. Matiz por jornadas.');
	assert.equal(resolveStylometryResult(work(set([a]), undefined, 'El auto conserva un resultado manual.', 'No')), 'El auto conserva un resultado manual.');
});

test('automatic partial conclusion does not assert whole-work authorship', () => {
	assert.equal(resolveStylometryResult(work(set([member('A', { confidence: 'segura', scope: 'participation' })]))), 'Los análisis respaldan con claridad la participación de A.');
});

test('Macías keeps the solo or anonymous collaboration alternatives in the approved human phrase', () => {
	const named = member('bances', { authorName: 'Francisco Antonio de Bances Candamo' });
	const anonymous = member('desconocido_dos_ingenios', { authorName: 'Desconocido (Dos ingenios)' });
	assert.equal(buildTraditionalAttributionParts(set([named], [named, anonymous])).map((part) => part.value).join(''), 'Obra atribuida a Francisco Antonio de Bances Candamo o a su colaboración con otros dos ingenios no identificados.');
});


test('automatic alternative participations are not described as a confirmed team', () => {
	const a = member('A', { scope: 'participation', confidence: 'segura' });
	const b = member('B', { scope: 'participation', confidence: 'probable' });
	const result = resolveStylometryResult(work(set([a], [b])));
	assert.match(result ?? '', /hipótesis alternativas/);
	assert.doesNotMatch(result ?? '', /participación de A y B/);
});


test('two or three identified participants establish collaboration despite mixed traditional alternatives', () => {
	const a = member('A', { scope: 'participation', confidence: 'segura' });
	const b = member('B', { scope: 'participation', confidence: 'probable' });
	const c = member('C', { scope: 'participation', confidence: 'segura' });
	const mixedTradition = set([member('A')], [member('A'), member('B'), member('C')]);
	assert.equal(inferWorkAuthorshipType(work(set([a, b]), mixedTradition)), 'colaboracion');
	assert.equal(inferWorkAuthorshipType(work(set([a, b, c]), mixedTradition)), 'colaboracion');
	assert.equal(inferWorkAuthorshipType(work(set([a, b], [a, c]), mixedTradition)), 'colaboracion');
	// Two alternative single participants are not an identified team.
	assert.equal(inferWorkAuthorshipType(work(set([a], [b]), set([member('A')]))), 'unica');
	assert.equal(inferWorkAuthorshipType(work(set([a], [b]), mixedTradition)), 'desconocida');
});
