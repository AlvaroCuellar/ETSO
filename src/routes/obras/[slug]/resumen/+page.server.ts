import { error } from '@sveltejs/kit';
import { setPublicCatalogCacheHeaders } from '$lib/server/cache-control';
import { getWorkBySlug } from '$lib/server/catalog-runtime';
import { getPublicSummaryAssetUrl } from '$lib/server/r2-public';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const work = await getWorkBySlug(params.slug);
	if (!work) throw error(404, 'Obra no encontrada');

	setPublicCatalogCacheHeaders(setHeaders);
	return {
		work,
		summaryUrl: getPublicSummaryAssetUrl(`${work.id}.json`)
	};
};
