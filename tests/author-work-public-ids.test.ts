import assert from 'node:assert/strict';
import test from 'node:test';

import type { AttributionSet, CatalogWork } from '../src/lib/domain/catalog.ts';
import {
	AUTHOR_WORK_PUBLIC_ID_FIELDS,
	buildAuthorWorkPublicIdsByAuthor
} from '../src/lib/domain/author-work-public-ids.ts';

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

test('exposes all five author-page categories', () => {
	assert.deepEqual(AUTHOR_WORK_PUBLIC_ID_FIELDS, [
		'relatedWorkPublicIds',
		'traditionalWorkPublicIds',
		'stylometryWorkPublicIds',
		'traditionalOnlyWorkPublicIds',
		'newStylometrySupportedWorkPublicIds'
	]);
	const index = buildAuthorWorkPublicIdsByAuthor([work()]);
	assert.deepEqual(index.get('traditional-author'), {
		relatedWorkPublicIds: [100001],
		traditionalWorkPublicIds: [100001],
		stylometryWorkPublicIds: [],
		traditionalOnlyWorkPublicIds: [100001],
		newStylometrySupportedWorkPublicIds: []
	});
	assert.deepEqual(index.get('stylometry-author'), {
		relatedWorkPublicIds: [100001],
		traditionalWorkPublicIds: [],
		stylometryWorkPublicIds: [100001],
		traditionalOnlyWorkPublicIds: [],
		newStylometrySupportedWorkPublicIds: [100001]
	});
});

test('computes overlapping memberships and differences per author, including mixed collaborations', () => {
	const index = buildAuthorWorkPublicIdsByAuthor([
		work({ traditionalAttribution: attribution('a', 'b'), stylometryAttribution: attribution('b', 'c') }),
		work({ publicId: 100002, traditionalAttribution: attribution('a'), stylometryAttribution: attribution('a') }),
		work({ publicId: 100003, traditionalAttribution: attribution('c'), stylometryAttribution: attribution('a') })
	]);
	assert.deepEqual(index.get('a'), {
		relatedWorkPublicIds: [100001, 100002, 100003],
		traditionalWorkPublicIds: [100001, 100002],
		stylometryWorkPublicIds: [100002, 100003],
		traditionalOnlyWorkPublicIds: [100001],
		newStylometrySupportedWorkPublicIds: [100003]
	});
	assert.deepEqual(index.get('b'), {
		relatedWorkPublicIds: [100001],
		traditionalWorkPublicIds: [100001],
		stylometryWorkPublicIds: [100001],
		traditionalOnlyWorkPublicIds: [],
		newStylometrySupportedWorkPublicIds: []
	});
	assert.deepEqual(index.get('c'), {
		relatedWorkPublicIds: [100001, 100003],
		traditionalWorkPublicIds: [100003],
		stylometryWorkPublicIds: [100001],
		traditionalOnlyWorkPublicIds: [100003],
		newStylometrySupportedWorkPublicIds: [100001]
	});
});

test('excludes all associations outside Examen de autorías', () => {
	assert.equal(buildAuthorWorkPublicIdsByAuthor([work({ inAuthorshipExam: false })]).size, 0);
});

test('ignores unresolved attributions independently on each side', () => {
	const index = buildAuthorWorkPublicIdsByAuthor([
		work({ stylometryAttribution: { ...attribution('stylometry-author'), unresolved: true } }),
		work({ publicId: 100002, traditionalAttribution: { ...attribution('traditional-author'), unresolved: true } }),
		work({
			publicId: 100003,
			traditionalAttribution: { ...attribution('traditional-author'), unresolved: true },
			stylometryAttribution: { ...attribution('stylometry-author'), unresolved: true }
		})
	]);
	assert.deepEqual(index.get('traditional-author'), {
		relatedWorkPublicIds: [100001],
		traditionalWorkPublicIds: [100001],
		stylometryWorkPublicIds: [],
		traditionalOnlyWorkPublicIds: [100001],
		newStylometrySupportedWorkPublicIds: []
	});
	assert.deepEqual(index.get('stylometry-author'), {
		relatedWorkPublicIds: [100002],
		traditionalWorkPublicIds: [],
		stylometryWorkPublicIds: [100002],
		traditionalOnlyWorkPublicIds: [],
		newStylometrySupportedWorkPublicIds: [100002]
	});
});

test('empty attribution groups contribute no associations', () => {
	const empty: AttributionSet = { connector: 'and', groups: [] };
	const index = buildAuthorWorkPublicIdsByAuthor([
		work({ traditionalAttribution: empty, stylometryAttribution: empty }),
		work({ traditionalAttribution: attribution(), stylometryAttribution: attribution() })
	]);
	assert.equal(index.size, 0);
	assert.equal(buildAuthorWorkPublicIdsByAuthor([]).size, 0);
});

test('preserves collaborators, alternative candidates and every displayed confidence on both sides', () => {
	const candidates: AttributionSet = {
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
	};
	const index = buildAuthorWorkPublicIdsByAuthor([
		work({ traditionalAttribution: candidates, stylometryAttribution: candidates })
	]);
	assert.deepEqual([...index.keys()], ['a', 'b', 'c', 'd']);
	for (const ids of index.values()) {
		assert.deepEqual(ids, {
			relatedWorkPublicIds: [100001],
			traditionalWorkPublicIds: [100001],
			stylometryWorkPublicIds: [100001],
			traditionalOnlyWorkPublicIds: [],
			newStylometrySupportedWorkPublicIds: []
		});
	}
});

test('deduplicates associations and preserves catalogue order in each category', () => {
	const index = buildAuthorWorkPublicIdsByAuthor([
		work({ publicId: 100004, traditionalAttribution: attribution('a', 'a'), stylometryAttribution: attribution() }),
		work({ publicId: 100002, traditionalAttribution: attribution(), stylometryAttribution: attribution('a', 'a') }),
		work({ publicId: 100001, traditionalAttribution: attribution('a'), stylometryAttribution: attribution('a') }),
		work({ publicId: 100003, traditionalAttribution: attribution('a'), stylometryAttribution: attribution() }),
		work({ publicId: 100005, traditionalAttribution: attribution(), stylometryAttribution: attribution('a') }),
		work({ publicId: 100004, traditionalAttribution: attribution('a'), stylometryAttribution: attribution() }),
		work({ publicId: 100002, traditionalAttribution: attribution(), stylometryAttribution: attribution('a') })
	]);
	assert.deepEqual(index.get('a'), {
		relatedWorkPublicIds: [100004, 100002, 100001, 100003, 100005],
		traditionalWorkPublicIds: [100004, 100001, 100003],
		stylometryWorkPublicIds: [100002, 100001, 100005],
		traditionalOnlyWorkPublicIds: [100004, 100003],
		newStylometrySupportedWorkPublicIds: [100002, 100005]
	});
});

test('deduplicated public IDs supported on both sides are excluded from both difference categories', () => {
	const index = buildAuthorWorkPublicIdsByAuthor([
		work({ traditionalAttribution: attribution('a'), stylometryAttribution: attribution() }),
		work({ traditionalAttribution: attribution(), stylometryAttribution: attribution('a') })
	]);
	assert.deepEqual(index.get('a'), {
		relatedWorkPublicIds: [100001],
		traditionalWorkPublicIds: [100001],
		stylometryWorkPublicIds: [100001],
		traditionalOnlyWorkPublicIds: [],
		newStylometrySupportedWorkPublicIds: []
	});
});

test('never substitutes internal IDs for missing or invalid public work IDs', () => {
	const invalidIds = [undefined, 0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1];
	const index = buildAuthorWorkPublicIdsByAuthor(invalidIds.map((publicId) => work({ publicId })));
	assert.equal(index.size, 0);
});

test('new catalogues produce fresh associations without mutating previous results or works', () => {
	const original = work();
	const before = structuredClone(original);
	const first = buildAuthorWorkPublicIdsByAuthor([original]);
	const firstBefore = structuredClone(first);
	const second = buildAuthorWorkPublicIdsByAuthor([work({ publicId: 100002 })]);
	assert.deepEqual(original, before);
	assert.deepEqual(first, firstBefore);
	assert.deepEqual(first.get('stylometry-author')?.stylometryWorkPublicIds, [100001]);
	assert.deepEqual(second.get('stylometry-author')?.stylometryWorkPublicIds, [100002]);
});
