import { getAllWorks, getCatalogStats } from '$lib/server/catalog-runtime';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [works, stats] = await Promise.all([getAllWorks(), getCatalogStats()]);
	const featuredWorks = works.slice(0, 3);

	return {
		stats,
		featuredWorks,
		primaryWorkSlug: featuredWorks[0]?.slug ?? null
	};
};
