import { getAllWorks, getCatalogStats } from '$lib/server/catalog-runtime';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const worksMeta = getAllWorks().map((work) => ({
		id: work.id,
		title: work.title,
		slug: work.slug,
		genre: work.genre,
		shortSummary: work.shortSummary,
		stylometryAttribution: work.stylometryAttribution
	}));

	return {
		stats: getCatalogStats(),
		worksMeta
	};
};
