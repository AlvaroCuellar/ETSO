import { setPublicCatalogCacheHeaders } from '$lib/server/cache-control';
import { getWorksForSummaryIndex } from '$lib/server/catalog-runtime';
import { getPublicSummaryAssetUrl } from '$lib/server/r2-public';

import type { AttributionSet } from '$lib/domain/catalog';
import type { PageServerLoad } from './$types';

const formatNameList = (names: string[]): string => {
	if (names.length === 0) return '';
	if (names.length === 1) return names[0];
	if (names.length === 2) return `${names[0]} y ${names[1]}`;
	return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
};

const formatTraditionalAttribution = (set: AttributionSet): string => {
	if (set.unresolved || set.groups.length === 0) return 'Desconocido';

	const names: string[] = [];
	const seen = new Set<string>();
	for (const group of set.groups) {
		for (const member of group.members) {
			const authorName = member.authorName.trim();
			if (!authorName || seen.has(authorName)) continue;
			seen.add(authorName);
			names.push(authorName);
		}
	}

	return names.length > 0 ? formatNameList(names) : 'Desconocido';
};

export const load: PageServerLoad = async ({ setHeaders }) => {
	const works = (await getWorksForSummaryIndex())
		.map((work) => ({
			slug: work.slug,
			title: work.title,
			titleVariants: work.titleVariants,
			traditional: formatTraditionalAttribution(work.traditionalAttribution),
			genre: work.genre
		}))
		.sort((a, b) => {
			const titleComparison = a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
			if (titleComparison !== 0) return titleComparison;
			return a.slug.localeCompare(b.slug, 'es', { sensitivity: 'base' });
		});

	setPublicCatalogCacheHeaders(setHeaders);
	return {
		works,
		summarySearchIndexUrl: getPublicSummaryAssetUrl('search-index.json')
	};
};
