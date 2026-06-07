import { json } from '@sveltejs/kit';
import { getWorksForSummaryList } from '$lib/server/catalog-runtime';
import { normalizePlainText } from '$lib/search/normalize';
import { buildWorkTitleSearchText } from '$lib/utils/format-display-work-title';

import type { AttributionSet } from '$lib/domain/catalog';
import type { RequestHandler } from './$types';

const normalizeFilterText = (value: string): string =>
	normalizePlainText(value, false).replace(/\s+/g, ' ').trim();

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

export const GET: RequestHandler = async () => {
	const works = (await getWorksForSummaryList())
		.map((work) => ({
			slug: work.slug,
			title: work.title,
			titleVariants: work.titleVariants,
			titleSearchText: normalizeFilterText(buildWorkTitleSearchText(work.title, work.titleVariants)),
			traditional: formatTraditionalAttribution(work.traditionalAttribution),
			genre: work.genre.trim() || 'Sin género'
		}))
		.sort((a, b) => {
			const titleComparison = a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
			if (titleComparison !== 0) return titleComparison;
			return a.slug.localeCompare(b.slug, 'es', { sensitivity: 'base' });
		});

	return json(
		{ works },
		{
			headers: {
				'cache-control': 'private, max-age=300'
			}
		}
	);
};
