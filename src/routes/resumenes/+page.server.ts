import { getWorksForSummaryIndex } from '$lib/server/catalog-runtime';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
	works: (await getWorksForSummaryIndex())
		.map((work) => ({
			slug: work.slug,
			title: work.title,
			titleVariants: work.titleVariants,
			traditionalAttribution: work.traditionalAttribution,
			genre: work.genre
		}))
		.sort((a, b) => {
			const titleComparison = a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
			if (titleComparison !== 0) return titleComparison;
			return a.slug.localeCompare(b.slug, 'es', { sensitivity: 'base' });
		})
});
