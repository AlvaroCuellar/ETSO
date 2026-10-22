import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import { load } from 'cheerio';
import { createServer } from 'vite';
import { formatBitesoJornadas } from '../src/lib/server/biteso-jornadas.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const id = 'ULLOA-LUIS&DAVILA-RODRIGO_PicoYCanente';
const corpus = path.resolve(root, '../ETSOdatos/corpus');
const source = await readFile(path.join(corpus, `${id}.txt`), 'utf8');
const divisions = JSON.parse(await readFile(path.join(root, 'data/biteso/jornadas.json'), 'utf8'));
const parts = await Promise.all(['Primera', 'Segunda', 'Tercera'].map((name) =>
	readFile(path.join(corpus, `${id}_${name}Jornada.txt`), 'utf8')));
const display = formatBitesoJornadas(source, divisions[id]);

test('Pico preserves every received line and the exact three jornada boundaries', () => {
	assert.equal(parts.join(''), source);
	assert.equal(display.replace(/^--Jornada (primera|segunda|tercera)--\n/gm, ''), source);
	assert.deepEqual(display.split(/^--Jornada (?:primera|segunda|tercera)--\n/m).slice(1), parts);
	assert.equal(formatBitesoJornadas(source), source);
});

test('an edited source cannot receive stale jornada boundaries', () => {
	const edited = source + 'Un verso añadido.\n';
	assert.equal(formatBitesoJornadas(edited, divisions[id]), edited);
});

test('BITESO renders three distinct headings and working navigation anchors', async () => {
	const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' });
	try {
		const { default: Page } = await server.ssrLoadModule('/src/routes/biteso/[id]/+page.svelte');
		const { render } = await server.ssrLoadModule('svelte/server');
		const work = {
			id, title: 'Pico y Canente', slug: 'pico-y-canente', genre: 'Comedia', generalGenre: 'Teatro',
			origin: 'El texto ha sido preparado por Sergio Rodríguez Nicolás.', textState: 'Bueno', addedOn: '2026/10',
			traditionalAttribution: { groups: [], connector: 'and' },
			stylometryAttribution: { groups: [], connector: 'and' },
			textLinks: [], inAuthorshipExam: true, shortSummary: '', hasSummaryFile: true
		};
		const data = { locale: 'es', work, publishedOn: '',
			citation: 'Rodríguez Nicolás, Sergio. Texto digital de Pico y Canente. BITESO, 2026.',
			canonicalUrl: 'https://etso.es/biteso/pico-y-canente',
			biteso: { id: 'pico-y-canente', workId: id, title: work.title,
				bitesoNombre: 'Rodríguez Nicolás, Sergio', bitesoRevisores: [], text: display }
		};
		const request = { page: { data, url: new URL(data.canonicalUrl), params: {},
			route: { id: '/biteso/[id]' }, status: 200 } };
		const html = render(Page, { props: { data }, context: new Map([['__request__', request]]) }).body;
		const $ = load(html);
		for (const [index, label] of ['primera', 'segunda', 'tercera'].entries()) {
			assert.equal($(`#jornada-${index + 1}`).text().trim(), `Jornada ${label}`);
			assert.ok($(`a[href="#jornada-${index + 1}"]`).length > 0);
		}
		assert.ok($.text().includes('Rodríguez Nicolás, Sergio. Texto digital de Pico y Canente. BITESO, 2026.'));
	} finally {
		await server.close();
	}
});
