import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { getRelatedBibliographyKeys, getRemainingBibliographyKeys, deduplicateBibliographySections, interleaveBibliographyAuthors } from '../src/lib/domain/report-related-bibliography.ts';

test('Más información alterna autores después de excluir los trabajos ya mostrados', () => {
	const entries = [
		{ id: 'g1', author: 'Vega García-Luengos, Germán' },
		{ id: 'g2', author: 'Rucio, José María y Germán Vega García-Luengos' },
		{ id: 'c1', author: 'Cuéllar, Álvaro' },
		{ id: 'c2', author: 'Cuéllar, Álvaro y Germán Vega García-Luengos' },
		{ id: 'c3', author: 'Martínez Carro, Elena y Álvaro Cuéllar' },
		{ id: 'otro', author: 'Otra persona' }
	];
	const remaining = getRemainingBibliographyKeys(entries.map(e => e.id), ['c1']);
	const filtered = entries.filter(e => remaining.includes(e.id));
	assert.deepEqual(interleaveBibliographyAuthors(filtered, e => e.author).map(e => e.id), ['c2', 'g1', 'c3', 'g2', 'otro']);
	assert.deepEqual(interleaveBibliographyAuthors(entries.slice(0, 2), e => e.author), entries.slice(0, 2));
});

test('la primera lista bibliográfica tiene prioridad y las posteriores no repiten artículos', () => {
	const sections = [
		{ id: 'cita', entries: [{ id: 'etso' }] },
		{ id: 'relacionados', entries: [{ id: 'lope1' }, { id: 'tesis' }, { id: 'lope2' }] },
		{ id: 'procesos', entries: [{ id: 'metodo' }, { id: 'lope1' }, { id: 'monja' }, { id: 'lope2' }, { id: 'metodo' }] },
		{ id: 'mas', entries: [{ id: 'monja' }, { id: 'otro' }, { id: 'tesis' }] },
		{ id: 'vacia', entries: [{ id: 'etso' }] }
	];
	assert.deepEqual(deduplicateBibliographySections(sections).map(s => [s.id, s.entries.map(e => e.id)]), [
		['cita', ['etso']], ['relacionados', ['lope1', 'tesis', 'lope2']],
		['procesos', ['metodo', 'monja']], ['mas', ['otro']]
	]);
	assert.equal(sections[2].entries.length, 5, 'no modifica las listas de origen');
});
import type { AttributionSet } from '../src/lib/domain/catalog.ts';

const { rules } = JSON.parse(readFileSync(new URL('../data/referencias/informes-relacionados.json', import.meta.url), 'utf8'));
const bibliography = JSON.parse(readFileSync(new URL('../data/referencias/bibliografia.json', import.meta.url), 'utf8'));
const set = (...groups: string[][]): AttributionSet => ({
	groups: groups.map((ids) => ({ members: ids.map((authorId) => ({ authorId, authorName: authorId })) })),
	connector: 'or'
});
const work = (traditionalAttribution = set(), stylometryAttribution = set(), id = 'obra') => ({ id, traditionalAttribution, stylometryAttribution });

test('prioriza el artículo conjunto de Vélez frente al estudio de la Segunda parte de Tirso', () => {
	const keys = getRelatedBibliographyKeys(work(set(['tirso_de_molina']), set(['velez_de_guevara_luis']), 'TIRSOdudosa_AmantesDeTeruel'), rules);
	assert.ok(keys.indexOf('cuellar-gonzalez-vega-2026-velez') >= 0);
	assert.ok(keys.indexOf('cuellar-gonzalez-vega-2026-velez') < keys.indexOf('vega-2025-mas-evidencias-tirso'));
});

test('relaciona Lope por cualquiera de las dos atribuciones y no repite referencias', () => {
	const lope = set(['vega_carpio_lope_de']);
	const expected = ['vega-2021-confirmaciones-i', 'cuellar-2022-tesis', 'vega-2023-confirmaciones-ii'];
	assert.deepEqual(getRelatedBibliographyKeys(work(lope), rules), expected);
	assert.deepEqual(getRelatedBibliographyKeys(work(set(), lope), rules), expected);
	assert.deepEqual(getRelatedBibliographyKeys(work(lope, lope), rules), expected);
});

test('incluye atribuciones alternativas y colaboraciones sin confundir Luis y Juan Vélez', () => {
	const keys = getRelatedBibliographyKeys(work(set(['otro'], ['claramonte_y_corroy_andres_de', 'velez_de_guevara_luis'])), rules);
	assert.deepEqual(keys, ['cuellar-vega-2023-claramonte', 'cuellar-gonzalez-vega-2026-velez']);
	assert.deepEqual(getRelatedBibliographyKeys(work(set(['velez_de_guevara_juan'])), rules), []);
});

test('La francesa Laura suma estudios particulares a los generales de Lope', () => {
	const keys = getRelatedBibliographyKeys(work(set(['desconocido']), set(['vega_carpio_lope_de']), 'DESCONOCIDO_FrancesaLaura'), rules);
	assert.equal(keys.length, 5);
	assert.equal(keys[0], 'cuellar-vega-2023-francesa-laura-articulo');
	assert.ok(!getRelatedBibliographyKeys(work(set(['vega_carpio_lope_de'])), rules).includes(keys[0]));
});

test('no añade referencias específicas a obras sin atribución pertinente', () => {
	assert.deepEqual(getRelatedBibliographyKeys(work(set(['calderon_de_la_barca_pedro']), set(['no_apunta_a_ningun_autor'])), rules), []);
});

test('todas las referencias configuradas existen y la cita general sigue siendo ETSO', () => {
	for (const rule of rules) for (const key of rule.entryKeys) assert.ok(bibliography.entriesByKey[key], key);
	assert.deepEqual(bibliography.views.informes.base.sections[0].entryKeys, ['etso-web']);
});

test('los estudios particulares distinguen versiones y obras homónimas', () => {
	const references = (id: string) => getRelatedBibliographyKeys(work(set(), set(), id), rules);
	assert.ok(references('BELMONTE&ROJAS&CALDERON_MejorAmigoElMuerto(VersionManuscritos)').includes('campion-cuellar-2021-refundicion'));
	assert.ok(!references('ROJAS_MejorAmigoElMuerto').includes('campion-cuellar-2021-refundicion'));
	assert.ok(references('SOLIS&COELLO&CALDERON_PastorFido(Transk-IMPR)').includes('vega-2023-colaboradas-calderon'));
	assert.ok(!references('CALDERON_PastorFido(Auto)').includes('vega-2023-colaboradas-calderon'));
	assert.ok(references('TIRSO_MujerPorFuerza').includes('vega-2026-mujer-fuerza'));
});

test('Más información se actualiza sin repetir trabajos relacionados ni metodológicos', () => {
	const all = ['metodo', 'estudio', 'nuevo', 'estudio'];
	assert.deepEqual(getRemainingBibliographyKeys(all, ['metodo', 'estudio']), ['nuevo']);
	assert.deepEqual(getRemainingBibliographyKeys(all, ['metodo']), ['estudio', 'nuevo']);
	assert.deepEqual(getRemainingBibliographyKeys(all, all), []);
	assert.deepEqual(getRemainingBibliographyKeys(all, []), ['metodo', 'estudio', 'nuevo']);
});
