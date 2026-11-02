import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';
import { load } from 'cheerio';
import { createServer } from 'vite';

const root = process.env.BITESO_TEST_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('TEI shared pages have distinct anchors and logical segments claim no page number', async () => {
	const candidate = process.env.BITESO_UI_CANDIDATE;
	const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom',
		plugins: [{ name: 'biteso-candidate', enforce: 'pre', async load(id) {
			if (id.split('?')[0] === path.join(root, 'src/routes/biteso/[id]/+page.svelte')) {
				// SSR renders closed navigation by default. Open the fixture's groups
				// through initial state so its real href generation is exercised.
				const source = await readFile(candidate || id.split('?')[0], 'utf8');
				return source.replace('let openTeiNavigationGroups = $state<string[]>([]);',
					`let openTeiNavigationGroups = $state<string[]>(['act_I', 'act_II', 'act_III', 'logical_II', 'logical_III', 'tei-pages-without-jornada']);`);
			}
		} }]
	});
	try {
		const { default: Page } = await server.ssrLoadModule('/src/routes/biteso/[id]/+page.svelte');
		const { render } = await server.ssrLoadModule('svelte/server');
		const work = { id: 'fixture', title: 'Texto de prueba', slug: 'fixture', genre: 'Comedia', generalGenre: 'Teatro',
			origin: 'Fuente de prueba', textState: 'Bueno', addedOn: '2026/11', traditionalAttribution: { groups: [], connector: 'and' },
			stylometryAttribution: { groups: [], connector: 'and' }, textLinks: [], inAuthorshipExam: true, shortSummary: '', hasSummaryFile: true };
		const stanza = (text) => [{ type: 'speech', lines: [{ text, parts: [{ text }], unclear: false }] }];
		const physical = (n, act, text) => ({ n, folio: n, facs: `page${n}`, pdfPage: n, image: '',
			jornada: { id: `act_${act}`, n: act, label: `Jornada ${act}` }, blocks: stanza(text) });
		const logical = (act) => ({ n: '', folio: '', facs: '', pdfPage: '', image: '',
			jornada: act ? { id: `logical_${act}`, n: act, label: `Jornada ${act}` } : null, blocks: stanza('Texto sin paginación') });
		const pages = [physical('16', 'I', 'Antes'), physical('17', 'I', 'Fin de I'),
			physical('17', 'II', 'Inicio de II'), physical('18', 'II', 'Después'), logical('III'), logical(null)];
		const data = { locale: 'es', work, publishedOn: '', citation: 'Cita de prueba', canonicalUrl: 'https://etso.es/biteso/fixture',
			biteso: { id: 'fixture', workId: 'fixture', title: work.title, bitesoNombre: 'Prueba', bitesoRevisores: [], text: '',
				tei: { source: 'tei', version: 1, workId: 'fixture', pages, downloads: {}, stats: { pages: pages.length, lines: 6, unclearLines: 0 } } } };
		const request = { page: { data, url: new URL(data.canonicalUrl), params: {}, route: { id: '/biteso/[id]' }, status: 200 } };
		const html = render(Page, { props: { data }, context: new Map([['__request__', request]]) }).body;
		const $ = load(html);
		const sections = $('section[id^="tei-page-"]');
		const ids = sections.map((_, node) => $(node).attr('id')).get();
		assert.deepEqual(ids, ['tei-page-16', 'tei-page-17', 'tei-page-17-slice-3', 'tei-page-18', 'tei-page-5', 'tei-page-6']);
		assert.equal(new Set(ids).size, ids.length);
		for (const id of ids) {
			assert.equal($(`[id="${id}"]`).length, 1);
			assert.ok($(`a[href="#${id}"]`).length > 0, id);
		}
		assert.match($('#tei-page-17').text(), /Fin de I/);
		assert.match($('#tei-page-17-slice-3').text(), /Inicio de II/);
		assert.equal($('#tei-page-17-slice-3 h3').text().trim(), 'Pag. 17');
		assert.equal($('#tei-page-5 h3').text().trim(), 'Jornada III');
		assert.equal($('#tei-page-6 h3').text().trim(), 'Texto');
		assert.equal($('#tei-jornada-act_II').next('section').attr('id'), 'tei-page-17-slice-3');
		// A blank logical n can collide with an earlier physical n through the
		// legacy index fallback. Explicit page numbers also reserve suffix IDs.
		data.biteso.tei.pages = [physical('2', 'I', 'Physical two'), logical('II'),
			physical('2-slice-2', 'III', 'Reserved suffix')];
		const collisionHtml = render(Page, { props: { data }, context: new Map([['__request__', request]]) }).body;
		const collision = load(collisionHtml);
		assert.deepEqual(collision('section[id^="tei-page-"]').map((_, node) => collision(node).attr('id')).get(),
			['tei-page-2', 'tei-page-2-slice-2-slice', 'tei-page-2-slice-2']);
		assert.equal(collision('#tei-page-2-slice-2-slice h3').text().trim(), 'Jornada II');
		assert.ok(collision('a[href="#tei-page-2-slice-2-slice"]').length > 0);

	} finally {
		await server.close();
	}
});
