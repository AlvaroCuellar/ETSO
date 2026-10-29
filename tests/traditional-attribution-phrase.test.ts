import assert from 'node:assert/strict';
import test from 'node:test';

import type { AttributionSet } from '../src/lib/domain/catalog.ts';
import {
	buildTraditionalAttributionParts,
	formatTraditionalAttributionCompact
} from '../src/lib/utils/traditional-attribution-phrase.ts';

const author = (authorName: string) => ({
	authorId: authorName.toLowerCase().replaceAll(/\W+/g, '_'),
	authorName
});

const attribution = (...groups: string[][]): AttributionSet => ({
	groups: groups.map((members) => ({ members: members.map(author) })),
	connector: groups.length > 1 ? 'or' : 'and'
});

const phrase = (set: AttributionSet): string =>
	buildTraditionalAttributionParts(set)
		.map((part) => part.value)
		.join('');

test('redacta una atribución individual', () => {
	assert.equal(phrase(attribution(['Calderón'])), 'Obra atribuida a Calderón.');
});

test('redacta una colaboración', () => {
	assert.equal(
		phrase(attribution(['Moreto', 'Matos Fragoso'])),
		'Obra atribuida a la colaboración de Moreto y Matos Fragoso.'
	);
});

test('distingue dos atribuciones alternativas', () => {
	assert.equal(
		phrase(attribution(['Guillén de Castro'], ['Calderón'])),
		'Obra atribuida alternativamente a Guillén de Castro o a Calderón.'
	);
});

test('distingue un autor de una colaboración alternativa', () => {
	assert.equal(
		phrase(attribution(['Calderón'], ['Diego de Figueroa', 'José de Figueroa'])),
		'Obra atribuida alternativamente a Calderón o a la colaboración de Diego de Figueroa y José de Figueroa.'
	);
});

test('distingue una colaboración de un autor alternativo', () => {
	assert.equal(
		phrase(attribution(['Cáncer', 'Juan Vélez'], ['Quiñones de Benavente'])),
		'Obra atribuida alternativamente a la colaboración de Cáncer y Juan Vélez o a Quiñones de Benavente.'
	);
});

test('conserva los grupos en las etiquetas compactas', () => {
	assert.equal(
		formatTraditionalAttributionCompact(
			attribution(['Calderón'], ['Zabaleta', 'Belmonte', 'Martínez'])
		),
		'Calderón o (Zabaleta, Belmonte y Martínez)'
	);
});

test('compact labels preserve an author-alone alternative to a collaboration and do not mutate it', () => {
	const set = { ...attribution(['Matos', 'Villaviciosa'], ['Matos']), reviewedPhrase: 'Obra atribuida a la colaboración de Matos y Villaviciosa o a Matos.' };
	const before = structuredClone(set);
	assert.equal(formatTraditionalAttributionCompact(set), '(Matos y Villaviciosa) o Matos');
	assert.deepEqual(set, before);
	assert.equal(phrase(set), set.reviewedPhrase);
});

test('compact outer connectors follow the structured set, including translated labels', () => {
	const set = { ...attribution(['Calderón'], ['Matos']), connector: 'and' as const };
	assert.equal(formatTraditionalAttributionCompact(set), 'Calderón y Matos');
	assert.equal(formatTraditionalAttributionCompact(set, 'Unknown', { and: 'and', or: 'or' }), 'Calderón and Matos');
});

test('anonymous teams retain their count in compact alternatives', () => {
	const set = attribution(['Calderón'], ['Desconocido (tres ingenios)']);
	set.reviewedPhrase = 'Obra atribuida a Calderón o a tres ingenios no identificados.';
	assert.equal(formatTraditionalAttributionCompact(set), 'Calderón o Desconocido (tres ingenios)');
});

test('traduce fragmentos de atribuciones alternativas sin alterar los nombres', () => {
	const translations: Record<string, string> = {
		'Obra atribuida alternativamente a': 'Work alternatively attributed to',
		a: 'to'
	};
	const parts = buildTraditionalAttributionParts(
		attribution(['Vicente Cipriano Segura'], ['Calderón']),
		{
			translate: (value) => translations[value] ?? value,
			connectorLabels: { and: 'and', or: 'or' }
		}
	);

	assert.equal(
		parts.map((part) => part.value).join(''),
		'Work alternatively attributed to Vicente Cipriano Segura or to Calderón.'
	);
	assert.deepEqual(
		parts.filter((part) => part.kind === 'author').map((part) => part.value),
		['Vicente Cipriano Segura', 'Calderón']
	);
});
