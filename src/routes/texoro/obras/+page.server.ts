import { setPublicCatalogCacheHeaders } from '$lib/server/cache-control';
import { getAllWorks } from '$lib/server/catalog-runtime';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ setHeaders }) => {
	const works = (await getAllWorks())
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
		});

	setPublicCatalogCacheHeaders(setHeaders);
	return { works };
};
