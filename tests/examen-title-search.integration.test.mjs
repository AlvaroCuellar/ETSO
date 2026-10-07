import assert from 'node:assert/strict';
import test from 'node:test';

// Run against a development server with ETSO_TEST_BASE_URL=http://127.0.0.1:5173.
const baseUrl = process.env.ETSO_TEST_BASE_URL;
const search = async (title) => {
	const url = new URL('/api/examen-autorias/works', baseUrl);
	url.searchParams.set('titulo', title);
	const response = await fetch(url);
	assert.equal(response.status, 200);
	return response.json();
};

test('title searches ignore Spanish accents in either cache population order', { skip: !baseUrl }, async () => {
	for (const [first, second] of [
		['medico de su', 'médico de su'],
		['médico de', 'medico de'],
		['PRINCIPE', 'príncipe'],
		['sueño', 'sueno']
	]) {
		const a = await search(first);
		const b = await search(second);
		assert.ok(a.totalResults > 0, first);
		assert.equal(a.totalResults, b.totalResults, `${first} / ${second}`);
		assert.deepEqual(a.works.map((work) => work.id), b.works.map((work) => work.id));
	}
});

test('title searches treat SQL LIKE wildcards as literal characters', { skip: !baseUrl }, async () => {
	for (const title of ['%', '_', 'El_%', '\\']) {
		const result = await search(title);
		assert.equal(result.totalResults, 0, title);
		assert.deepEqual(result.works, []);
	}
});
