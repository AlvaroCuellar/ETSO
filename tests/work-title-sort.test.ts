import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeResultSort, resultSortLabel, sortSearchResults } from '../src/lib/search/result-sort.ts';
import type { SearchResult } from '../src/lib/search/types.ts';

const titles = ['¿Zorro?', '¡Ay, verdades, que en amor…!', 'Árbol', 'Ñandú', '«Barca»', 'Nube'];
const results: SearchResult[] = titles.map((title, docId) => ({
	workId: String(docId), publicId: null, docId, docTokenCount: 0, score: 1, matches: [],
	meta: {
		id: String(docId), title, titleVariants: [], slug: String(docId), genre: 'Comedia',
		textState: 'Bueno', shortSummary: '', textLinks: [],
		traditionalAttribution: { groups: [], connector: 'and' },
		stylometryAttribution: { groups: [], connector: 'and' }
	}
}));
const orderedTitles = (sort: 'title' | 'genre', direction: 'asc' | 'desc') =>
	sortSearchResults(results, sort, direction).map((result) => result.meta?.title);

test('titles ignore punctuation and accents while preserving Spanish ñ and displayed titles', () => {
	assert.deepEqual(orderedTitles('title', 'asc'), [
		'Árbol', '¡Ay, verdades, que en amor…!', '«Barca»', 'Nube', 'Ñandú', '¿Zorro?'
	]);
	assert.deepEqual(orderedTitles('title', 'desc'), [...orderedTitles('title', 'asc')].reverse());
	assert.deepEqual(results.map((result) => result.meta?.title), titles);
});

test('title tie-breaking follows the same order when sorting by another field', () => {
	assert.deepEqual(orderedTitles('genre', 'asc'), orderedTitles('title', 'asc'));
});

test('general genre and subgenre sort independently and preserve legacy genre links', () => {
	const mixed: SearchResult[] = results.slice(0, 4).map((result, index) => ({
		...result,
		meta: {
			...result.meta!,
			generalGenre: ['Teatro', 'Prosa', 'Poesía', undefined][index],
			genre: ['Comedia', 'Novela', 'Sonetos', 'Auto'][index]
		}
	}));
	assert.equal(normalizeResultSort('generalGenre'), 'generalGenre');
	assert.equal(normalizeResultSort('genre'), 'genre');
	assert.equal(resultSortLabel('generalGenre'), 'Género');
	assert.equal(resultSortLabel('genre'), 'Subgénero');
	for (const direction of ['asc', 'desc'] as const) {
		const expected = direction === 'asc' ? ['Poesía', 'Prosa', 'Teatro', 'Teatro'] : ['Teatro', 'Teatro', 'Prosa', 'Poesía'];
		assert.deepEqual(sortSearchResults(mixed, 'generalGenre', direction).map((r) => r.meta!.generalGenre || 'Teatro'), expected);
	}
	assert.deepEqual(sortSearchResults(mixed, 'genre', 'asc').map((r) => r.meta!.genre), ['Auto', 'Comedia', 'Novela', 'Sonetos']);
});

const baseUrl = process.env.ETSO_TEST_BASE_URL;
test('Examen paginates the corrected global order instead of sorting each page', { skip: !baseUrl }, async () => {
	const response = await fetch(new URL('/api/obras?fields=id,title,flags', baseUrl));
	assert.equal(response.status, 200);
	const { works } = await response.json();
	const expected = works.filter((work: { flags: { inAuthorshipExam: boolean } }) => work.flags.inAuthorshipExam)
		.sort((a: { title: string; id: string }, b: { title: string; id: string }) =>
			a.title.localeCompare(b.title, 'es', { sensitivity: 'base', ignorePunctuation: true }) || a.id.localeCompare(b.id)
		);
	const index = expected.findIndex((work: { title: string }) => work.title === '¡Ay, verdades, que en amor…!');
	assert.ok(index > 0);
	const first = await fetch(new URL('/api/examen-autorias/works', baseUrl)).then((res) => res.json());
	assert.deepEqual(first.works.map((work: { id: string }) => work.id), expected.slice(0, first.pageSize).map((work: { id: string }) => work.id));
	const page = Math.floor(index / first.pageSize) + 1;
	const actual = await fetch(new URL(`/api/examen-autorias/works?page=${page}`, baseUrl)).then((res) => res.json());
	const offset = (page - 1) * first.pageSize;
	assert.deepEqual(actual.works.map((work: { id: string }) => work.id), expected.slice(offset, offset + first.pageSize).map((work: { id: string }) => work.id));
});
