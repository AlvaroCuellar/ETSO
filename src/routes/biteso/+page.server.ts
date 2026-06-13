import {
	UNRESOLVED_AUTHOR_ID,
	type AttributionSet,
	type CatalogWork
} from '$lib/domain/catalog';
import { setPublicCatalogCacheHeaders } from '$lib/server/cache-control';
import { getBitesoWorks } from '$lib/server/catalog-runtime';

import type { PageServerLoad } from './$types';

const getBitesoSlug = (work: CatalogWork): string =>
	work.textLinks
		.find((link) => link.kind === 'biteso')
		?.href.replace(/^\/biteso\//, '') ?? work.slug;

const collectAuthorIds = (set: AttributionSet, authorIds: Set<string>): void => {
	if (set.unresolved) return;

	for (const group of set.groups) {
		for (const member of group.members) {
			if (!member.authorId || member.authorId === UNRESOLVED_AUTHOR_ID) continue;
			authorIds.add(member.authorId);
		}
	}
};

const countUniqueAuthors = (works: CatalogWork[]): number => {
	const authorIds = new Set<string>();
	for (const work of works) {
		collectAuthorIds(work.traditionalAttribution, authorIds);
		collectAuthorIds(work.stylometryAttribution, authorIds);
	}
	return authorIds.size;
};

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
	const bitesoWorks = (await getBitesoWorks())
		.sort((a, b) => {
			const titleComparison = a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
			if (titleComparison !== 0) return titleComparison;
			return a.id.localeCompare(b.id, 'es', { sensitivity: 'base' });
		});

	setPublicCatalogCacheHeaders(setHeaders);
	return {
		works: bitesoWorks.map((work) => ({
			id: work.id,
			slug: getBitesoSlug(work),
			title: work.title,
			titleVariants: work.titleVariants,
			traditional: formatTraditionalAttribution(work.traditionalAttribution),
			genre: work.genre,
			textState: work.textState
		})),
		stats: {
			bitesoTexts: bitesoWorks.length,
			authors: countUniqueAuthors(bitesoWorks)
		}
	};
};
