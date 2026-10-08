import assert from 'node:assert/strict';
import test from 'node:test';
import { load } from 'cheerio';

// Run with a local catalog server: ETSO_TEST_BASE_URL=http://127.0.0.1:5174.
const baseUrl = process.env.ETSO_TEST_BASE_URL;
const authorPath = '/autores/vega_carpio_lope_de';
const fetchPage = async (path) => {
	const response = await fetch(new URL(path, baseUrl));
	assert.equal(response.status, 200, path);
	return load(await response.text());
};
const rowIds = ($) => $('.obra-row').map((_, row) => $(row).attr('data-obra-id')).get();

test('author pages expose every related work once through crawlable SSR pagination', { skip: !baseUrl }, async () => {
	const first = await fetchPage(authorPath);
	const total = Number(first('[data-filter="related_any"] > div').first().text().trim());
	const links = first('nav[aria-label="Paginación de obras"] a[aria-current], nav[aria-label="Paginación de obras"] a[aria-label]')
		.map((_, link) => first(link).attr('href')).get();
	assert.ok(total > 50, 'fixture must exercise more than one page');
	assert.equal(rowIds(first).length, 50);
	assert.equal(first('.detail-row').length, 0, 'collapsed details should not be generated');
	const seen = new Set();
	for (const path of links) {
		const $ = path === authorPath ? first : await fetchPage(path);
		const ids = rowIds($);
		assert.ok(ids.length > 0 && ids.length <= 50);
		assert.equal($('link[rel="canonical"]').attr('href'), new URL(path, 'https://etso.es').href);
		for (const id of ids) {
			assert.ok(!seen.has(id), `${id} must not repeat between pages`);
			seen.add(id);
		}
	}
	assert.equal(seen.size, total, 'pagination must preserve the whole author list');
});

test('filters search the entire author list, preserve variants and use noindex,follow', { skip: !baseUrl }, async () => {
	const first = await fetchPage(authorPath);
	const nextPath = first('a[rel="next"]').attr('href');
	const second = await fetchPage(nextPath);
	const target = second('.obra-row').first();
	const title = target.find('.obra-title a').first().text().trim();
	const workId = target.attr('data-obra-id');
	assert.ok(title);
	assert.ok(!rowIds(first).includes(workId), 'fixture should not be on page one');
	const filtered = await fetchPage(`${authorPath}?title=${encodeURIComponent(title)}`);
	assert.ok(rowIds(filtered).includes(workId));
	assert.equal(filtered('meta[name="robots"]').attr('content'), 'noindex,follow');
	const variants = await fetchPage(`${authorPath}?title=las%20verdades%20de%20amor`);
	assert.ok(variants('.obra-title').text().includes('¡Ay, verdades'));
});

test('localized pagination and canonical links preserve page and normalize invalid values', { skip: !baseUrl }, async () => {
	const english = await fetchPage(`/en${authorPath}?page=2`);
	assert.equal(english('link[rel="canonical"]').attr('href'), `https://etso.es/en${authorPath}?page=2`);
	assert.equal(english('a[rel="prev"]').attr('href'), `/en${authorPath}`);
	assert.equal(english('a[rel="next"]').attr('href'), `/en${authorPath}?page=3`);
	assert.equal(english('link[hreflang="fr"]').attr('href'), `https://etso.es/fr${authorPath}?page=2`);
	for (const page of ['0', '-1', 'foo', '1.5']) {
		const $ = await fetchPage(`${authorPath}?page=${page}`);
		assert.equal($('link[rel="canonical"]').attr('href'), `https://etso.es${authorPath}`);
		assert.equal($('a[aria-current="page"]').text(), '1');
	}
});
