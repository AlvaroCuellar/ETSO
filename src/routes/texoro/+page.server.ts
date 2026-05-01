import { getAllWorks, getCatalogStats } from '$lib/server/catalog-runtime';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [works, stats] = await Promise.all([getAllWorks(), getCatalogStats()]);
	const worksMeta = works.map((work) => ({
		id: work.id,
		title: work.title,
		slug: work.slug,
		genre: work.genre,
		shortSummary: work.shortSummary,
		stylometryAttribution: work.stylometryAttribution
	}));

	return {
		stats,
		worksMeta
	};
};
