import { error } from '@sveltejs/kit';
import { setPublicCatalogCacheHeaders } from '$lib/server/cache-control';
import { getAuthorById, getAuthorMetrics, getAuthorWorks } from '$lib/server/catalog-runtime';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
	const author = await getAuthorById(params.id);
	if (!author) throw error(404, 'Autor no encontrado');

	const [works, metrics] = await Promise.all([getAuthorWorks(author.id), getAuthorMetrics(author.id)]);

	setPublicCatalogCacheHeaders(setHeaders);
	return {
		author,
		works,
		metrics
	};
};
