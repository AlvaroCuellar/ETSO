import assert from 'node:assert/strict';
import test from 'node:test';

import type { AttributionSet, CatalogWork } from '../src/lib/domain/catalog.ts';
import { buildStylometryWorkPublicIdsByAuthor } from '../src/lib/domain/author-stylometry-works.ts';

const attribution = (...authorIds: string[]): AttributionSet => ({
	connector: 'and',
	groups: [{ members: authorIds.map((authorId) => ({ authorId, authorName: authorId })) }]
});

const work = (overrides: Partial<CatalogWork> = {}): CatalogWork => ({
	id: 'internal-work-id',
	publicId: 100001,
	slug: 'obra-de-prueba',
	title: 'Obra de prueba',
	titleVariants: [],
	genre: 'Comedia',
	origin: '',
	textState: '',
	addedOn: '',
	shortSummary: '',
	hasSummaryFile: false,
	inAuthorshipExam: true,
	traditionalAttribution: attribution('traditional-author'),
	stylometryAttribution: attribution('stylometry-author'),
	textLinks: [],
	...overrides
});

test('links public work IDs to stylometric authors, without traditional-only associations', () => {
	const index = buildStylometryWorkPublicIdsByAuthor([work()]);
	assert.deepEqual([...index], [['stylometry-author', [100001]]]);
});

test('excludes works outside Examen de autorías and unresolved attributions', () => {
	const index = buildStylometryWorkPublicIdsByAuthor([
		work({ inAuthorshipExam: false }),
		work({ stylometryAttribution: { ...attribution('stylometry-author'), unresolved: true } }),
		work({ stylometryAttribution: { connector: 'and', groups: [] } })
	]);
	assert.equal(index.size, 0);
});

test('preserves collaborators, alternative candidates and every displayed confidence', () => {
	const index = buildStylometryWorkPublicIdsByAuthor([
		work({
			stylometryAttribution: {
				connector: 'or',
				groups: [
					{ members: [
						{ authorId: 'a', authorName: 'A', confidence: 'segura' },
						{ authorId: 'b', authorName: 'B', confidence: 'probable' }
					] },
					{ members: [
						{ authorId: 'c', authorName: 'C', confidence: 'posible' },
						{ authorId: 'd', authorName: 'D', confidence: 'no_concluyente' }
					] }
				]
			}
		})
	]);
	assert.deepEqual([...index], [
		['a', [100001]], ['b', [100001]], ['c', [100001]], ['d', [100001]]
	]);
});

test('deduplicates associations and preserves catalogue order', () => {
	const index = buildStylometryWorkPublicIdsByAuthor([
		work({ publicId: 100002, stylometryAttribution: attribution('a', 'a') }),
		work({ publicId: 100001, stylometryAttribution: attribution('a') }),
		work({ publicId: 100002, stylometryAttribution: attribution('a') })
	]);
	assert.deepEqual(index.get('a'), [100002, 100001]);
});

test('never substitutes internal IDs for missing or invalid public work IDs', () => {
	const invalidIds = [undefined, 0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1];
	const index = buildStylometryWorkPublicIdsByAuthor(invalidIds.map((publicId) => work({ publicId })));
	assert.equal(index.size, 0);
});

test('new catalogues produce fresh associations without mutating previous results or works', () => {
	const original = work();
	const before = structuredClone(original);
	const first = buildStylometryWorkPublicIdsByAuthor([original]);
	const second = buildStylometryWorkPublicIdsByAuthor([work({ publicId: 100002 })]);
	assert.deepEqual(original, before);
	assert.deepEqual(first.get('stylometry-author'), [100001]);
	assert.deepEqual(second.get('stylometry-author'), [100002]);
	assert.equal(buildStylometryWorkPublicIdsByAuthor([]).size, 0);
});
