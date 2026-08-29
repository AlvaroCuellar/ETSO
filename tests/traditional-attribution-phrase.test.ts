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
		'Calderón o Zabaleta, Belmonte y Martínez'
	);
});
