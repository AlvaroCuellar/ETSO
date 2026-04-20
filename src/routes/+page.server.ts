import { getAllWorks, getCatalogStats } from '$lib/server/catalog-local';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const featuredWorks = getAllWorks().slice(0, 3);

	return {
		stats: getCatalogStats(),
		featuredWorks,
		primaryWorkSlug: featuredWorks[0]?.slug ?? null
	};
};
