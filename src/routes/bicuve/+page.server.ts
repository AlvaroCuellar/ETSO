import {
	UNRESOLVED_AUTHOR_ID,
	type AttributionSet,
	type CatalogWork
} from '$lib/domain/catalog';
import { getAllWorks } from '$lib/server/catalog-runtime';

import type { PageServerLoad } from './$types';

const hasBicuveText = (work: CatalogWork): boolean =>
	work.textLinks.some((link) => link.kind === 'bicuve');

const getBicuveSlug = (work: CatalogWork): string =>
	work.textLinks
		.find((link) => link.kind === 'bicuve')
		?.href.replace(/^\/bicuve\//, '') ?? work.slug;

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

export const load: PageServerLoad = async () => {
	const bicuveWorks = (await getAllWorks())
		.filter(hasBicuveText)
		.sort((a, b) => {
			const titleComparison = a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
			if (titleComparison !== 0) return titleComparison;
			return a.id.localeCompare(b.id, 'es', { sensitivity: 'base' });
		});

	return {
		works: bicuveWorks.map((work) => ({
			id: work.id,
			slug: getBicuveSlug(work),
			title: work.title,
			titleVariants: work.titleVariants
		})),
		stats: {
			bicuveTexts: bicuveWorks.length,
			authors: countUniqueAuthors(bicuveWorks)
		}
	};
};
