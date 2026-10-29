import assert from 'node:assert/strict';
import test from 'node:test';
import { formatAttribution } from '../src/lib/domain/catalog.ts';
import type { AttributionSet } from '../src/lib/domain/catalog.ts';
import { buildTraditionalAttributionParts, formatTraditionalAttributionCompact } from '../src/lib/utils/traditional-attribution-phrase.ts';
import { withLegacyAttributionColumns } from '../src/lib/server/catalog-schema-compat.ts';

const reviewedPhrase = 'Obra atribuida a la colaboración de Manuel de Vargas y Luis de Belmonte Bermúdez con un tercer ingenio, para quien se han propuesto los nombres de Jerónimo de Cáncer o Antonio Martínez de Meneses; también se ha propuesto la participación de Sebastián de Alarcón.';
const attribution: AttributionSet = { groups: [{ members: [{ authorId: 'a', authorName: 'Vargas' }, { authorId: 'b', authorName: 'Belmonte' }] }], connector: 'and' };

test('compact labels use groups while detailed/API phrases retain the exact approved prose', () => {
	const reviewed = { ...attribution, reviewedPhrase };
	assert.equal(formatAttribution(reviewed), reviewedPhrase);
	assert.equal(formatTraditionalAttributionCompact(reviewed), 'Vargas y Belmonte');
	assert.equal(buildTraditionalAttributionParts(reviewed).map((part) => part.value).join(''), reviewedPhrase);
	assert.deepEqual(buildTraditionalAttributionParts(reviewed).filter((part) => part.kind === 'author').map((part) => part.authorId), ['a', 'b']);
	assert.equal(buildTraditionalAttributionParts(reviewed, { includePhrasePrefix: false }).map((part) => part.value).join(''), reviewedPhrase);
	assert.equal(reviewed.groups, attribution.groups);
});

test('a work without a reviewed phrase retains its previous attribution', () => {
	assert.equal(formatAttribution(attribution), 'Vargas y Belmonte');
	assert.equal(buildTraditionalAttributionParts(attribution).map((part) => part.value).join(''), 'Obra atribuida a la colaboración de Vargas y Belmonte.');
});

test('remote-to-legacy dev fallback removes only absent optional aliases and participation predicate', () => {
	const sql = "SELECT m.confianza, m.scope AS scope, s.reviewed_phrase AS reviewed_phrase FROM attribution_sets s JOIN attribution_members m WHERE EXISTS(SELECT 1 FROM attribution_members pm WHERE pm.scope = 'participation')";
	assert.equal(withLegacyAttributionColumns(sql, { memberScope: true, reviewedPhrase: true }), sql);
	const legacy = withLegacyAttributionColumns(sql, { memberScope: false, reviewedPhrase: false });
	assert.match(legacy, /m\.confianza, NULL AS scope, NULL AS reviewed_phrase/);
	assert.match(legacy, /WHERE 0\)/);
	assert.doesNotMatch(legacy, /m\.scope|s\.reviewed_phrase|pm\.scope/);
	assert.match(withLegacyAttributionColumns(sql, { memberScope: true, reviewedPhrase: false }), /m\.scope AS scope, NULL AS reviewed_phrase/);
	assert.equal(withLegacyAttributionColumns('SELECT titulo FROM works WHERE id = ?', { memberScope: false, reviewedPhrase: false }), 'SELECT titulo FROM works WHERE id = ?');
});
